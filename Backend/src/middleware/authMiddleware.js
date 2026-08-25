const jwt = require("jsonwebtoken");

// ======================================================
// TOKEN VERIFICATION
//
// Every failure path returns 401 with a generic message. Internal JWT
// errors (TokenExpiredError / JsonWebTokenError / malformed signature) are
// never forwarded to the client, and are never thrown out of this middleware
// where Express would turn them into a 500.
// ======================================================

const authMiddleware = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access Token Required"
            });
        }

        const [scheme, token] = authHeader.split(" ");

        if (!token || scheme !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        // Distinguish only expiry, so the frontend can tell the user to log
        // in again. No internal error detail is included.
        const message =
            error.name === "TokenExpiredError"
                ? "Session Expired"
                : "Unauthorized";

        return res.status(401).json({
            success: false,
            message
        });

    }

};

module.exports = authMiddleware;
