import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProgramSetup from './pages/ProgramSetup';
import Customers from './pages/Customers';
import Campaigns from './pages/Campaigns';
import Layout from './components/Layout';
import SetPin from './pages/SetPin';
import CompleteProfile from './pages/CompleteProfile';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './components/AdminLayout';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/panel/configurar-pin" element={<SetPin />} />
      <Route path="/panel/completar-perfil" element={<CompleteProfile />} />
      <Route element={<Layout />}>
        <Route path="/panel" element={<Dashboard />} />
        <Route path="/panel/programas" element={<ProgramSetup />} />
        <Route path="/panel/clientes" element={<Customers />} />
        <Route path="/panel/campanas" element={<Campaigns />} />
      </Route>
      <Route path="/admin" element={<AdminLogin />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin/panel" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}
