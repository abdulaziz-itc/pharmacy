import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface Product {
    id: number;
    name: string;
    price: number;
    production_price: number;
    marketing_expense: number;
    salary_expense: number;
    other_expenses: number;  // Прочие расходы
    is_active: boolean;
    manufacturers?: { name: string; id: number }[];
    category?: { name: string; id: number } | null;
    manufacturer_ids?: number[]; // for creation/update
    category_id: number;
}

interface ProductState {
    products: Product[];
    isLoading: boolean;
    fetchProducts: () => Promise<void>;
    createProduct: (data: Omit<Product, 'id' | 'manufacturers' | 'category'>) => Promise<void>;
    updateProduct: (id: number, data: Partial<Product>) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
    products: [],
    isLoading: false,
    fetchProducts: async () => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.get('/products/');
            set({ products: response.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching products:', error);
            set({ isLoading: false });
        }
    },
    createProduct: async (data) => {
        set({ isLoading: true });
        try {
            await axiosInstance.post('/products/', data);
            const response = await axiosInstance.get('/products/');
            set({ products: response.data, isLoading: false });
        } catch (error) {
            console.error('Error creating product:', error);
            set({ isLoading: false });
            throw error;
        }
    },
    updateProduct: async (id, data) => {
        set({ isLoading: true });
        try {
            await axiosInstance.put(`/products/${id}`, data);
            const response = await axiosInstance.get('/products/');
            set({ products: response.data, isLoading: false });
        } catch (error) {
            console.error('Error updating product:', error);
            set({ isLoading: false });
            throw error;
        }
    },
}));
