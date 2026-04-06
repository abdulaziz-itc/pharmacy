import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface Category {
    id: number;
    name: string;
}

interface CategoryState {
    categories: Category[];
    isLoading: boolean;
    fetchCategories: () => Promise<void>;
    createCategory: (name: string) => Promise<void>;
    updateCategory: (id: number, name: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
    categories: [],
    isLoading: false,
    fetchCategories: async () => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.get('/categories/');
            set({ categories: response.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching categories:', error);
            set({ isLoading: false });
        }
    },
    createCategory: async (name: string) => {
        set({ isLoading: true });
        try {
            await axiosInstance.post('/categories/', { name });
            const response = await axiosInstance.get('/categories/');
            set({ categories: response.data, isLoading: false });
        } catch (error) {
            console.error('Error creating category:', error);
            set({ isLoading: false });
            throw error;
        }
    },
    updateCategory: async (id: number, name: string) => {
        set({ isLoading: true });
        try {
            await axiosInstance.put(`/categories/${id}`, { name });
            const response = await axiosInstance.get('/categories/');
            set({ categories: response.data, isLoading: false });
        } catch (error) {
            console.error('Error updating category:', error);
            set({ isLoading: false });
            throw error;
        }
    },
}));
