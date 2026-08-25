import { useEffect, useMemo, useState } from "react";

import { adminCustomerList } from "../../services/customerService";

// ======================================================
// ADMIN CUSTOMERS
//
// Global, cross-company view. Backed by POST /customer/admin-list, which is
// gated to Admin server-side - this page never filters by the Admin's own
// company_id, and never sends a company_id to the backend.
//
// Layout, table markup, search box and pagination follow the existing
// admin/Company.jsx and manager/Customers.jsx pattern (client-side slicing).
//
// Field note from the schema: customers.company_name is the customer's own
// business name; the owning CRM tenant comes from the companies join. The API
// returns them as customer_company_name and company_name respectively.
// ======================================================

const RECORDS_PER_PAGE = 10;

// Every cell goes through this so a null column can never crash a render.
const show = (value, fallback = "-") => {

    if (value === null || value === undefined) return fallback;

    const text = String(value).trim();

    return text === "" ? fallback : text;

};

function AdminCustomers() {

    const [customers, setCustomers] = useState([]);
    const [companies, setCompanies] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);

    // ================= LOAD =================

    const getCustomers = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await adminCustomerList();

            setCustomers(response.data || []);
            setCompanies(response.companies || []);

        } catch (err) {

            setCustomers([]);
            setCompanies([]);

            setError(
                err.response?.data?.message ||
                "Unable to load customers"
            );

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        getCustomers();

    }, []);

    // ================= SEARCH + COMPANY FILTER =================
    // "all" is the default, so the Admin view spans every company.

    const filteredCustomers = useMemo(() => {

        const value = search.trim().toLowerCase();

        return customers.filter((customer) => {

            const matchesCompany =
                companyFilter === "all" ||
                String(customer?.company_id) === String(companyFilter);

            if (!matchesCompany) {
                return false;
            }

            if (!value) {
                return true;
            }

            return (
                (customer?.customer_name || "").toLowerCase().includes(value) ||
                (customer?.email || "").toLowerCase().includes(value) ||
                (customer?.phone || "").toLowerCase().includes(value) ||
                (customer?.company_name || "").toLowerCase().includes(value) ||
                (customer?.customer_company_name || "").toLowerCase().includes(value)
            );

        });

    }, [customers, search, companyFilter]);

    // ================= PAGINATION =================

    const lastIndex = currentPage * RECORDS_PER_PAGE;

    const firstIndex = lastIndex - RECORDS_PER_PAGE;

    const currentCustomers = filteredCustomers.slice(firstIndex, lastIndex);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredCustomers.length / RECORDS_PER_PAGE)
    );

    // Keep the page in range when a filter shrinks the result set.
    useEffect(() => {

        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }

    }, [currentPage, totalPages]);

    // ================= JSX =================

    return (

        <div className="space-y-6">

            {/* Header */}

            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-3xl font-bold text-gray-800">
                        Customers
                    </h1>

                    <p className="text-gray-500">
                        All customers across every company
                    </p>

                </div>

            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Search + Company filter */}

            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center gap-4">

                <input
                    type="text"
                    placeholder="Search name, email, phone or company..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-96 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />

                <select
                    value={companyFilter}
                    onChange={(e) => {
                        setCompanyFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="border rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >

                    <option value="all">All Companies</option>

                    {companies.map((company) => (
                        <option key={company.company_id} value={company.company_id}>
                            {show(company.company_name, "Unassigned")}
                        </option>
                    ))}

                </select>

            </div>

            {/* Customer Table */}

            <div className="bg-white rounded-lg shadow overflow-hidden">

                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-gray-100">

                            <tr>
                                <th className="text-left px-5 py-3">Customer</th>
                                <th className="text-left px-5 py-3">Company</th>
                                <th className="text-left px-5 py-3">Email</th>
                                <th className="text-left px-5 py-3">Phone</th>
                                <th className="text-left px-5 py-3">Location</th>
                                <th className="text-left px-5 py-3">Manager</th>
                                <th className="text-left px-5 py-3">Status</th>
                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>
                                    <td colSpan="7" className="text-center py-10">
                                        Loading...
                                    </td>
                                </tr>

                            ) : filteredCustomers.length === 0 ? (

                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-500">
                                        No customers found
                                    </td>
                                </tr>

                            ) : (

                                currentCustomers.map((customer) => (

                                    <tr key={customer.id} className="border-t">

                                        {/* Customer name + their own business name */}
                                        <td className="px-5 py-3">

                                            <p className="font-semibold text-gray-800">
                                                {show(customer.customer_name)}
                                            </p>

                                            {customer.customer_company_name && (
                                                <p className="text-xs text-gray-500">
                                                    {show(customer.customer_company_name)}
                                                </p>
                                            )}

                                        </td>

                                        {/* Owning CRM company */}
                                        <td className="px-5 py-3">

                                            <p className="font-medium text-gray-800">
                                                {show(customer.company_name, "Unassigned")}
                                            </p>

                                            {customer.company_code && (
                                                <p className="text-xs text-gray-500">
                                                    {show(customer.company_code)}
                                                </p>
                                            )}

                                        </td>

                                        <td className="px-5 py-3">
                                            {show(customer.email)}
                                        </td>

                                        <td className="px-5 py-3">

                                            <p>{show(customer.phone)}</p>

                                            {customer.alternate_phone && (
                                                <p className="text-xs text-gray-500">
                                                    {show(customer.alternate_phone)}
                                                </p>
                                            )}

                                        </td>

                                        <td className="px-5 py-3">
                                            {show(
                                                [customer.city, customer.state]
                                                    .filter(Boolean)
                                                    .join(", ")
                                            )}
                                        </td>

                                        <td className="px-5 py-3">
                                            {show(customer.manager_name)}
                                        </td>

                                        <td className="px-5 py-3">

                                            {customer.status === null ||
                                             customer.status === undefined ? (

                                                <span className="text-gray-500 font-semibold">
                                                    -
                                                </span>

                                            ) : customer.status ? (

                                                <span className="text-green-600 font-semibold">
                                                    Active
                                                </span>

                                            ) : (

                                                <span className="text-red-600 font-semibold">
                                                    Inactive
                                                </span>

                                            )}

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>

                {/* Pagination - same pattern as admin/Company.jsx */}

                <div className="flex justify-between items-center p-5">

                    <p>
                        Total : {filteredCustomers.length}
                        {companyFilter !== "all" && customers.length !== filteredCustomers.length
                            ? ` of ${customers.length}`
                            : ""}
                    </p>

                    <div className="flex gap-2">

                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="px-4 py-2 border rounded disabled:opacity-50"
                        >
                            Previous
                        </button>

                        <span className="px-4 py-2">
                            {currentPage} / {totalPages}
                        </span>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="px-4 py-2 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default AdminCustomers;
