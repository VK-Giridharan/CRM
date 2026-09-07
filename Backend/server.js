require("dotenv").config();

const app = require("./src/app");
const pool = require("./src/database/connection");

const PORT = process.env.PORT || 5000;

// ======================================================
// ENVIRONMENT VALIDATION
//
// Fail fast at boot rather than at request time. Without this, a missing
// JWT_SECRET makes jwt.sign throw on every login and jwt.verify reject every
// token, which is very hard to diagnose from the symptoms.
//
// Values are never printed - only the names of missing/weak variables.
// ======================================================

const REQUIRED_ENV = [
    // "DB_HOST",
    // "DB_PORT",
    // "DB_USER",
    // "DB_PASSWORD",
    // "DB_NAME",
    // "JWT_SECRET"
    "DATABASE_URL",
    "JWT_SECRET"
];

const validateEnv = () => {

    const missing = REQUIRED_ENV.filter(
        (key) => !process.env[key] || String(process.env[key]).trim() === ""
    );

    if (missing.length > 0) {
        console.error(
            "❌ Missing required environment variables:",
            missing.join(", ")
        );
        console.error("   Copy .env.example to .env and fill in the values.");
        process.exit(1);
    }

    if (process.env.JWT_SECRET.length < 32) {
        console.error(
            "❌ JWT_SECRET is too weak (minimum 32 characters)."
        );
        console.error(
            '   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
        );
        process.exit(1);
    }

};

// ======================================================
// SCHEMA VALIDATION
//
// The whole Task Report module returned HTTP 500 on every call in production
// because migration 001 had never been applied - and nothing said so. The
// failure only showed up as "column does not exist" buried in a log.
//
// This checks, at boot, that the tables and columns the code depends on
// actually exist, and refuses to start with a message naming the migration
// to run. Same fail-fast philosophy as validateEnv above.
// ======================================================

const REQUIRED_SCHEMA = [
    {
        table: "password_resets",
        columns: ["id", "user_id", "token_hash", "expires_at", "used_at"],
        migration: "001_password_reset_and_report_attachments.sql"
    },
    {
        table: "task_reports",
        columns: [
            "attachment_path",
            "attachment_original_name",
            "attachment_mime",
            "attachment_size"
        ],
        migration: "001_password_reset_and_report_attachments.sql"
    },
    {
        table: "leads",
        columns: ["requirement"],
        migration: "002_lead_requirement_and_password_changed_at.sql"
    },
    {
        table: "users",
        columns: ["password_changed_at"],
        migration: "002_lead_requirement_and_password_changed_at.sql"
    }
];

const validateSchema = async () => {

    const problems = [];

    for (const spec of REQUIRED_SCHEMA) {

        const result = await pool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = $1`,
            [spec.table]
        );

        if (result.rows.length === 0) {
            problems.push(
                `  - table "${spec.table}" is missing   -> run ${spec.migration}`
            );
            continue;
        }

        const present = new Set(result.rows.map((r) => r.column_name));

        const missing = spec.columns.filter((c) => !present.has(c));

        if (missing.length > 0) {
            problems.push(
                `  - ${spec.table}.${missing.join(", ")} missing   -> run ${spec.migration}`
            );
        }

    }

    if (problems.length > 0) {

        console.error("❌ Database schema is out of date:");
        console.error(problems.join("\n"));
        console.error(
            "\n   Apply the migration(s) in Backend/src/database/migrations/ " +
            "and start again."
        );

        process.exit(1);

    }

};

const startServer = async () => {
    try {

        validateEnv();

        // Actual Database Connection Test
        await pool.query("SELECT 1");

        console.log("✅ PostgreSQL Connected Successfully");

        await validateSchema();

        console.log("✅ Database Schema Verified");

        app.listen(PORT, () => {
            console.log(`🚀 Server Running on Port ${PORT}`);
        });

    } catch (error) {

        console.error("❌ PostgreSQL Connection Failed");
        console.error(error.message);

        process.exit(1);

    }
};

startServer();
