import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard } from "../../services/dashboardService";

import StatCard from "../common/StatCard";
import StatusBreakdown from "../common/StatusBreakdown";
import StatusBadge from "../common/StatusBadge";

// ======================================================
// WORKER DASHBOARD
//
// Shared by Employee and Intern. Every number comes straight from
// GET /dashboard, which counts only rows belonging to the signed-in worker
// inside their own company.
// ======================================================

const formatDate = (value) => {

    if (!value) return "-";

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? "-"
        : parsed.toLocaleDateString();

};

function WorkerDashboard({ roleLabel = "Employee", basePath = "/employee" }) {

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    useEffect(() => {

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
                    {roleLabel} Dashboard
                </h1>

                <p className="text-gray-500 mt-1">
                    Your assigned work and report status
                </p>

            </div>

            {/* CARDS */}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                <StatCard
                    label="Assigned Tasks"
                    value={cards.assigned_tasks}
                    tone="blue"
                />

                <StatCard
                    label="Pending Work"
                    value={cards.pending_work}
                    tone="orange"
                    hint="Pending, In Progress or Rework"
                />

                <StatCard
                    label="Awaiting Review"
                    value={cards.awaiting_review}
                    tone="purple"
                />

                <StatCard
                    label="Completed Work"
                    value={cards.completed_work}
                    tone="green"
                />

            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                <StatCard
                    label="In Progress"
                    value={cards.in_progress}
                    tone="blue"
                />

                <StatCard
                    label="Rework Requested"
                    value={cards.rework}
                    tone="red"
                />

                <StatCard
                    label="Submitted Reports"
                    value={cards.submitted_reports}
                    tone="slate"
                />

            </div>

            {/* BREAKDOWNS */}

            <div className="grid gap-6 lg:grid-cols-2">

                <StatusBreakdown
                    title="My Tasks by Status"
                    data={data?.tasks_by_status}
                />

                <StatusBreakdown
                    title="My Reports by Review Status"
                    data={data?.reports_by_status}
                />

            </div>

            {/* RECENT TASKS */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <div className="px-6 py-5 border-b flex items-center justify-between">

                    <h3 className="text-lg font-bold text-gray-800">
                        Recent Tasks
                    </h3>

                    <Link
                        to={`${basePath}/task`}
                        className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                        View all
                    </Link>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-sm">Task</th>
                                <th className="px-5 py-3 text-left text-sm">Parent Task</th>
                                <th className="px-5 py-3 text-left text-sm">Due</th>
                                <th className="px-5 py-3 text-left text-sm">Status</th>
                            </tr>
                        </thead>

                        <tbody>

                            {(data?.recent_tasks || []).length === 0 ? (

                                <tr>
                                    <td
                                        colSpan="4"
                                        className="text-center py-10 text-gray-500"
                                    >
                                        No tasks assigned yet
                                    </td>
                                </tr>

                            ) : (

                                data.recent_tasks.map((task) => (

                                    <tr key={task.id} className="border-t">

                                        <td className="px-5 py-4 font-semibold">
                                            {task.title || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {task.parent_task_title || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {formatDate(task.parent_task_due_date)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <StatusBadge status={task.status} />
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

export default WorkerDashboard;
