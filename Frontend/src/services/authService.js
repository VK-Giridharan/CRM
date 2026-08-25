import api from "./api";

export const loginUser = async (data) => {
    const response = await api.post("/auth/login", data);
    return response.data;
};

export const registerUser = async (data) => {
    const response = await api.post("/auth/register", data);
    return response.data;
};

// ================= PASSWORD RESET =================

// Always resolves with the same generic message whether or not the email
// exists - the backend deliberately does not reveal account existence.
export const forgotPassword = async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
};

export const resetPassword = async ({ token, newPassword }) => {
    const response = await api.post("/auth/reset-password", {
        token,
        newPassword
    });
    return response.data;
};
