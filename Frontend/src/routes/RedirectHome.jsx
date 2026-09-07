import { Navigate } from "react-router-dom";

import { HOME_BY_ROLE } from "./ProtectedRoute";

// ======================================================
// WHERE DOES AN UNKNOWN URL GO?
//
// The catch-all route used to send everyone to /login, so an authenticated
// user who mistyped a URL was dumped on the sign-in screen and looked logged
// out (report BUG-020).
//
// This sends a signed-in user back to their own dashboard and only shows
// /login to someone who genuinely has no session.
//
// Reading localStorage is wrapped in try/catch for the same reason
// ProtectedRoute does it: corrupted storage must not crash the whole app.
// ======================================================

const readStoredUser = () => {

    try {

        const raw = localStorage.getItem("user");

        return raw ? JSON.parse(raw) : null;

    } catch (error) {

        return null;

    }

};

function RedirectHome() {

    const token = localStorage.getItem("token");
    const user = readStoredUser();

    if (token && user && user.role && HOME_BY_ROLE[user.role]) {
        return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
    }

    return <Navigate to="/login" replace />;

}

export default RedirectHome;
