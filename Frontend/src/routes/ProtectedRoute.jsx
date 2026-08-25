import { Navigate } from "react-router-dom";

// ======================================================
// ROLE-AWARE ROUTE GUARD
//
// Previously this only checked that a token string existed, so any logged-in
// user could type /admin/companies and get a fully rendered Admin page.
//
// This is defence in depth for UX only - the backend remains the real
// security boundary and independently rejects every unauthorised call.
// ======================================================

// Where each role belongs when it lands somewhere it shouldn't be.
const HOME_BY_ROLE = {
    Admin: "/admin/dashboard",
    Manager: "/manager/dashboard",
    "Team Lead": "/teamleader/dashboard",
    Employee: "/employee/dashboard",
    Intern: "/intern/dashboard"
};

const readStoredUser = () => {

    try {

        const raw = localStorage.getItem("user");

        return raw ? JSON.parse(raw) : null;

    } catch (error) {

        // Corrupted localStorage must not crash the whole app.
        return null;

    }

};

function ProtectedRoute({ children, allowedRoles }) {

    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const user = readStoredUser();

    // Token present but no usable user record - treat the session as broken.
    if (!user || !user.role) {
        return <Navigate to="/login" replace />;
    }

    // No list supplied means "any authenticated role".
    if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {

        const home = HOME_BY_ROLE[user.role] || "/login";

        return <Navigate to={home} replace />;

    }

    return children;

}

export default ProtectedRoute;
export { HOME_BY_ROLE };
