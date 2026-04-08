import api from './axios';
import { type User } from '../store/authStore';

export const authService = {
    login: async (username: string, password: string, location?: string) => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        if (location) {
            params.append('client_location', location);
        }
        const response = await api.post('/login/access-token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return response.data;
    },

    getMe: async () => {
        const response = await api.get<User>('/users/me');
        return response.data;
    },
};
