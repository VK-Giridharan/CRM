import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import ProtectedRoute from "./ProtectedRoute";
import RedirectHome from "./RedirectHome";
import DashboardLayout from "../layouts/DashboardLayout";

// Admin
import AdminDashboard from "../pages/admin/Dashboard";
import AdminCompanyList from "../pages/admin/Company";
import AdminPendingUsers from "../pages/admin/PendingUsers";
import AdminWorkers from "../pages/admin/Workers";
import AdminCustomers from "../pages/admin/Customers";
import AdminProfile from "../pages/admin/Profile";

// Manager
import ManagerDashboard from "../pages/manager/Dashboard";
import ManagerWorkers from "../pages/manager/Workers";
import ManagerCustomers from "../pages/manager/Customers";
import ManagerTasks from "../pages/manager/Tasks";
import ManagerMeetings from "../pages/manager/Meetings";
import ManagerProfile from "../pages/manager/Profile";
import ManagerPendingUsers from "../pages/manager/PendingUsers";
import ManagerReports from "../pages/manager/Reports";

// Team Leader
import TeamLeaderDashboard from "../pages/teamleader/Dashboard";
import TeamLeaderTasks from "../pages/teamleader/Tasks";
import TeamLeaderReports from "../pages/teamleader/Reports";
import TeamLeaderProfile from "../pages/teamleader/Profile";
import TeamLeaderWorkers from "../pages/teamleader/Workers";

// Employee
import EmployeeDashboard from "../pages/employee/Dashboard";
import EmployeeProfile from "../pages/employee/Profile";
import EmployeeTasks from "../pages/employee/Tasks";
import EmployeeReports from "../pages/employee/Reports";

// Intern
import InternDashboard from "../pages/intern/Dashboard";
import InternProfile from "../pages/intern/Profile";
import InternTasks from "../pages/intern/Tasks";
import InternReports from "../pages/intern/Reports";

// ======================================================
// Every role subtree declares the roles allowed to enter it. Typing another
// role's URL now bounces the user back to their own dashboard instead of
// rendering the page.
// ======================================================

const ROLES = {
    ADMIN: "Admin",
    MANAGER: "Manager",
    TEAM_LEAD: "Team Lead",
    EMPLOYEE: "Employee",
    INTERN: "Intern"
};

function AppRoutes() {
    return (
        <Routes>

            {/* Public Routes */}

            <Route path="/" element={<RedirectHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ================= ADMIN ================= */}

            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="companies" element={<AdminCompanyList />} />
                <Route path="pending-users" element={<AdminPendingUsers />} />
                <Route path="workers" element={<AdminWorkers />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="profile" element={<AdminProfile />} />
            </Route>


            {/* ================= MANAGER ================= */}

            <Route
                path="/manager"
                element={
                    <ProtectedRoute allowedRoles={[ROLES.MANAGER]}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="workers" element={<ManagerWorkers />} />
                <Route path="customers" element={<ManagerCustomers />} />
                <Route path="tasks" element={<ManagerTasks />} />
                <Route path="meetings" element={<ManagerMeetings />} />
                <Route path="profile" element={<ManagerProfile />} />
                <Route path="pending-users" element={<ManagerPendingUsers />} />
                <Route path="reports" element={<ManagerReports />} />
            </Route>

            {/* ================= TEAM LEADER ================= */}

            <Route
                path="/teamleader"
                element={
                    <ProtectedRoute allowedRoles={[ROLES.TEAM_LEAD]}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TeamLeaderDashboard />} />
                <Route path="task" element={<TeamLeaderTasks />} />
                <Route path="report" element={<TeamLeaderReports />} />
                <Route path="profile" element={<TeamLeaderProfile />} />
                <Route path="workers" element={<TeamLeaderWorkers />} />
            </Route>


            {/* ================= EMPLOYEE ================= */}

            <Route
                path="/employee"
                element={
                    <ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="profile" element={<EmployeeProfile />} />
                <Route path="task" element={<EmployeeTasks />} />
                <Route path="report" element={<EmployeeReports />} />
            </Route>

            {/* ================= INTERN ================= */}

            <Route
                path="/intern"
                element={
                    <ProtectedRoute allowedRoles={[ROLES.INTERN]}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<InternDashboard />} />
                <Route path="profile" element={<InternProfile />} />
                <Route path="task" element={<InternTasks />} />
                <Route path="report" element={<InternReports />} />
            </Route>

            {/* Unknown route - signed-in users go to their own dashboard,
                everyone else to login (BUG-020) */}
            <Route path="*" element={<RedirectHome />} />

        </Routes>
    );
}

export default AppRoutes;
