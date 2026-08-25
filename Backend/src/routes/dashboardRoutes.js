const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/verifyToken");

const { getDashboard } = require("../controllers/dashboardController");

// Single endpoint - the controller returns the payload appropriate to the
// caller's role and scopes every count to their company.
router.get("/", verifyToken, getDashboard);

module.exports = router;
