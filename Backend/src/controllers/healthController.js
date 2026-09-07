const pool = require("../database/connection");

const { successResponse, errorResponse } = require("../utils/response");

// ======================================================
// HEALTH CHECK
//
// This used to be a synchronous function that returned a hardcoded
// "database": "Connected" without ever touching the pool, so it would have
// reported a healthy database during a total outage (report BUG-021) and was
// useless for monitoring or a load-balancer probe.
//
// It now runs a real (trivial) query and reports what actually happened,
// returning 503 when the database cannot be reached so an orchestrator can
// act on it. The error message is logged server-side only.
// ======================================================

const healthCheck = async (req, res) => {

    try {

        await pool.query("SELECT 1");

        return successResponse(res, "Server is running", {
            server: "Running",
            database: "Connected",
            timestamp: new Date()
        });

    } catch (error) {

        console.error("HEALTH CHECK - database unreachable:", error.message);

        return errorResponse(res, "Database Unavailable", 503);

    }

};

module.exports = {
    healthCheck,
};
