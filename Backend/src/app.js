const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const customerRoutes = require("./routes/customerRoutes");
const taskRoutes = require("./routes/taskRoutes");
const leadRoutes = require("./routes/leadRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const taskReportRoutes = require("./routes/taskReportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const notFound = require("./middleware/notFoundMiddleware");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();

// ======================================================
// CORS
//
// Restricted to the origins listed in CORS_ORIGIN when it is set. Falls back
// to the previous permissive behaviour when it is not, so an existing dev
// setup on a different port keeps working.
// ======================================================

const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors(
        allowedOrigins.length > 0
            ? {
                origin: (origin, callback) => {
                    // Requests with no Origin header (curl, Postman,
                    // server-to-server) are allowed through.
                    if (!origin || allowedOrigins.includes(origin)) {
                        return callback(null, true);
                    }
                    return callback(null, false);
                }
            }
            : undefined
    )
);

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Enterprise CRM Backend Running..."
  });
});

// API Routes
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/company", companyRoutes);
app.use("/api/v1/customer", customerRoutes);
app.use("/api/v1/task", taskRoutes);
app.use("/api/v1/lead", leadRoutes);
app.use("/api/v1/meeting", meetingRoutes);
app.use("/api/v1/task-report", taskReportRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);

// NOTE: the uploads directory is deliberately NOT served as static files.
// Report attachments are delivered through
// GET /api/v1/task-report/:id/attachment, which checks the caller's identity
// and company before streaming the file.

// 404 Middleware (Always Last)
app.use(notFound);

// Error Middleware (Always Last)
app.use(errorHandler);

module.exports = app;
