import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists on load
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const oauthLogin = async (token, refreshToken, isPending) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    
    try {
      const response = await api.get('/auth/me');
      // The backend /me returns { email, authorities }
      // We need more user data (id, name, role) for our context state
      // On callback, we might just stay in loading state until we redirect to dashboard
      // where dashboards usually fetch their own data.
      // But let's try to get full info if possible.
      
      const userData = { email: response.data.data.email, role: isPending === 'true' ? 'PENDING' : '' };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, pending: isPending === 'true' };
    } catch (error) {
      console.error("OAuth session initiation failed", error);
      return { success: false };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, refreshToken, userId, role } = response.data.data;
      
      if (!token || typeof token !== 'string' || token === 'undefined') {
        throw new Error("Invalid token received from server");
      }

      const userData = { id: userId, email, role };
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login failed", error);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token, refreshToken, userId, role } = response.data.data;

      if (!token || typeof token !== 'string' || token === 'undefined') {
        throw new Error("Invalid token received from server");
      }
      
      const sessionData = { id: userId, email: userData.email, role };
      
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(sessionData));
      setUser(sessionData);
      return { success: true };
    } catch (error) {
       console.error("Registration failed", error);
       return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
