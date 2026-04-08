import api from './axios';

export const getNotifications = async () => {
    try {
        const response = await api.get('/notifications/');
        return response.data;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
};

export const createNotification = async (data: any) => {
    try {
        const response = await api.post('/notifications/', data);
        return response.data;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

export const markNotificationRead = async (id: number) => {
    try {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    } catch (error) {
        console.error("Error marking notification read:", error);
        throw error;
    }
};
