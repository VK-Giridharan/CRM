const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/verifyToken");

const {
    createTask,
    taskList,
    taskDetails,
    updateTask,
    deleteTask,
    assignTask,
    assignedWorkers,
    changeTaskStatus,
    teamLeadTasks,
    splitTaskList,
    createSplitTask,
    updateSplitTask,
    changeSplitTaskStatus,
    employeeTaskList,
    employeeTaskDetails,
    employeeStartTask
} = require("../controllers/taskController");

// ================= MANAGER =================

router.post("/create", verifyToken, createTask);

router.post("/list", verifyToken, taskList);

router.post("/details", verifyToken, taskDetails);

router.post("/update", verifyToken, updateTask);

router.post("/delete", verifyToken, deleteTask);

router.post("/assign", verifyToken, assignTask);

router.post("/assigned-workers", verifyToken, assignedWorkers);

router.post("/change-status", verifyToken, changeTaskStatus);

// ================= TEAM LEAD =================

router.post("/teamlead-list", verifyToken, teamLeadTasks);

router.post("/split-list", verifyToken, splitTaskList);

router.post("/split-create", verifyToken, createSplitTask);

router.post("/split-update", verifyToken, updateSplitTask);

router.post("/split-change-status", verifyToken, changeSplitTaskStatus);

// ================= EMPLOYEE / INTERN =================
// Both worker roles share these endpoints; the controllers authorise
// Employee and Intern and scope every query to the caller's own rows.

router.post("/employee/tasks", verifyToken, employeeTaskList);

router.post("/employee/task-details", verifyToken, employeeTaskDetails);

router.post("/employee/start-task", verifyToken, employeeStartTask);

module.exports = router;
