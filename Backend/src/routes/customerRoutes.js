const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");

const { ROLES } = require("../utils/status");

const {
    createCustomer,
    customerList,
    adminCustomerList,
    customerDetails,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customerController");

// ================= ADMIN ONLY =================
//
// Global cross-company customer list. requireRole re-reads the caller's role
// from the users table, so Manager / Team Lead / Employee / Intern receive a
// 403 here regardless of what the frontend renders or what the JWT claims.
//
// Registered before "/list" for readability only - the paths do not overlap.

router.post(
    "/admin-list",
    verifyToken,
    requireRole(ROLES.ADMIN),
    adminCustomerList
);

// ================= SHARED =================
// "/list" stays company-scoped and is used by the Manager page.

router.post("/create", verifyToken, createCustomer);

router.post("/list", verifyToken, customerList);

router.post("/details", verifyToken, customerDetails);

router.post("/update", verifyToken, updateCustomer);

router.post("/delete", verifyToken, deleteCustomer);

module.exports = router;
