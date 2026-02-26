import { create } from 'zustand';
import axiosInstance from '../api/axios';

export interface MedicalOrganization {
    id: number;
    name: string;
    address: string;
    region_id: number;
    region?: {
        id: number;
        name: string;
    };
    org_type: string;
    brand: string;
    director_name: string;
    assigned_reps?: any[];
    assigned_rep_ids?: number[];
    contact_phone?: string;
}

interface MedOrgStore {
    medOrgs: MedicalOrganization[];
    isLoading: boolean;
    fetchMedOrgs: (regionId?: number) => Promise<void>;
    createMedOrg: (data: Partial<MedicalOrganization>) => Promise<void>;
    updateMedOrg: (id: number, data: Partial<MedicalOrganization>) => Promise<void>;
    fetchOrgStock: (id: number) => Promise<any[]>;
    fetchOrgDoctors: (id: number) => Promise<any[]>;
}

export const useMedOrgStore = create<MedOrgStore>((set) => ({
    medOrgs: [],
    isLoading: false,
    fetchMedOrgs: async (regionId) => {
        set({ isLoading: true });
        try {
            const params = regionId ? { region_id: regionId } : {};
            const response = await axiosInstance.get('/crm/med-orgs/', { params });
            set({ medOrgs: response.data, isLoading: false });
        } catch (error) {
            console.error('Error fetching med orgs:', error);
            set({ isLoading: false });
        }
    },
    createMedOrg: async (data) => {
        set({ isLoading: true });
        try {
            await axiosInstance.post('/crm/med-orgs/', data);
            const response = await axiosInstance.get('/crm/med-orgs/');
            set({ medOrgs: response.data, isLoading: false });
        } catch (error) {
            console.error('Error creating med org:', error);
            set({ isLoading: false });
            throw error;
        }
    },
    updateMedOrg: async (id, data) => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.put(`/crm/med-orgs/${id}`, data);
            // update existing item in array instead of refetching all
            set((state) => ({
                medOrgs: state.medOrgs.map(org => org.id === id ? { ...org, ...response.data } : org),
                isLoading: false
            }));
        } catch (error) {
            console.error('Error updating med org:', error);
            set({ isLoading: false });
            throw error;
        }
    },
    fetchOrgStock: async (id) => {
        try {
            const response = await axiosInstance.get(`/crm/med-orgs/${id}/stock`);
            return response.data;
        } catch (error) {
            console.error('Error fetching org stock:', error);
            return [];
        }
    },
    fetchOrgDoctors: async (id) => {
        try {
            const response = await axiosInstance.get(`/crm/doctors/?med_org_id=${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching org doctors:', error);
            return [];
        }
    }
}));
