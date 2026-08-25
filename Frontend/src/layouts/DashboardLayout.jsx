import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import { Outlet } from "react-router-dom";

function DashboardLayout() {
    return (
        <div className="flex h-screen bg-gray-100">

            {/* Sidebar */}
            <Sidebar />

            {/* Right Side */}
            <div className="flex flex-col flex-1">

                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>

            </div>

        </div>
    );
}

export default DashboardLayout; 