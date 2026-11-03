import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import RandomChatPage from './pages/RandomChatPage';
import AdminPage from './pages/AdminPage';
import './styles.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!authenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, user, loading } = useAuth();
  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!authenticated || user?.role !== 'ROLE_ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomCode" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      <Route path="/random" element={<ProtectedRoute><RandomChatPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
