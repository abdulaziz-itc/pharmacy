import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const UserRole = {
    ADMIN: 'admin',
    DIRECTOR: 'director',
    DEPUTY_DIRECTOR: 'deputy_director',
    HEAD_OF_ORDERS: 'head_of_orders',
    PRODUCT_MANAGER: 'product_manager',
    FIELD_FORCE_MANAGER: 'field_force_manager',
    REGIONAL_MANAGER: 'regional_manager',
    MED_REP: 'med_rep'
} as const;

export interface User {
    id: number;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            setAuth: (user, token) => set({ user, token }),
            logout: () => set({ user: null, token: null }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
