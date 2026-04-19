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

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, userId, role } = response.data.data;
      
      if (!token || typeof token !== 'string' || token === 'undefined') {
        throw new Error("Invalid token received from server");
      }

      const userData = { id: userId, email, role };
      
      localStorage.setItem('token', token);
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
      const { token, userId, role } = response.data.data;

      if (!token || typeof token !== 'string' || token === 'undefined') {
        throw new Error("Invalid token received from server");
      }
      
      const sessionData = { id: userId, email: userData.email, role };
      
      localStorage.setItem('token', token);
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
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
