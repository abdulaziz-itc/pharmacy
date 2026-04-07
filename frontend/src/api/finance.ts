import api from './axios';

export const createSalaryPayment = async (data: {
    user_id: number;
    amount: number;
    notes?: string;
    target_month?: number;
    target_year?: number;
}) => {
    const response = await api.post('/finance/salary-payment', data);
    return response.data;
};
