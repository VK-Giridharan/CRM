const express = require("express");

const router = express.Router();

const {
    submitTaskReport,
    teamLeadReportList,
    getTaskReportDetails,
    reviewTaskReport,
    myTaskReports,
    employeeReportList,
    employeeReportDetails,
    downloadReportAttachment
} = require("../controllers/taskReportController");

const verifyToken = require("../middleware/verifyToken");
const { uploadSingle } = require("../middleware/uploadMiddleware");

// ======================================================
// ROUTE ORDER MATTERS
//
// Express matches top-down, so every literal path must be registered
// BEFORE the "/:id" wildcard. Previously "/:id" sat above "/employee-list",
// which made GET /task-report/employee-list resolve to the details handler
// with report_id = "employee-list" and fail with a Postgres cast error.
//
// Keep all literal routes in this first block.
// ======================================================

// Employee / Intern - submit or resubmit a report.
// Accepts JSON, or multipart/form-data with an optional "attachment" file.
router.post(
    "/submit",
    verifyToken,
    uploadSingle("attachment"),
    submitTaskReport
);

// Team Lead - reports awaiting review
router.get(
    "/team-lead",
    verifyToken,
    teamLeadReportList
);

// Any worker - reports they submitted
router.get(
    "/my",
    verifyToken,
    myTaskReports
);

// Employee / Intern - their split tasks with latest report state
router.get(
    "/employee-list",
    verifyToken,
    employeeReportList
);

// Employee / Intern - single report detail
router.get(
    "/employee-details/:id",
    verifyToken,
    employeeReportDetails
);

// ======================================================
// WILDCARD ROUTES - must stay last
// ======================================================

router.get(
    "/:id/attachment",
    verifyToken,
    downloadReportAttachment
);

router.post(
    "/:id/review",
    verifyToken,
    reviewTaskReport
);

router.get(
    "/:id",
    verifyToken,
    getTaskReportDetails
);

module.exports = router;
