import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import InstallPrompt from './components/InstallPrompt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import NewDelivery from './pages/NewDelivery';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ClienteOrdine from './pages/ClienteOrdine';
import OrdiniGiorno from './pages/OrdiniGiorno';
import Contabilita from './pages/Contabilita';
import OrdiniRicorrenti from './pages/OrdiniRicorrenti';
import StoricoCliente from './pages/StoricoCliente';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* iOS/Android Install Prompt */}
        <InstallPrompt />
        
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Common Routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Driver/Admin Routes */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/delivery" element={<NewDelivery />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ordini" element={<OrdiniGiorno />} />
            <Route path="/contabilita" element={<Contabilita />} />
            
            {/* Client Routes */}
            <Route path="/ordine" element={<ClienteOrdine />} />
            <Route path="/ricorrenti" element={<OrdiniRicorrenti />} />
            
            {/* Admin Only Routes */}
            <Route path="/storico/:customerId" element={<StoricoCliente />} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

