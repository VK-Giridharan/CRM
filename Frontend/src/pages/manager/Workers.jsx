import { useEffect, useState } from "react";
import { getWorkers } from "../../services/workerService";

function ManagerWorkers() {

    // ================= STATES =================

    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [tab, setTab] = useState("Team Lead");
    const [search, setSearch] = useState("");

    // ================= LOAD =================

    const loadWorkers = async () => {

        try {

            setLoading(true);

            const response = await getWorkers();
            console.log(response.data);

            setWorkers(response.data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };


    // ================= FILTER =================

    const filteredWorkers = workers.filter((worker) => {

        const roleMatch = worker.role === tab;

        const searchMatch =
            `${worker.first_name} ${worker.last_name}`
                .toLowerCase()
                .includes(search.toLowerCase());

        return roleMatch && searchMatch;

    });

    // ================= USE EFFECT =================

    useEffect(() => {
        loadWorkers();
    }, []);

    // ================= JSX =================

    return (

        <div className="space-y-6">

            {/* Header */}

            <div className="flex justify-between items-center">

                <div>

                    <h1 className="text-3xl font-bold">
                        Workers
                    </h1>

                    <p className="text-gray-500">
                        Manage all workers
                    </p>

                </div>

            </div>

            {/* Tabs */}

            <div className="flex gap-3">

                {
                    ["Team Lead", "Employee", "Intern"].map((item) => (

                        <button
                            key={item}
                            onClick={() => setTab(item)}
                            className={`px-5 py-2 rounded-lg font-medium transition
                            ${tab === item
                                    ? "bg-blue-600 text-white"
                                    : "bg-white border hover:bg-gray-100"
                                }`}
                        >

                            {item}

                        </button>

                    ))
                }

            </div>

            {/* Search */}

            <div className="bg-white rounded-lg shadow p-4">

                <input
                    type="text"
                    placeholder="Search Worker..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-80 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />

            </div>

            {/* Table */}

            <div className="bg-white rounded-lg shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="text-left px-5 py-3">
                                Name
                            </th>

                            <th className="text-left px-5 py-3">
                                Email
                            </th>

                            <th className="text-left px-5 py-3">
                                Phone
                            </th>

                            <th className="text-left px-5 py-3">
                                Company
                            </th>

                            <th className="text-left px-5 py-3">
                                Role
                            </th>

                            <th className="text-center px-5 py-3">
                                Status
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

                                filteredWorkers.length === 0 ?

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="text-center py-10">

                                            No Workers Found

                                        </td>

                                    </tr>

                                    :

                                    filteredWorkers.map((worker) => (

                                        <tr
                                            key={worker.id}
                                            className="border-t hover:bg-gray-50">

                                            <td className="px-5 py-3">

                                                {worker.first_name} {worker.last_name}

                                            </td>

                                            <td className="px-5 py-3">

                                                {worker.email}

                                            </td>

                                            <td className="px-5 py-3">

                                                {worker.phone}

                                            </td>

                                            <td className="px-5 py-3">

                                                {worker.company_name || "-"}

                                            </td>

                                            <td className="px-5 py-3">

                                                {

                                                    worker.role ??

                                                    <span className="text-orange-600 font-semibold">
                                                        Pending
                                                    </span>

                                                }

                                            </td>

                                            <td className="px-5 py-3 text-center">

                                                <span
                                                    className={`font-semibold ${worker.is_active
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                        }`}
                                                >
                                                    {worker.is_active ? "Active" : "Inactive"}
                                                </span>

                                            </td>

                                        </tr>

                                    ))

                        }

                    </tbody>

                </table>

            </div>

        </div>

    );

}

export default ManagerWorkers;