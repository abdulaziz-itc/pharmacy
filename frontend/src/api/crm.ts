import axiosInstance from './axios';

export interface MedicalOrganization {
    id: number;
    name: string;
    address?: string;
    region_id: number;
    org_type: 'clinic' | 'pharmacy';
    brand?: string;
    director_name?: string;
    assigned_reps?: any[];
    inn?: string;
}

export interface Doctor {
    id: number;
    full_name: string;
    region_id: number;
    specialty_id: number;
    category_id: number;
    med_org_id: number;
    assigned_rep_id?: number;
    med_org?: MedicalOrganization;
}

export const getMedOrgs = async (params?: Record<string, any>) => {
    const response = await axiosInstance.get('/crm/med-orgs/', { params });
    return response.data;
};

export const getMedicalOrganizations = getMedOrgs;

export const getDoctors = async (params?: Record<string, any>) => {
    const response = await axiosInstance.get('/crm/doctors/', { params });
    return response.data;
};

export const createDoctor = async (data: any) => {
    const response = await axiosInstance.post('/crm/doctors/', data);
    return response.data;
};

export interface DoctorSpecialty {
    id: number;
    name: string;
}

export interface DoctorCategory {
    id: number;
    name: string;
}

export const getSpecialties = async () => {
    const response = await axiosInstance.get('/crm/doctor-specialties/');
    return response.data;
};

export const createSpecialty = async (name: string): Promise<DoctorSpecialty> => {
    const response = await axiosInstance.post('/crm/doctor-specialties/', { name });
    return response.data;
};

export const getDoctorCategories = async () => {
    const response = await axiosInstance.get('/crm/doctor-categories/');
    return response.data;
};

export const getRegions = async () => {
    const response = await axiosInstance.get('/crm/regions/');
    return response.data;
};

export const updateDoctor = async (id: number, data: any) => {
    const response = await axiosInstance.put(`/crm/doctors/${id}`, data);
    return response.data;
};
