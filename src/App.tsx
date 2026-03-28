import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import WashQueue from './pages/WashQueue';
import Clients from './pages/Clients';
import NewClient from './pages/NewClient';
import ClientDetails from './pages/ClientDetails';
import NewWash from './pages/NewWash';
import Finance from './pages/Finance';
import NewTransaction from './pages/NewTransaction';
import Inventory from './pages/Inventory';
import Services from './pages/Services';
import NewService from './pages/NewService';
import EditService from './pages/EditService';
import EditClient from './pages/EditClient';
import Login from './pages/Login';
import Relatorios from './pages/Relatorios';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/fila" replace />} />
                    <Route path="/fila" element={<WashQueue />} />
                    <Route path="/clientes" element={<Clients />} />
                    <Route path="/clientes/novo" element={<NewClient />} />
                    <Route path="/clientes/editar/:id" element={<EditClient />} />
                    <Route path="/clientes/:id" element={<ClientDetails />} />
                    <Route path="/lavagem/nova" element={<NewWash />} />
                    <Route path="/financeiro" element={<Finance />} />
                    <Route path="/financeiro/novo" element={<NewTransaction />} />
                    <Route path="/estoque" element={<Inventory />} />
                    <Route path="/servicos" element={<Services />} />
                    <Route path="/servicos/novo" element={<NewService />} />
                    <Route path="/servicos/editar/:id" element={<EditService />} />
                    <Route path="/relatorios" element={<Relatorios />} />
                    <Route path="/configuracoes" element={<Settings />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
