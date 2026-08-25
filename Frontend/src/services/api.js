import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
    headers: {
        "Content-Type": "application/json"
    }
});

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {

    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Let the browser set the multipart boundary itself when sending FormData.
    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    }

    return config;

});

// ======================================================
// 401 HANDLING
//
// The backend now returns 401 (never 500) for an expired or invalid token.
// Without this interceptor the user was left on a broken page with no way
// back; now the stale session is cleared and they are sent to login once.
// ======================================================

api.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.response?.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Avoid a redirect loop when the failing call *is* the login call.
            const onAuthPage =
                window.location.pathname.startsWith("/login") ||
                window.location.pathname.startsWith("/register") ||
                window.location.pathname.startsWith("/forgot-password") ||
                window.location.pathname.startsWith("/reset-password");

            if (!onAuthPage) {
                window.location.replace("/login");
            }

        }

        return Promise.reject(error);

    }

);

export default api;
