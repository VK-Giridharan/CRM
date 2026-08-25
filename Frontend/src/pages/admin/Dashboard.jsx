import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard } from "../../services/dashboardService";

import StatCard from "../../components/common/StatCard";
import StatusBreakdown from "../../components/common/StatusBreakdown";

// Admin is the only global role - these figures span every company and are
// real COUNTs returned by GET /dashboard.

function AdminDashboard() {

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
                    Admin Dashboard
                </h1>

                <p className="text-gray-500 mt-1">
                    Platform-wide overview across every company
                </p>

            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                <StatCard
                    label="Companies"
                    value={cards.total_companies}
                    tone="blue"
                    hint={`${cards.active_companies || 0} active`}
                />

                <StatCard
                    label="Total Users"
                    value={cards.total_users}
                    tone="purple"
                />

                <StatCard
                    label="Pending Users"
                    value={cards.pending_users}
                    tone="orange"
                    hint="Awaiting role assignment"
                />

                <StatCard
                    label="Customers"
                    value={cards.total_customers}
                    tone="green"
                />

            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                <StatCard
                    label="Total Tasks"
                    value={cards.total_tasks}
                    tone="slate"
                />

                <StatCard
                    label="Inactive Companies"
                    value={cards.inactive_companies}
                    tone="red"
                />

                <StatCard
                    label="Disabled Accounts"
                    value={data?.disabled_users}
                    tone="red"
                />

            </div>

            <div className="grid gap-6 lg:grid-cols-3">

                <StatusBreakdown
                    title="Users by Role"
                    data={data?.users_by_role}
                />

                {/* COMPANY OVERVIEW */}

                <div className="bg-white rounded-xl shadow overflow-hidden lg:col-span-2">

                    <div className="px-6 py-5 border-b flex items-center justify-between">

                        <h3 className="text-lg font-bold text-gray-800">
                            Company Overview
                        </h3>

                        <Link
                            to="/admin/companies"
                            className="text-blue-600 hover:underline text-sm font-semibold"
                        >
                            Manage companies
                        </Link>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full">

                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-sm">Company</th>
                                    <th className="px-5 py-3 text-left text-sm">Code</th>
                                    <th className="px-5 py-3 text-left text-sm">Users</th>
                                    <th className="px-5 py-3 text-left text-sm">Customers</th>
                                    <th className="px-5 py-3 text-left text-sm">Tasks</th>
                                    <th className="px-5 py-3 text-left text-sm">Status</th>
                                </tr>
                            </thead>

                            <tbody>

                                {(data?.companies || []).length === 0 ? (

                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="text-center py-10 text-gray-500"
                                        >
                                            No companies have been created yet
                                        </td>
                                    </tr>

                                ) : (

                                    data.companies.map((company) => (

                                        <tr key={company.id} className="border-t">

                                            <td className="px-5 py-4 font-semibold">
                                                {company.company_name || "-"}
                                            </td>

                                            <td className="px-5 py-4">
                                                {company.company_code || "-"}
                                            </td>

                                            <td className="px-5 py-4">
                                                {company.user_count}
                                            </td>

                                            <td className="px-5 py-4">
                                                {company.customer_count}
                                            </td>

                                            <td className="px-5 py-4">
                                                {company.task_count}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        company.status
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {company.status ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default AdminDashboard;
