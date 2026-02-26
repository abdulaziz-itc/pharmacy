import axiosInstance from './axios';

export interface UserCreate {
    full_name: string;
    username: string;
    password: string;
    role: string;
    manager_id?: number;
    region_id?: number;
}

export const createUser = async (userData: UserCreate) => {
    const response = await axiosInstance.post('/users/', userData);
    return response.data;
};

export const getUsers = async () => {
    const response = await axiosInstance.get('/users/');
    return response.data;
};
