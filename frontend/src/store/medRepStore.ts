import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface MedRep {
    id: number;
    username: string;
    full_name: string;
    role: string;
    is_active: boolean;
    manager_name: string | null;
}

interface MedRepState {
    medReps: MedRep[];
    isLoading: boolean;
    error: string | null;
    fetchMedReps: (role?: string) => Promise<void>;
}

export const useMedRepStore = create<MedRepState>((set) => ({
    medReps: [],
    isLoading: false,
    error: null,
    fetchMedReps: async (role) => {
        set({ isLoading: true, error: null });
        try {
            const params = role ? { role } : {};
            const response = await axiosInstance.get('/users/med-reps', { params });
            set({ medReps: response.data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch med reps', isLoading: false });
        }
    },
}));
