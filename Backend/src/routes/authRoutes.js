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
    resetPassword
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// ================= PUBLIC =================

router.post("/login", login);

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

module.exports = router;
