const crypto = require("crypto");

const pool = require("../database/connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { getAuthContext } = require("../utils/authContext");
const { ROLES } = require("../utils/status");

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

        if (!first_name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All required fields are mandatory"
            });
        }

        if (!EMAIL_PATTERN.test(String(email).trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        if (String(password).length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
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
            // Same message as "user not found" so login cannot be used to
            // discover which emails/phones are registered.
            return res.status(401).json({
                success: false,
                message: "Invalid Credentials"
            });
        }

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

        const currentUser = await getAuthContext(req.user.id);

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const targetResult = await pool.query(
            `SELECT id, role, company_id FROM users WHERE id = $1`,
            [user_id]
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

            const companyCheck = await pool.query(
                `SELECT id FROM companies WHERE id = $1`,
                [company_id]
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
                [role, company_id, user_id]
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
                [role, currentUser.company_id, user_id]
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

        if (!first_name || !String(first_name).trim()) {
            return res.status(400).json({
                success: false,
                message: "First name is required"
            });
        }

        if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        if (!phone || !String(phone).trim()) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
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

        if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`
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

        await pool.query(
            "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
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

        // Never leak the token or the failure reason.
        console.error("FORGOT PASSWORD ERROR:", error.message);

        return res.status(200).json(genericResponse);

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

        if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
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

        await client.query(
            `UPDATE users
             SET password = $1, updated_at = NOW()
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
