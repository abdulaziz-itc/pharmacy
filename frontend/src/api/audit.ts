import axiosInstance from './axios';

export interface AuditLog {
    id: number;
    user_id: number;
    username: string;
    full_name?: string;
    action: string;
    entity_type: string;
    entity_id: number;
    description: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
}

export interface AuditLogFilters {
    username?: string;
    action?: string;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
    ip_address?: string;
    skip?: number;
    limit?: number;
}

export const getAuditLogs = async (filters: AuditLogFilters = {}) => {
    const response = await axiosInstance.get('/audit/audit-logs/', { params: filters });
    return response.data;
};

export const getAuditActions = async () => {
    const response = await axiosInstance.get('/audit/audit-logs/actions/');
    return response.data;
};

export const clearAuditLogs = async () => {
    const response = await axiosInstance.delete('/audit/audit-logs/');
    return response.data;
};
