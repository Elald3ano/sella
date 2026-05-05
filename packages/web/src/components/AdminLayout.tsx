import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/admin'); return; }
    if (!isAdmin) { signOut(); navigate('/admin'); }
  }, [user, loading, isAdmin, navigate, signOut]);

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 min-h-screen flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-gray-800"><span className="text-lg font-bold text-white">Sella Admin</span></div>
        <nav className="flex-1 p-3 space-y-1">
          <button onClick={() => navigate('/admin/panel')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/admin/panel' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>📊 Dashboard</button>
        </nav>
        <div className="p-3 border-t border-gray-800 flex items-center justify-between">
          <span className="text-xs text-gray-500">{user.email}</span>
          <button onClick={() => signOut()} className="text-xs text-gray-500 hover:text-red-400">Salir</button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto"><Outlet /></main>
    </div>
  );
}
