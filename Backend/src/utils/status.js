// ======================================================
// SHARED WORKFLOW STATUS VOCABULARY
//
// These values already exist in the database as plain varchar columns.
// This module is the single place they are declared so controllers stop
// drifting apart (split_tasks.status previously accepted values that
// changeSplitTaskStatus rejected).
//
// No CHECK constraints are added to the database - validation stays in
// the application layer, matching the existing design.
// ======================================================

// split_tasks.status
const SPLIT_TASK_STATUS = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    SUBMITTED: "Submitted",
    REWORK: "Rework",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled"
};

const SPLIT_TASK_STATUSES = Object.values(SPLIT_TASK_STATUS);

// Statuses a Team Lead may set manually on a split task.
// "Submitted" is set by the worker on submit, and "Completed" is set by
// the review flow on approval - neither is assignable by hand.
const TEAM_LEAD_ASSIGNABLE_SPLIT_STATUSES = [
    SPLIT_TASK_STATUS.PENDING,
    SPLIT_TASK_STATUS.IN_PROGRESS,
    SPLIT_TASK_STATUS.REWORK,
    SPLIT_TASK_STATUS.COMPLETED,
    SPLIT_TASK_STATUS.CANCELLED
];

// A worker may submit a report only from these split task statuses.
const SUBMITTABLE_SPLIT_STATUSES = [
    SPLIT_TASK_STATUS.IN_PROGRESS,
    SPLIT_TASK_STATUS.REWORK
];

// task_reports.review_status
const REPORT_STATUS = {
    SUBMITTED: "Submitted",
    APPROVED: "Approved",
    REWORK: "Rework"
};

// tasks.status and task_assignments.status
const TASK_STATUS = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled"
};

const TASK_STATUSES = Object.values(TASK_STATUS);

// users.role - mirrors the user_role PostgreSQL ENUM exactly
const ROLES = {
    ADMIN: "Admin",
    MANAGER: "Manager",
    TEAM_LEAD: "Team Lead",
    EMPLOYEE: "Employee",
    INTERN: "Intern"
};

// Roles that can be assigned a split task and submit reports
const WORKER_ROLES = [ROLES.EMPLOYEE, ROLES.INTERN];

module.exports = {
    SPLIT_TASK_STATUS,
    SPLIT_TASK_STATUSES,
    TEAM_LEAD_ASSIGNABLE_SPLIT_STATUSES,
    SUBMITTABLE_SPLIT_STATUSES,
    REPORT_STATUS,
    TASK_STATUS,
    TASK_STATUSES,
    ROLES,
    WORKER_ROLES
};
