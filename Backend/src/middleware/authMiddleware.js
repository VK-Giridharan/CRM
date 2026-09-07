const jwt = require("jsonwebtoken");

const pool = require("../database/connection");

// ======================================================
// TOKEN VERIFICATION
//
// Every failure path returns 401 with a generic message. Internal JWT
// errors (TokenExpiredError / JsonWebTokenError / malformed signature) are
// never forwarded to the client, and are never thrown out of this middleware
// where Express would turn them into a 500.
//
// After the signature checks out, the token is also validated against the
// account's current state:
//
//   * password_changed_at - a JWT minted BEFORE the user's most recent
//     password change or reset is rejected, so changing a password actually
//     ends every other session. Rows where password_changed_at IS NULL
//     (every account that existed before this shipped) are never rejected.
//
//   * is_active - a disabled account is refused on every route, not just at
//     login, so revoking access takes effect immediately instead of when the
//     stolen token happens to expire.
//
// This costs one indexed primary-key lookup per authenticated request.
// ======================================================

const authMiddleware = async (req, res, next) => {

    let decoded;

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access Token Required"
            });
        }

        const [scheme, token] = authHeader.split(" ");

        if (!token || scheme !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            });
        }

        decoded = jwt.verify(token, process.env.JWT_SECRET);

    } catch (error) {

        // Distinguish only expiry, so the frontend can tell the user to log
        // in again. No internal error detail is included.
        const message =
            error.name === "TokenExpiredError"
                ? "Session Expired"
                : "Unauthorized";

        return res.status(401).json({
            success: false,
            message
        });

    }

    // ------------------------------------------------------
    // Account-state checks. Kept outside the JWT try/catch so a database
    // failure is not misreported as an authentication failure.
    // ------------------------------------------------------
    try {

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const result = await pool.query(
            `SELECT is_active, password_changed_at
             FROM users
             WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const account = result.rows[0];

        if (!account.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account Disabled"
            });
        }

        if (account.password_changed_at && decoded.iat) {

            // jwt `iat` is in whole seconds, so compare at second precision
            // and allow the boundary second through - otherwise the token
            // issued by the very login that follows a reset could be
            // rejected by its own timestamp.
            //
            // Known limitation: a token minted in the SAME second as the
            // password change survives. That one-second window is inherent to
            // the `iat` claim's resolution; every older token (the realistic
            // stolen-token case) is rejected.
            const changedAtSeconds =
                Math.floor(new Date(account.password_changed_at).getTime() / 1000);

            if (decoded.iat < changedAtSeconds) {
                return res.status(401).json({
                    success: false,
                    message: "Session Expired"
                });
            }

        }

        req.user = decoded;

        next();

    } catch (error) {

        next(error);

    }

};

module.exports = authMiddleware;
