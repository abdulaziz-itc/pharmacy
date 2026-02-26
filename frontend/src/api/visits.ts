import axiosInstance from './axios';

export const getVisits = async (userId: number) => {
    const response = await axiosInstance.get(`/users/${userId}/visits`);
    return response.data;
};

export const createVisit = async (visitData: any) => {
    const response = await axiosInstance.post('/users/visits/', visitData);
    return response.data;
};

export const getVisitPlans = async (userId: number) => {
    const response = await axiosInstance.get(`/users/${userId}/plans`);
    return response.data;
};

export const createVisitPlan = async (planData: any) => {
    const response = await axiosInstance.post('/users/plans/', planData);
    return response.data;
};
