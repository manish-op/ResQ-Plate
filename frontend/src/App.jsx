import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DonorDashboard from './pages/DonorDashboard';
import RecipientApp from './pages/RecipientApp';
import QrVerifyPage from './pages/QrVerifyPage';
import DonorOrdersPage from './pages/DonorOrdersPage';
import RecipientClaimsPage from './pages/RecipientClaimsPage';
import OAuthCallback from './pages/OAuthCallback';
import FinishProfile from './pages/FinishProfile';
import ThemeWrapper from './components/ThemeWrapper';

const App = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <ThemeWrapper>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/oauth-callback" element={<OAuthCallback />} />
                <Route path="/finish-profile" element={<FinishProfile />} />
                <Route path="/donor" element={<DonorDashboard />} />
                <Route path="/donor/orders" element={<DonorOrdersPage />} />
                <Route path="/recipient" element={<RecipientApp />} />
                <Route path="/recipient/claims" element={<RecipientClaimsPage />} />
                <Route path="/verify/:token" element={<QrVerifyPage />} />
              </Routes>
            </ThemeWrapper>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
