import api from './axios';
import { type User } from '../store/authStore';

export const authService = {
    login: async (username: string, password: string) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        const response = await api.post('/login/access-token', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getMe: async () => {
        const response = await api.get<User>('/users/me');
        return response.data;
    },
};
