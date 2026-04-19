import React, { createContext, useContext, useEffect, useState } from 'react';
import { wsService } from '../services/wsService';
import { AuthContext } from './AuthContext';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if the user is logged in
    if (user) {
      wsService.connect(() => setIsConnected(true));
    } else {
      wsService.disconnect();
      setIsConnected(false);
    }

    return () => {
      wsService.disconnect();
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ isConnected, wsService }}>
      {children}
    </WebSocketContext.Provider>
  );
};
