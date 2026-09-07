const { Pool, types } = require("pg");
require("dotenv").config();

// ======================================================
// DATE COLUMNS ARE RETURNED AS PLAIN STRINGS
//
// The A-Z test report (BUG-013) found every date in the CRM displaying one
// day early - a meeting stored as 2026-10-15 rendered as
// "2026-10-14T18:30:00.000Z".
//
// Root cause: node-postgres parses a DATE column (OID 1082) into a JS Date
// at LOCAL midnight. JSON.stringify then serialises that through
// toISOString(), which converts to UTC and rolls the calendar day back by
// the local offset (IST is +05:30, so local midnight becomes 18:30 the
// previous day).
//
// meeting_date, next_meeting_date, start_date and due_date are all date-only
// values with no time component, so the safest fix is to stop converting
// them at all: return the raw 'YYYY-MM-DD' text Postgres already sends. No
// timezone maths, so the day cannot shift no matter where the server or the
// browser is.
//
// Deliberately scoped to OID 1082 (date) only. TIMESTAMP columns
// (created_at, submitted_at, last_login, ...) genuinely carry a time and are
// left exactly as they were.
// ======================================================

types.setTypeParser(1082, (value) => value);

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
