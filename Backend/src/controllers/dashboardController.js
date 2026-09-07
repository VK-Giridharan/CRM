const pool = require("../database/connection");
const { getAuthContext } = require("../utils/authContext");

const {
    SPLIT_TASK_STATUS,
    REPORT_STATUS,
    ROLES,
    WORKER_ROLES
} = require("../utils/status");

// ======================================================
// DASHBOARD
//
// Every figure below is a real COUNT against the live tables - nothing is
// fabricated or seeded.
//
// Scoping rules:
//   Admin      - global (it is the only global role)
//   Manager    - own company only
//   Team Lead  - own assignments inside own company
//   Employee   - own split tasks / own reports
//   Intern     - identical to Employee
//
// tasks has no company_id, so task-side counts resolve the tenant through
// tasks -> customers.company_id.
// ======================================================

const countOf = (result, key = "count") => Number(result.rows[0][key]) || 0;

// ------------------------------------------------------
// ADMIN
// ------------------------------------------------------

const adminDashboard = async () => {

    const companies = await pool.query(
        `SELECT
            COUNT(*)                                   AS total,
            COUNT(*) FILTER (WHERE status = true)      AS active,
            COUNT(*) FILTER (WHERE status = false)     AS inactive
         FROM companies`
    );

    const users = await pool.query(
        `SELECT
            COUNT(*)                                       AS total,
            COUNT(*) FILTER (WHERE role IS NULL)           AS pending,
            COUNT(*) FILTER (WHERE role = 'Admin')         AS admins,
            COUNT(*) FILTER (WHERE role = 'Manager')       AS managers,
            COUNT(*) FILTER (WHERE role = 'Team Lead')     AS team_leads,
            COUNT(*) FILTER (WHERE role = 'Employee')      AS employees,
            COUNT(*) FILTER (WHERE role = 'Intern')        AS interns,
            COUNT(*) FILTER (WHERE is_active = false)      AS disabled
         FROM users`
    );

    const customers = await pool.query(
        `SELECT COUNT(*) AS count FROM customers WHERE deleted_at IS NULL`
    );

    const tasks = await pool.query(
        `SELECT COUNT(*) AS count FROM tasks WHERE deleted_at IS NULL`
    );

    // Per-company breakdown so Admin has a genuine company overview.
    const perCompany = await pool.query(
        `SELECT
            co.id,
            co.company_name,
            co.company_code,
            co.status,
            (SELECT COUNT(*) FROM users u
              WHERE u.company_id = co.id)                        AS user_count,
            (SELECT COUNT(*) FROM customers c
              WHERE c.company_id = co.id
                AND c.deleted_at IS NULL)                        AS customer_count,
            (SELECT COUNT(*) FROM tasks t
               INNER JOIN customers c2 ON c2.id = t.customer_id
              WHERE c2.company_id = co.id
                AND t.deleted_at IS NULL)                        AS task_count
         FROM companies co
         ORDER BY co.id DESC`
    );

    const u = users.rows[0];
    const c = companies.rows[0];

    return {
        role: ROLES.ADMIN,
        cards: {
            total_companies: Number(c.total) || 0,
            active_companies: Number(c.active) || 0,
            inactive_companies: Number(c.inactive) || 0,
            total_users: Number(u.total) || 0,
            pending_users: Number(u.pending) || 0,
            total_customers: countOf(customers),
            total_tasks: countOf(tasks)
        },
        users_by_role: {
            Admin: Number(u.admins) || 0,
            Manager: Number(u.managers) || 0,
            "Team Lead": Number(u.team_leads) || 0,
            Employee: Number(u.employees) || 0,
            Intern: Number(u.interns) || 0,
            Unassigned: Number(u.pending) || 0
        },
        disabled_users: Number(u.disabled) || 0,
        companies: perCompany.rows
    };

};

// ------------------------------------------------------
// MANAGER
// ------------------------------------------------------

const managerDashboard = async (companyId) => {

    if (!companyId) {
        return {
            role: ROLES.MANAGER,
            cards: {},
            leads_by_status: {},
            tasks_by_status: {},
            team: {},
            message: "You are not assigned to a company yet"
        };
    }

    const customers = await pool.query(
        `SELECT COUNT(*) AS count
         FROM customers
         WHERE company_id = $1 AND deleted_at IS NULL`,
        [companyId]
    );

    const leads = await pool.query(
        `SELECT
            COUNT(*)                                                AS total,
            COUNT(*) FILTER (WHERE status = 'Pending')              AS pending,
            COUNT(*) FILTER (WHERE status = 'Meeting Scheduled')    AS meeting_scheduled,
            COUNT(*) FILTER (WHERE status = 'Future Business')      AS future_business,
            COUNT(*) FILTER (WHERE status = 'Converted')            AS converted,
            COUNT(*) FILTER (WHERE status = 'Closed')               AS closed
         FROM leads
         WHERE company_id = $1`,
        [companyId]
    );

    const meetings = await pool.query(
        `SELECT
            COUNT(*)                                            AS total,
            COUNT(*) FILTER (WHERE status = 'Scheduled')        AS scheduled,
            COUNT(*) FILTER (WHERE status = 'Completed')        AS completed,
            COUNT(*) FILTER (
                WHERE status = 'Scheduled'
                  AND meeting_date >= CURRENT_DATE
            )                                                   AS upcoming
         FROM meetings
         WHERE company_id = $1`,
        [companyId]
    );

    const tasks = await pool.query(
        `SELECT
            COUNT(*)                                            AS total,
            COUNT(*) FILTER (WHERE t.status = 'Pending')        AS pending,
            COUNT(*) FILTER (WHERE t.status = 'In Progress')    AS in_progress,
            COUNT(*) FILTER (WHERE t.status = 'Completed')      AS completed,
            COUNT(*) FILTER (WHERE t.status = 'Cancelled')      AS cancelled
         FROM tasks t
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE c.company_id = $1
           AND t.deleted_at IS NULL`,
        [companyId]
    );

    const unassignedTasks = await pool.query(
        `SELECT COUNT(*) AS count
         FROM tasks t
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE c.company_id = $1
           AND t.deleted_at IS NULL
           AND NOT EXISTS (
               SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id
           )`,
        [companyId]
    );

    // team_size counts the people the Manager actually manages. It used to be
    // COUNT(*) over the whole company, which included the Manager themselves,
    // so the "Team Members" card disagreed with the "Team Composition"
    // breakdown rendered directly underneath it.
    const team = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE role = 'Team Lead')  AS team_leads,
            COUNT(*) FILTER (WHERE role = 'Employee')   AS employees,
            COUNT(*) FILTER (WHERE role = 'Intern')     AS interns,
            COUNT(*) FILTER (
                WHERE role IN ('Team Lead', 'Employee', 'Intern')
            )                                           AS total
         FROM users
         WHERE company_id = $1`,
        [companyId]
    );

    const upcomingMeetings = await pool.query(
        `SELECT
            m.id, m.meeting_title, m.meeting_date, m.meeting_time,
            l.lead_name
         FROM meetings m
         INNER JOIN leads l ON l.id = m.lead_id
         WHERE m.company_id = $1
           AND m.status = 'Scheduled'
           AND m.meeting_date >= CURRENT_DATE
         ORDER BY m.meeting_date ASC, m.meeting_time ASC
         LIMIT 5`,
        [companyId]
    );

    const l = leads.rows[0];
    const mt = meetings.rows[0];
    const t = tasks.rows[0];
    const tm = team.rows[0];

    return {
        role: ROLES.MANAGER,
        cards: {
            total_customers: countOf(customers),
            total_leads: Number(l.total) || 0,
            total_meetings: Number(mt.total) || 0,
            upcoming_meetings: Number(mt.upcoming) || 0,
            total_tasks: Number(t.total) || 0,
            unassigned_tasks: countOf(unassignedTasks),
            team_size: Number(tm.total) || 0
        },
        leads_by_status: {
            Pending: Number(l.pending) || 0,
            "Meeting Scheduled": Number(l.meeting_scheduled) || 0,
            "Future Business": Number(l.future_business) || 0,
            Converted: Number(l.converted) || 0,
            Closed: Number(l.closed) || 0
        },
        tasks_by_status: {
            Pending: Number(t.pending) || 0,
            "In Progress": Number(t.in_progress) || 0,
            Completed: Number(t.completed) || 0,
            Cancelled: Number(t.cancelled) || 0
        },
        team: {
            "Team Lead": Number(tm.team_leads) || 0,
            Employee: Number(tm.employees) || 0,
            Intern: Number(tm.interns) || 0
        },
        upcoming_meeting_list: upcomingMeetings.rows
    };

};

// ------------------------------------------------------
// TEAM LEAD
// ------------------------------------------------------

const teamLeadDashboard = async (userId, companyId) => {

    const assignments = await pool.query(
        `SELECT
            COUNT(*)                                                AS total,
            COUNT(*) FILTER (WHERE ta.status = 'Pending')           AS pending,
            COUNT(*) FILTER (WHERE ta.status = 'In Progress')       AS in_progress,
            COUNT(*) FILTER (WHERE ta.status = 'Completed')         AS completed
         FROM task_assignments ta
         INNER JOIN tasks t ON t.id = ta.task_id
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE ta.team_lead_id = $1
           AND c.company_id = $2
           AND t.deleted_at IS NULL`,
        [userId, companyId]
    );

    const splitTasks = await pool.query(
        `SELECT
            COUNT(*)                                                AS total,
            COUNT(*) FILTER (WHERE st.status = 'Pending')           AS pending,
            COUNT(*) FILTER (WHERE st.status = 'In Progress')       AS in_progress,
            COUNT(*) FILTER (WHERE st.status = 'Submitted')         AS submitted,
            COUNT(*) FILTER (WHERE st.status = 'Rework')            AS rework,
            COUNT(*) FILTER (WHERE st.status = 'Completed')         AS completed,
            COUNT(*) FILTER (WHERE st.status = 'Cancelled')         AS cancelled
         FROM split_tasks st
         INNER JOIN task_assignments ta ON ta.id = st.parent_assignment_id
         INNER JOIN tasks t ON t.id = ta.task_id
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE ta.team_lead_id = $1
           AND c.company_id = $2
           AND t.deleted_at IS NULL`,
        [userId, companyId]
    );

    const reports = await pool.query(
        `SELECT
            COUNT(*)                                                        AS total,
            COUNT(*) FILTER (WHERE tr.review_status = 'Submitted')          AS awaiting_review,
            COUNT(*) FILTER (WHERE tr.review_status = 'Approved')           AS approved,
            COUNT(*) FILTER (WHERE tr.review_status = 'Rework')             AS rework
         FROM task_reports tr
         INNER JOIN split_tasks st ON st.id = tr.split_task_id
         INNER JOIN task_assignments ta ON ta.id = st.parent_assignment_id
         INNER JOIN tasks t ON t.id = ta.task_id
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE ta.team_lead_id = $1
           AND c.company_id = $2
           AND t.deleted_at IS NULL`,
        [userId, companyId]
    );

    const pendingReviewList = await pool.query(
        `SELECT
            tr.id AS report_id,
            tr.submitted_at,
            st.title AS split_task_title,
            u.first_name || ' ' || COALESCE(u.last_name, '') AS employee_name
         FROM task_reports tr
         INNER JOIN split_tasks st ON st.id = tr.split_task_id
         INNER JOIN task_assignments ta ON ta.id = st.parent_assignment_id
         INNER JOIN tasks t ON t.id = ta.task_id
         INNER JOIN customers c ON c.id = t.customer_id
         LEFT JOIN users u ON u.id = tr.submitted_by
         WHERE ta.team_lead_id = $1
           AND c.company_id = $2
           AND tr.review_status = $3
           AND t.deleted_at IS NULL
         ORDER BY tr.id DESC
         LIMIT 5`,
        [userId, companyId, REPORT_STATUS.SUBMITTED]
    );

    const a = assignments.rows[0];
    const s = splitTasks.rows[0];
    const r = reports.rows[0];

    return {
        role: ROLES.TEAM_LEAD,
        cards: {
            assigned_tasks: Number(a.total) || 0,
            assignments_in_progress: Number(a.in_progress) || 0,
            assignments_completed: Number(a.completed) || 0,
            split_tasks: Number(s.total) || 0,
            reports_awaiting_review: Number(r.awaiting_review) || 0,
            completed_work: Number(s.completed) || 0
        },
        assignments_by_status: {
            Pending: Number(a.pending) || 0,
            "In Progress": Number(a.in_progress) || 0,
            Completed: Number(a.completed) || 0
        },
        split_tasks_by_status: {
            Pending: Number(s.pending) || 0,
            "In Progress": Number(s.in_progress) || 0,
            Submitted: Number(s.submitted) || 0,
            Rework: Number(s.rework) || 0,
            Completed: Number(s.completed) || 0,
            Cancelled: Number(s.cancelled) || 0
        },
        reports_by_status: {
            Submitted: Number(r.awaiting_review) || 0,
            Approved: Number(r.approved) || 0,
            Rework: Number(r.rework) || 0
        },
        pending_review_list: pendingReviewList.rows
    };

};

// ------------------------------------------------------
// EMPLOYEE / INTERN (identical shape)
// ------------------------------------------------------

const workerDashboard = async (userId, companyId, role) => {

    const splitTasks = await pool.query(
        `SELECT
            COUNT(*)                                            AS total,
            COUNT(*) FILTER (WHERE st.status = 'Pending')       AS pending,
            COUNT(*) FILTER (WHERE st.status = 'In Progress')   AS in_progress,
            COUNT(*) FILTER (WHERE st.status = 'Submitted')     AS submitted,
            COUNT(*) FILTER (WHERE st.status = 'Rework')        AS rework,
            COUNT(*) FILTER (WHERE st.status = 'Completed')     AS completed,
            COUNT(*) FILTER (WHERE st.status = 'Cancelled')     AS cancelled
         FROM split_tasks st
         INNER JOIN task_assignments ta ON ta.id = st.parent_assignment_id
         INNER JOIN tasks t ON t.id = ta.task_id
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE st.employee_id = $1
           AND c.company_id = $2
           AND t.deleted_at IS NULL`,
        [userId, companyId]
    );

    const reports = await pool.query(
        `SELECT
            COUNT(*)                                                AS total,
            COUNT(*) FILTER (WHERE review_status = 'Submitted')     AS awaiting_review,
            COUNT(*) FILTER (WHERE review_status = 'Approved')      AS approved,
            COUNT(*) FILTER (WHERE review_status = 'Rework')        AS rework
         FROM task_reports
         WHERE submitted_by = $1`,
        [userId]
    );

    const recentTasks = await pool.query(
        `SELECT
            st.id,
            st.title,
            st.status,
            st.created_at,
            t.title AS parent_task_title,
            t.due_date AS parent_task_due_date
         FROM split_tasks st
         INNER JOIN task_assignments ta ON ta.id = st.parent_assignment_id
         INNER JOIN tasks t ON t.id = ta.task_id
         INNER JOIN customers c ON c.id = t.customer_id
         WHERE st.employee_id = $1
           AND c.company_id = $2
           AND t.deleted_at IS NULL
         ORDER BY st.id DESC
         LIMIT 5`,
        [userId, companyId]
    );

    const s = splitTasks.rows[0];
    const r = reports.rows[0];

    const pendingWork =
        (Number(s.pending) || 0) +
        (Number(s.in_progress) || 0) +
        (Number(s.rework) || 0);

    return {
        role,
        cards: {
            assigned_tasks: Number(s.total) || 0,
            pending_work: pendingWork,
            in_progress: Number(s.in_progress) || 0,
            awaiting_review: Number(s.submitted) || 0,
            rework: Number(s.rework) || 0,
            completed_work: Number(s.completed) || 0,
            submitted_reports: Number(r.total) || 0
        },
        tasks_by_status: {
            Pending: Number(s.pending) || 0,
            "In Progress": Number(s.in_progress) || 0,
            Submitted: Number(s.submitted) || 0,
            Rework: Number(s.rework) || 0,
            Completed: Number(s.completed) || 0,
            Cancelled: Number(s.cancelled) || 0
        },
        reports_by_status: {
            Submitted: Number(r.awaiting_review) || 0,
            Approved: Number(r.approved) || 0,
            Rework: Number(r.rework) || 0
        },
        recent_tasks: recentTasks.rows
    };

};

// ------------------------------------------------------
// ENTRY POINT
// ------------------------------------------------------

exports.getDashboard = async (req, res) => {

    try {

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (!authUser.role) {
            return res.status(403).json({
                success: false,
                message: "Your account is awaiting role assignment"
            });
        }

        let data;

        if (authUser.role === ROLES.ADMIN) {
            data = await adminDashboard();
        }
        else if (authUser.role === ROLES.MANAGER) {
            data = await managerDashboard(authUser.company_id);
        }
        else if (authUser.role === ROLES.TEAM_LEAD) {
            data = await teamLeadDashboard(authUser.id, authUser.company_id);
        }
        else if (WORKER_ROLES.includes(authUser.role)) {
            data = await workerDashboard(
                authUser.id,
                authUser.company_id,
                authUser.role
            );
        }
        else {
            return res.status(403).json({
                success: false,
                message: "No dashboard is available for your role"
            });
        }

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.log("DASHBOARD ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
