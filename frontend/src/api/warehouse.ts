import api from './axios';

export interface Stock {
  id: number;
  product_id: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
  };
}

export interface Warehouse {
  id: number;
  name: string;
  warehouse_type: string;
  med_org_id?: number;
  stocks: Stock[];
}

export interface DeletionRequest {
  reservations: any[];
  invoices: any[];
  return_requests: any[];
}

export const warehouseApi = {
  getWarehouses: async () => {
    const response = await api.get<Warehouse[]>('/domain/warehouse/warehouses/');
    return response.data;
  },
  
  createWarehouse: async (data: { name: string; warehouse_type: string; med_org_id?: number }) => {
    const response = await api.post<Warehouse>('/domain/warehouse/warehouses/', data);
    return response.data;
  },
  
  addStock: async (warehouseId: number, data: { product_id: number; quantity: number }) => {
    const response = await api.post(`/domain/warehouse/warehouses/${warehouseId}/stock`, data);
    return response.data;
  },
  
  getDeletionRequests: async () => {
    const response = await api.get<DeletionRequest>('/domain/warehouse/deletion-requests');
    return response.data;
  },
  
  approveDeletion: async (type: 'reservation' | 'invoice', id: number) => {
    const response = await api.post(`/domain/warehouse/deletion-requests/${type}/${id}/approve`);
    return response.data;
  },
  
  rejectDeletion: async (type: 'reservation' | 'invoice', id: number) => {
    const response = await api.post(`/domain/warehouse/deletion-requests/${type}/${id}/reject`);
    return response.data;
  },
  
  approveReturn: async (id: number) => {
    const response = await api.post(`/domain/warehouse/deletion-requests/return/${id}/approve`);
    return response.data;
  },
  
  rejectReturn: async (id: number) => {
    const response = await api.post(`/domain/warehouse/deletion-requests/return/${id}/reject`);
    return response.data;
  },
};
