import api from './axios';

export const getVisitPlans = async (userId?: number) => {
    try {
        const response = await api.get('/visit-plans/', {
            params: { med_rep_id: userId }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching visit plans:", error);
        return [];
    }
};

export const createVisitPlan = async (data: any) => {
    try {
        const response = await api.post('/visit-plans/', data);
        return response.data;
    } catch (error) {
        console.error("Error creating visit plan:", error);
        throw error;
    }
};
