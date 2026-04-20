import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ThemeWrapper = ({ children }) => {
  const { user } = useContext(AuthContext);
  
  const roleClass = user?.role === 'DONOR' 
    ? 'role-donor' 
    : user?.role === 'RECIPIENT' 
      ? 'role-recipient' 
      : '';

  return (
    <div className={`app-theme-container ${roleClass}`} style={{ minHeight: '100vh' }}>
      {children}
    </div>
  );
};

export default ThemeWrapper;
