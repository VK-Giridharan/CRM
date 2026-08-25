const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const { ROLES } = require("../utils/status");

const {
    createLead,
    getLeadList,
    getLeadDetails,
    updateLead,
    deleteLead,
    updateLeadStatus
} = require("../controllers/leadController");

// ======================================================
// Leads belong to the sales pipeline and are Manager-owned.
// Every controller already derives company_id from the authenticated user's
// row (never from the request body); requireRole stops non-Managers from
// reaching them at all.
// ======================================================

const managerOnly = requireRole(ROLES.MANAGER);

router.post("/create", authMiddleware, managerOnly, createLead);

router.post("/list", authMiddleware, managerOnly, getLeadList);

router.post("/details", authMiddleware, managerOnly, getLeadDetails);

router.post("/update", authMiddleware, managerOnly, updateLead);

router.post("/delete", authMiddleware, managerOnly, deleteLead);

router.post("/status", authMiddleware, managerOnly, updateLeadStatus);

module.exports = router;
