const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const { ROLES } = require("../utils/status");

const {
    createCompany,
    companyList,
    companyDetails,
    updateCompany,
    deleteCompany
} = require("../controllers/companyController");

// ======================================================
// Company management is ADMIN ONLY.
//
// requireRole re-reads the caller's role from the users table, so a stale
// JWT minted before a demotion cannot be used to keep Admin powers.
// Manager / Team Lead / Employee / Intern all receive 403 here regardless of
// what the frontend shows them.
// ======================================================

router.post(
    "/create",
    authMiddleware,
    requireRole(ROLES.ADMIN),
    createCompany
);

router.post(
    "/update",
    authMiddleware,
    requireRole(ROLES.ADMIN),
    updateCompany
);

router.post(
    "/delete",
    authMiddleware,
    requireRole(ROLES.ADMIN),
    deleteCompany
);

// Read endpoints: Admin sees every company; a Manager may read only their
// own company record. Enforced inside the controller.
router.post(
    "/list",
    authMiddleware,
    requireRole(ROLES.ADMIN, ROLES.MANAGER),
    companyList
);

router.post(
    "/details",
    authMiddleware,
    requireRole(ROLES.ADMIN, ROLES.MANAGER),
    companyDetails
);

module.exports = router;
