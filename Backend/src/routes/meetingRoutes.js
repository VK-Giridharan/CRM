const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const { ROLES } = require("../utils/status");

const {
    createMeeting,
    getMeetingList,
    getMeetingDetails,
    updateMeeting,
    deleteMeeting,
    completeMeeting
} = require("../controllers/meetingController");

// ======================================================
// Meetings hang off leads and are Manager-owned. Each controller scopes by
// the company_id read from the authenticated user's row.
// ======================================================

const managerOnly = requireRole(ROLES.MANAGER);

router.post("/create", authMiddleware, managerOnly, createMeeting);

router.post("/list", authMiddleware, managerOnly, getMeetingList);

router.post("/details", authMiddleware, managerOnly, getMeetingDetails);

router.post("/update", authMiddleware, managerOnly, updateMeeting);

router.post("/delete", authMiddleware, managerOnly, deleteMeeting);

router.post("/complete", authMiddleware, managerOnly, completeMeeting);

module.exports = router;
