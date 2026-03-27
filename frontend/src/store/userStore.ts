import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface User {
    id: number;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
    manager_id?: number | null;
    manager_name?: string | null;
    region_ids: number[];
}

export interface LoginHistory {
    id: number;
    user_id: number;
    login_at: string;
    ip_address: string | null;
    location: string | null;
    user_agent: string | null;
    user?: User;
}

interface UserStore {
    users: User[];
    loginHistory: LoginHistory[];
    isLoading: boolean;
    error: string | null;
    fetchUsers: (role?: string) => Promise<void>;
    fetchLoginHistory: (month?: number, year?: number) => Promise<void>;
    clearLoginHistory: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
    users: [],
    loginHistory: [],
    isLoading: false,
    error: null,
    fetchUsers: async (role) => {
        set({ isLoading: true, error: null });
        try {
            const params = role ? { role } : {};
            const response = await axiosInstance.get('/users/med-reps', { params });
            // /users/med-reps returns users with manager names, which is what we need
            set({ users: response.data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch users', isLoading: false });
        }
    },
    fetchLoginHistory: async (month?: number, year?: number) => {
        set({ isLoading: true, error: null });
        try {
            const params: any = {};
            if (month) params.month = month;
            if (year) params.year = year;
            
            const response = await axiosInstance.get('/users/login-history', { params });
            set({ loginHistory: response.data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch login history', isLoading: false });
        }
    },
    clearLoginHistory: async () => {
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.delete('/users/login-history');
            set({ loginHistory: [], isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to clear login history', isLoading: false });
            throw err;
        }
    },
}));
