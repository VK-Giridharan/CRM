import { useEffect, useState } from "react";

import {
    employeeReportList,
    employeeReportDetails,
    downloadReportAttachment
} from "../../services/taskReportService";

import StatusBadge from "../common/StatusBadge";
import { formatDateTime } from "../../utils/formatDate";

// ======================================================
// WORKER REPORTS
//
// Shared by the Employee and Intern pages.
//
// Field names match GET /task-report/employee-list exactly. The previous
// Employee page read report.id / report.status / report.created_at, none of
// which that endpoint returns - so keys were undefined, the status column was
// always "Pending", the date was always "-", and View called
// /employee-details/undefined.
//
// Actual response fields used here:
//   split_task_id, split_task_title, split_task_description, task_status,
//   parent_task_id, parent_task_title, report_id, report, review_status,
//   review_remarks, submitted_at, reviewed_at,
//   attachment_original_name, has_attachment
// ======================================================



function WorkerReports({ roleLabel = "Employee" }) {

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");

    const [showDetails, setShowDetails] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");

    // ================= LOAD =================

    const loadReports = async () => {

        try {

            setLoading(true);

            const response = await employeeReportList();

            setRows(response.data || []);

        } catch (error) {

            setRows([]);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadReports();

    }, []);

    // ================= VIEW =================

    const handleView = async (reportId) => {

        // Guard: a task with no submitted report has report_id === null and
        // must never reach the details endpoint.
        if (!reportId) {
            return;
        }

        try {

            setShowDetails(true);
            setDetailsLoading(true);
            setDetailsError("");
            setSelectedReport(null);

            const response = await employeeReportDetails(reportId);

            setSelectedReport(response.data || null);

        } catch (error) {

            setSelectedReport(null);

            setDetailsError(
                error.response?.data?.message ||
                "Unable to load report details"
            );

        } finally {

            setDetailsLoading(false);

        }

    };

    const closeDetails = () => {

        setShowDetails(false);
        setSelectedReport(null);
        setDetailsError("");

    };

    // ================= SEARCH =================

    const filteredRows = rows.filter((row) => {

        const value = search.toLowerCase();

        return (
            (row?.split_task_title || "").toLowerCase().includes(value) ||
            (row?.parent_task_title || "").toLowerCase().includes(value) ||
            (row?.task_status || "").toLowerCase().includes(value) ||
            (row?.review_status || "").toLowerCase().includes(value)
        );

    });

    // ================= JSX =================

    return (

        <div className="space-y-6">

            {/* HEADER */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">
                    My Task Reports
                </h1>

                <p className="text-gray-500 mt-1">
                    {roleLabel} reports and their review status
                </p>

            </div>


            {/* SEARCH */}

            <div className="bg-white rounded-xl shadow p-5">

                <input
                    type="text"
                    placeholder="Search reports..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
                                <th className="px-5 py-4 text-left">Task</th>
                                <th className="px-5 py-4 text-left">Parent Task</th>
                                <th className="px-5 py-4 text-left">Submitted</th>
                                <th className="px-5 py-4 text-left">Task Status</th>
                                <th className="px-5 py-4 text-left">Review</th>
                                <th className="px-5 py-4 text-center">Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-500">
                                        Loading Reports...
                                    </td>
                                </tr>

                            ) : filteredRows.length === 0 ? (

                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-500">
                                        {rows.length === 0
                                            ? "You have no assigned tasks yet"
                                            : "No reports match your search"}
                                    </td>
                                </tr>

                            ) : (

                                filteredRows.map((row, index) => (

                                    <tr
                                        key={row.split_task_id}
                                        className="border-t hover:bg-gray-50"
                                    >

                                        <td className="px-5 py-4">
                                            {index + 1}
                                        </td>

                                        <td className="px-5 py-4">

                                            <p className="font-semibold text-gray-800">
                                                {row.split_task_title || "-"}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                {row.report_id
                                                    ? `Report #${row.report_id}`
                                                    : "Not submitted"}
                                            </p>

                                        </td>

                                        <td className="px-5 py-4">
                                            {row.parent_task_title || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {formatDateTime(row.submitted_at)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <StatusBadge status={row.task_status} />
                                        </td>

                                        <td className="px-5 py-4">

                                            <StatusBadge
                                                status={row.review_status}
                                                fallback="No report"
                                            />

                                            {row.review_status === "Rework" &&
                                                row.review_remarks && (
                                                <p className="text-xs text-orange-600 mt-1 max-w-[200px]">
                                                    {row.review_remarks}
                                                </p>
                                            )}

                                        </td>

                                        <td className="px-5 py-4 text-center">

                                            <button
                                                onClick={() => handleView(row.report_id)}
                                                disabled={!row.report_id}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg"
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

            </div>


            {/* ================= DETAILS MODAL ================= */}

            {showDetails && (

                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-5">

                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

                        <div className="border-b px-6 py-5 flex justify-between items-center">

                            <div>

                                <h2 className="text-2xl font-bold text-gray-800">
                                    Report Details
                                </h2>

                                {selectedReport && (
                                    <p className="text-gray-500 text-sm mt-1">
                                        Report #{selectedReport.id}
                                    </p>
                                )}

                            </div>

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
                                    Loading Report Details...
                                </div>

                            ) : detailsError || !selectedReport ? (

                                <div className="text-center py-10 text-red-500">
                                    {detailsError || "Unable to load report details"}
                                </div>

                            ) : (

                                <div className="space-y-6">

                                    <div className="bg-gray-50 rounded-xl p-5">

                                        <h3 className="text-lg font-bold mb-4">
                                            Task Information
                                        </h3>

                                        <div className="grid md:grid-cols-2 gap-5">

                                            <div>
                                                <p className="text-sm text-gray-500">Task</p>
                                                <p className="font-semibold">
                                                    {selectedReport.split_task_title || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Parent Task</p>
                                                <p className="font-semibold">
                                                    {selectedReport.parent_task_title || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Task Status</p>
                                                <StatusBadge status={selectedReport.task_status} />
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Review Status</p>
                                                <StatusBadge status={selectedReport.review_status} />
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Team Lead</p>
                                                <p className="font-semibold">
                                                    {selectedReport.team_lead_name || "-"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Attachment</p>

                                                {selectedReport.has_attachment ? (
                                                    <button
                                                        onClick={() =>
                                                            downloadReportAttachment(
                                                                selectedReport.id,
                                                                selectedReport.attachment_original_name
                                                            )
                                                        }
                                                        className="text-blue-600 hover:underline font-semibold"
                                                    >
                                                        {selectedReport.attachment_original_name ||
                                                            "Download"}
                                                    </button>
                                                ) : (
                                                    <p className="font-semibold">None</p>
                                                )}

                                            </div>

                                        </div>

                                    </div>

                                    <div>

                                        <h3 className="text-lg font-bold mb-3">
                                            My Report
                                        </h3>

                                        <div className="border rounded-xl p-5">
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {selectedReport.report || "No report content"}
                                            </p>
                                        </div>

                                    </div>

                                    <div>

                                        <h3 className="text-lg font-bold mb-3">
                                            Team Lead Remark
                                        </h3>

                                        <div className="border rounded-xl p-5 bg-gray-50">
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {selectedReport.review_remarks ||
                                                    "No review remark given"}
                                            </p>
                                        </div>

                                    </div>

                                    <div className="grid md:grid-cols-2 gap-5">

                                        <div className="border rounded-xl p-4">
                                            <p className="text-sm text-gray-500">Submitted On</p>
                                            <p className="font-semibold mt-1">
                                                {formatDateTime(selectedReport.submitted_at)}
                                            </p>
                                        </div>

                                        <div className="border rounded-xl p-4">
                                            <p className="text-sm text-gray-500">Reviewed On</p>
                                            <p className="font-semibold mt-1">
                                                {selectedReport.reviewed_at
                                                    ? formatDateTime(selectedReport.reviewed_at)
                                                    : "Not Reviewed Yet"}
                                            </p>
                                        </div>

                                    </div>

                                </div>

                            )}

                        </div>

                        <div className="border-t px-6 py-4 flex justify-end">

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

        </div>

    );

}

export default WorkerReports;
