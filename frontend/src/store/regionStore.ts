import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface Region {
    id: number;
    name: string;
}

interface RegionStore {
    regions: Region[];
    isLoading: boolean;
    fetchRegions: () => Promise<void>;
}

export const useRegionStore = create<RegionStore>((set) => ({
    regions: [],
    isLoading: false,
    fetchRegions: async () => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.get('/crm/regions/');
            set({ regions: response.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching regions:', error);
            set({ isLoading: false });
        }
    },
}));
