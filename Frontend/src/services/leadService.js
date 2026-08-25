import api from "./api";

// ================= CREATE =================

export const createLead = async (data) => {
    const response = await api.post("/lead/create", data);
    return response.data;
};

// ================= LIST =================

export const leadList = async () => {
    const response = await api.post("/lead/list");
    return response.data;
};

// ================= DETAILS =================

export const leadDetails = async (data) => {
    const response = await api.post("/lead/details", data);
    return response.data;
};

// ================= UPDATE =================

export const updateLead = async (data) => {
    const response = await api.post("/lead/update", data);
    return response.data;
};

// ================= DELETE =================

export const deleteLead = async (data) => {
    const response = await api.post("/lead/delete", data);
    return response.data;
};

// ================= STATUS =================

export const updateLeadStatus = async (data) => {
    const response = await api.post("/lead/status", data);
    return response.data;
};