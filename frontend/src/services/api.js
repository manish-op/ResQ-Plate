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

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token));
};

// Response Interceptor: Handle global errors and show toasts
api.interceptors.response.use(
  (response) => {
    if (response.data?.success && response.data?.message && ['POST', 'PUT', 'DELETE'].includes(response.config.method?.toUpperCase())) {
      toast.success(response.data.message);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const message = error.response?.data?.message || 'Something went wrong. Please try again.';

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        handleLogoutRedirection();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post('http://localhost:8080/api/auth/refresh', { refreshToken });
        const newToken = data.data.token;
        const newRefreshToken = data.data.refreshToken;

        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        isRefreshing = false;
        onTokenRefreshed(newToken);
        refreshSubscribers = [];

        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        handleLogoutRedirection();
        return Promise.reject(refreshError);
      }
    } else if (error.response?.status === 401) {
      handleLogoutRedirection();
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

const handleLogoutRedirection = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/auth') {
    toast.error('Session expired. Please log in again.');
    window.location.href = '/auth';
  }
};

export default api;
