import { useEffect, useState } from "react";

import {
    managerReportList,
    taskReportDetails,
    downloadReportAttachment
} from "../../services/taskReportService";

import { formatDateTime } from "../../utils/formatDate";

import StatusBadge from "../../components/common/StatusBadge";

// ======================================================
// MANAGER TASK REPORTS
//
// The A-Z test report (BUG-014) found that a Manager could create a task,
// assign it and have it worked on, but had nowhere in the application to
// read the reports it produced - every report screen and endpoint was
// Team-Lead-only, so the documented "Manager views Report" step of the
// workflow did not exist.
//
// This is a READ-ONLY view on purpose. Reviewing (Approve / Rework) stays
// with the Team Lead who owns the assignment, exactly as before - nothing
// about Team Lead behaviour changes.
// ======================================================

const REVIEW_FILTERS = ["All", "Submitted", "Approved", "Rework"];

function ManagerReports() {

    const [reports, setReports] = useState([]);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");

    const [reviewFilter, setReviewFilter] = useState("All");

    const [selectedReport, setSelectedReport] = useState(null);

    const [showModal, setShowModal] = useState(false);

    const [detailLoading, setDetailLoading] = useState(false);

    // ==================================================
    // LOAD
    // ==================================================

    const loadReports = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await managerReportList();

            setReports(response.data || []);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Could not load reports"
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        loadReports();
    }, []);

    // ==================================================
    // DETAILS
    // ==================================================

    const openReport = async (report) => {

        setShowModal(true);
        setDetailLoading(true);
        setSelectedReport(report);

        try {

            const response = await taskReportDetails(report.id);

            setSelectedReport(response.data || report);

        } catch (err) {

            // Fall back to the row we already have rather than blanking the
            // modal out.
            setSelectedReport(report);

        } finally {

            setDetailLoading(false);

        }

    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedReport(null);
    };

    const handleDownload = async (report) => {

        try {

            await downloadReportAttachment(
                report.id,
                report.attachment_original_name
            );

        } catch (err) {

            setError("Could not download the attachment");

        }

    };

    // ==================================================
    // FILTERING
    // ==================================================

    const term = search.trim().toLowerCase();

    const filteredReports = reports.filter((report) => {

        if (reviewFilter !== "All" && report.review_status !== reviewFilter) {
            return false;
        }

        if (!term) return true;

        return [
            report.split_task_title,
            report.parent_task_title,
            report.employee_name,
            report.team_lead_name,
            report.customer_name
        ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(term));

    });

    const counts = reports.reduce((acc, r) => {
        acc[r.review_status] = (acc[r.review_status] || 0) + 1;
        return acc;
    }, {});

    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="space-y-6">

            {/* Header */}
            <div>

                <h1 className="text-2xl font-bold text-gray-800">
                    Task Reports
                </h1>

                <p className="text-gray-500">
                    Work submitted by Employees and Interns across your company
                </p>

            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Total Reports</p>
                    <p className="text-2xl font-bold text-gray-800">{reports.length}</p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Awaiting Review</p>
                    <p className="text-2xl font-bold text-amber-600">{counts.Submitted || 0}</p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{counts.Approved || 0}</p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow">
                    <p className="text-sm text-gray-500">Sent for Rework</p>
                    <p className="text-2xl font-bold text-red-600">{counts.Rework || 0}</p>
                </div>

            </div>

            {/* Search + filter */}
            <div className="rounded-xl bg-white p-5 shadow">

                <div className="flex flex-wrap items-center gap-4">

                    <input
                        type="text"
                        placeholder="Search task, employee or customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-96 rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <select
                        value={reviewFilter}
                        onChange={(e) => setReviewFilter(e.target.value)}
                        className="rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {REVIEW_FILTERS.map((status) => (
                            <option key={status} value={status}>
                                {status === "All" ? "All Statuses" : status}
                            </option>
                        ))}
                    </select>

                    <div className="ml-auto text-gray-600">
                        Showing
                        <span className="ml-2 font-semibold">
                            {filteredReports.length}
                        </span>
                    </div>

                </div>

            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl bg-white shadow">

                <table className="w-full text-left">

                    <thead className="bg-gray-50 text-sm text-gray-600">
                        <tr>
                            <th className="px-5 py-3">Task</th>
                            <th className="px-5 py-3">Parent Task</th>
                            <th className="px-5 py-3">Customer</th>
                            <th className="px-5 py-3">Submitted By</th>
                            <th className="px-5 py-3">Team Lead</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Submitted</th>
                            <th className="px-5 py-3">Action</th>
                        </tr>
                    </thead>

                    <tbody>

                        {loading && (
                            <tr>
                                <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                                    Loading reports...
                                </td>
                            </tr>
                        )}

                        {!loading && filteredReports.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                                    No reports found
                                </td>
                            </tr>
                        )}

                        {!loading && filteredReports.map((report) => (

                            <tr key={report.id} className="border-t hover:bg-gray-50">

                                <td className="px-5 py-3">
                                    <div className="font-medium text-gray-800">
                                        {report.split_task_title}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Report #{report.id}
                                    </div>
                                </td>

                                <td className="px-5 py-3 text-gray-700">
                                    {report.parent_task_title}
                                </td>

                                <td className="px-5 py-3 text-gray-700">
                                    {report.customer_name || "-"}
                                </td>

                                <td className="px-5 py-3">
                                    <div className="text-gray-800">{report.employee_name}</div>
                                    <div className="text-xs text-gray-500">{report.employee_role}</div>
                                </td>

                                <td className="px-5 py-3 text-gray-700">
                                    {report.team_lead_name || "-"}
                                </td>

                                <td className="px-5 py-3">
                                    <StatusBadge status={report.review_status} />
                                </td>

                                <td className="px-5 py-3 text-sm text-gray-600">
                                    {formatDateTime(report.submitted_at)}
                                </td>

                                <td className="px-5 py-3">
                                    <button
                                        onClick={() => openReport(report)}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                                    >
                                        View
                                    </button>
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            {/* Detail modal */}
            {showModal && selectedReport && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">

                        <div className="mb-4 flex items-start justify-between">

                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    Report Details
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {selectedReport.employee_name}
                                </p>
                            </div>

                            <button
                                onClick={closeModal}
                                className="text-2xl leading-none text-gray-400 hover:text-gray-700"
                            >
                                &times;
                            </button>

                        </div>

                        {detailLoading && (
                            <p className="py-6 text-center text-gray-500">Loading...</p>
                        )}

                        {!detailLoading && (

                            <div className="space-y-4">

                                <div className="grid grid-cols-2 gap-4">

                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Task</p>
                                        <p className="font-medium text-gray-800">
                                            {selectedReport.split_task_title}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Parent Task</p>
                                        <p className="font-medium text-gray-800">
                                            {selectedReport.parent_task_title}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Review Status</p>
                                        <StatusBadge status={selectedReport.review_status} />
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase text-gray-500">Submitted</p>
                                        <p className="text-gray-800">
                                            {formatDateTime(selectedReport.submitted_at)}
                                        </p>
                                    </div>

                                </div>

                                <div>
                                    <p className="mb-1 text-xs uppercase text-gray-500">Report</p>
                                    <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-gray-800">
                                        {selectedReport.report}
                                    </div>
                                </div>

                                {selectedReport.review_remarks && (
                                    <div>
                                        <p className="mb-1 text-xs uppercase text-gray-500">
                                            Review Remark
                                        </p>
                                        <div className="whitespace-pre-wrap rounded-lg bg-amber-50 p-4 text-gray-800">
                                            {selectedReport.review_remarks}
                                        </div>
                                    </div>
                                )}

                                {selectedReport.has_attachment && (
                                    <div>
                                        <p className="mb-1 text-xs uppercase text-gray-500">
                                            Attachment
                                        </p>
                                        <button
                                            onClick={() => handleDownload(selectedReport)}
                                            className="rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                        >
                                            Download {selectedReport.attachment_original_name}
                                        </button>
                                    </div>
                                )}

                                <p className="pt-2 text-xs text-gray-500">
                                    Approving or returning work for rework is handled by the
                                    Team Lead who owns the assignment.
                                </p>

                            </div>

                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={closeModal}
                                className="rounded-lg bg-gray-200 px-5 py-2 text-gray-800 hover:bg-gray-300"
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

export default ManagerReports;
