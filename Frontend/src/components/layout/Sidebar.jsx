import { Link } from "react-router-dom";

function Sidebar() {

    const user = JSON.parse(localStorage.getItem("user"));

    return (

        <aside className="w-64 bg-slate-800 text-white">

            <div className="h-16 flex items-center justify-center border-b border-slate-700">
                <h2 className="text-xl font-bold">
                    {user?.role}
                </h2>
            </div>

            <nav className="p-4 space-y-2">

                {/* ================= ADMIN ================= */}

                {user?.role === "Admin" && (
                    <>
                        <Link to="/admin/dashboard" className="block px-4 py-2 rounded hover:bg-slate-700">Dashboard</Link>

                        <Link to="/admin/companies" className="block px-4 py-2 rounded hover:bg-slate-700">Companies</Link>

                        <Link to="/admin/pending-users" className="block px-4 py-2 rounded hover:bg-slate-700">Pending Users</Link>

                        <Link to="/admin/workers" className="block px-4 py-2 rounded hover:bg-slate-700">Workers</Link>

                        <Link to="/admin/customers" className="block px-4 py-2 rounded hover:bg-slate-700">Customers</Link>

                        <Link to="/admin/profile" className="block px-4 py-2 rounded hover:bg-slate-700">Profile</Link>
                    </>
                )}

                {/* ================= MANAGER ================= */}

                {user?.role === "Manager" && (
                    <>
                        <Link to="/manager/dashboard" className="block px-4 py-2 rounded hover:bg-slate-700">Dashboard</Link>

                        <Link to="/manager/pending-users" className="block px-4 py-2 rounded hover:bg-slate-700">Pending Users</Link>

                        <Link to="/manager/workers" className="block px-4 py-2 rounded hover:bg-slate-700">Workers</Link>

                        <Link to="/manager/customers" className="block px-4 py-2 rounded hover:bg-slate-700">Customers</Link>

                        <Link to="/manager/tasks" className="block px-4 py-2 rounded hover:bg-slate-700">Tasks</Link>

                        <Link to="/manager/meetings" className="block px-4 py-2 rounded hover:bg-slate-700">Meetings</Link>

                        <Link to="/manager/profile" className="block px-4 py-2 rounded hover:bg-slate-700">Profile</Link>
                    </>
                )}

                {/* ================= TEAM LEADER ================= */}

                {user?.role === "Team Lead" && (
                    <>
                        <Link to="/teamleader/dashboard" className="block px-4 py-2 rounded hover:bg-slate-700">Dashboard</Link>

                        <Link to="/teamleader/task" className="block px-4 py-2 rounded hover:bg-slate-700">Tasks</Link>

                        <Link to="/teamleader/workers" className="block px-4 py-2 rounded hover:bg-slate-700">Workers</Link>

                        <Link to="/teamleader/report" className="block px-4 py-2 rounded hover:bg-slate-700">Reports</Link>

                        <Link to="/teamleader/profile" className="block px-4 py-2 rounded hover:bg-slate-700">Profile</Link>

                    </>
                )}

                {/* ================= EMPLOYEE ================= */}

                {user?.role === "Employee" && (
                    <>
                        <Link to="/employee/dashboard" className="block px-4 py-2 rounded hover:bg-slate-700">Dashboard</Link>

                        <Link to="/employee/task" className="block px-4 py-2 rounded hover:bg-slate-700">Tasks</Link>

                        <Link to="/employee/report" className="block px-4 py-2 rounded hover:bg-slate-700">Reports</Link>

                        <Link to="/employee/profile" className="block px-4 py-2 rounded hover:bg-slate-700">Profile</Link>
                    </>
                )}

                {/* ================= INTERN ================= */}

                {user?.role === "Intern" && (
                    <>
                        <Link to="/intern/dashboard" className="block px-4 py-2 rounded hover:bg-slate-700">Dashboard</Link>

                        <Link to="/intern/task" className="block px-4 py-2 rounded hover:bg-slate-700">Tasks</Link>

                        <Link to="/intern/report" className="block px-4 py-2 rounded hover:bg-slate-700">Reports</Link>

                        <Link to="/intern/profile" className="block px-4 py-2 rounded hover:bg-slate-700">Profile</Link>
                    </>
                )}

            </nav>

        </aside>

    );
}

export default Sidebar;