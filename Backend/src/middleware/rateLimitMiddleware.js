// ======================================================
// IN-MEMORY RATE LIMITING
//
// The A-Z test report (BUG-025) found that 30 consecutive failed logins for
// one account produced 30 plain 401s - no delay, no lockout, no 429 - so
// passwords could be attacked at full network speed.
//
// This is a deliberately small, dependency-free limiter that matches the
// existing architecture (single Node process, no Redis, no new packages).
//
// Design notes:
//
//   * Keyed on client IP *and* the submitted identifier, so one attacker
//     cannot lock every account out from a single address, and a distributed
//     attack on one account is still throttled.
//   * Only FAILED attempts count. A successful login clears the counter, so
//     a legitimate user who mistypes once and then succeeds is never
//     penalised.
//   * The block expires on its own after BLOCK_MS - there is no permanent
//     lockout and no admin unlock step.
//   * A fixed sweep drops expired entries so the map cannot grow without
//     bound from random identifiers.
// ======================================================

const WINDOW_MS = Number(process.env.LOGIN_WINDOW_MINUTES || 15) * 60 * 1000;
const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 8);
const BLOCK_MS = Number(process.env.LOGIN_BLOCK_MINUTES || 15) * 60 * 1000;

// key -> { count, firstAttempt, blockedUntil }
const attempts = new Map();

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const sweep = () => {

    const now = Date.now();

    for (const [key, entry] of attempts) {

        const blockExpired = !entry.blockedUntil || entry.blockedUntil <= now;
        const windowExpired = now - entry.firstAttempt > WINDOW_MS;

        if (blockExpired && windowExpired) {
            attempts.delete(key);
        }

    }

};

// unref() so an idle timer never holds the process open (tests, CI, shutdown).
const sweepTimer = setInterval(sweep, SWEEP_INTERVAL_MS);

if (typeof sweepTimer.unref === "function") {
    sweepTimer.unref();
}

const clientIp = (req) =>
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";

const buildKey = (req) => {

    const identifier = req.body && req.body.emailOrPhone;

    const who =
        typeof identifier === "string" || typeof identifier === "number"
            ? String(identifier).trim().toLowerCase()
            : "";

    return `${clientIp(req)}|${who}`;

};

// ------------------------------------------------------
// Gate: refuses the request while the key is blocked.
// ------------------------------------------------------
const loginRateLimit = (req, res, next) => {

    const key = buildKey(req);
    const now = Date.now();

    const entry = attempts.get(key);

    if (entry && entry.blockedUntil && entry.blockedUntil > now) {

        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);

        res.setHeader("Retry-After", String(retryAfter));

        return res.status(429).json({
            success: false,
            message:
                "Too many failed login attempts. Please try again in " +
                `${Math.ceil(retryAfter / 60)} minute(s).`
        });

    }

    // Window has rolled over - start counting again.
    if (entry && now - entry.firstAttempt > WINDOW_MS &&
        (!entry.blockedUntil || entry.blockedUntil <= now)) {
        attempts.delete(key);
    }

    req.rateLimitKey = key;

    next();

};

// ------------------------------------------------------
// Called by the login controller after a failed attempt.
// ------------------------------------------------------
const registerFailedLogin = (req) => {

    const key = req.rateLimitKey || buildKey(req);
    const now = Date.now();

    const entry = attempts.get(key) || { count: 0, firstAttempt: now, blockedUntil: 0 };

    entry.count += 1;

    if (entry.count >= MAX_ATTEMPTS) {
        entry.blockedUntil = now + BLOCK_MS;
    }

    attempts.set(key, entry);

};

// ------------------------------------------------------
// Called by the login controller after a successful attempt.
// ------------------------------------------------------
const clearFailedLogins = (req) => {

    attempts.delete(req.rateLimitKey || buildKey(req));

};

// Test helper - lets the regression suite reset state between scenarios.
const resetRateLimiter = () => attempts.clear();

module.exports = {
    loginRateLimit,
    registerFailedLogin,
    clearFailedLogins,
    resetRateLimiter,
    MAX_ATTEMPTS
};
