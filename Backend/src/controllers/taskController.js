const pool = require("../database/connection");
const { getAuthContext } = require("../utils/authContext");

const {
    SPLIT_TASK_STATUS,
    TEAM_LEAD_ASSIGNABLE_SPLIT_STATUSES,
    TASK_STATUS,
    TASK_STATUSES,
    TASK_PRIORITIES,
    ROLES,
    WORKER_ROLES
} = require("../utils/status");

const {
    parseId,
    parseDateOnly,
    validateName,
    validateText,
    validateDate,
    validateDateOrder,
    firstError
} = require("../utils/validation");

const { syncAssignmentAndTask, syncFromSplitTask } = require("../utils/taskRollup");

// ======================================================
// COMPANY SCOPING
//
// The tasks table has no company_id column, so every tenant check resolves
// through the real relationship chain:
//
//   tasks -> customers.company_id
//   task_assignments -> tasks -> customers.company_id
//   split_tasks -> task_assignments -> tasks -> customers.company_id
//
// company_id always comes from the authenticated user's row, never from the
// request body.
// ======================================================

// Returns the owning company of a task, or null when the task does not exist
// (or is soft-deleted).
const getTaskCompanyId = async (taskId, executor = pool) => {

    const result = await executor.query(
        `SELECT c.company_id
         FROM tasks t
         INNER JOIN customers c
            ON c.id = t.customer_id
         WHERE t.id = $1
           AND t.deleted_at IS NULL`,
        [taskId]
    );

    return result.rows.length > 0 ? result.rows[0].company_id : null;

};

// Returns { assignment_id, task_id, team_lead_id, company_id } or null.
const getAssignmentWithCompany = async (assignmentId, executor = pool) => {

    const result = await executor.query(
        `SELECT
            ta.id AS assignment_id,
            ta.task_id,
            ta.team_lead_id,
            c.company_id
         FROM task_assignments ta
         INNER JOIN tasks t
            ON t.id = ta.task_id
         INNER JOIN customers c
            ON c.id = t.customer_id
         WHERE ta.id = $1
           AND t.deleted_at IS NULL`,
        [assignmentId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;

};

const sameCompany = (a, b) => Number(a) === Number(b);

// ======================================================
// CREATE TASK
// Manager creates a main task for a customer in their own company
// ======================================================

exports.createTask = async (req, res) => {

    try {

        const {
            customer_id,
            title,
            description,
            priority,
            start_date,
            due_date
        } = req.body;

        if (!customer_id || !title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer and Title are required"
            });
        }

        const customerId = parseId(customer_id);

        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Customer Id"
            });
        }

        // priority was previously accepted verbatim, so "SUPER_URGENT" was
        // persisted; dates were passed straight to Postgres, so "notadate"
        // became a 500 (report BUG-011).
        if (priority && !TASK_PRIORITIES.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: `Priority must be one of: ${TASK_PRIORITIES.join(", ")}`
            });
        }

        const validationError = firstError([
            validateName(title, "Title"),
            validateText(description, "Description"),
            validateDate(start_date, "Start date"),
            validateDate(due_date, "Due date"),
            validateDateOrder(start_date, due_date, "Start date", "Due date")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const manager_id = req.user.id;

        const authUser = await getAuthContext(manager_id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.MANAGER) {
            return res.status(403).json({
                success: false,
                message: "Only Manager can create tasks"
            });
        }

        // The customer must belong to the manager's own company.
        const customerResult = await pool.query(
            `SELECT id, company_id
             FROM customers
             WHERE id = $1
               AND deleted_at IS NULL`,
            [customerId]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer Not Found"
            });
        }

        if (!sameCompany(customerResult.rows[0].company_id, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can create tasks only for your company customers"
            });
        }

        const result = await pool.query(
            `INSERT INTO tasks
            (
                customer_id,
                manager_id,
                title,
                description,
                priority,
                start_date,
                due_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id`,
            [
                customerId,
                manager_id,
                String(title).trim(),
                description || null,
                priority || "Medium",
                parseDateOnly(start_date),
                parseDateOnly(due_date)
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Task Created Successfully",
            task_id: result.rows[0].id
        });

    } catch (error) {

        console.log("CREATE TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// TASK LIST
// Scoped to the caller's company via customers.company_id.
// Admin is a global administrator and sees every company.
// ======================================================

exports.taskList = async (req, res) => {

    try {

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const isAdmin = authUser.role === ROLES.ADMIN;

        if (!isAdmin && !authUser.company_id) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const params = isAdmin ? [] : [authUser.company_id];

        const result = await pool.query(
            `SELECT
                t.id,
                t.customer_id,
                t.title,
                t.description,
                t.priority,
                t.start_date,
                t.due_date,
                t.status,
                t.created_at,

                c.customer_name,
                c.company_name,
                c.company_id,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS manager_name

             FROM tasks t

             INNER JOIN customers c
                ON c.id = t.customer_id

             LEFT JOIN users u
                ON u.id = t.manager_id

             WHERE t.deleted_at IS NULL
             ${isAdmin ? "" : "AND c.company_id = $1"}

             ORDER BY t.id DESC`,
            params
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("TASK LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// TASK DETAILS
//
// The old implementation LEFT JOINed task_assignments with no filter and
// returned rows[0], so a task assigned to two Team Leads handed back an
// arbitrary assignment - Team Lead B could receive Team Lead A's
// assignment_id and then get 403 on their own task.
//
// Now the assignment is resolved from the caller:
//   Team Lead -> their own assignment (assignment_id)
//   Manager / Admin -> the full assignments list, no ambiguous single id
// ======================================================

exports.taskDetails = async (req, res) => {

    try {

        const { task_id } = req.body;

        if (!task_id) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required"
            });
        }

        const taskId = parseId(task_id);

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task ID"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const taskResult = await pool.query(
            `SELECT
                t.id,
                t.customer_id,
                t.manager_id,
                t.title,
                t.description,
                t.priority,
                t.start_date,
                t.due_date,
                t.status,
                t.created_at,
                t.updated_at,

                c.customer_name,
                c.company_name,
                c.company_id,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS manager_name

             FROM tasks t
             INNER JOIN customers c
                ON c.id = t.customer_id
             LEFT JOIN users u
                ON u.id = t.manager_id
             WHERE t.id = $1
               AND t.deleted_at IS NULL`,
            [taskId]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task Not Found"
            });
        }

        const task = taskResult.rows[0];

        // Company isolation (Admin is global).
        if (authUser.role !== ROLES.ADMIN &&
            !sameCompany(task.company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can access only your company tasks"
            });

        }

        // Assignments for this task, within the same company.
        const assignmentsResult = await pool.query(
            `SELECT
                ta.id AS assignment_id,
                ta.team_lead_id,
                ta.status AS assignment_status,
                ta.assigned_at,
                ta.completed_at,
                u.first_name || ' ' || COALESCE(u.last_name, '') AS team_lead_name
             FROM task_assignments ta
             LEFT JOIN users u
                ON u.id = ta.team_lead_id
             WHERE ta.task_id = $1
             ORDER BY ta.id DESC`,
            [taskId]
        );

        const assignments = assignmentsResult.rows;

        // A Team Lead only ever gets their OWN assignment id.
        let assignment_id = null;

        if (authUser.role === ROLES.TEAM_LEAD) {

            const own = assignments.find(
                (row) => Number(row.team_lead_id) === Number(authUser.id)
            );

            if (!own) {
                return res.status(403).json({
                    success: false,
                    message: "This task is not assigned to you"
                });
            }

            assignment_id = own.assignment_id;

        }

        return res.status(200).json({
            success: true,
            data: {
                ...task,
                assignment_id,
                assignments
            }
        });

    } catch (error) {

        console.log("TASK DETAILS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// UPDATE TASK
// Manager, own company only
// ======================================================

exports.updateTask = async (req, res) => {

    try {

        const {
            task_id,
            title,
            description,
            priority,
            start_date,
            due_date,
            status
        } = req.body;

        if (!task_id) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required"
            });
        }

        const taskId = parseId(task_id);

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task ID"
            });
        }

        if (status && !TASK_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task Status"
            });
        }

        if (priority && !TASK_PRIORITIES.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: `Priority must be one of: ${TASK_PRIORITIES.join(", ")}`
            });
        }

        const validationError = firstError([
            validateName(title, "Title", { required: false }),
            validateText(description, "Description"),
            validateDate(start_date, "Start date"),
            validateDate(due_date, "Due date"),
            validateDateOrder(start_date, due_date, "Start date", "Due date")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.MANAGER) {
            return res.status(403).json({
                success: false,
                message: "Only Manager can update main tasks"
            });
        }

        const taskCompanyId = await getTaskCompanyId(taskId);

        if (taskCompanyId === null) {
            return res.status(404).json({
                success: false,
                message: "Task Not Found"
            });
        }

        if (!sameCompany(taskCompanyId, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can update only your company tasks"
            });
        }

        // --------------------------------------------------
        // PARTIAL UPDATE (BUG-012)
        //
        // description, start_date and due_date used to be assigned directly,
        // so a title-only edit silently wiped the task's description and its
        // whole schedule. Only keys actually present in the body are written
        // now:
        //   key absent     -> column untouched
        //   key present    -> column set
        //   key present "" -> column explicitly cleared
        // --------------------------------------------------
        const has = (key) =>
            Object.prototype.hasOwnProperty.call(req.body, key);

        const setClauses = [];
        const values = [];

        const push = (column, value) => {
            values.push(value);
            setClauses.push(`${column} = $${values.length}`);
        };

        if (has("title") && title && String(title).trim()) {
            push("title", String(title).trim());
        }

        if (has("description")) {
            push("description", description ? String(description).trim() : null);
        }

        if (has("priority") && priority) {
            push("priority", priority);
        }

        if (has("start_date")) {
            push("start_date", parseDateOnly(start_date));
        }

        if (has("due_date")) {
            push("due_date", parseDateOnly(due_date));
        }

        if (has("status") && status) {
            push("status", status);
        }

        if (setClauses.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        values.push(taskId);

        await pool.query(
            `UPDATE tasks
             SET ${setClauses.join(", ")},
                 updated_at = NOW()
             WHERE id = $${values.length}
               AND deleted_at IS NULL`,
            values
        );

        return res.status(200).json({
            success: true,
            message: "Task Updated Successfully"
        });

    } catch (error) {

        console.log("UPDATE TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// DELETE TASK (soft delete)
// Manager, own company only
// ======================================================

exports.deleteTask = async (req, res) => {

    try {

        const { task_id } = req.body;

        if (!task_id) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required"
            });
        }

        const taskId = parseId(task_id);

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task ID"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.MANAGER) {
            return res.status(403).json({
                success: false,
                message: "Only Manager can delete main tasks"
            });
        }

        const taskCompanyId = await getTaskCompanyId(taskId);

        if (taskCompanyId === null) {
            return res.status(404).json({
                success: false,
                message: "Task Not Found"
            });
        }

        if (!sameCompany(taskCompanyId, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can delete only your company tasks"
            });
        }

        await pool.query(
            `UPDATE tasks
             SET deleted_at = NOW()
             WHERE id = $1
               AND deleted_at IS NULL`,
            [taskId]
        );

        return res.status(200).json({
            success: true,
            message: "Task Deleted Successfully"
        });

    } catch (error) {

        console.log("DELETE TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// ASSIGN MAIN TASK TO TEAM LEAD
// Manager only. Both the task and the Team Lead must belong to the
// manager's own company - this blocks cross-company assignment.
// ======================================================

exports.assignTask = async (req, res) => {

    try {

        const { task_id, employee_id } = req.body;

        if (!task_id || !employee_id) {
            return res.status(400).json({
                success: false,
                message: "Task ID and Team Lead ID are required"
            });
        }

        const taskId = parseId(task_id);
        const teamLeadId = parseId(employee_id);

        if (!taskId || !teamLeadId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task ID or Team Lead ID"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (authUser.role !== ROLES.MANAGER) {
            return res.status(403).json({
                success: false,
                message: "Only Manager can assign main tasks"
            });
        }

        // --- task must be in the manager's company ---
        const taskCompanyId = await getTaskCompanyId(taskId);

        if (taskCompanyId === null) {
            return res.status(404).json({
                success: false,
                message: "Task Not Found"
            });
        }

        if (!sameCompany(taskCompanyId, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can assign only your company tasks"
            });
        }

        // --- team lead must exist, be a Team Lead, and be in the same company ---
        const teamLeadResult = await pool.query(
            `SELECT id, role, company_id, is_active
             FROM users
             WHERE id = $1`,
            [teamLeadId]
        );

        if (teamLeadResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Team Lead Not Found"
            });
        }

        const teamLead = teamLeadResult.rows[0];

        if (teamLead.role !== ROLES.TEAM_LEAD) {
            return res.status(400).json({
                success: false,
                message: "Main task can only be assigned to Team Lead"
            });
        }

        if (!teamLead.is_active) {
            return res.status(400).json({
                success: false,
                message: "This Team Lead account is disabled"
            });
        }

        if (!sameCompany(teamLead.company_id, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can assign tasks only to Team Leads in your company"
            });
        }

        // --- prevent duplicate assignment of the same task to the same lead ---
        const duplicate = await pool.query(
            `SELECT id
             FROM task_assignments
             WHERE task_id = $1
               AND team_lead_id = $2`,
            [taskId, teamLeadId]
        );

        if (duplicate.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: "This task is already assigned to that Team Lead",
                assignment_id: duplicate.rows[0].id
            });
        }

        const result = await pool.query(
            `INSERT INTO task_assignments (task_id, team_lead_id)
             VALUES ($1, $2)
             RETURNING id`,
            [taskId, teamLeadId]
        );

        return res.status(201).json({
            success: true,
            message: "Task Assigned To Team Lead Successfully",
            assignment_id: result.rows[0].id
        });

    } catch (error) {

        console.log("ASSIGN TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// ASSIGNED WORKERS FOR A TASK
// Company scoped
// ======================================================

exports.assignedWorkers = async (req, res) => {

    try {

        const { task_id } = req.body;

        if (!task_id) {
            return res.status(400).json({
                success: false,
                message: "Task ID is required"
            });
        }

        const taskId = parseId(task_id);

        if (!taskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task ID"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const taskCompanyId = await getTaskCompanyId(taskId);

        if (taskCompanyId === null) {
            return res.status(404).json({
                success: false,
                message: "Task Not Found"
            });
        }

        if (authUser.role !== ROLES.ADMIN &&
            !sameCompany(taskCompanyId, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can access only your company tasks"
            });

        }

        const result = await pool.query(
            `SELECT
                ta.id,
                ta.task_id,
                ta.status,
                ta.assigned_at,
                ta.completed_at,
                u.id AS employee_id,
                u.first_name,
                u.last_name,
                u.role
             FROM task_assignments ta
             INNER JOIN users u
                ON u.id = ta.team_lead_id
             WHERE ta.task_id = $1
             ORDER BY ta.id DESC`,
            [taskId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("ASSIGNED WORKERS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// CHANGE MAIN TASK ASSIGNMENT STATUS
//
// Previously had no role check, no ownership check and no status whitelist -
// any authenticated user could set any assignment to any string.
// ======================================================

exports.changeTaskStatus = async (req, res) => {

    try {

        const { assignment_id, status } = req.body;

        if (!assignment_id || !status) {
            return res.status(400).json({
                success: false,
                message: "Assignment ID and Status are required"
            });
        }

        const assignmentId = parseId(assignment_id);

        if (!assignmentId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Assignment ID"
            });
        }

        if (!TASK_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task Status"
            });
        }

        const authUser = await getAuthContext(req.user.id);

        if (!authUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found"
            });
        }

        const assignment = await getAssignmentWithCompany(assignmentId);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Task Assignment Not Found"
            });
        }

        if (!sameCompany(assignment.company_id, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can update only your company assignments"
            });
        }

        // The owning Team Lead, or a Manager of the same company.
        const isOwningTeamLead =
            authUser.role === ROLES.TEAM_LEAD &&
            Number(assignment.team_lead_id) === Number(authUser.id);

        const isCompanyManager = authUser.role === ROLES.MANAGER;

        if (!isOwningTeamLead && !isCompanyManager) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this assignment"
            });
        }

        const completedAt =
            status === TASK_STATUS.COMPLETED ? new Date() : null;

        await pool.query(
            `UPDATE task_assignments
             SET status = $1,
                 completed_at = COALESCE($2, completed_at)
             WHERE id = $3`,
            [status, completedAt, assignmentId]
        );

        return res.status(200).json({
            success: true,
            message: "Status Updated Successfully"
        });

    } catch (error) {

        console.log("CHANGE TASK STATUS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// TEAM LEAD TASK LIST
// Only the logged-in Team Lead's own assignments, own company
// ======================================================

exports.teamLeadTasks = async (req, res) => {

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
                message: "Only Team Lead can access this page"
            });
        }

        const result = await pool.query(
            `SELECT
                t.id,
                t.title,
                t.description,
                t.priority,
                t.start_date,
                t.due_date,
                t.status,
                t.created_at,

                c.customer_name,
                c.company_name,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS manager_name,

                ta.id AS assignment_id,
                ta.team_lead_id,
                ta.status AS assignment_status,
                ta.assigned_at,
                ta.completed_at,

                (
                    SELECT COUNT(*)
                    FROM split_tasks st
                    WHERE st.parent_assignment_id = ta.id
                ) AS split_task_count

             FROM task_assignments ta

             INNER JOIN tasks t
                ON t.id = ta.task_id

             INNER JOIN customers c
                ON c.id = t.customer_id

             LEFT JOIN users u
                ON u.id = t.manager_id

             WHERE ta.team_lead_id = $1
               AND c.company_id    = $2
               AND t.deleted_at IS NULL

             ORDER BY ta.id DESC`,
            [team_lead_id, authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("TEAM LEAD TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// SPLIT TASK LIST
// Team Lead, own assignment, own company
// ======================================================

exports.splitTaskList = async (req, res) => {

    try {

        const { task_assignment_id } = req.body;

        if (!task_assignment_id) {
            return res.status(400).json({
                success: false,
                message: "Task Assignment ID is required"
            });
        }

        const assignmentId = parseId(task_assignment_id);

        if (!assignmentId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Task Assignment ID"
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
                message: "Only Team Lead can view split tasks"
            });
        }

        const assignment = await getAssignmentWithCompany(assignmentId);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Task Assignment Not Found"
            });
        }

        if (Number(assignment.team_lead_id) !== Number(team_lead_id) ||
            !sameCompany(assignment.company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can access only your assigned tasks"
            });

        }

        const result = await pool.query(
            `SELECT
                st.id,
                st.parent_assignment_id,
                st.title,
                st.description,
                st.status,
                st.remarks,
                st.employee_id,
                st.created_at,
                st.completed_at,

                u.first_name || ' ' || COALESCE(u.last_name, '') AS employee_name,
                u.role AS employee_role,

                (
                    SELECT tr.id
                    FROM task_reports tr
                    WHERE tr.split_task_id = st.id
                    ORDER BY tr.id DESC
                    LIMIT 1
                ) AS latest_report_id,

                (
                    SELECT tr.review_status
                    FROM task_reports tr
                    WHERE tr.split_task_id = st.id
                    ORDER BY tr.id DESC
                    LIMIT 1
                ) AS latest_review_status

             FROM split_tasks st
             LEFT JOIN users u
                ON u.id = st.employee_id
             WHERE st.parent_assignment_id = $1
             ORDER BY st.id ASC`,
            [assignmentId]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("SPLIT TASK LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// CREATE SPLIT TASK
// Team Lead splits their own assignment to an Employee / Intern
// in the SAME company.
// ======================================================

exports.createSplitTask = async (req, res) => {

    try {

        const {
            parent_assignment_id,
            title,
            description,
            employee_id,
            status,
            remarks
        } = req.body;

        if (!parent_assignment_id || !title || !String(title).trim() || !employee_id) {
            return res.status(400).json({
                success: false,
                message: "Parent Assignment, Title and Employee are required"
            });
        }

        const parentAssignmentId = parseId(parent_assignment_id);
        const workerId = parseId(employee_id);

        if (!parentAssignmentId || !workerId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Parent Assignment or Employee ID"
            });
        }

        const validationError = firstError([
            validateName(title, "Title"),
            validateText(description, "Description"),
            validateText(remarks, "Remarks")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
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
                message: "Only Team Lead can split tasks"
            });
        }

        const assignment = await getAssignmentWithCompany(parentAssignmentId);

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Task Assignment Not Found"
            });
        }

        if (Number(assignment.team_lead_id) !== Number(team_lead_id) ||
            !sameCompany(assignment.company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can split only your assigned tasks"
            });

        }

        // --- worker must be Employee/Intern in the SAME company ---
        const workerResult = await pool.query(
            `SELECT id, role, company_id, is_active
             FROM users
             WHERE id = $1`,
            [workerId]
        );

        if (workerResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Employee or Intern Not Found"
            });
        }

        const worker = workerResult.rows[0];

        if (!WORKER_ROLES.includes(worker.role)) {
            return res.status(400).json({
                success: false,
                message: "Split task can only be assigned to Employee or Intern"
            });
        }

        if (!worker.is_active) {
            return res.status(400).json({
                success: false,
                message: "This account is disabled"
            });
        }

        if (!sameCompany(worker.company_id, authUser.company_id)) {
            return res.status(403).json({
                success: false,
                message: "You can assign work only to members of your company"
            });
        }

        const requestedStatus = status || SPLIT_TASK_STATUS.PENDING;

        if (!TEAM_LEAD_ASSIGNABLE_SPLIT_STATUSES.includes(requestedStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task Status"
            });
        }

        const result = await pool.query(
            `INSERT INTO split_tasks
            (
                parent_assignment_id,
                title,
                description,
                employee_id,
                status,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                parentAssignmentId,
                String(title).trim(),
                description || null,
                workerId,
                requestedStatus,
                remarks || null
            ]
        );

        // Adding work under an assignment re-derives the parent statuses, so
        // a new Pending split re-opens an assignment that had been rolled up
        // to Completed.
        await syncAssignmentAndTask(parentAssignmentId);

        return res.status(201).json({
            success: true,
            message: "Split Task Created Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log("CREATE SPLIT TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// UPDATE SPLIT TASK
//
// The previous ownership query referenced two columns that do not exist:
//   st.task_assignment_id  (actual column: st.parent_assignment_id)
//   ta.employee_id         (actual column: ta.team_lead_id)
// so this endpoint failed 100% of the time. Rewritten against the real
// schema, with company isolation added.
// ======================================================

exports.updateSplitTask = async (req, res) => {

    try {

        const {
            split_task_id,
            title,
            description,
            employee_id,
            status,
            remarks
        } = req.body;

        if (!split_task_id) {
            return res.status(400).json({
                success: false,
                message: "Split Task ID is required"
            });
        }

        const splitTaskId = parseId(split_task_id);

        if (!splitTaskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task ID"
            });
        }

        const workerId = employee_id ? parseId(employee_id) : null;

        if (employee_id && !workerId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Employee ID"
            });
        }

        const validationError = firstError([
            validateName(title, "Title", { required: false }),
            validateText(description, "Description"),
            validateText(remarks, "Remarks")
        ]);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
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
                message: "Only Team Lead can update split tasks"
            });
        }

        // Ownership resolved through the real chain:
        // split_tasks.parent_assignment_id -> task_assignments.team_lead_id
        const checkResult = await pool.query(
            `SELECT
                st.id,
                st.employee_id,
                st.status,
                ta.team_lead_id,
                c.company_id
             FROM split_tasks st
             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id
             INNER JOIN tasks t
                ON t.id = ta.task_id
             INNER JOIN customers c
                ON c.id = t.customer_id
             WHERE st.id = $1`,
            [splitTaskId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Split Task Not Found"
            });
        }

        const existing = checkResult.rows[0];

        if (Number(existing.team_lead_id) !== Number(team_lead_id) ||
            !sameCompany(existing.company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can update only your split tasks"
            });

        }

        // Reassignment, if requested, must stay inside the company.
        if (workerId) {

            const workerResult = await pool.query(
                `SELECT id, role, company_id, is_active
                 FROM users
                 WHERE id = $1`,
                [workerId]
            );

            if (workerResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Employee or Intern Not Found"
                });
            }

            const worker = workerResult.rows[0];

            if (!WORKER_ROLES.includes(worker.role)) {
                return res.status(400).json({
                    success: false,
                    message: "Split task can only be assigned to Employee or Intern"
                });
            }

            if (!sameCompany(worker.company_id, authUser.company_id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can assign work only to members of your company"
                });
            }

        }

        if (status && !TEAM_LEAD_ASSIGNABLE_SPLIT_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task Status"
            });
        }

        // COALESCE keeps omitted fields intact instead of nulling them out.
        await pool.query(
            `UPDATE split_tasks
             SET title       = COALESCE($1, title),
                 description = COALESCE($2, description),
                 employee_id = COALESCE($3, employee_id),
                 status      = COALESCE($4, status),
                 remarks     = COALESCE($5, remarks)
             WHERE id = $6`,
            [
                title ? String(title).trim() : null,
                description ?? null,
                workerId || null,
                status || null,
                remarks ?? null,
                splitTaskId
            ]
        );

        // A status change here can finish (or re-open) the parent assignment.
        await syncFromSplitTask(splitTaskId);

        return res.status(200).json({
            success: true,
            message: "Split Task Updated Successfully"
        });

    } catch (error) {

        console.log("UPDATE SPLIT TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// CHANGE SPLIT TASK STATUS
// Team Lead, own assignment, own company
// ======================================================

exports.changeSplitTaskStatus = async (req, res) => {

    try {

        const { split_task_id, status } = req.body;

        if (!split_task_id || !status) {
            return res.status(400).json({
                success: false,
                message: "Split Task ID and Status are required"
            });
        }

        const splitTaskId = parseId(split_task_id);

        if (!splitTaskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task ID"
            });
        }

        if (!TEAM_LEAD_ASSIGNABLE_SPLIT_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task Status"
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
                message: "Only Team Lead can change split task status"
            });
        }

        const checkResult = await pool.query(
            `SELECT
                st.id,
                ta.team_lead_id,
                c.company_id
             FROM split_tasks st
             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id
             INNER JOIN tasks t
                ON t.id = ta.task_id
             INNER JOIN customers c
                ON c.id = t.customer_id
             WHERE st.id = $1`,
            [splitTaskId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Split Task Not Found"
            });
        }

        const existing = checkResult.rows[0];

        if (Number(existing.team_lead_id) !== Number(team_lead_id) ||
            !sameCompany(existing.company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can update only your assigned split tasks"
            });

        }

        const completedAt =
            status === SPLIT_TASK_STATUS.COMPLETED ? new Date() : null;

        const result = await pool.query(
            `UPDATE split_tasks
             SET status = $1,
                 completed_at = $2
             WHERE id = $3
             RETURNING *`,
            [status, completedAt, splitTaskId]
        );

        // Re-derive the parent assignment and task from their children.
        await syncFromSplitTask(splitTaskId);

        return res.status(200).json({
            success: true,
            message: "Split Task Status Updated Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log("CHANGE SPLIT TASK STATUS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// WORKER TASK LIST
// Employee AND Intern - their own split tasks, own company.
// Interns were previously rejected outright even though split tasks can be
// assigned to them.
// ======================================================

exports.employeeTaskList = async (req, res) => {

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
                message: "Only Employee or Intern can access these tasks"
            });
        }

        const result = await pool.query(
            `SELECT
                st.id,
                st.parent_assignment_id,
                st.title,
                st.description,
                st.employee_id,
                st.status,
                st.remarks,
                st.created_at,
                st.completed_at,

                t.id          AS parent_task_id,
                t.title       AS parent_task_title,
                t.description AS parent_task_description,
                t.priority    AS parent_task_priority,
                t.start_date  AS parent_task_start_date,
                t.due_date    AS parent_task_due_date,

                cu.customer_name,
                cu.company_name AS customer_company_name,

                ta.team_lead_id,
                tl.first_name || ' ' || COALESCE(tl.last_name, '') AS team_lead_name,

                (
                    SELECT tr.id
                    FROM task_reports tr
                    WHERE tr.split_task_id = st.id
                    ORDER BY tr.id DESC
                    LIMIT 1
                ) AS latest_report_id,

                (
                    SELECT tr.review_status
                    FROM task_reports tr
                    WHERE tr.split_task_id = st.id
                    ORDER BY tr.id DESC
                    LIMIT 1
                ) AS latest_review_status,

                (
                    SELECT tr.review_remarks
                    FROM task_reports tr
                    WHERE tr.split_task_id = st.id
                    ORDER BY tr.id DESC
                    LIMIT 1
                ) AS latest_review_remarks

             FROM split_tasks st

             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id

             INNER JOIN tasks t
                ON t.id = ta.task_id

             INNER JOIN customers cu
                ON cu.id = t.customer_id

             LEFT JOIN users tl
                ON tl.id = ta.team_lead_id

             WHERE st.employee_id = $1
               AND cu.company_id  = $2
               AND t.deleted_at IS NULL

             ORDER BY st.id DESC`,
            [worker_id, authUser.company_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.log("WORKER TASK LIST ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// WORKER SINGLE TASK DETAILS
// Employee / Intern - one of their own split tasks, with report history
// ======================================================

exports.employeeTaskDetails = async (req, res) => {

    try {

        const worker_id = req.user.id;

        const { split_task_id } = req.body;

        if (!split_task_id) {
            return res.status(400).json({
                success: false,
                message: "Split Task ID is required"
            });
        }

        const splitTaskId = parseId(split_task_id);

        if (!splitTaskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task ID"
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
                message: "Only Employee or Intern can access these tasks"
            });
        }

        const result = await pool.query(
            `SELECT
                st.id,
                st.parent_assignment_id,
                st.title,
                st.description,
                st.status,
                st.remarks,
                st.created_at,
                st.completed_at,

                t.id          AS parent_task_id,
                t.title       AS parent_task_title,
                t.description AS parent_task_description,
                t.priority    AS parent_task_priority,
                t.start_date  AS parent_task_start_date,
                t.due_date    AS parent_task_due_date,

                cu.customer_name,
                cu.company_name AS customer_company_name,

                ta.team_lead_id,
                tl.first_name || ' ' || COALESCE(tl.last_name, '') AS team_lead_name

             FROM split_tasks st
             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id
             INNER JOIN tasks t
                ON t.id = ta.task_id
             INNER JOIN customers cu
                ON cu.id = t.customer_id
             LEFT JOIN users tl
                ON tl.id = ta.team_lead_id
             WHERE st.id          = $1
               AND st.employee_id = $2
               AND cu.company_id  = $3
               AND t.deleted_at IS NULL`,
            [splitTaskId, worker_id, authUser.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Task Not Found"
            });
        }

        const reports = await pool.query(
            `SELECT
                id,
                report,
                review_status,
                review_remarks,
                submitted_at,
                reviewed_at,
                attachment_original_name,
                (attachment_path IS NOT NULL) AS has_attachment
             FROM task_reports
             WHERE split_task_id = $1
               AND submitted_by  = $2
             ORDER BY id DESC`,
            [splitTaskId, worker_id]
        );

        return res.status(200).json({
            success: true,
            data: {
                ...result.rows[0],
                reports: reports.rows
            }
        });

    } catch (error) {

        console.log("WORKER TASK DETAILS ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// ======================================================
// WORKER START TASK
// Employee / Intern - Pending -> In Progress on their own task
// ======================================================

exports.employeeStartTask = async (req, res) => {

    try {

        const { split_task_id } = req.body;

        if (!split_task_id) {
            return res.status(400).json({
                success: false,
                message: "Split Task ID is required"
            });
        }

        const splitTaskId = parseId(split_task_id);

        if (!splitTaskId) {
            return res.status(400).json({
                success: false,
                message: "Invalid Split Task ID"
            });
        }

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
                message: "Only Employee or Intern can start a task"
            });
        }

        const taskResult = await pool.query(
            `SELECT
                st.id,
                st.employee_id,
                st.status,
                c.company_id
             FROM split_tasks st
             INNER JOIN task_assignments ta
                ON ta.id = st.parent_assignment_id
             INNER JOIN tasks t
                ON t.id = ta.task_id
             INNER JOIN customers c
                ON c.id = t.customer_id
             WHERE st.id = $1`,
            [splitTaskId]
        );

        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Split Task Not Found"
            });
        }

        const splitTask = taskResult.rows[0];

        if (Number(splitTask.employee_id) !== Number(worker_id) ||
            !sameCompany(splitTask.company_id, authUser.company_id)) {

            return res.status(403).json({
                success: false,
                message: "You can start only your assigned tasks"
            });

        }

        if (splitTask.status !== SPLIT_TASK_STATUS.PENDING) {
            return res.status(400).json({
                success: false,
                message: "Only Pending tasks can be started"
            });
        }

        const result = await pool.query(
            `UPDATE split_tasks
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [SPLIT_TASK_STATUS.IN_PROGRESS, splitTaskId]
        );

        // Starting the first piece of work moves the parents to In Progress.
        await syncFromSplitTask(splitTaskId);

        return res.status(200).json({
            success: true,
            message: "Task Started Successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.log("WORKER START TASK ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};
