import api from "./api";

export const createCompany = async (data) => {
    const response = await api.post("/company/create", data);
    return response.data;
};

export const companyList = async () => {
    const response = await api.post("/company/list");
    return response.data;
};

export const companyDetails = async (id) => {
    const response = await api.post("/company/details", { id });
    return response.data;
};

export const updateCompany = async (data) => {
    const response = await api.post("/company/update", data);
    return response.data;
};

export const deleteCompany = async (id) => {
    const response = await api.post("/company/delete", { id });
    return response.data;
};