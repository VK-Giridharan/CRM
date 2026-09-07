import { useEffect, useState } from "react";

import {
    employeeTaskList,
    employeeTaskDetails,
    employeeStartTask
} from "../../services/taskService";

import {
    submitTaskReport,
    downloadReportAttachment
} from "../../services/taskReportService";

import StatusBadge from "../common/StatusBadge";
import { formatDate, formatDateTime } from "../../utils/formatDate";

// ======================================================
// WORKER TASK WORKSPACE
//
// Shared by the Employee and Intern pages - the workflow and the backend
// endpoints are identical for both roles, so the logic lives here once.
//
// Flow: assigned split task -> Start -> work -> Submit Report (+ optional
// attachment) -> Team Lead reviews -> Approved or Rework -> resubmit.
//
// Field names below match the API exactly:
//   list        -> id, title, status, parent_task_*, latest_review_*
//   details     -> the same plus reports[]
// ======================================================

const MAX_UPLOAD_MB = 2;





function WorkerTasks({ roleLabel = "Employee" }) {

    // ================= LIST =================

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [startingTask, setStartingTask] = useState(null);

    // ================= DETAILS MODAL =================

    const [showDetails, setShowDetails] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // ================= SUBMIT MODAL =================

    const [showSubmit, setShowSubmit] = useState(false);
    const [submitTask, setSubmitTask] = useState(null);
    const [reportText, setReportText] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    // ================= LOAD =================

    const loadTasks = async () => {

        try {

            setLoading(true);

            const response = await employeeTaskList();

            setTasks(response.data || []);

        } catch (error) {

            setTasks([]);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadTasks();

    }, []);

    // ================= START TASK =================

    const handleStartTask = async (task) => {

        try {

            setStartingTask(task.id);

            await employeeStartTask(task.id);

            await loadTasks();

        } catch (error) {

            alert(
                error.response?.data?.message ||
                "Unable to start task"
            );

        } finally {

            setStartingTask(null);

        }

    };

    // ================= VIEW DETAILS =================

    const handleViewDetails = async (task) => {

        try {

            setShowDetails(true);
            setDetailsLoading(true);
            setSelectedTask(null);

            const response = await employeeTaskDetails(task.id);

            setSelectedTask(response.data || null);

        } catch (error) {

            setSelectedTask(null);

        } finally {

            setDetailsLoading(false);

        }

    };

    const closeDetails = () => {

        setShowDetails(false);
        setSelectedTask(null);

    };

    // ================= SUBMIT REPORT =================

    const openSubmit = (task) => {

        setSubmitTask(task);
        setReportText("");
        setAttachment(null);
        setFormError("");
        setFormSuccess("");
        setShowSubmit(true);

    };

    const closeSubmit = () => {

        setShowSubmit(false);
        setSubmitTask(null);
        setReportText("");
        setAttachment(null);
        setFormError("");
        setFormSuccess("");

    };

    const handleFileChange = (event) => {

        const file = event.target.files?.[0] || null;

        setFormError("");

        if (!file) {
            setAttachment(null);
            return;
        }

        // Client-side check for immediate feedback. The backend enforces the
        // real limit and the MIME whitelist regardless of what happens here.
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {

            setFormError(
                `File is too large. Maximum size is ${MAX_UPLOAD_MB}MB`
            );

            event.target.value = "";
            setAttachment(null);

            return;

        }

        setAttachment(file);

    };

    const handleSubmitReport = async () => {

        setFormError("");
        setFormSuccess("");

        const trimmed = reportText.trim();

        if (!trimmed) {
            setFormError("Please write your report before submitting");
            return;
        }

        if (trimmed.length < 10) {
            setFormError("Report must be at least 10 characters");
            return;
        }

        // Guard against a double click firing two submissions.
        if (submitting) {
            return;
        }

        try {

            setSubmitting(true);

            const response = await submitTaskReport({
                split_task_id: submitTask.id,
                report: trimmed,
                attachment
            });

            setFormSuccess(
                response.message || "Report submitted successfully"
            );

            await loadTasks();

            // Give the user a moment to read the confirmation.
            setTimeout(() => {
                closeSubmit();
            }, 900);

        } catch (error) {

            setFormError(
                error.response?.data?.message ||
                "Unable to submit report"
            );

        } finally {

            setSubmitting(false);

        }

    };

    // ================= SEARCH =================

    const filteredTasks = tasks.filter((task) => {

        const value = search.toLowerCase();

        return (
            (task?.title || "").toLowerCase().includes(value) ||
            (task?.parent_task_title || "").toLowerCase().includes(value) ||
            (task?.description || "").toLowerCase().includes(value) ||
            (task?.status || "").toLowerCase().includes(value)
        );

    });

    // A report can be submitted from In Progress or Rework only - this
    // mirrors the backend rule exactly.
    const canSubmit = (status) =>
        status === "In Progress" || status === "Rework";

    // ================= JSX =================

    return (

        <div className="space-y-6">

            {/* HEADER */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">
                    My Tasks
                </h1>

                <p className="text-gray-500 mt-1">
                    {roleLabel} workspace &mdash; start your work, then submit a report for review
                </p>

            </div>


            {/* SEARCH */}

            <div className="bg-white rounded-xl shadow p-5">

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search task..."
                    className="w-full md:w-96 border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />

            </div>


            {/* TABLE */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-5 py-4 text-left">#</th>
                                <th className="px-5 py-4 text-left">Parent Task</th>
                                <th className="px-5 py-4 text-left">My Task</th>
                                <th className="px-5 py-4 text-left">Priority</th>
                                <th className="px-5 py-4 text-left">Due Date</th>
                                <th className="px-5 py-4 text-left">Status</th>
                                <th className="px-5 py-4 text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-500">
                                        Loading Tasks...
                                    </td>
                                </tr>

                            ) : filteredTasks.length === 0 ? (

                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-500">
                                        {tasks.length === 0
                                            ? "No tasks have been assigned to you yet"
                                            : "No tasks match your search"}
                                    </td>
                                </tr>

                            ) : (

                                filteredTasks.map((task, index) => (

                                    <tr key={task.id} className="border-t hover:bg-gray-50">

                                        <td className="px-5 py-4">
                                            {index + 1}
                                        </td>

                                        <td className="px-5 py-4">

                                            <p className="font-semibold">
                                                {task.parent_task_title || "-"}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                {task.customer_name || "-"}
                                            </p>

                                        </td>

                                        <td className="px-5 py-4">

                                            <p className="font-semibold">
                                                {task.title || "-"}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                Task #{task.id}
                                            </p>

                                        </td>

                                        <td className="px-5 py-4">
                                            {task.parent_task_priority || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {formatDate(task.parent_task_due_date)}
                                        </td>

                                        <td className="px-5 py-4">

                                            <StatusBadge status={task.status} />

                                            {task.status === "Rework" &&
                                                task.latest_review_remarks && (
                                                <p className="text-xs text-orange-600 mt-1 max-w-[200px]">
                                                    {task.latest_review_remarks}
                                                </p>
                                            )}

                                        </td>

                                        <td className="px-5 py-4">

                                            <div className="flex items-center justify-center gap-2">

                                                <button
                                                    onClick={() => handleViewDetails(task)}
                                                    className="border px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
                                                >
                                                    View
                                                </button>

                                                {task.status === "Pending" && (
                                                    <button
                                                        onClick={() => handleStartTask(task)}
                                                        disabled={startingTask === task.id}
                                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm"
                                                    >
                                                        {startingTask === task.id
                                                            ? "Starting..."
                                                            : "Start"}
                                                    </button>
                                                )}

                                                {canSubmit(task.status) && (
                                                    <button
                                                        onClick={() => openSubmit(task)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm"
                                                    >
                                                        {task.status === "Rework"
                                                            ? "Resubmit"
                                                            : "Submit Report"}
                                                    </button>
                                                )}

                                                {task.status === "Submitted" && (
                                                    <span className="text-purple-600 text-sm font-medium">
                                                        Awaiting review
                                                    </span>
                                                )}

                                            </div>

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* ================= DETAILS MODAL ================= */}

            {showDetails && (

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

                        <div className="border-b px-6 py-5 flex justify-between items-center">

                            <h2 className="text-2xl font-bold text-gray-800">
                                Task Details
                            </h2>

                            <button
                                onClick={closeDetails}
                                className="text-2xl text-gray-500 hover:text-red-500"
                            >
                                &times;
                            </button>

                        </div>

                        <div className="p-6">

                            {detailsLoading ? (

                                <div className="text-center py-10 text-gray-500">
                                    Loading Task Details...
                                </div>

                            ) : !selectedTask ? (

                                <div className="text-center py-10 text-red-500">
                                    Unable to load task details
                                </div>

                            ) : (

                                <div className="space-y-6">

                                    <div className="bg-gray-50 rounded-xl p-5">

                                        <div className="grid md:grid-cols-2 gap-5">

                                            <div>
                                                <p className="text-sm text-gray-500">My Task</p>
                                                <p className="font-semibold">
                                                    {selectedTask.title || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Status</p>
                                                <StatusBadge status={selectedTask.status} />
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Parent Task</p>
                                                <p className="font-semibold">
                                                    {selectedTask.parent_task_title || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Priority</p>
                                                <p className="font-semibold">
                                                    {selectedTask.parent_task_priority || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Customer</p>
                                                <p className="font-semibold">
                                                    {selectedTask.customer_name || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Team Lead</p>
                                                <p className="font-semibold">
                                                    {selectedTask.team_lead_name || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Start Date</p>
                                                <p className="font-semibold">
                                                    {formatDate(selectedTask.parent_task_start_date)}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Due Date</p>
                                                <p className="font-semibold">
                                                    {formatDate(selectedTask.parent_task_due_date)}
                                                </p>
                                            </div>

                                        </div>

                                    </div>

                                    <div>

                                        <h3 className="text-lg font-bold mb-2">
                                            Description
                                        </h3>

                                        <div className="border rounded-xl p-5">
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {selectedTask.description ||
                                                    "No description provided"}
                                            </p>
                                        </div>

                                    </div>

                                    {selectedTask.remarks && (

                                        <div>

                                            <h3 className="text-lg font-bold mb-2">
                                                Team Lead Remarks
                                            </h3>

                                            <div className="border rounded-xl p-5 bg-gray-50">
                                                <p className="text-gray-700 whitespace-pre-wrap">
                                                    {selectedTask.remarks}
                                                </p>
                                            </div>

                                        </div>

                                    )}

                                    {/* REPORT HISTORY */}

                                    <div>

                                        <h3 className="text-lg font-bold mb-3">
                                            My Submitted Reports
                                        </h3>

                                        {(selectedTask.reports || []).length === 0 ? (

                                            <p className="text-gray-500 text-sm border rounded-xl p-5">
                                                You have not submitted a report for this task yet
                                            </p>

                                        ) : (

                                            <div className="space-y-3">

                                                {selectedTask.reports.map((report) => (

                                                    <div
                                                        key={report.id}
                                                        className="border rounded-xl p-5"
                                                    >

                                                        <div className="flex justify-between items-start gap-4">

                                                            <div>
                                                                <p className="text-sm text-gray-500">
                                                                    Report #{report.id} &middot;{" "}
                                                                    {formatDateTime(report.submitted_at)}
                                                                </p>
                                                            </div>

                                                            <StatusBadge status={report.review_status} />

                                                        </div>

                                                        <p className="text-gray-700 whitespace-pre-wrap mt-3">
                                                            {report.report}
                                                        </p>

                                                        {report.has_attachment && (
                                                            <button
                                                                onClick={() =>
                                                                    downloadReportAttachment(
                                                                        report.id,
                                                                        report.attachment_original_name
                                                                    )
                                                                }
                                                                className="mt-3 text-blue-600 hover:underline text-sm"
                                                            >
                                                                Download attachment
                                                                {report.attachment_original_name
                                                                    ? `: ${report.attachment_original_name}`
                                                                    : ""}
                                                            </button>
                                                        )}

                                                        {report.review_remarks && (
                                                            <div className="mt-3 bg-orange-50 border border-orange-100 rounded-lg p-3">
                                                                <p className="text-xs font-semibold text-orange-700">
                                                                    Team Lead Remark
                                                                </p>
                                                                <p className="text-sm text-orange-800 whitespace-pre-wrap">
                                                                    {report.review_remarks}
                                                                </p>
                                                            </div>
                                                        )}

                                                    </div>

                                                ))}

                                            </div>

                                        )}

                                    </div>

                                </div>

                            )}

                        </div>

                        <div className="border-t px-6 py-4 flex justify-between">

                            {selectedTask && canSubmit(selectedTask.status) ? (
                                <button
                                    onClick={() => {
                                        closeDetails();
                                        openSubmit(selectedTask);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
                                >
                                    {selectedTask.status === "Rework"
                                        ? "Resubmit Report"
                                        : "Submit Report"}
                                </button>
                            ) : <span />}

                            <button
                                onClick={closeDetails}
                                className="px-5 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Close
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* ================= SUBMIT REPORT MODAL ================= */}

            {showSubmit && submitTask && (

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                        <div className="border-b px-6 py-5 flex justify-between items-center">

                            <div>

                                <h2 className="text-2xl font-bold text-gray-800">
                                    {submitTask.status === "Rework"
                                        ? "Resubmit Report"
                                        : "Submit Report"}
                                </h2>

                                <p className="text-gray-500 text-sm mt-1">
                                    {submitTask.title}
                                </p>

                            </div>

                            <button
                                onClick={closeSubmit}
                                disabled={submitting}
                                className="text-2xl text-gray-500 hover:text-red-500 disabled:opacity-40"
                            >
                                &times;
                            </button>

                        </div>

                        <div className="p-6 space-y-5">

                            {submitTask.status === "Rework" &&
                                submitTask.latest_review_remarks && (

                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">

                                    <p className="text-sm font-semibold text-orange-700">
                                        Rework requested
                                    </p>

                                    <p className="text-sm text-orange-800 mt-1 whitespace-pre-wrap">
                                        {submitTask.latest_review_remarks}
                                    </p>

                                </div>

                            )}

                            {formError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    {formError}
                                </div>
                            )}

                            {formSuccess && (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                                    {formSuccess}
                                </div>
                            )}

                            <div>

                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Report <span className="text-red-500">*</span>
                                </label>

                                <textarea
                                    rows={8}
                                    value={reportText}
                                    onChange={(e) => setReportText(e.target.value)}
                                    disabled={submitting}
                                    placeholder="Describe the work you completed..."
                                    className="w-full border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                />

                                <p className="text-xs text-gray-500 mt-1">
                                    {reportText.trim().length} characters (minimum 10)
                                </p>

                            </div>

                            <div>

                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Attachment (optional)
                                </label>

                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={submitting}
                                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"
                                    className="w-full border rounded-lg px-4 py-3 disabled:bg-gray-100"
                                />

                                <p className="text-xs text-gray-500 mt-1">
                                    PDF, image, text or Office document. Max {MAX_UPLOAD_MB}MB.
                                </p>

                                {attachment && (
                                    <p className="text-xs text-gray-700 mt-1">
                                        Selected: {attachment.name}
                                    </p>
                                )}

                            </div>

                        </div>

                        <div className="border-t px-6 py-4 flex justify-end gap-3">

                            <button
                                onClick={closeSubmit}
                                disabled={submitting}
                                className="px-5 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-40"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSubmitReport}
                                disabled={submitting || !reportText.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
                            >
                                {submitting ? "Submitting..." : "Submit Report"}
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

export default WorkerTasks;
