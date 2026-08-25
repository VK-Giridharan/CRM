import { useEffect, useState } from "react";

import { getWorkers } from "../../services/workerService";

function TeamLeaderWorkers() {

    // ================= STATES =================

    const [workers, setWorkers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [tab, setTab] = useState("Employee");

    const [search, setSearch] = useState("");


    // ================= LOAD WORKERS =================

    const loadWorkers = async () => {

        try {

            setLoading(true);

            const response = await getWorkers();

            console.log("TEAM LEADER WORKERS:", response.data);

            setWorkers(response.data || []);

        } catch (error) {

            console.log("WORKERS ERROR:", error);

        } finally {

            setLoading(false);

        }

    };


    // ================= FILTER =================

    const filteredWorkers = workers.filter((worker) => {

        // Team Lead can see only Employee / Intern

        const roleMatch = worker.role === tab;

        const fullName =
            `${worker.first_name || ""} ${worker.last_name || ""}`
                .toLowerCase();

        const searchValue = search.toLowerCase();

        const searchMatch =
            fullName.includes(searchValue) ||
            (worker.email || "")
                .toLowerCase()
                .includes(searchValue) ||
            (worker.phone || "")
                .toLowerCase()
                .includes(searchValue);

        return roleMatch && searchMatch;

    });


    // ================= USE EFFECT =================

    useEffect(() => {

        loadWorkers();

    }, []);


    // ================= JSX =================

    return (

        <div className="space-y-6">

            {/* ================= HEADER ================= */}

            <div>

                <h1 className="text-3xl font-bold text-gray-800">

                    Workers

                </h1>

                <p className="text-gray-500 mt-1">

                    Manage Employees and Interns under your team

                </p>

            </div>


            {/* ================= TABS ================= */}

            <div className="flex gap-3">

                {
                    ["Employee", "Intern"].map((item) => (

                        <button

                            key={item}

                            onClick={() => {

                                setTab(item);

                                setSearch("");

                            }}

                            className={`px-5 py-2 rounded-lg font-medium transition

                            ${
                                tab === item

                                    ? "bg-blue-600 text-white"

                                    : "bg-white border text-gray-600 hover:bg-gray-100"

                            }`}

                        >

                            {item}

                        </button>

                    ))
                }

            </div>


            {/* ================= SEARCH ================= */}

            <div className="bg-white rounded-lg shadow p-4">

                <input

                    type="text"

                    placeholder={`Search ${tab}...`}

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                    className="w-80 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"

                />

            </div>


            {/* ================= TABLE ================= */}

            <div className="bg-white rounded-lg shadow overflow-hidden">

                <table className="w-full">

                    {/* ================= TABLE HEADER ================= */}

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


                    {/* ================= TABLE BODY ================= */}

                    <tbody>

                        {

                            loading ?

                                (

                                    <tr>

                                        <td

                                            colSpan="6"

                                            className="text-center py-10"

                                        >

                                            Loading...

                                        </td>

                                    </tr>

                                )

                                :

                                filteredWorkers.length === 0 ?

                                    (

                                        <tr>

                                            <td

                                                colSpan="6"

                                                className="text-center py-10 text-gray-500"

                                            >

                                                No {tab}s Found

                                            </td>

                                        </tr>

                                    )

                                    :

                                    (

                                        filteredWorkers.map((worker) => (

                                            <tr

                                                key={worker.id}

                                                className="border-t hover:bg-gray-50"

                                            >

                                                {/* NAME */}

                                                <td className="px-5 py-3">

                                                    <div className="font-medium text-gray-800">

                                                        {worker.first_name}{" "}

                                                        {worker.last_name}

                                                    </div>

                                                </td>


                                                {/* EMAIL */}

                                                <td className="px-5 py-3">

                                                    {worker.email || "-"}

                                                </td>


                                                {/* PHONE */}

                                                <td className="px-5 py-3">

                                                    {worker.phone || "-"}

                                                </td>


                                                {/* COMPANY */}

                                                <td className="px-5 py-3">

                                                    {worker.company_name || "-"}

                                                </td>


                                                {/* ROLE */}

                                                <td className="px-5 py-3">

                                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">

                                                        {worker.role}

                                                    </span>

                                                </td>


                                                {/* STATUS */}

                                                <td className="px-5 py-3 text-center">

                                                    <span

                                                        className={`px-3 py-1 rounded-full text-sm font-semibold

                                                        ${
                                                            worker.is_active

                                                                ? "bg-green-100 text-green-700"

                                                                : "bg-red-100 text-red-700"

                                                        }`}

                                                    >

                                                        {

                                                            worker.is_active

                                                                ? "Active"

                                                                : "Inactive"

                                                        }

                                                    </span>

                                                </td>

                                            </tr>

                                        ))

                                    )

                        }

                    </tbody>

                </table>

            </div>


            {/* ================= SUMMARY ================= */}

            <div className="bg-white rounded-lg shadow p-4">

                <div className="flex justify-between items-center">

                    <div className="text-gray-600">

                        Total {tab}s

                    </div>

                    <div className="text-xl font-bold text-blue-600">

                        {filteredWorkers.length}

                    </div>

                </div>

            </div>

        </div>

    );

}

export default TeamLeaderWorkers;