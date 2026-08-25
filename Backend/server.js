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
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
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

const startServer = async () => {
    try {

        validateEnv();

        // Actual Database Connection Test
        await pool.query("SELECT 1");

        console.log("✅ PostgreSQL Connected Successfully");

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
