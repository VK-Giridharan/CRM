const crypto = require("crypto");

const pool = require("../database/connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { getAuthContext } = require("../utils/authContext");
const {
    registerFailedLogin,
    clearFailedLogins
} = require("../middleware/rateLimitMiddleware");
const { ROLES } = require("../utils/status");

const {
    parseId,
    validateName,
    validateEmail,
    validatePhone,
    validatePassword,
    firstError,
    MIN_PASSWORD_LENGTH,
    EMAIL_PATTERN
} = require("../utils/validation");

const BCRYPT_ROUNDS = 10;

// Roles a Manager is allowed to grant
const MANAGER_ASSIGNABLE_ROLES = [
    ROLES.TEAM_LEAD,
    ROLES.EMPLOYEE,
    ROLES.INTERN
];

const hashResetToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

// ======================================================
// REGISTER
// New users always land with role = NULL / company_id = NULL and are
// promoted later by an Admin (-> Manager) or a Manager (-> worker role).
// ======================================================

exports.register = async (req, res) => {
    try {

        const { first_name, last_name, email, phone, password } = req.body;

        // Presence first, so the existing "All required fields are mandatory"
        // message is preserved for a genuinely empty request.
        if (!first_name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All required fields are mandatory"
            });
        }

        // Format validation. Previously phone was not validated at all, so a
        // direct API call could store "abcdefghij" or a 15-digit number even
        // though the Register screen enforces exactly 10 digits.
        const validationError = firstError([
            validateName(first_name, "First name"),
            validateName(last_name, "Last name", { required: false }),
            validateEmail(email),
            validatePhone(phone),
            validatePassword(password)
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const normalisedEmail = String(email).trim().toLowerCase();
        const normalisedPhone = String(phone).trim();

        const emailCheck = await pool.query(
            "SELECT id FROM users WHERE LOWER(email) = $1",
            [normalisedEmail]
        );

        if (emailCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        const phoneCheck = await pool.query(
            "SELECT id FROM users WHERE phone = $1",
            [normalisedPhone]
        );

        if (phoneCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Phone number already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users
            (first_name, last_name, email, phone, password)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, first_name, last_name, email, phone, created_at`,
            [
                String(first_name).trim(),
                last_name ? String(last_name).trim() : null,
                normalisedEmail,
                normalisedPhone,
                hashedPassword
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User Registered Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.error("REGISTER ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

// ======================================================
// LOGIN
// ======================================================

exports.login = async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;

        if (!emailOrPhone || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/Phone and Password are required"
            });
        }

        // Reject non-primitive values before they reach bcrypt.compare, which
        // throws on a non-string and previously escaped as a 500. Both fields
        // are checked so neither can be used to trigger a server error.
        if (typeof password !== "string" ||
            (typeof emailOrPhone !== "string" && typeof emailOrPhone !== "number")) {

            return res.status(400).json({
                success: false,
                message: "Email/Phone and Password must be text"
            });

        }

        const identifier = String(emailOrPhone).trim();

        // Only the columns actually needed - the password hash is read for
        // comparison and never leaves this function.
        const result = await pool.query(
            `SELECT
                id, first_name, last_name, email, phone,
                password, role, company_id, is_active
             FROM users
             WHERE LOWER(email) = LOWER($1)
                OR phone = $1`,
            [identifier]
        );

        if (result.rows.length === 0) {
            registerFailedLogin(req);
            return res.status(401).json({
                success: false,
                message: "Invalid Credentials"
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Account Disabled"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            registerFailedLogin(req);
            // Same message as "user not found" so login cannot be used to
            // discover which emails/phones are registered.
            return res.status(401).json({
                success: false,
                message: "Invalid Credentials"
            });
        }

        // Successful sign-in clears the counter, so a user who mistypes once
        // and then gets it right is never throttled.
        clearFailedLogins(req);

        await pool.query(
            `UPDATE users SET last_login = NOW() WHERE id = $1`,
            [user.id]
        );

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                company_id: user.company_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login Successful",

            token,

            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                company_id: user.company_id,
                is_active: user.is_active
            }
        });

    } catch (error) {

        console.error("LOGIN ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

// ======================================================
// GET PROFILE (/me)
// ======================================================

exports.getProfile = async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                id, first_name, last_name, email, phone,
                role, company_id, is_active, last_login
            FROM users
            WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        console.error("GET PROFILE ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// WORKERS LIST
//
// Previously returned every user in every company with no role check.
// Now: Admin sees all; Manager and Team Lead see only their own company.
// The password hash is never selected.
// ======================================================

exports.getWorkers = async (req, res) => {

    try {

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const allowedRoles = [ROLES.ADMIN, ROLES.MANAGER, ROLES.TEAM_LEAD];

        if (!allowedRoles.includes(authUser.role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view team members"
            });
        }

        const isAdmin = authUser.role === ROLES.ADMIN;

        if (!isAdmin && !authUser.company_id) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const result = await pool.query(
            `SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.role,
                u.is_active,
                u.company_id,
                c.company_name
             FROM users u
             LEFT JOIN companies c
                ON c.id = u.company_id
             ${isAdmin ? "" : "WHERE u.company_id = $1"}
             ORDER BY u.first_name ASC`,
            isAdmin ? [] : [authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.error("GET WORKERS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// CHANGE ROLE
//
// Admin  -> may promote an unassigned user to Manager and place them in a company.
// Manager-> may grant Team Lead / Employee / Intern, and ONLY to a user who is
//           still unassigned (company_id IS NULL) or already inside the
//           manager's own company. This blocks a Manager from pulling another
//           company's staff into their tenant.
// ======================================================

exports.changeRole = async (req, res) => {

    try {

        const { user_id, role, company_id } = req.body;

        if (!user_id || !role) {
            return res.status(400).json({
                success: false,
                message: "User Id and Role are required"
            });
        }

        // Validate the id in the application so a value like "abc" returns a
        // 400 instead of reaching Postgres and surfacing as a 500.
        const targetUserId = parseId(user_id);

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: "Invalid User Id"
            });
        }

        const currentUser = await getAuthContext(req.user.id);

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const targetResult = await pool.query(
            `SELECT id, role, company_id FROM users WHERE id = $1`,
            [targetUserId]
        );

        if (targetResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Target User Not Found"
            });
        }

        const targetUser = targetResult.rows[0];

        if (Number(targetUser.id) === Number(currentUser.id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot change your own role"
            });
        }

        // ================= ADMIN =================

        if (currentUser.role === ROLES.ADMIN) {

            if (role !== ROLES.MANAGER) {
                return res.status(400).json({
                    success: false,
                    message: "Admin can assign only Manager role"
                });
            }

            if (!company_id) {
                return res.status(400).json({
                    success: false,
                    message: "Company is required"
                });
            }

            const targetCompanyId = parseId(company_id);

            if (!targetCompanyId) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Company Id"
                });
            }

            const companyCheck = await pool.query(
                `SELECT id FROM companies WHERE id = $1`,
                [targetCompanyId]
            );

            if (companyCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Company Not Found"
                });
            }

            await pool.query(
                `UPDATE users
                 SET role = $1, company_id = $2, updated_at = NOW()
                 WHERE id = $3`,
                [role, targetCompanyId, targetUserId]
            );

            return res.status(200).json({
                success: true,
                message: "Manager Assigned Successfully"
            });

        }

        // ================= MANAGER =================

        if (currentUser.role === ROLES.MANAGER) {

            if (!MANAGER_ASSIGNABLE_ROLES.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Role"
                });
            }

            if (!currentUser.company_id) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to a company"
                });
            }

            // Target must be unassigned, or already in this manager's company.
            const targetIsUnassigned = targetUser.company_id === null;

            const targetInSameCompany =
                Number(targetUser.company_id) === Number(currentUser.company_id);

            if (!targetIsUnassigned && !targetInSameCompany) {
                return res.status(403).json({
                    success: false,
                    message: "You can manage only users in your own company"
                });
            }

            // A Manager may never grant Admin or Manager, and may not demote
            // an existing Admin/Manager.
            if (targetUser.role === ROLES.ADMIN ||
                targetUser.role === ROLES.MANAGER) {

                return res.status(403).json({
                    success: false,
                    message: "You cannot change this user's role"
                });

            }

            // company_id is taken from the manager's own row, never the body.
            await pool.query(
                `UPDATE users
                 SET role = $1, company_id = $2, updated_at = NOW()
                 WHERE id = $3`,
                [role, currentUser.company_id, targetUserId]
            );

            return res.status(200).json({
                success: true,
                message: "Role Assigned Successfully"
            });

        }

        return res.status(403).json({
            success: false,
            message: "You are not authorized to perform this action"
        });

    } catch (error) {

        console.error("CHANGE ROLE ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// PENDING USERS
//
// A pending user has role IS NULL and company_id IS NULL - they belong to no
// company yet, so this list cannot be company-filtered. It is instead
// restricted to the two roles that are allowed to promote people.
// ======================================================

exports.getPendingUsers = async (req, res) => {

    try {

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (![ROLES.ADMIN, ROLES.MANAGER].includes(authUser.role)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view pending users"
            });
        }

        const result = await pool.query(
            `SELECT
                id, first_name, last_name, email, phone, created_at
             FROM users
             WHERE role IS NULL
               AND company_id IS NULL
             ORDER BY created_at DESC`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.error("PENDING USERS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// PROFILE (with company name)
// ======================================================

exports.profile = async (req, res) => {

    try {

        const result = await pool.query(
            `SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                u.role,
                u.company_id,
                c.company_name,
                u.created_at,
                u.last_login
             FROM users u
             LEFT JOIN companies c
                ON c.id = u.company_id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.error("PROFILE ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// UPDATE PROFILE
// ======================================================

exports.updateProfile = async (req, res) => {

    try {

        const { first_name, last_name, email, phone } = req.body;

        // Same rules as registration - phone in particular was previously
        // only checked for presence, so "123" was accepted here.
        const validationError = firstError([
            validateName(first_name, "First name"),
            validateName(last_name, "Last name", { required: false }),
            validateEmail(email),
            validatePhone(phone)
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const normalisedEmail = String(email).trim().toLowerCase();
        const normalisedPhone = String(phone).trim();

        // Reject collisions explicitly instead of letting the insert fail.
        const clash = await pool.query(
            `SELECT id
             FROM users
             WHERE (LOWER(email) = $1 OR phone = $2)
               AND id <> $3`,
            [normalisedEmail, normalisedPhone, req.user.id]
        );

        if (clash.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is already in use"
            });
        }

        await pool.query(
            `UPDATE users
             SET first_name = $1,
                 last_name  = $2,
                 email      = $3,
                 phone      = $4,
                 updated_at = NOW()
             WHERE id = $5`,
            [
                String(first_name).trim(),
                last_name ? String(last_name).trim() : null,
                normalisedEmail,
                normalisedPhone,
                req.user.id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Profile Updated Successfully"
        });

    } catch (error) {

        console.error("UPDATE PROFILE ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// CHANGE PASSWORD (authenticated)
// ======================================================

exports.changePassword = async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current and new password are required"
            });
        }

        if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
            return res.status(400).json({
                success: false,
                message: "Passwords must be text"
            });
        }

        const passwordError = validatePassword(newPassword, "New password");

        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from the current password"
            });
        }

        const user = await pool.query(
            "SELECT password FROM users WHERE id = $1",
            [req.user.id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const match = await bcrypt.compare(
            currentPassword,
            user.rows[0].password
        );

        if (!match) {
            return res.status(400).json({
                success: false,
                message: "Current Password Incorrect"
            });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        // password_changed_at is stamped so authMiddleware can reject any JWT
        // that was issued before this moment - changing the password now
        // genuinely ends every other session.
        await pool.query(
            `UPDATE users
             SET password = $1,
                 password_changed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [hash, req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: "Password Changed Successfully"
        });

    } catch (error) {

        console.error("CHANGE PASSWORD ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// FORGOT PASSWORD
//
// Always responds with the same generic message and 200 status, whether or
// not the address exists, so this endpoint cannot be used to enumerate
// accounts. Only the SHA-256 hash of the token is stored; the raw token is
// never written to the database and never logged.
//
// This project has no email infrastructure, so delivery is out of scope.
// For local testing only, setting ALLOW_RESET_TOKEN_IN_RESPONSE=true (and
// NODE_ENV != production) echoes the token back. It is off unless explicitly
// enabled.
// ======================================================

exports.forgotPassword = async (req, res) => {

    const genericResponse = {
        success: true,
        message:
            "If an account exists for that email, a password reset link has been generated."
    };

    try {

        const { email } = req.body;

        if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
            // Still generic - an invalid format must not be distinguishable.
            return res.status(200).json(genericResponse);
        }

        const normalisedEmail = String(email).trim().toLowerCase();

        const userResult = await pool.query(
            `SELECT id, is_active FROM users WHERE LOWER(email) = $1`,
            [normalisedEmail]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(200).json(genericResponse);
        }

        const user = userResult.rows[0];

        const ttlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 30;

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashResetToken(rawToken);

        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            // Invalidate any outstanding tokens for this user so only the
            // newest link works.
            await client.query(
                `UPDATE password_resets
                 SET used_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1
                   AND used_at IS NULL`,
                [user.id]
            );

            await client.query(
                `INSERT INTO password_resets (user_id, token_hash, expires_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' minutes')::interval)`,
                [user.id, tokenHash, String(ttlMinutes)]
            );

            await client.query("COMMIT");

        } catch (error) {

            await client.query("ROLLBACK");
            throw error;

        } finally {

            client.release();

        }

        const allowTokenEcho =
            process.env.NODE_ENV !== "production" &&
            process.env.ALLOW_RESET_TOKEN_IN_RESPONSE === "true";

        if (allowTokenEcho) {
            return res.status(200).json({
                ...genericResponse,
                dev_only_reset_token: rawToken,
                dev_only_expires_in_minutes: ttlMinutes
            });
        }

        return res.status(200).json(genericResponse);

    } catch (error) {

        // The response stays generic so the endpoint cannot be used to
        // enumerate accounts, but the failure is logged loudly: previously a
        // missing password_resets table made this path swallow every error
        // while still telling the user a link had been generated.
        console.error(
            "FORGOT PASSWORD FAILED - no reset token was created:",
            error.message
        );

        return res.status(200).json(genericResponse);

    }

};

// ======================================================
// ADMIN-ASSISTED RESET LINK
//
// This project has no email infrastructure, so a self-service reset token
// can never reach the user. Without a delivery path the whole reset feature
// is unusable in production (the reset screen asks for a token the user has
// no way to obtain).
//
// This endpoint is that delivery path: an Admin generates a single-use link
// for a specific user and passes it on through a channel they already trust.
//
// Security properties:
//   * Admin only, enforced by requireRole on the route.
//   * The token is generated exactly like the self-service flow - random 32
//     bytes, only the SHA-256 hash is stored, single use, same TTL.
//   * Any outstanding token for that user is invalidated first.
//   * Disabled accounts are refused.
//   * The raw token is returned ONLY to the authenticated Admin who asked
//     for it, never to an anonymous caller.
// ======================================================

exports.adminGenerateResetLink = async (req, res) => {

    const client = await pool.connect();

    try {

        const { user_id } = req.body;

        const targetId = parseId(user_id);

        if (!targetId) {
            return res.status(400).json({
                success: false,
                message: "A valid User Id is required"
            });
        }

        const userResult = await client.query(
            `SELECT id, email, first_name, last_name, is_active
             FROM users
             WHERE id = $1`,
            [targetId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
            return res.status(400).json({
                success: false,
                message: "This account is disabled. Re-enable it before resetting the password."
            });
        }

        const ttlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 30;

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashResetToken(rawToken);

        await client.query("BEGIN");

        await client.query(
            `UPDATE password_resets
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
               AND used_at IS NULL`,
            [targetId]
        );

        await client.query(
            `INSERT INTO password_resets (user_id, token_hash, expires_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 || ' minutes')::interval)`,
            [targetId, tokenHash, String(ttlMinutes)]
        );

        await client.query("COMMIT");

        const appUrl = (process.env.APP_URL || "http://localhost:5173")
            .replace(/\/+$/, "");

        return res.status(200).json({
            success: true,
            message: "Reset link generated. Share it with the user directly.",
            data: {
                user_id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name || ""}`.trim(),
                reset_token: rawToken,
                reset_url: `${appUrl}/reset-password?token=${rawToken}`,
                expires_in_minutes: ttlMinutes
            }
        });

    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            // connection already unusable
        }

        console.error("ADMIN RESET LINK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    } finally {

        client.release();

    }

};

// ======================================================
// RESET PASSWORD
//
// The supplied token is hashed and matched against password_resets. The row
// must be unused and unexpired. On success the password is rehashed with the
// existing bcrypt approach and the token is consumed (single use).
// ======================================================

exports.resetPassword = async (req, res) => {

    const client = await pool.connect();

    try {

        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Token and new password are required"
            });
        }

        const passwordError = validatePassword(newPassword);

        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError
            });
        }

        if (typeof token !== "string") {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired"
            });
        }

        const tokenHash = hashResetToken(String(token).trim());

        const resetResult = await client.query(
            `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
             FROM password_resets pr
             INNER JOIN users u
                ON u.id = pr.user_id
             WHERE pr.token_hash = $1
               AND u.is_active = true`,
            [tokenHash]
        );

        if (resetResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired"
            });
        }

        const resetRow = resetResult.rows[0];

        if (resetRow.used_at !== null) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired"
            });
        }

        if (new Date(resetRow.expires_at).getTime() < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired"
            });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        await client.query("BEGIN");

        // Stamping password_changed_at invalidates every JWT issued before
        // the reset, so a stolen token cannot outlive the password it was
        // obtained with.
        await client.query(
            `UPDATE users
             SET password = $1,
                 password_changed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [hash, resetRow.user_id]
        );

        // Consume this token and any other outstanding one for the user.
        await client.query(
            `UPDATE password_resets
             SET used_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
               AND used_at IS NULL`,
            [resetRow.user_id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Password has been reset. You can now log in."
        });

    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            // connection already unusable
        }

        console.error("RESET PASSWORD ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    } finally {

        client.release();

    }

};
