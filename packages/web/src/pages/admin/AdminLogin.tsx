import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError, data } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) { setError('Credenciales inválidas'); setLoading(false); return; }

    const role = data.user?.user_metadata?.role;
    if (role !== 'admin') { await supabase.auth.signOut(); setError('No tenés permisos de administrador'); setLoading(false); return; }

    navigate('/admin/panel');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8"><div className="text-4xl mb-3">🛡️</div><h1 className="text-2xl font-bold text-white">Sella Admin</h1><p className="text-gray-400 text-sm mt-1">Panel de administración</p></div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <form onSubmit={handleLogin}>
            {error && <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4 border border-red-800">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-300 mb-1">Correo</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="admin@sella.co" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 outline-none" /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-6 bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50">{loading ? 'Ingresando...' : 'Ingresar'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
