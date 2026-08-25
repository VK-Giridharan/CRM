import api from "./api";

// =====================================================
// MANAGER / COMMON TASK APIs
// =====================================================

// Create Main Task
export const createTask = async (data) => {
    const response = await api.post(
        "/task/create",
        data
    );

    return response.data;
};


// Get All Tasks
export const taskList = async () => {
    const response = await api.post(
        "/task/list"
    );

    return response.data;
};


// Get Task Details
export const TaskDetails = async (data) => {
    const response = await api.post(
        "/task/details",
        data
    );

    return response.data;
};


// Update Main Task
export const updateTask = async (data) => {
    const response = await api.post(
        "/task/update",
        data
    );

    return response.data;
};


// Delete Main Task
export const deleteTask = async (data) => {
    const response = await api.post(
        "/task/delete",
        data
    );

    return response.data;
};


// =====================================================
// MANAGER - TASK ASSIGNMENT
// =====================================================

// Manager assigns Main Task to Team Lead
export const assignTask = async (data) => {
    const response = await api.post(
        "/task/assign",
        data
    );

    return response.data;
};


// Get assigned Team Leads
export const assignedWorkers = async (data) => {
    const response = await api.post(
        "/task/assigned-workers",
        data
    );

    return response.data;
};


// Change Main Task Assignment Status
export const changeTaskStatus = async (data) => {
    const response = await api.post(
        "/task/change-status",
        data
    );

    return response.data;
};


// =====================================================
// TEAM LEAD - MAIN TASKS
// =====================================================

// Get tasks assigned to logged-in Team Lead
export const teamLeadTasks = async () => {
    const response = await api.post(
        "/task/teamlead-list"
    );

    return response.data;
};


// =====================================================
// TEAM LEAD - SPLIT TASKS
// =====================================================

// Get Split Tasks under a Main Task
export const splitTaskList = async (parent_assignment_id) => {

    const response = await api.post(
        "/task/split-list",
        {
            task_assignment_id: parent_assignment_id
        }
    );

    return response.data;
};


// Create Split Task
// Team Lead creates and assigns split task
// employee_id can be Employee / Intern
export const createSplitTask = async (data) => {
    const response = await api.post(
        "/task/split-create",
        data
    );

    return response.data;
};


// Update Split Task
export const updateSplitTask = async (data) => {
    const response = await api.post(
        "/task/split-update",
        data
    );

    return response.data;
};

// Change Split Task Status
export const changeSplitTaskStatus = async ({
    split_task_id,
    status
}) => {

    const response = await api.post(
        "/task/split-change-status",
        {
            split_task_id,
            status
        }
    );

    return response.data;
};

// =====================================================
// EMPLOYEE / INTERN
// Both worker roles share these endpoints.
// =====================================================

export const employeeTaskList = async () => {

    const response = await api.post(
        "/task/employee/tasks"
    );

    return response.data;

};


// Single split task with its report history
export const employeeTaskDetails = async (split_task_id) => {

    const response = await api.post(
        "/task/employee/task-details",
        {
            split_task_id
        }
    );

    return response.data;

};

export const employeeStartTask = async (split_task_id) => {

    const response = await api.post(
        "/task/employee/start-task",
        {
            split_task_id
        }
    );

    return response.data;

};