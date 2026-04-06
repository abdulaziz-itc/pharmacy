import axiosInstance from './axios';

export const getUserHierarchy = async (userId: number) => {
    const response = await axiosInstance.get(`/users/${userId}/hierarchy`);
    return response.data;
};
