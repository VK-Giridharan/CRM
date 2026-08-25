import api from "./api";

// One endpoint for every role - the backend returns the payload appropriate
// to the caller and scopes all counts to their company.
export const getDashboard = async () => {
    const response = await api.get("/dashboard");
    return response.data;
};
