import api from "./api";

// ================= CREATE =================

export const createMeeting = async (data) => {
    const response = await api.post("/meeting/create", data);
    return response.data;
};

// ================= LIST =================

export const meetingList = async () => {
    const response = await api.post("/meeting/list");
    return response.data;
};

// ================= DETAILS =================

export const meetingDetails = async (data) => {
    const response = await api.post("/meeting/details", data);
    return response.data;
};

// ================= UPDATE =================

export const updateMeeting = async (data) => {
    const response = await api.post("/meeting/update", data);
    return response.data;
};

// ================= DELETE =================

export const deleteMeeting = async (data) => {
    const response = await api.post("/meeting/delete", data);
    return response.data;
};

// ================= COMPLETE =================

export const completeMeeting = async (data) => {
    const response = await api.post("/meeting/complete", data);
    return response.data;
};