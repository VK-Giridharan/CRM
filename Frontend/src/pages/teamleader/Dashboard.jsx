import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard } from "../../services/dashboardService";

import StatCard from "../../components/common/StatCard";
import StatusBreakdown from "../../components/common/StatusBreakdown";
import { formatDateTime } from "../../utils/formatDate";

// Counts cover only assignments owned by this Team Lead, inside their company.



function TeamLeaderDashboard() {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        const load = async () => {

            try {

                setLoading(true);
                setError("");

                const response = await getDashboard();

                setData(response.data || null);

            } catch (err) {

                setError(
                    err.response?.data?.message ||
                    "Unable to load dashboard"
                );

            } finally {

                setLoading(false);

            }

        };

        load();

    }, []);

    if (loading) {
        return (
            <div className="text-center py-20 text-xl font-semibold text-gray-600">
                Loading Dashboard...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {error}
            </div>
        );
    }

    const cards = data?.cards || {};

    return (

        <div className="space-y-6">

            <div>

                <h1 className="text-3xl font-bold text-gray-800">
                    Team Lead Dashboard
                </h1>

                <p className="text-gray-500 mt-1">
                    Your assignments, split tasks and reports awaiting review
                </p>

            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                <StatCard
                    label="Assigned Tasks"
                    value={cards.assigned_tasks}
                    tone="blue"
                />

                <StatCard
                    label="Split Tasks"
                    value={cards.split_tasks}
                    tone="purple"
                />

                <StatCard
                    label="Awaiting My Review"
                    value={cards.reports_awaiting_review}
                    tone="orange"
                />

                <StatCard
                    label="Completed Work"
                    value={cards.completed_work}
                    tone="green"
                />

            </div>

            <div className="grid gap-6 lg:grid-cols-3">

                <StatusBreakdown
                    title="My Assignments"
                    data={data?.assignments_by_status}
                />

                <StatusBreakdown
                    title="Split Tasks by Status"
                    data={data?.split_tasks_by_status}
                />

                <StatusBreakdown
                    title="Reports by Status"
                    data={data?.reports_by_status}
                />

            </div>

            {/* PENDING REVIEWS */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <div className="px-6 py-5 border-b flex items-center justify-between">

                    <h3 className="text-lg font-bold text-gray-800">
                        Reports Waiting For Review
                    </h3>

                    <Link
                        to="/teamleader/report"
                        className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                        View all
                    </Link>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-sm">Report</th>
                                <th className="px-5 py-3 text-left text-sm">Task</th>
                                <th className="px-5 py-3 text-left text-sm">Submitted By</th>
                                <th className="px-5 py-3 text-left text-sm">Submitted</th>
                            </tr>
                        </thead>

                        <tbody>

                            {(data?.pending_review_list || []).length === 0 ? (

                                <tr>
                                    <td colSpan="4" className="text-center py-10 text-gray-500">
                                        Nothing is waiting for your review
                                    </td>
                                </tr>

                            ) : (

                                data.pending_review_list.map((report) => (

                                    <tr key={report.report_id} className="border-t">

                                        <td className="px-5 py-4 font-semibold">
                                            #{report.report_id}
                                        </td>

                                        <td className="px-5 py-4">
                                            {report.split_task_title || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {report.employee_name || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {formatDateTime(report.submitted_at)}
                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );

}

export default TeamLeaderDashboard;
