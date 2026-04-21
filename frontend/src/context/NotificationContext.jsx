import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

let addNotificationRef = null;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  // Store reference for non-hook usage (e.g. in api.js)
  addNotificationRef = addNotification;

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="toast-area">
        {notifications.map((n) => (
          <div key={n.id} className={`toast ${n.type}`} onClick={() => removeNotification(n.id)}>
            <span className="toast-icon">
              {n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="toast-message">{n.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const toast = {
  success: (msg) => addNotificationRef?.(msg, 'success'),
  error: (msg) => addNotificationRef?.(msg, 'error'),
  info: (msg) => addNotificationRef?.(msg, 'info'),
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
