import { useEffect, useState } from "react";
import { pendingUsers, changeRole } from "../../services/workerService";

function ManagerPendingUsers() {

    // ================= STATES =================

    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");

    const [showModal, setShowModal] = useState(false);

    const [selectedUser, setSelectedUser] = useState(null);

    const [selectedRole, setSelectedRole] = useState("");

    // ================= FUNCTIONS =================

    const getPendingUsers = async () => {

        try {

            setLoading(true);

            const response = await pendingUsers();

            setUsers(response.data);

        } catch (error) {

            console.log(error);

        } finally {

            setLoading(false);

        }

    };

    const handleAssign = async () => {

        if (!selectedRole) {

            alert("Select Role");

            return;

        }

        try {

            setSaving(true);

            await changeRole({

                user_id: selectedUser.id,

                role: selectedRole

            });

            setShowModal(false);

            setSelectedRole("");

            setSelectedUser(null);

            getPendingUsers();

        } catch (error) {

            console.log(error);

        } finally {

            setSaving(false);

        }

    };

    // ================= FILTER =================

    // last_name and phone are nullable on users.
    const filteredUsers = users.filter((user) => {

        const value = search.toLowerCase();

        return (

            `${user?.first_name || ""} ${user?.last_name || ""}`
                .toLowerCase()
                .includes(value)

            ||

            (user?.email || "").toLowerCase().includes(value)

            ||

            (user?.phone || "").includes(search)

        );

    });

    // ================= USE EFFECT =================

    useEffect(() => {

        getPendingUsers();

    }, []);

    // ================= JSX =================

    return (

        <div className="space-y-6">

            <div className="flex justify-between items-center">

                <div>

                    <h1 className="text-3xl font-bold">

                        Pending Users

                    </h1>

                    <p className="text-gray-500">

                        Assign Team Members

                    </p>

                </div>

            </div>

            <div className="bg-white p-4 rounded-xl shadow">

                <input

                    type="text"

                    placeholder="Search User..."

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}

                    className="w-80 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"

                />

            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-gray-100">

                        <tr>

                            <th className="px-5 py-3 text-left">Name</th>

                            <th className="px-5 py-3 text-left">Email</th>

                            <th className="px-5 py-3 text-left">Phone</th>

                            <th className="px-5 py-3 text-center">Action</th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            loading ?

                                <tr>

                                    <td colSpan="4" className="text-center py-10">

                                        Loading...

                                    </td>

                                </tr>

                                :

                                filteredUsers.length === 0 ?

                                    <tr>

                                        <td colSpan="4" className="text-center py-10">

                                            No Pending Users

                                        </td>

                                    </tr>

                                    :

                                    filteredUsers.map((user) => (

                                        <tr
                                            key={user.id}
                                            className="border-t hover:bg-gray-50">

                                            <td className="px-5 py-3">

                                                {user.first_name} {user.last_name}

                                            </td>

                                            <td className="px-5 py-3">

                                                {user.email}

                                            </td>

                                            <td className="px-5 py-3">

                                                {user.phone}

                                            </td>

                                            <td className="px-5 py-3 text-center">

                                                <button

                                                    onClick={() => {

                                                        setSelectedUser(user);

                                                        setSelectedRole("");

                                                        setShowModal(true);

                                                    }}

                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">

                                                    Assign

                                                </button>

                                            </td>

                                        </tr>

                                    ))

                        }

                    </tbody>

                </table>

            </div>
                        {/* Assign Role Modal */}

            {

                showModal &&

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

                    <div className="bg-white rounded-xl w-full max-w-lg p-6">

                        <div className="flex justify-between items-center mb-6">

                            <h2 className="text-2xl font-bold">

                                Assign Role

                            </h2>

                            <button

                                onClick={() => {

                                    setShowModal(false);

                                    setSelectedRole("");

                                    setSelectedUser(null);

                                }}

                                className="text-3xl">

                                ×

                            </button>

                        </div>

                        <div className="space-y-4">

                            <input

                                value={`${selectedUser?.first_name} ${selectedUser?.last_name}`}

                                readOnly

                                className="w-full border rounded-lg px-4 py-3 bg-gray-100"

                            />

                            <select

                                value={selectedRole}

                                onChange={(e) => setSelectedRole(e.target.value)}

                                className="w-full border rounded-lg px-4 py-3"

                            >

                                <option value="">

                                    Select Role

                                </option>

                                <option value="Team Lead">

                                    Team Lead

                                </option>

                                <option value="Employee">

                                    Employee

                                </option>

                                <option value="Intern">

                                    Intern

                                </option>

                            </select>

                        </div>

                        <div className="flex justify-end gap-3 mt-6">

                            <button

                                onClick={() => {

                                    setShowModal(false);

                                    setSelectedRole("");

                                    setSelectedUser(null);

                                }}

                                className="border px-5 py-2 rounded-lg">

                                Cancel

                            </button>

                            <button

                                onClick={handleAssign}

                                disabled={saving}

                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"

                            >

                                {

                                    saving

                                        ? "Assigning..."

                                        : "Assign"

                                }

                            </button>

                        </div>

                    </div>

                </div>

            }

        </div>

    );

}

export default ManagerPendingUsers;