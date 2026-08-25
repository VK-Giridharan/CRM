import { useEffect, useState } from "react";

import { createTask, taskList, updateTask, deleteTask, assignTask } from "../../services/taskService";

import { customerList } from "../../services/customerService";

import { getWorkers } from "../../services/workerService";

function Tasks() {

    // ================= STATES =================

    const [tasks, setTasks] = useState([]);

    const [customers, setCustomers] = useState([]);

    const [workers, setWorkers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);

    const [editingTask, setEditingTask] = useState(null);

    const [search, setSearch] = useState("");

    const [showAssignModal, setShowAssignModal] = useState(false);

    const [selectedTask, setSelectedTask] = useState(null);

    const [selectedWorker, setSelectedWorker] = useState("");

    const [savingAssign, setSavingAssign] = useState(false);

    const [formData, setFormData] = useState({

        customer_id: "",

        title: "",

        description: "",

        priority: "Medium",

        start_date: "",

        due_date: "",

        status: "Pending"

    });

    // ================= LOAD TASKS =================

    const loadTasks = async () => {

        try {

            setLoading(true);

            const response = await taskList();

            setTasks(response.data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    // ================= LOAD CUSTOMERS =================

    const loadCustomers = async () => {

        try {

            const response = await customerList();

            setCustomers(response.data);

        } catch (error) {

            console.log(error);

        }

    };

    // ================= LOAD WORKERS =================

    const loadWorkers = async () => {

        try {

            const response = await getWorkers();

            setWorkers(response.data);

        } catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {

        loadTasks();

        loadCustomers();

        loadWorkers();

    }, []);

    const handleChange = (e) => {

        setFormData({

            ...formData,

            [e.target.name]: e.target.value

        });

    };

    const formatDateForInput = (date) => {

        if (!date) return "";

        const dateString = String(date);

        // Already YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        // ISO / timestamp format
        const parsedDate = new Date(dateString);

        if (isNaN(parsedDate.getTime())) {
            return "";
        }

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
        const day = String(parsedDate.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const handleSave = async () => {

        try {

            if (editingTask) {

                await updateTask({

                    task_id: editingTask.id,

                    ...formData

                });

            } else {

                await createTask(formData);

            }

            setShowModal(false);

            setEditingTask(null);

            setFormData({

                customer_id: "",

                title: "",

                description: "",

                priority: "Medium",

                start_date: "",

                due_date: "",

                status: "Pending"

            });

            loadTasks();

        } catch (error) {

            console.log(error);

        }

    };

    const handleDelete = async (id) => {

        if (!window.confirm("Delete Task?")) return;

        try {

            await deleteTask({
                task_id: id
            });

            alert("Task Deleted Successfully");

            loadTasks();

        } catch (error) {

            console.log("DELETE ERROR:", error);
            console.log("BACKEND ERROR:", error.response?.data);

        }

    };

    // customer_name comes from a join and is null for a removed customer,
    // so every field is guarded before .toLowerCase().
    const filteredTasks = tasks.filter((task) => {

        const value = search.toLowerCase();

        return (

            (task?.title || "").toLowerCase().includes(value)

            ||

            (task?.customer_name || "").toLowerCase().includes(value)

        );

    });

    // The backend only accepts a Team Lead for a main task assignment, so
    // offering Employees/Interns here produced a guaranteed 400.
    const assignWorkers = workers.filter(

        (worker) => worker?.role === "Team Lead"

    );

    const handleAssign = async () => {

        if (!selectedWorker) {

            alert("Select Worker");

            return;

        }

        try {

            setSavingAssign(true);

            await assignTask({

                task_id: selectedTask.id,

                employee_id: selectedWorker

            });

            alert("Task Assigned Successfully");

            setShowAssignModal(false);

            setSelectedWorker("");

            setSelectedTask(null);

        }

        catch (error) {

            console.log(error);

        }

        finally {

            setSavingAssign(false);

        }

    };

    return (
        <div className="space-y-6">

            <div className="flex justify-between items-center">

                <div>

                    <h1 className="text-3xl font-bold">

                        Task Management

                    </h1>

                    <p className="text-gray-500">

                        Create and Assign Tasks

                    </p>

                </div>

                <button

                    onClick={() => {

                        setEditingTask(null);

                        setFormData({

                            customer_id: "",

                            title: "",

                            description: "",

                            priority: "Medium",

                            start_date: "",

                            due_date: "",

                            status: "Pending"

                        });

                        setShowModal(true);

                    }}

                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">

                    + Create Task

                </button>

            </div>

            <div className="bg-white rounded-xl shadow p-4">

                <input

                    type="text"

                    placeholder="Search Task..."

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                    className="w-96 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"

                />

            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="px-5 py-3 text-left">

                                Customer

                            </th>

                            <th className="px-5 py-3 text-left">

                                Task

                            </th>

                            <th className="px-5 py-3 text-left">

                                Priority

                            </th>

                            <th className="px-5 py-3 text-left">

                                Due Date

                            </th>

                            <th className="px-5 py-3 text-left">

                                Status

                            </th>

                            <th className="px-5 py-3 text-center">

                                Action

                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            loading ?

                                <tr>

                                    <td
                                        colSpan="6"
                                        className="text-center py-10">

                                        Loading...

                                    </td>

                                </tr>

                                :

                                filteredTasks.length === 0 ?

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="text-center py-10">

                                            No Tasks Found

                                        </td>

                                    </tr>

                                    :

                                    filteredTasks.map((task) => (

                                        <tr
                                            key={task.id}
                                            className="border-t hover:bg-gray-50">

                                            <td className="px-5 py-3">

                                                {task.customer_name}

                                            </td>

                                            <td className="px-5 py-3">

                                                {task.title}

                                            </td>

                                            <td className="px-5 py-3">

                                                {task.priority}

                                            </td>

                                            <td className="px-5 py-3">

                                                {task.due_date}

                                            </td>

                                            <td className="px-5 py-3">

                                                <span
                                                    className={`px-3 py-1 rounded-full text-sm

                                        ${task.status === "Completed"

                                                            ? "bg-green-100 text-green-700"

                                                            : task.status === "In Progress"

                                                                ? "bg-blue-100 text-blue-700"

                                                                : "bg-yellow-100 text-yellow-700"

                                                        }`}>

                                                    {task.status}

                                                </span>

                                            </td>

                                            <td className="px-5 py-3 text-center space-x-2">

                                                <button
                                                    onClick={() => {

                                                        setEditingTask(task);

                                                        setFormData({

                                                            customer_id: task.customer_id || "",

                                                            title: task.title || "",

                                                            description: task.description || "",

                                                            priority: task.priority || "Medium",

                                                            start_date: formatDateForInput(task.start_date),

                                                            due_date: formatDateForInput(task.due_date),

                                                            status: task.status || "Pending"

                                                        });

                                                        setShowModal(true);

                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                                                >
                                                    Edit
                                                </button>

                                                <button

                                                    onClick={() => handleDelete(task.id)}

                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">

                                                    Delete

                                                </button>

                                                <button

                                                    onClick={() => {

                                                        setSelectedTask(task);

                                                        setSelectedWorker("");

                                                        setShowAssignModal(true);

                                                    }}

                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">

                                                    Assign

                                                </button>

                                            </td>

                                        </tr>

                                    ))

                        }

                    </tbody>

                </table>

            </div>
            {
                showModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-xl w-full max-w-3xl p-6">

                        <div className="flex justify-between items-center mb-6">

                            <h2 className="text-2xl font-bold">

                                {editingTask ? "Edit Task" : "Create Task"}

                            </h2>

                            <button

                                onClick={() => {

                                    setShowModal(false);

                                    setEditingTask(null);

                                }}

                                className="text-3xl">

                                ×

                            </button>

                        </div>

                        <div className="grid grid-cols-2 gap-4">

                            {/* Customer */}

                            <div>

                                <label className="block mb-2 font-medium">

                                    Customer

                                </label>

                                <select

                                    name="customer_id"

                                    value={formData.customer_id}

                                    onChange={handleChange}

                                    className="w-full border rounded-lg px-4 py-3">

                                    <option value="">

                                        Select Customer

                                    </option>

                                    {

                                        customers.map((customer) => (

                                            <option

                                                key={customer.id}

                                                value={customer.id}>

                                                {customer.customer_name}

                                            </option>

                                        ))

                                    }

                                </select>

                            </div>

                            {/* Priority */}

                            <div>

                                <label className="block mb-2 font-medium">

                                    Priority

                                </label>

                                <select

                                    name="priority"

                                    value={formData.priority}

                                    onChange={handleChange}

                                    className="w-full border rounded-lg px-4 py-3">

                                    <option>Low</option>

                                    <option>Medium</option>

                                    <option>High</option>

                                    <option>Urgent</option>

                                </select>

                            </div>

                            {/* Title */}

                            <div className="col-span-2">

                                <label className="block mb-2 font-medium">

                                    Task Title

                                </label>

                                <input

                                    type="text"

                                    name="title"

                                    value={formData.title}

                                    onChange={handleChange}

                                    className="w-full border rounded-lg px-4 py-3"

                                />

                            </div>

                            {/* Description */}

                            <div className="col-span-2">

                                <label className="block mb-2 font-medium">

                                    Description

                                </label>

                                <textarea

                                    rows="4"

                                    name="description"

                                    value={formData.description}

                                    onChange={handleChange}

                                    className="w-full border rounded-lg px-4 py-3 resize-none">

                                </textarea>

                            </div>

                            {/* Start Date */}

                            <div>

                                <label className="block mb-2 font-medium">

                                    Start Date

                                </label>

                                <input

                                    type="date"

                                    name="start_date"

                                    value={formData.start_date}

                                    onChange={handleChange}

                                    className="w-full border rounded-lg px-4 py-3"

                                />

                            </div>

                            {/* Due Date */}

                            <div>

                                <label className="block mb-2 font-medium">

                                    Due Date

                                </label>

                                <input

                                    type="date"

                                    name="due_date"

                                    value={formData.due_date}

                                    onChange={handleChange}

                                    className="w-full border rounded-lg px-4 py-3"

                                />

                            </div>

                            {/* Status */}

                            {

                                editingTask &&

                                <div className="col-span-2">

                                    <label className="block mb-2 font-medium">

                                        Status

                                    </label>

                                    <select

                                        name="status"

                                        value={formData.status}

                                        onChange={handleChange}

                                        className="w-full border rounded-lg px-4 py-3">

                                        <option>Pending</option>

                                        <option>In Progress</option>

                                        <option>Completed</option>

                                        <option>Cancelled</option>

                                    </select>

                                </div>

                            }

                        </div>

                        <div className="flex justify-end gap-3 mt-6">

                            <button

                                onClick={() => {

                                    setShowModal(false);

                                    setEditingTask(null);

                                }}

                                className="border px-5 py-2 rounded-lg">

                                Cancel

                            </button>

                            <button

                                onClick={handleSave}

                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">

                                {editingTask ? "Update" : "Create"}

                            </button>

                        </div>

                    </div>

                </div>
            }

            {
                showAssignModal &&

                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

                    <div className="bg-white rounded-xl w-full max-w-lg p-6">

                        <div className="flex justify-between items-center mb-6">

                            <h2 className="text-2xl font-bold">

                                Assign Worker

                            </h2>

                            <button

                                onClick={() => {

                                    setShowAssignModal(false);

                                    setSelectedTask(null);

                                }}

                                className="text-3xl">

                                ×

                            </button>

                        </div>

                        <div className="space-y-4">

                            <input

                                readOnly

                                value={selectedTask?.title || ""}

                                className="w-full border rounded-lg px-4 py-3 bg-gray-100"

                            />

                            <select

                                value={selectedWorker}

                                onChange={(e) => setSelectedWorker(e.target.value)}

                                className="w-full border rounded-lg px-4 py-3">

                                <option value="">

                                    Select Worker

                                </option>

                                {

                                    assignWorkers.map(worker => (

                                        <option

                                            key={worker.id}

                                            value={worker.id}>

                                            {worker.first_name} {worker.last_name}

                                            ({worker.role})

                                        </option>

                                    ))

                                }

                            </select>

                        </div>

                        <div className="flex justify-end gap-3 mt-6">

                            <button

                                onClick={() => setShowAssignModal(false)}

                                className="border px-5 py-2 rounded-lg">

                                Cancel

                            </button>

                            <button

                                onClick={handleAssign}

                                disabled={savingAssign}

                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg">

                                {

                                    savingAssign

                                        ?

                                        "Assigning..."

                                        :

                                        "Assign"

                                }

                            </button>

                        </div>

                    </div>

                </div>

            }

        </div>
    )
}

export default Tasks;