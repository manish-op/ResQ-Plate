import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import AuthPage from './pages/AuthPage';
import DonorDashboard from './pages/DonorDashboard';
import RecipientApp from './pages/RecipientApp';
import QrVerifyPage from './pages/QrVerifyPage';
import DonorOrdersPage from './pages/DonorOrdersPage';
import RecipientClaimsPage from './pages/RecipientClaimsPage';

const App = () => {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/donor" element={<DonorDashboard />} />
            <Route path="/donor/orders" element={<DonorOrdersPage />} />
            <Route path="/recipient" element={<RecipientApp />} />
            <Route path="/recipient/claims" element={<RecipientClaimsPage />} />
            <Route path="/verify/:token" element={<QrVerifyPage />} />
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App;
