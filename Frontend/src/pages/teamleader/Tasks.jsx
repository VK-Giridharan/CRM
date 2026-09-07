import { useEffect, useState } from "react";

import {
    TaskDetails,
    teamLeadTasks,
    splitTaskList,
    createSplitTask,
    updateSplitTask,
    changeSplitTaskStatus
} from "../../services/taskService";

import { getWorkers } from "../../services/workerService";
import { formatDate } from "../../utils/formatDate";

function TeamLeaderTask() {

    // =====================================================
    // COMMON
    // =====================================================

    const [loading, setLoading] = useState(false);

    const [tasks, setTasks] = useState([]);

    const [selectedTask, setSelectedTask] = useState(null);

    const [taskDetails, setTaskDetails] = useState(null);

    const [showTaskDetails, setShowTaskDetails] = useState(false);

    const [workers, setWorkers] = useState([]);

    const [splitTasks, setSplitTasks] = useState([]);

    // =====================================================
    // MODALS
    // =====================================================

    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [showSplitModal, setShowSplitModal] = useState(false);

    // =====================================================
    // SEARCH
    // =====================================================

    const [search, setSearch] = useState("");

    // =====================================================
    // SPLIT TASK FORM
    // =====================================================

    const [splitForm, setSplitForm] = useState({

        title: "",

        description: "",

        employee_id: "",

        status: "Pending",

        remark: ""

    });

    // =====================================================
    // LOAD TASKS
    // =====================================================

    const loadTasks = async () => {

        try {

            setLoading(true);

            const response = await teamLeadTasks();

            setTasks(response.data || []);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    // =====================================================
    // LOAD SPLIT TASKS
    // =====================================================

    const loadSplitTasks = async (assignmentId) => {

        try {

            console.log(
                "LOADING SPLIT TASKS FOR ASSIGNMENT:",
                assignmentId
            );

            const response = await splitTaskList(assignmentId);

            console.log(
                "SPLIT TASK LIST RESPONSE:",
                response
            );

            setSplitTasks(response.data || []);

        } catch (error) {

            console.log(
                "SPLIT TASK LIST ERROR:",
                error.response?.data || error
            );

            setSplitTasks([]);

        }

    };

    // =====================================================
    // LOAD WORKERS
    // =====================================================

    const loadWorkers = async () => {

        try {

            const response = await getWorkers();

            setWorkers(response.data || []);

        } catch (error) {

            console.log(error);

        }

    };

    // =====================================================
    // OPEN TASK DETAILS
    // =====================================================

    const handleViewTask = async (task) => {

        try {

            setSelectedTask(task);

            const response = await TaskDetails({

                task_id: task.id

            });

            console.log(
                "TASK DETAILS RESPONSE:",
                response
            );

            const taskData = response.data;

            setSelectedTask(taskData);

            console.log(
                "TASK ID:",
                taskData.id
            );

            console.log(
                "ASSIGNMENT ID:",
                taskData.assignment_id
            );

            await loadSplitTasks(
                taskData.assignment_id
            );

            setShowDetailsModal(true);

        } catch (error) {

            console.log(
                "TASK DETAILS ERROR:",
                error
            );

            console.log(
                "SERVER RESPONSE:",
                error.response?.data
            );

        }

    };

    // =====================================================
    // OPEN SPLIT MODAL
    // =====================================================

    const handleOpenSplit = () => {

        setSplitForm({

            title: "",

            description: "",

            employee_id: "",

            status: "Pending",

            remark: ""

        });

        setShowSplitModal(true);

    };

    // =====================================================
    // SPLIT INPUT
    // =====================================================

    const handleSplitInput = (e) => {

        setSplitForm({

            ...splitForm,

            [e.target.name]: e.target.value

        });

    };

    // =====================================================
    // CREATE SPLIT TASK
    // =====================================================

    const handleCreateSplitTask = async () => {

        try {

            if (!splitForm.title.trim()) {

                alert("Split Task Title is required");

                return;

            }

            if (!splitForm.employee_id) {

                alert("Please select Employee / Intern");

                return;

            }

            console.log("SELECTED TASK BEFORE SPLIT:", selectedTask);
            console.log("ASSIGNMENT ID:", selectedTask?.assignment_id);

            await createSplitTask({

                parent_assignment_id:
                    selectedTask.assignment_id ||
                    selectedTask.parent_assignment_id,

                title: splitForm.title,

                description: splitForm.description,

                employee_id: splitForm.employee_id,

                status: splitForm.status,

                remarks: splitForm.remark

            });

            setShowSplitModal(false);

            setSplitForm({

                title: "",

                description: "",

                employee_id: "",

                status: "Pending",

                remark: ""

            });

            await loadSplitTasks(
                selectedTask.assignment_id
            );

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Unable to create split task"
            );

        }

    };

    // =====================================================
    // CHANGE SPLIT TASK STATUS
    // =====================================================

    const handleSplitStatusChange = async (splitTask, status) => {

        try {

            console.log(
                "CHANGING SPLIT TASK STATUS:",
                splitTask.id,
                status
            );

            const response = await changeSplitTaskStatus({

                split_task_id: splitTask.id,

                status: status

            });

            console.log(
                "SPLIT STATUS RESPONSE:",
                response
            );

            alert(
                response.message ||
                "Split Task Status Updated Successfully"
            );

            // IMPORTANT:
            // splitTaskList needs assignment_id
            await loadSplitTasks(
                selectedTask.assignment_id
            );

        } catch (error) {

            console.log(
                "SPLIT STATUS ERROR:",
                error.response?.data || error
            );

            alert(
                error.response?.data?.message ||
                "Unable to update split task status"
            );

        }

    };

    // =====================================================
    // SEARCH
    // =====================================================

    const filteredTasks = tasks.filter((task) => {

        const value = search.toLowerCase();

        return (

            task.title?.toLowerCase().includes(value) ||

            task.customer_name
                ?.toLowerCase()
                .includes(value) ||

            task.company_name
                ?.toLowerCase()
                .includes(value)

        );

    });

    // =====================================================
    // USE EFFECT
    // =====================================================

    useEffect(() => {

        loadTasks();

        loadWorkers();

    }, []);

    // =====================================================
    // WORKERS
    // =====================================================

    const availableWorkers = workers.filter(

        (worker) =>

            worker.role === "Employee" ||

            worker.role === "Intern"

    );

    // =====================================================
    // JSX
    // =====================================================

    return (

        <div className="space-y-6">

            {/* =================================================
                HEADER
            ================================================= */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">

                    Task Management

                </h1>

                <p className="text-gray-500 mt-1">

                    View Manager Tasks and Split Tasks for Employees

                </p>

            </div>


            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="bg-white rounded-xl shadow p-5">

                <input

                    type="text"

                    placeholder="Search Task..."

                    value={search}

                    onChange={(e) =>
                        setSearch(e.target.value)
                    }

                    className="w-96 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"

                />

            </div>


            {/* =================================================
                TASK TABLE
            ================================================= */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="px-5 py-4 text-left">
                                Task
                            </th>

                            <th className="px-5 py-4 text-left">
                                Customer
                            </th>

                            <th className="px-5 py-4 text-left">
                                Company
                            </th>

                            <th className="px-5 py-4 text-left">
                                Priority
                            </th>

                            <th className="px-5 py-4 text-left">
                                Start Date
                            </th>

                            <th className="px-5 py-4 text-left">
                                Due Date
                            </th>

                            <th className="px-5 py-4 text-left">
                                Status
                            </th>

                            <th className="px-5 py-4 text-center">
                                Action
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {loading ? (

                            <tr>

                                <td
                                    colSpan="8"
                                    className="text-center py-10"
                                >

                                    Loading Tasks...

                                </td>

                            </tr>

                        ) : filteredTasks.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="8"
                                    className="text-center py-10 text-gray-500"
                                >

                                    No Tasks Assigned

                                </td>

                            </tr>

                        ) : (

                            filteredTasks.map((task) => (

                                <tr
                                    key={task.id}
                                    className="border-t hover:bg-gray-50"
                                >

                                    <td className="px-5 py-4">

                                        <p className="font-semibold">

                                            {task.title}

                                        </p>

                                        <p className="text-sm text-gray-500">

                                            #{task.id}

                                        </p>

                                    </td>

                                    <td className="px-5 py-4">

                                        {task.customer_name || "-"}

                                    </td>

                                    <td className="px-5 py-4">

                                        {task.company_name || "-"}

                                    </td>

                                    <td className="px-5 py-4">

                                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">

                                            {task.priority || "-"}

                                        </span>

                                    </td>

                                    <td className="px-5 py-4">

                                        {formatDate(task.start_date)}

                                    </td>

                                    <td className="px-5 py-4">

                                        {formatDate(task.due_date)}

                                    </td>

                                    <td className="px-5 py-4">

                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">

                                            {task.status || "Pending"}

                                        </span>

                                    </td>

                                    <td className="px-5 py-4 text-center">

                                        <button

                                            onClick={() =>
                                                handleViewTask(task)
                                            }

                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"

                                        >

                                            View

                                        </button>

                                    </td>

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>


            {/* =================================================
                TASK DETAILS MODAL
            ================================================= */}

            {showDetailsModal && selectedTask && (

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">

                        {/* HEADER */}

                        <div className="border-b px-6 py-5 flex justify-between items-center">

                            <div>

                                <h2 className="text-2xl font-bold">

                                    Task Details

                                </h2>

                                <p className="text-gray-500">

                                    Parent Task #{selectedTask.id}

                                </p>

                            </div>

                            <button

                                onClick={() =>
                                    setShowDetailsModal(false)
                                }

                                className="text-2xl text-gray-500 hover:text-red-500"

                            >

                                ×

                            </button>

                        </div>


                        {/* PARENT TASK */}

                        <div className="p-6">

                            <div className="bg-gray-50 rounded-xl p-5">

                                <div className="flex justify-between items-start">

                                    <div>

                                        <h3 className="text-xl font-bold">

                                            {selectedTask.title}

                                        </h3>

                                        <p className="text-gray-500 mt-2">

                                            {selectedTask.description || "-"}

                                        </p>

                                    </div>

                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">

                                        {selectedTask.status}

                                    </span>

                                </div>

                                <div className="grid grid-cols-4 gap-4 mt-5">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Priority
                                        </p>

                                        <p className="font-semibold">
                                            {selectedTask.priority || "-"}
                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Start Date
                                        </p>

                                        <p className="font-semibold">
                                            {formatDate(selectedTask.start_date)}
                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Due Date
                                        </p>

                                        <p className="font-semibold">
                                            {formatDate(selectedTask.due_date)}
                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Company
                                        </p>

                                        <p className="font-semibold">
                                            {selectedTask.company_name || "-"}
                                        </p>

                                    </div>

                                </div>

                            </div>


                            {/* =================================================
                                SPLIT TASK SECTION
                            ================================================= */}

                            <div className="mt-8">

                                <div className="flex justify-between items-center mb-4">

                                    <div>

                                        <h3 className="text-xl font-bold">

                                            Split Tasks

                                        </h3>

                                        <p className="text-gray-500 text-sm">

                                            Divide this Manager task among your Employee / Intern

                                        </p>

                                    </div>


                                    {/* ALWAYS SHOW SPLIT TASK BUTTON */}

                                    <button
                                        onClick={handleOpenSplit}
                                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
                                    >
                                        + Split Task
                                    </button>

                                </div>


                                {/* SPLIT TABLE */}

                                {splitTasks.length === 0 ? (

                                    <div className="border border-dashed rounded-xl p-8 text-center text-gray-500">

                                        No Split Tasks Created

                                        <p className="text-sm mt-2">

                                            Click "Split Task" to divide this task.

                                        </p>

                                    </div>

                                ) : (

                                    <div className="border rounded-xl overflow-hidden">

                                        <table className="w-full">

                                            <thead className="bg-gray-100">

                                                <tr>

                                                    <th className="px-4 py-3 text-left">
                                                        #
                                                    </th>

                                                    <th className="px-4 py-3 text-left">
                                                        Title
                                                    </th>

                                                    <th className="px-4 py-3 text-left">
                                                        Description
                                                    </th>

                                                    <th className="px-4 py-3 text-left">
                                                        Employee
                                                    </th>

                                                    <th className="px-4 py-3 text-left">
                                                        Status
                                                    </th>

                                                    <th className="px-4 py-3 text-left">
                                                        Remark
                                                    </th>

                                                    <th className="px-4 py-3 text-center">
                                                        Action
                                                    </th>

                                                </tr>

                                            </thead>

                                            <tbody>

                                                {splitTasks.map(
                                                    (splitTask, index) => (

                                                        <tr
                                                            key={splitTask.id}
                                                            className="border-t"
                                                        >

                                                            <td className="px-4 py-3">

                                                                #{index + 1}

                                                            </td>

                                                            <td className="px-4 py-3 font-semibold">

                                                                {splitTask.title}

                                                            </td>

                                                            <td className="px-4 py-3">

                                                                {splitTask.description || "-"}

                                                            </td>

                                                            <td className="px-4 py-3">

                                                                {splitTask.employee_name || (

                                                                    <span className="text-orange-500">

                                                                        Not Assigned

                                                                    </span>

                                                                )}

                                                            </td>

                                                            <td className="px-4 py-3">

                                                                <select
                                                                    value={splitTask.status || "Pending"}
                                                                    onChange={(e) =>
                                                                        handleSplitStatusChange(
                                                                            splitTask,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className={`border rounded-lg px-3 py-2 text-sm font-medium outline-none cursor-pointer
                                                                         ${splitTask.status === "Completed"
                                                                            ? "bg-green-50 text-green-700 border-green-300"
                                                                            : splitTask.status === "In Progress"
                                                                                ? "bg-blue-50 text-blue-700 border-blue-300"
                                                                                : splitTask.status === "Cancelled"
                                                                                    ? "bg-red-50 text-red-700 border-red-300"
                                                                                    : "bg-yellow-50 text-yellow-700 border-yellow-300"
                                                                        }
                                                                        `}
                                                                >

                                                                    <option value="Pending">
                                                                        Pending
                                                                    </option>

                                                                    <option value="In Progress">
                                                                        In Progress
                                                                    </option>

                                                                    <option value="Completed">
                                                                        Completed
                                                                    </option>

                                                                    <option value="Cancelled">
                                                                        Cancelled
                                                                    </option>

                                                                </select>

                                                            </td>

                                                            <td className="px-4 py-3">

                                                                {splitTask.remarks || "-"}

                                                            </td>

                                                            <td className="px-4 py-3 text-center">

                                                                {splitTask.employee_name ? (

                                                                    <span className="text-green-600 font-semibold">
                                                                        Assigned
                                                                    </span>

                                                                ) : (

                                                                    <span className="text-orange-500 font-semibold">
                                                                        Not Assigned
                                                                    </span>

                                                                )}

                                                            </td>

                                                        </tr>

                                                    )
                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                )}

                            </div>

                        </div>


                        {/* FOOTER */}

                        <div className="border-t px-6 py-4 flex justify-end">

                            <button

                                onClick={() =>
                                    setShowDetailsModal(false)
                                }

                                className="px-5 py-2 border rounded-lg hover:bg-gray-100"

                            >

                                Close

                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* =================================================
                CREATE SPLIT TASK MODAL
            ================================================= */}

            {showSplitModal && selectedTask && (

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">

                        <div className="border-b px-6 py-4 flex justify-between">

                            <div>

                                <h2 className="text-xl font-bold">

                                    Create Split Task

                                </h2>

                                <p className="text-sm text-gray-500">

                                    Parent: {selectedTask.title}

                                </p>

                            </div>

                            <button

                                onClick={() =>
                                    setShowSplitModal(false)
                                }

                                className="text-2xl text-gray-500"

                            >

                                ×

                            </button>

                        </div>


                        <div className="p-6 space-y-5">

                            <div>

                                <label className="font-medium block mb-2">

                                    Split Task Title

                                </label>

                                <input

                                    type="text"

                                    name="title"

                                    value={splitForm.title}

                                    onChange={handleSplitInput}

                                    placeholder="Example: Prepare Website Design"

                                    className="w-full border rounded-lg px-4 py-3"

                                />

                            </div>


                            <div>

                                <label className="font-medium block mb-2">

                                    Description

                                </label>

                                <textarea

                                    name="description"

                                    value={splitForm.description}

                                    onChange={handleSplitInput}

                                    rows="4"

                                    placeholder="Enter split task description"

                                    className="w-full border rounded-lg px-4 py-3"

                                />

                            </div>

                            <div>

                                <label className="font-medium block mb-2">

                                    Assign To

                                </label>

                                <select

                                    name="employee_id"

                                    value={splitForm.employee_id}

                                    onChange={handleSplitInput}

                                    className="w-full border rounded-lg px-4 py-3"

                                >

                                    <option value="">

                                        Select Employee / Intern

                                    </option>

                                    {availableWorkers.map((worker) => (

                                        <option
                                            key={worker.id}
                                            value={worker.id}
                                        >

                                            {worker.first_name}{" "}
                                            {worker.last_name}{" "}
                                            ({worker.role})

                                        </option>

                                    ))}

                                </select>

                            </div>


                            <div className="grid grid-cols-2 gap-4">

                                <div>

                                    <label className="font-medium block mb-2">

                                        Status

                                    </label>

                                    <select

                                        name="status"

                                        value={splitForm.status}

                                        onChange={handleSplitInput}

                                        className="w-full border rounded-lg px-4 py-3"

                                    >

                                        <option value="Pending">
                                            Pending
                                        </option>

                                        <option value="In Progress">
                                            In Progress
                                        </option>

                                    </select>

                                </div>


                                <div>

                                    <label className="font-medium block mb-2">

                                        Remark

                                    </label>

                                    <input

                                        type="text"

                                        name="remark"

                                        value={splitForm.remark}

                                        onChange={handleSplitInput}

                                        placeholder="Optional"

                                        className="w-full border rounded-lg px-4 py-3"

                                    />

                                </div>

                            </div>

                        </div>


                        <div className="border-t px-6 py-4 flex justify-end gap-3">

                            <button

                                onClick={() =>
                                    setShowSplitModal(false)
                                }

                                className="px-5 py-2 border rounded-lg"

                            >

                                Cancel

                            </button>

                            <button

                                onClick={handleCreateSplitTask}

                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"

                            >

                                Create Split Task

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

export default TeamLeaderTask;