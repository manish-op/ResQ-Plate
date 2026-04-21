import axios from 'axios';
import { toast } from '../context/NotificationContext';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors and show toasts
api.interceptors.response.use(
  (response) => {
    // Show success toasts for mutations if message exists in response
    if (response.data?.success && response.data?.message && ['POST', 'PUT', 'DELETE'].includes(response.config.method?.toUpperCase())) {
      toast.success(response.data.message);
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Session expired. Please log in again.');
      window.location.href = '/auth';
    } else {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
