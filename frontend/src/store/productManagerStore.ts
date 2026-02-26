import { create } from 'zustand';
import { getUsers, createUser } from '../api/user';
import type { UserCreate } from '../api/user';

export interface ProductManager {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

interface ProductManagerState {
    productManagers: ProductManager[];
    isLoading: boolean;
    error: string | null;
    fetchProductManagers: () => Promise<void>;
    addProductManager: (manager: UserCreate) => Promise<void>;
}

export const useProductManagerStore = create<ProductManagerState>((set, get) => ({
    productManagers: [],
    isLoading: false,
    error: null,
    fetchProductManagers: async () => {
        set({ isLoading: true, error: null });
        try {
            const users = await getUsers();
            // Filter only product managers if the API returns all users
            const pms = users.filter((u: any) => u.role === 'product_manager');
            set({ productManagers: pms, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },
    addProductManager: async (managerData) => {
        set({ isLoading: true, error: null });
        try {
            const newManager = await createUser({
                ...managerData,
                role: 'product_manager'
            });
            set({
                productManagers: [...get().productManagers, newManager],
                isLoading: false
            });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },
}));
