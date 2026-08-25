import api from "./api";

export const getWorkers = async () => {
    const response = await api.post("/auth/workers");
    return response.data;
};

export const changeRole = async (data) => {
    const response = await api.post("/auth/change-role", data);
    return response.data;
};

export const pendingUsers = async () => {
    const response = await api.post("/auth/pending-users");
    return response.data;
};