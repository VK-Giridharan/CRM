import api from "./api";

export const profile=async()=>{const response=await api.post("/auth/profile");return response.data;}

export const updateProfile=async(data)=>{
    const response=await api.post("/auth/update-profile",data);
    return response.data;}

export const changePassword=async(data)=>{const response=await api.post("/auth/change-password",data);return response.data;}