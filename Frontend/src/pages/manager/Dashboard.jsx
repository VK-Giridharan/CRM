import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard } from "../../services/dashboardService";

import StatCard from "../../components/common/StatCard";
import StatusBreakdown from "../../components/common/StatusBreakdown";
import { formatDate } from "../../utils/formatDate";

// Every figure is scoped server-side to the manager's own company.



function ManagerDashboard() {

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

    if (data?.message) {
        return (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-orange-700">
                {data.message}
            </div>
        );
    }

    const cards = data?.cards || {};

    return (

        <div className="space-y-6">

            <div>

                <h1 className="text-3xl font-bold text-gray-800">
                    Manager Dashboard
                </h1>

                <p className="text-gray-500 mt-1">
                    Your company at a glance
                </p>

            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                <StatCard label="Customers" value={cards.total_customers} tone="green" />

                <StatCard label="Leads" value={cards.total_leads} tone="blue" />

                <StatCard
                    label="Upcoming Meetings"
                    value={cards.upcoming_meetings}
                    tone="purple"
                    hint={`${cards.total_meetings || 0} total`}
                />

                <StatCard label="Team Members" value={cards.team_size} tone="slate" />

            </div>

            <div className="grid gap-5 sm:grid-cols-2">

                <StatCard label="Total Tasks" value={cards.total_tasks} tone="blue" />

                <StatCard
                    label="Unassigned Tasks"
                    value={cards.unassigned_tasks}
                    tone="orange"
                    hint="Not yet given to a Team Lead"
                />

            </div>

            <div className="grid gap-6 lg:grid-cols-3">

                <StatusBreakdown title="Leads by Status" data={data?.leads_by_status} />

                <StatusBreakdown title="Tasks by Status" data={data?.tasks_by_status} />

                <StatusBreakdown title="Team Composition" data={data?.team} />

            </div>

            {/* UPCOMING MEETINGS */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <div className="px-6 py-5 border-b flex items-center justify-between">

                    <h3 className="text-lg font-bold text-gray-800">
                        Upcoming Meetings
                    </h3>

                    <Link
                        to="/manager/meetings"
                        className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                        View all
                    </Link>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-sm">Meeting</th>
                                <th className="px-5 py-3 text-left text-sm">Lead</th>
                                <th className="px-5 py-3 text-left text-sm">Date</th>
                                <th className="px-5 py-3 text-left text-sm">Time</th>
                            </tr>
                        </thead>

                        <tbody>

                            {(data?.upcoming_meeting_list || []).length === 0 ? (

                                <tr>
                                    <td colSpan="4" className="text-center py-10 text-gray-500">
                                        No upcoming meetings scheduled
                                    </td>
                                </tr>

                            ) : (

                                data.upcoming_meeting_list.map((meeting) => (

                                    <tr key={meeting.id} className="border-t">

                                        <td className="px-5 py-4 font-semibold">
                                            {meeting.meeting_title || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {meeting.lead_name || "-"}
                                        </td>

                                        <td className="px-5 py-4">
                                            {formatDate(meeting.meeting_date)}
                                        </td>

                                        <td className="px-5 py-4">
                                            {meeting.meeting_time || "-"}
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

export default ManagerDashboard;
