const path = require("path");
const fs = require("fs");

const pool = require("../database/connection");
const { getAuthContext } = require("../utils/authContext");
const { removeUploadedFile, UPLOAD_DIR } = require("../middleware/uploadMiddleware");

const {
    SPLIT_TASK_STATUS,
    SUBMITTABLE_SPLIT_STATUSES,
    REPORT_STATUS,
    ROLES,
    WORKER_ROLES
} = require("../utils/status");

// ======================================================
// COMPANY SCOPING
//
// tasks has no company_id, so every report-side query resolves the tenant
// through the real relationship chain:
//
//   task_reports -> split_tasks -> task_assignments -> tasks
//                -> customers.company_id
//
// company_id is always derived from the authenticated user's row - it is
// never read from the request body.
// ======================================================

const SPLIT_TASK_COMPANY_JOIN = `
    INNER JOIN task_assignments ta
        ON ta.id = st.parent_assignment_id
    INNER JOIN tasks t
        ON t.id = ta.task_id
    INNER JOIN customers c
        ON c.id = t.customer_id
`;

// Resolves the owning company of a split task. Returns null when the split
// task does not exist.
const getSplitTaskCompanyId = async (splitTaskId) => {

    const result = await pool.query(
        `SELECT c.company_id
         FROM split_tasks st
         ${SPLIT_TASK_COMPANY_JOIN}
         WHERE st.id = $1`,
        [splitTaskId]
    );

    return result.rows.length > 0 ? result.rows[0].company_id : null;

};

// ======================================================
// SUBMIT / RESUBMIT TASK REPORT
// Employee or Intern, own assigned split task only
// Optional single file attachment
// ======================================================

exports.submitTaskReport = async (req, res) => {

    try {

        const { split_task_id, report } = req.body;

        const user_id = req.user.id;

        // --------------------------------------------------
        // 1. VALIDATION
        // --------------------------------------------------

        if (!split_task_id || !report || !String(report).trim()) {

            removeUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "Split Task ID and Report are required"
            });

        }

        const splitTaskId = Number(split_task_id);

        if (!Number.isInteger(splitTaskId) || splitTaskId <= 0) {

            removeUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "Invalid Split Task ID"
            });

        }

        const reportText = String(report).trim();

        if (reportText.length < 10) {

            removeUploadedFile(req.file);

            return res.status(400).json({
                success: false,
                message: "Report must be at least 10 characters"
            });

        }

        // --------------------------------------------------
        // 2. CHECK USER
        // --------------------------------------------------

        const authUser = await getAuthContext(user_id);

        if (!authUser) {

            removeUploadedFile(req.file);

            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });

        }

        // --------------------------------------------------
        // 3. EMPLOYEE / INTERN ONLY
        // --------------------------------------------------

        if (!WORKER_ROLES.includes(authUser.role)) {

            removeUploadedFile(req.file);

            return res.status(403).json({
                success: false,
                message: "Only Employee or Intern can submit task report"
            });

        }

        // --------------------------------------------------
        // 4. GET SPLIT TASK (with its owning company)
        // --------------------------------------------------

        const splitTaskResult = await pool.query(
            `SELECT
                st.id,
                st.parent_assignment_id,
                st.employee_id,
                st.status,
                c.company_id
             FROM split_tasks st
             ${SPLIT_TASK_COMPANY_JOIN}
             WHERE st.id = $1`,
            [splitTaskId]
        );

        if (splitTaskResult.rows.length === 0) {

            removeUploadedFile(req.file);

            return res.status(404).json({
                success: false,
                message: "Split Task Not Found"
            });

        }

        const splitTask = splitTaskResult.rows[0];

        // --------------------------------------------------
        // 5. OWNERSHIP + COMPANY ISOLATION
        // --------------------------------------------------

        if (Number(splitTask.employee_id) !== Number(user_id)) {

            removeUploadedFile(req.file);

            return res.status(403).json({
                success: false,
                message: "You can report only your assigned tasks"
            });

        }

        if (Number(splitTask.company_id) !== Number(authUser.company_id)) {

            removeUploadedFile(req.file);

            return res.status(403).json({
                success: false,
                message: "You can report only your company tasks"
            });

        }

        // --------------------------------------------------
        // 6. STATUS GATE
        //
        // Also blocks duplicate submissions: after a successful submit the
        // split task moves to "Submitted", which is not submittable, so a
        // second submit is rejected until the Team Lead sends it back.
        // --------------------------------------------------

        if (!SUBMITTABLE_SPLIT_STATUSES.includes(splitTask.status)) {

            removeUploadedFile(req.file);

            const alreadySubmitted =
                splitTask.status === SPLIT_TASK_STATUS.SUBMITTED;

            return res.status(400).json({
                success: false,
                message: alreadySubmitted
                    ? "A report has already been submitted and is awaiting review"
                    : "Task must be In Progress or Rework before submitting a report"
            });

        }

        // --------------------------------------------------
        // 7. INSERT REPORT + MOVE SPLIT TASK (transactional)
        // --------------------------------------------------

        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            const reportResult = await client.query(
                `INSERT INTO task_reports
                (
                    split_task_id,
                    task_assignment_id,
                    submitted_by,
                    report,
                    review_status,
                    submitted_at,
                    attachment_path,
                    attachment_original_name,
                    attachment_mime,
                    attachment_size
                )
                VALUES
                (
                    $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9
                )
                RETURNING
                    id,
                    split_task_id,
                    report,
                    review_status,
                    submitted_at,
                    attachment_original_name`,
                [
                    splitTaskId,
                    splitTask.parent_assignment_id,
                    user_id,
                    reportText,
                    REPORT_STATUS.SUBMITTED,
                    req.file ? req.file.filename : null,
                    req.file ? req.file.originalname : null,
                    req.file ? req.file.mimetype : null,
                    req.file ? req.file.size : null
                ]
            );

            await client.query(
                `UPDATE split_tasks
                 SET status = $1
                 WHERE id = $2`,
                [SPLIT_TASK_STATUS.SUBMITTED, splitTaskId]
            );

            await client.query("COMMIT");

            return res.status(201).json({
                success: true,
                message: "Task Report Submitted Successfully",
                data: reportResult.rows[0]
            });

        } catch (error) {

            await client.query("ROLLBACK");
            removeUploadedFile(req.file);
            throw error;

        } finally {

            client.release();

        }

    } catch (error) {

        console.log("SUBMIT TASK REPORT ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// TEAM LEAD REPORT LIST
// Reports submitted under this Team Lead's own assignments
// ======================================================

exports.teamLeadReportList = async (req, res) => {

    try {

        const team_lead_id = req.user.id;

        const authUser = await getAuthContext(team_lead_id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.TEAM_LEAD) {
            return res.status(403).json({
                success: false,
                message: "Only Team Lead can view reports"
            });
        }

        const result = await pool.query(
            `SELECT
                tr.id,
                tr.split_task_id,
                tr.task_assignment_id,
                tr.submitted_by,
                tr.report,
                tr.review_status,
                tr.review_remarks,
                tr.reviewed_by,
                tr.submitted_at,
                tr.reviewed_at,
                tr.attachment_original_name,
                (tr.attachment_path IS NOT NULL) AS has_attachment,

                st.title       AS split_task_title,
                st.description AS split_task_description,
                st.status      AS split_task_status,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS employee_name,
                u.role AS employee_role,

                ta.task_id,
                t.title AS parent_task_title

             FROM task_reports tr

             INNER JOIN split_tasks st
                ON st.id = tr.split_task_id

             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id

             INNER JOIN tasks t
                ON t.id = ta.task_id

             INNER JOIN customers c
                ON c.id = t.customer_id

             LEFT JOIN users u
                ON u.id = tr.submitted_by

             WHERE ta.team_lead_id = $1
               AND c.company_id    = $2
               AND t.deleted_at IS NULL

             ORDER BY tr.id DESC`,
            [team_lead_id, authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("TEAM LEAD REPORT LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// TEAM LEAD - SINGLE REPORT DETAILS
// ======================================================

exports.getTaskReportDetails = async (req, res) => {

    try {

        const report_id = Number(req.params.id);

        if (!Number.isInteger(report_id) || report_id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Report ID"
            });
        }

        const team_lead_id = req.user.id;

        const authUser = await getAuthContext(team_lead_id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.TEAM_LEAD) {
            return res.status(403).json({
                success: false,
                message: "Only Team Lead can view report details"
            });
        }

        const result = await pool.query(
            `SELECT
                tr.id,
                tr.split_task_id,
                tr.task_assignment_id,
                tr.submitted_by,
                tr.report,
                tr.review_status,
                tr.review_remarks,
                tr.reviewed_by,
                tr.submitted_at,
                tr.reviewed_at,
                tr.attachment_original_name,
                (tr.attachment_path IS NOT NULL) AS has_attachment,

                st.title       AS split_task_title,
                st.description AS split_task_description,
                st.status      AS split_task_status,
                st.employee_id,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS employee_name,
                u.role AS employee_role,

                ta.task_id,
                ta.team_lead_id,

                t.title       AS parent_task_title,
                t.description AS parent_task_description

             FROM task_reports tr

             INNER JOIN split_tasks st
                ON st.id = tr.split_task_id

             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id

             INNER JOIN tasks t
                ON t.id = ta.task_id

             INNER JOIN customers c
                ON c.id = t.customer_id

             LEFT JOIN users u
                ON u.id = tr.submitted_by

             WHERE tr.id            = $1
               AND ta.team_lead_id  = $2
               AND c.company_id     = $3`,
            [report_id, team_lead_id, authUser.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Report Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.log("TASK REPORT DETAILS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// TEAM LEAD - REVIEW REPORT (Approve / Rework)
// ======================================================

exports.reviewTaskReport = async (req, res) => {

    const client = await pool.connect();

    try {

        const report_id = Number(req.params.id);

        const { action, review_remarks } = req.body;

        const team_lead_id = req.user.id;

        if (!Number.isInteger(report_id) || report_id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Report ID"
            });
        }

        if (!["Approve", "Rework"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be Approve or Rework"
            });
        }

        if (action === "Rework" && !review_remarks?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Rework remark is required"
            });
        }

        const authUser = await getAuthContext(team_lead_id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.TEAM_LEAD) {
            return res.status(403).json({
                success: false,
                message: "Only Team Lead can review reports"
            });
        }

        // --------------------------------------------------
        // Load report with ownership + company scope enforced
        // --------------------------------------------------

        const reportResult = await client.query(
            `SELECT
                tr.id,
                tr.split_task_id,
                tr.review_status,
                st.parent_assignment_id,
                ta.team_lead_id,
                c.company_id
             FROM task_reports tr
             INNER JOIN split_tasks st
                ON st.id = tr.split_task_id
             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id
             INNER JOIN tasks t
                ON t.id = ta.task_id
             INNER JOIN customers c
                ON c.id = t.customer_id
             WHERE tr.id = $1`,
            [report_id]
        );

        if (reportResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Report Not Found"
            });
        }

        const report = reportResult.rows[0];

        if (Number(report.team_lead_id) !== Number(team_lead_id) ||
            Number(report.company_id) !== Number(authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can review only your team reports"
            });

        }

        if (report.review_status !== REPORT_STATUS.SUBMITTED) {
            return res.status(400).json({
                success: false,
                message: "This report has already been reviewed"
            });
        }

        // --------------------------------------------------
        // Apply review - report row and split task move together
        // --------------------------------------------------

        await client.query("BEGIN");

        if (action === "Approve") {

            await client.query(
                `UPDATE task_reports
                 SET review_status  = $1,
                     review_remarks = NULL,
                     reviewed_by    = $2,
                     reviewed_at    = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [REPORT_STATUS.APPROVED, team_lead_id, report_id]
            );

            await client.query(
                `UPDATE split_tasks
                 SET status       = $1,
                     completed_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [SPLIT_TASK_STATUS.COMPLETED, report.split_task_id]
            );

            await client.query("COMMIT");

            return res.status(200).json({
                success: true,
                message: "Report Approved and Task Completed"
            });

        }

        await client.query(
            `UPDATE task_reports
             SET review_status  = $1,
                 review_remarks = $2,
                 reviewed_by    = $3,
                 reviewed_at    = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
                REPORT_STATUS.REWORK,
                review_remarks.trim(),
                team_lead_id,
                report_id
            ]
        );

        await client.query(
            `UPDATE split_tasks
             SET status       = $1,
                 completed_at = NULL
             WHERE id = $2`,
            [SPLIT_TASK_STATUS.REWORK, report.split_task_id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Report Sent Back for Rework"
        });

    } catch (error) {

        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            // connection already unusable - nothing further to do
        }

        console.log("REVIEW TASK REPORT ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    } finally {

        client.release();

    }

};

// ======================================================
// MY REPORTS
// Any worker - reports they personally submitted
// ======================================================

exports.myTaskReports = async (req, res) => {

    try {

        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT
                tr.id,
                tr.split_task_id,
                tr.report,
                tr.review_status,
                tr.review_remarks,
                tr.submitted_at,
                tr.reviewed_at,
                tr.attachment_original_name,
                (tr.attachment_path IS NOT NULL) AS has_attachment,

                st.title  AS task_title,
                st.status AS task_status

             FROM task_reports tr
             INNER JOIN split_tasks st
                ON st.id = tr.split_task_id
             WHERE tr.submitted_by = $1
             ORDER BY tr.id DESC`,
            [user_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("MY TASK REPORTS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// EMPLOYEE / INTERN REPORT LIST
//
// One row per assigned split task, carrying the LATEST report for that task
// (or nulls when nothing has been submitted yet). DISTINCT ON prevents the
// duplicate rows the old LEFT JOIN produced once a task was reworked and
// resubmitted.
// ======================================================

exports.employeeReportList = async (req, res) => {

    try {

        const worker_id = req.user.id;

        const authUser = await getAuthContext(worker_id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (!WORKER_ROLES.includes(authUser.role)) {
            return res.status(403).json({
                success: false,
                message: "Only Employee or Intern can view these reports"
            });
        }

        const result = await pool.query(
            `SELECT DISTINCT ON (st.id)

                st.id          AS split_task_id,
                st.title       AS split_task_title,
                st.description AS split_task_description,
                st.status      AS task_status,
                st.parent_assignment_id,
                st.created_at  AS task_created_at,
                st.completed_at,

                t.id    AS parent_task_id,
                t.title AS parent_task_title,

                tr.id             AS report_id,
                tr.report,
                tr.review_status,
                tr.review_remarks,
                tr.submitted_at,
                tr.reviewed_at,
                tr.attachment_original_name,
                (tr.attachment_path IS NOT NULL) AS has_attachment

             FROM split_tasks st

             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id

             INNER JOIN tasks t
                ON t.id = ta.task_id

             INNER JOIN customers c
                ON c.id = t.customer_id

             LEFT JOIN task_reports tr
                ON tr.split_task_id = st.id

             WHERE st.employee_id = $1
               AND c.company_id   = $2

             ORDER BY st.id DESC, tr.id DESC`,
            [worker_id, authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("EMPLOYEE REPORT LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// EMPLOYEE / INTERN REPORT DETAILS
//
// Filters on task_reports.submitted_by. The previous implementation queried
// tr.employee_id, which does not exist on task_reports - the endpoint always
// failed with a Postgres "column does not exist" error.
// ======================================================

exports.employeeReportDetails = async (req, res) => {

    try {

        const worker_id = req.user.id;

        const report_id = Number(req.params.id);

        if (!Number.isInteger(report_id) || report_id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Report ID"
            });
        }

        const authUser = await getAuthContext(worker_id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (!WORKER_ROLES.includes(authUser.role)) {
            return res.status(403).json({
                success: false,
                message: "Only Employee or Intern can view report details"
            });
        }

        const result = await pool.query(
            `SELECT
                tr.id,
                tr.split_task_id,
                tr.submitted_by,
                tr.report,
                tr.review_status,
                tr.review_remarks,
                tr.submitted_at,
                tr.reviewed_at,
                tr.attachment_original_name,
                (tr.attachment_path IS NOT NULL) AS has_attachment,

                st.title       AS split_task_title,
                st.description AS split_task_description,
                st.status      AS task_status,

                t.id    AS parent_task_id,
                t.title AS parent_task_title,

                ta.team_lead_id,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS team_lead_name

             FROM task_reports tr

             INNER JOIN split_tasks st
                ON st.id = tr.split_task_id

             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id

             INNER JOIN tasks t
                ON t.id = ta.task_id

             INNER JOIN customers c
                ON c.id = t.customer_id

             LEFT JOIN users u
                ON u.id = ta.team_lead_id

             WHERE tr.id           = $1
               AND tr.submitted_by = $2
               AND c.company_id    = $3`,
            [report_id, worker_id, authUser.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Report Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.log("EMPLOYEE REPORT DETAILS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// DOWNLOAD REPORT ATTACHMENT
//
// Allowed for: the worker who submitted it, the Team Lead who owns the
// parent assignment, and a Manager of the same company. Everyone else 404s.
// The stored filename is basename-ed before use so a tampered database value
// still cannot escape the uploads directory.
// ======================================================

exports.downloadReportAttachment = async (req, res) => {

    try {

        const report_id = Number(req.params.id);

        if (!Number.isInteger(report_id) || report_id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Report ID"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const result = await pool.query(
            `SELECT
                tr.attachment_path,
                tr.attachment_original_name,
                tr.attachment_mime,
                tr.submitted_by,
                ta.team_lead_id,
                c.company_id
             FROM task_reports tr
             INNER JOIN split_tasks st
                ON st.id = tr.split_task_id
             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id
             INNER JOIN tasks t
                ON t.id = ta.task_id
             INNER JOIN customers c
                ON c.id = t.customer_id
             WHERE tr.id = $1`,
            [report_id]
        );

        if (result.rows.length === 0 || !result.rows[0].attachment_path) {
            return res.status(404).json({
                success: false,
                message: "Attachment Not Found"
            });
        }

        const row = result.rows[0];

        const sameCompany =
            Number(row.company_id) === Number(authUser.company_id);

        const isSubmitter =
            Number(row.submitted_by) === Number(authUser.id);

        const isOwningTeamLead =
            authUser.role === ROLES.TEAM_LEAD &&
            Number(row.team_lead_id) === Number(authUser.id);

        const isCompanyManager =
            authUser.role === ROLES.MANAGER && sameCompany;

        if (!(isSubmitter || isOwningTeamLead || isCompanyManager) || !sameCompany) {
            return res.status(404).json({
                success: false,
                message: "Attachment Not Found"
            });
        }

        const safeName = path.basename(row.attachment_path);
        const absolutePath = path.join(UPLOAD_DIR, safeName);

        if (!absolutePath.startsWith(UPLOAD_DIR) || !fs.existsSync(absolutePath)) {
            return res.status(404).json({
                success: false,
                message: "Attachment Not Found"
            });
        }

        // Force download rather than inline rendering so a stored file can
        // never execute in the browser origin.
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(
                row.attachment_original_name || safeName
            )}"`
        );

        return res.sendFile(absolutePath);

    } catch (error) {

        console.log("DOWNLOAD ATTACHMENT ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
