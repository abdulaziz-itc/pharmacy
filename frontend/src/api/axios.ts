import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
    : 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        // Get token from Zustand persist storage
        // Get token from Zustand persist storage
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            try {
                const { state } = JSON.parse(authStorage);
                if (state?.token) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                    return config;
                }
            } catch (error) {
                console.error('Failed to parse auth storage:', error);
            }
        }

        // Fallback: Check for temporary token set during login
        const tempToken = localStorage.getItem('token');
        if (tempToken) {
            config.headers.Authorization = `Bearer ${tempToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Clear token and redirect to login if needed
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
