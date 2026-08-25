const pool = require("../database/connection");

// ======================================================
// AUTH CONTEXT
//
// Re-fetches the caller's role / company_id from the users table on every
// request rather than trusting the JWT payload, so a role or company change
// takes effect without requiring re-login. This preserves the re-fetch
// pattern the existing controllers already use.
// ======================================================

const getAuthContext = async (userId) => {

    const result = await pool.query(
        `SELECT id, role, company_id, is_active
         FROM users
         WHERE id = $1`,
        [userId]
    );

    return result.rows[0] || null;

};

module.exports = { getAuthContext };
