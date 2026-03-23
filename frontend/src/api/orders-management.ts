import axiosInstance from './axios';

export interface Warehouse {
    id: number;
    name: string;
    warehouse_type: string;
    med_org_id?: number;
    stocks?: Stock[];
}

export interface Stock {
    id: number;
    product_id: number;
    quantity: number;
}

export const getWarehouses = async () => {
    const response = await axiosInstance.get('/domain/orders/management/warehouses/');
    return response.data;
};

export const createWarehouse = async (data: Partial<Warehouse>) => {
    const response = await axiosInstance.post('/domain/orders/management/warehouses/', data);
    return response.data;
};

export const createPayment = async (data: any) => {
    const response = await axiosInstance.post('/domain/orders/management/payments/', data);
    return response.data;
};

export const fulfillStock = async (warehouseId: number, productId: number, quantity: number) => {
    const response = await axiosInstance.post(`/domain/orders/management/warehouses/${warehouseId}/fulfill`, {
        product_id: productId,
        quantity: quantity
    });
    return response.data;
};

export const getReservations = async (status?: string) => {
    const response = await axiosInstance.get('/domain/orders/management/reservations/', { params: { status } });
    return response.data;
};

export const getReservationById = async (id: number) => {
    const response = await axiosInstance.get(`/sales/reservations/${id}`);
    return response.data;
};

export const activateReservation = async (reservationId: number) => {
    const response = await axiosInstance.post(`/domain/orders/management/reservations/${reservationId}/activate`);
    return response.data;
};

export const deleteReservation = async (reservationId: number) => {
    const response = await axiosInstance.delete(`/domain/orders/management/reservations/${reservationId}`);
    return response.data;
};

export const getInvoices = async () => {
    const response = await axiosInstance.get('/domain/orders/management/invoices/');
    return response.data;
};

// MedRep Sales Assignment
export const getUnassignedSales = async () => {
    const response = await axiosInstance.get('/sales/medrep/unassigned-sales/');
    return response.data;
};

export const assignSaleToDoctor = async (unassignedId: number, doctorId: number, quantity: number) => {
    const response = await axiosInstance.post(`/sales/medrep/unassigned-sales/${unassignedId}/assign`, null, {
        params: { doctor_id: doctorId, quantity: quantity }
    });
    return response.data;
};

// MedRep Bonus Balance
export const getMedRepBonusBalance = async (medRepId?: number, month?: number, year?: number) => {
    const response = await axiosInstance.get('/sales/bonus-balance/', {
        params: { med_rep_id: medRepId, month, year }
    });
    return response.data;
};

export const allocateBonus = async (data: {
    med_rep_id?: number;   // Whose balance to debit (for admin/director)
    doctor_id: number;
    product_id: number;   // Required - determines marketing_expense
    quantity: number;     // Units to pay for
    target_month: number;
    target_year: number;
    amount_per_unit?: number;
    notes?: string;
}) => {
    const response = await axiosInstance.post('/sales/allocate-bonus/', data);
    return response.data;
};
