const pool = require("../database/connection");

const { SPLIT_TASK_STATUS, TASK_STATUS } = require("./status");

// ======================================================
// PARENT TASK ROLL-UP
//
// The A-Z test report (BUG-029) found that completing and approving every
// child split task left the parent assignment and the parent task sitting at
// "Pending" forever - the Manager's task board never showed finished work.
//
// This module derives those two parent rows from the children below them:
//
//   split_tasks  ->  task_assignments.status
//   task_assignments -> tasks.status
//
// Rules, deliberately conservative:
//
//   * A task with NO split tasks is never touched. Plain, unsplit tasks keep
//     behaving exactly as they did before - the Manager still owns their
//     status.
//   * Cancelled children are ignored when deciding whether the rest are
//     finished; if every child is Cancelled the parent becomes Cancelled.
//   * A task a Manager has explicitly Cancelled is never revived.
//   * The roll-up is re-derived from scratch on every call, so it is
//     idempotent and self-correcting: sending work back for rework moves the
//     parents back to "In Progress" just as approving moves them forward.
//
// `executor` lets a caller pass an open transaction client so the roll-up
// commits atomically with the change that triggered it.
// ======================================================

const deriveStatus = (statuses) => {

    if (statuses.length === 0) return null;

    const active = statuses.filter(
        (s) => s !== SPLIT_TASK_STATUS.CANCELLED
    );

    // Everything was cancelled.
    if (active.length === 0) return TASK_STATUS.CANCELLED;

    // Every remaining child is finished.
    if (active.every((s) => s === SPLIT_TASK_STATUS.COMPLETED)) {
        return TASK_STATUS.COMPLETED;
    }

    // Nothing has been picked up yet.
    if (active.every((s) => s === SPLIT_TASK_STATUS.PENDING)) {
        return TASK_STATUS.PENDING;
    }

    // Something is underway (In Progress / Submitted / Rework, or a mix that
    // includes at least one Completed).
    return TASK_STATUS.IN_PROGRESS;

};

// ------------------------------------------------------
// Recompute one assignment from its split tasks, then recompute the owning
// task from all of its assignments.
// ------------------------------------------------------
const syncAssignmentAndTask = async (assignmentId, executor = pool) => {

    if (!assignmentId) return;

    const assignmentRow = await executor.query(
        `SELECT task_id FROM task_assignments WHERE id = $1`,
        [assignmentId]
    );

    if (assignmentRow.rows.length === 0) return;

    const taskId = assignmentRow.rows[0].task_id;

    // ---- assignment from its split tasks ----
    const splits = await executor.query(
        `SELECT status FROM split_tasks WHERE parent_assignment_id = $1`,
        [assignmentId]
    );

    const splitStatuses = splits.rows.map((r) => r.status);

    // No children -> leave this assignment exactly as the Team Lead set it.
    if (splitStatuses.length > 0) {

        const assignmentStatus = deriveStatus(splitStatuses);

        if (assignmentStatus) {

            const isComplete = assignmentStatus === TASK_STATUS.COMPLETED;

            // completed_at is decided here rather than in SQL: reusing $1 both
            // as the status value and inside a CASE comparison made Postgres
            // report "inconsistent types deduced for parameter $1".
            await executor.query(
                isComplete
                    ? `UPDATE task_assignments
                       SET status = $1,
                           completed_at = COALESCE(completed_at, NOW())
                       WHERE id = $2`
                    : `UPDATE task_assignments
                       SET status = $1,
                           completed_at = NULL
                       WHERE id = $2`,
                [assignmentStatus, assignmentId]
            );

        }

    }

    // ---- task from all of its assignments ----
    //
    // Only roll the task up when at least one of its assignments actually has
    // split tasks underneath it. Otherwise an unsplit task would be dragged
    // around by assignment statuses the Manager set by hand.
    const hasAnySplit = await executor.query(
        `SELECT 1
         FROM split_tasks st
         INNER JOIN task_assignments ta ON ta.id = st.parent_assignment_id
         WHERE ta.task_id = $1
         LIMIT 1`,
        [taskId]
    );

    if (hasAnySplit.rows.length === 0) return;

    const assignments = await executor.query(
        `SELECT status FROM task_assignments WHERE task_id = $1`,
        [taskId]
    );

    const taskStatus = deriveStatus(assignments.rows.map((r) => r.status));

    if (!taskStatus) return;

    // A task the Manager explicitly cancelled stays cancelled.
    await executor.query(
        `UPDATE tasks
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
           AND deleted_at IS NULL
           AND status <> $3`,
        [taskStatus, taskId, TASK_STATUS.CANCELLED]
    );

};

// Convenience wrapper for callers that only hold a split task id.
const syncFromSplitTask = async (splitTaskId, executor = pool) => {

    if (!splitTaskId) return;

    const row = await executor.query(
        `SELECT parent_assignment_id FROM split_tasks WHERE id = $1`,
        [splitTaskId]
    );

    if (row.rows.length === 0) return;

    await syncAssignmentAndTask(row.rows[0].parent_assignment_id, executor);

};

module.exports = {
    deriveStatus,
    syncAssignmentAndTask,
    syncFromSplitTask
};
