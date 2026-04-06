import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface Manufacturer {
    id: number;
    name: string;
}

interface ManufacturerState {
    manufacturers: Manufacturer[];
    isLoading: boolean;
    fetchManufacturers: () => Promise<void>;
    createManufacturer: (name: string) => Promise<void>;
    updateManufacturer: (id: number, name: string) => Promise<void>;
}

export const useManufacturerStore = create<ManufacturerState>((set) => ({
    manufacturers: [],
    isLoading: false,

    fetchManufacturers: async () => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.get('/manufacturers/');
            set({ manufacturers: response.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
            set({ isLoading: false });
        }
    },

    createManufacturer: async (name: string) => {
        set({ isLoading: true });
        try {
            await axiosInstance.post('/manufacturers/', { name });
            const response = await axiosInstance.get('/manufacturers/');
            set({ manufacturers: response.data, isLoading: false });
        } catch (error) {
            console.error('Error creating manufacturer:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    updateManufacturer: async (id: number, name: string) => {
        try {
            await axiosInstance.put(`/manufacturers/${id}`, { name });
            const response = await axiosInstance.get('/manufacturers/');
            set({ manufacturers: response.data });
        } catch (error) {
            console.error('Error updating manufacturer:', error);
            throw error;
        }
    },
}));
