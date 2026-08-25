const { getAuthContext } = require("../utils/authContext");

// ======================================================
// ROLE GUARD
//
// Usage: router.post("/create", verifyToken, requireRole(ROLES.ADMIN), handler)
//
// Must run AFTER a token middleware. Loads the caller's current row and
// attaches it to req.authUser so downstream controllers can scope queries by
// company without repeating the lookup.
// ======================================================

const requireRole = (...allowedRoles) => {

    return async (req, res, next) => {

        try {

            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            const authUser = await getAuthContext(req.user.id);

            if (!authUser) {
                return res.status(404).json({
                    success: false,
                    message: "User Not Found"
                });
            }

            if (!authUser.is_active) {
                return res.status(403).json({
                    success: false,
                    message: "Account Disabled"
                });
            }

            if (!allowedRoles.includes(authUser.role)) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to perform this action"
                });
            }

            req.authUser = authUser;

            next();

        } catch (error) {

            next(error);

        }

    };

};

module.exports = requireRole;
