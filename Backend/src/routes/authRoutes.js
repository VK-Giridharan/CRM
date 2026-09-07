const express = require("express");

const router = express.Router();

const {
    login,
    register,
    getProfile,
    getWorkers,
    changeRole,
    getPendingUsers,
    profile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    adminGenerateResetLink
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");

const { ROLES } = require("../utils/status");

const { loginRateLimit } = require("../middleware/rateLimitMiddleware");

// ================= PUBLIC =================

// loginRateLimit throttles repeated FAILED attempts per IP + identifier.
// A successful login clears the counter, so normal use is never affected.
router.post("/login", loginRateLimit, login);

router.post("/register", register);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

// ================= AUTHENTICATED =================

router.get("/me", authMiddleware, getProfile);

router.post("/workers", authMiddleware, getWorkers);

router.post("/change-role", authMiddleware, changeRole);

router.post("/pending-users", authMiddleware, getPendingUsers);

router.post("/profile", authMiddleware, profile);

router.post("/update-profile", authMiddleware, updateProfile);

router.post("/change-password", authMiddleware, changePassword);

// ================= ADMIN =================
//
// Delivery path for password resets. This project has no email service, so
// an Admin generates the single-use link and passes it to the user through a
// channel they already trust. requireRole re-reads the caller's role from the
// database, so only a real Admin can reach it.
router.post(
    "/admin-generate-reset-link",
    authMiddleware,
    requireRole(ROLES.ADMIN),
    adminGenerateResetLink
);

module.exports = router;
