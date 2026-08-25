import api from "./api";

// Company-scoped list used by the Manager page.
export const customerList = async () => {
    const response = await api.post("/customer/list");
    return response.data;
};

// Global cross-company list for the Admin Customers page.
// Backend-gated to Admin only - every other role receives 403.
export const adminCustomerList = async () => {
    const response = await api.post("/customer/admin-list");
    return response.data;
};

export const createCustomer = async (data) => {
    const response = await api.post("/customer/create", data);
    return response.data;
};

export const customerDetails = async (data) => {
    const response = await api.post("/customer/details", data);
    return response.data;
};

export const updateCustomer = async (data) => {
    const response = await api.post("/customer/update", data);
    return response.data;
};

export const deleteCustomer = async (data) => {
    const response = await api.post("/customer/delete", data);
    return response.data;
};