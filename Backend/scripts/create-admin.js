#!/usr/bin/env node

// ======================================================
// FIRST ADMIN BOOTSTRAP
//
// The A-Z test report (BUG-030) found that a fresh install could never
// produce an Admin:
//
//   * register() always creates a user with role = NULL
//   * change-role requires the CALLER to already be an Admin or a Manager
//
// so with an empty users table nobody can ever be promoted, and the
// application cannot be deployed without hand-writing SQL.
//
// This script is that missing step. It is deliberately a CLI tool and NOT an
// HTTP endpoint: creating an Admin requires shell access to the server, so
// there is no new public attack surface. Nothing about normal registration
// changes.
//
// USAGE (from Backend/):
//
//   npm run create-admin -- --email admin@example.com --password "Str0ngPass" \
//                           --first-name Admin --last-name User --phone 9999999999
//
// Behaviour:
//   * Refuses to run if an Admin already exists, unless --force is given.
//   * If the email already belongs to a user, that user is PROMOTED to Admin
//     (their password is left alone) rather than duplicated.
//   * Otherwise a new Admin is created with the supplied password.
//   * The password is hashed with bcrypt using the same cost as the app and
//     is never printed or logged.
// ======================================================

require("dotenv").config();

const bcrypt = require("bcrypt");

const pool = require("../src/database/connection");
const { ROLES } = require("../src/utils/status");

const {
    validateName,
    validateEmail,
    validatePhone,
    validatePassword,
    firstError
} = require("../src/utils/validation");

const BCRYPT_ROUNDS = 10;

// ------------------------------------------------------
// Minimal argument parser: --key value / --flag
// ------------------------------------------------------
const parseArgs = (argv) => {

    const args = {};

    for (let i = 0; i < argv.length; i += 1) {

        const token = argv[i];

        if (!token.startsWith("--")) continue;

        const key = token.slice(2);
        const next = argv[i + 1];

        if (next === undefined || next.startsWith("--")) {
            args[key] = true;
        } else {
            args[key] = next;
            i += 1;
        }

    }

    return args;

};

const usage = () => {
    console.log(`
Create the first Admin account.

  npm run create-admin -- --email <email> --password <password> \\
                          --first-name <name> [--last-name <name>] \\
                          --phone <10 digits> [--force]

Options:
  --email        required
  --password     required (min 8 chars, at least one letter and one number)
  --first-name   required
  --last-name    optional
  --phone        required, exactly 10 digits
  --force        create/promote even though an Admin already exists
`);
};

const main = async () => {

    const args = parseArgs(process.argv.slice(2));

    if (args.help || args.h) {
        usage();
        return 0;
    }

    const email = args.email;
    const password = args.password;
    const firstName = args["first-name"];
    const lastName = args["last-name"] || null;
    const phone = args.phone;

    if (!email || !password || !firstName || !phone) {
        console.error("Missing required argument.");
        usage();
        return 1;
    }

    const validationError = firstError([
        validateName(firstName, "First name"),
        validateName(lastName, "Last name", { required: false }),
        validateEmail(email),
        validatePhone(phone),
        validatePassword(password)
    ]);

    if (validationError) {
        console.error(`Invalid input: ${validationError}`);
        return 1;
    }

    const normalisedEmail = String(email).trim().toLowerCase();
    const normalisedPhone = String(phone).trim();

    // ----- refuse to run when an Admin already exists -----
    const existingAdmins = await pool.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE role = $1`,
        [ROLES.ADMIN]
    );

    if (existingAdmins.rows[0].count > 0 && !args.force) {
        console.error(
            `An Admin already exists (${existingAdmins.rows[0].count} found).\n` +
            "Re-run with --force only if you genuinely need another one."
        );
        return 1;
    }

    // ----- promote an existing user, or create a new one -----
    const existingUser = await pool.query(
        `SELECT id, role FROM users WHERE LOWER(email) = $1`,
        [normalisedEmail]
    );

    if (existingUser.rows.length > 0) {

        const user = existingUser.rows[0];

        if (user.role === ROLES.ADMIN) {
            console.log(`User ${normalisedEmail} is already an Admin (id ${user.id}). Nothing to do.`);
            return 0;
        }

        await pool.query(
            `UPDATE users
             SET role = $1,
                 company_id = NULL,
                 is_active = true,
                 updated_at = NOW()
             WHERE id = $2`,
            [ROLES.ADMIN, user.id]
        );

        console.log(
            `Promoted existing user ${normalisedEmail} (id ${user.id}) to Admin. ` +
            "Their existing password was left unchanged."
        );

        return 0;

    }

    const phoneClash = await pool.query(
        `SELECT id FROM users WHERE phone = $1`,
        [normalisedPhone]
    );

    if (phoneClash.rows.length > 0) {
        console.error(`Phone number ${normalisedPhone} is already registered to another user.`);
        return 1;
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const created = await pool.query(
        `INSERT INTO users
            (first_name, last_name, email, phone, password, role, company_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, true)
         RETURNING id, email, role`,
        [
            String(firstName).trim(),
            lastName ? String(lastName).trim() : null,
            normalisedEmail,
            normalisedPhone,
            hashed,
            ROLES.ADMIN
        ]
    );

    const admin = created.rows[0];

    console.log(`Admin created: id ${admin.id}, ${admin.email}`);
    console.log("You can now log in and create companies.");

    return 0;

};

main()
    .then(async (code) => {
        await pool.end();
        process.exit(code);
    })
    .catch(async (error) => {
        console.error("create-admin failed:", error.message);
        try { await pool.end(); } catch (e) { /* pool already closed */ }
        process.exit(1);
    });
