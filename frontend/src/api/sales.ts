import axiosInstance from './axios';

export interface Plan {
    id: number;
    med_rep_id: number;
    doctor_id?: number;
    med_org_id?: number;
    product_id: number;
    month: number;
    year: number;
    target_amount: number;
    target_quantity: number;
}

export interface SaleFact {
    id: number;
    med_rep_id: number;
    doctor_id: number;
    product_id: number;
    date: string;
    amount: number;
    quantity: number;
}

export interface DoctorFactAssignment {
    id: number;
    med_rep_id: number;
    doctor_id: number;
    product_id: number;
    quantity: number;
    month: number;
    year: number;
    created_at: string;
}

export interface BonusPayment {
    id: number;
    med_rep_id: number;
    doctor_id?: number;
    product_id?: number;
    amount: number;
    for_month: number;
    for_year: number;
    paid_date: string;
    notes?: string;
    created_at: string;
    product?: { id: number; name: string };
}

export const getPlans = async (month?: number, year?: number, med_rep_id?: number, doctor_id?: number) => {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    if (med_rep_id) params.med_rep_id = med_rep_id;
    if (doctor_id) params.doctor_id = doctor_id;
    const response = await axiosInstance.get('/sales/plans/', { params });
    return response.data;
};

export const createPlan = async (planData: Omit<Plan, 'id'>) => {
    const response = await axiosInstance.post('/sales/plans/', planData);
    return response.data;
};

export const getSaleFacts = async (med_rep_id?: number) => {
    const params: any = {};
    if (med_rep_id) params.med_rep_id = med_rep_id;
    const response = await axiosInstance.get('/sales/facts/', { params });
    return response.data;
};

export const getDoctorFacts = async (med_rep_id?: number, doctor_id?: number) => {
    const params: any = {};
    if (med_rep_id) params.med_rep_id = med_rep_id;
    if (doctor_id) params.doctor_id = doctor_id;
    const response = await axiosInstance.get('/sales/doctor-facts/', { params });
    return response.data;
};

export const createDoctorFact = async (factData: Omit<DoctorFactAssignment, 'id' | 'created_at'>) => {
    const response = await axiosInstance.post('/sales/doctor-facts/', factData);
    return response.data;
};

export const updatePlan = async (id: number, planData: Partial<Plan>) => {
    const response = await axiosInstance.put(`/sales/plans/${id}`, planData);
    return response.data;
};

export const deletePlan = async (id: number) => {
    const response = await axiosInstance.delete(`/sales/plans/${id}`);
    return response.data;
};

export const getBonusPayments = async (med_rep_id?: number) => {
    const params: any = {};
    if (med_rep_id) params.med_rep_id = med_rep_id;
    const response = await axiosInstance.get('/sales/bonus-payments/', { params });
    return response.data;
};

export const createBonusPayment = async (data: Omit<BonusPayment, 'id' | 'created_at'>) => {
    const response = await axiosInstance.post('/sales/bonus-payments/', data);
    return response.data;
};

export const updateBonusPayment = async (id: number, data: Partial<Omit<BonusPayment, 'id' | 'created_at'>>) => {
    const response = await axiosInstance.patch(`/sales/bonus-payments/${id}/`, data);
    return response.data;
};
