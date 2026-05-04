import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('id');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) navigate('/registro');
  }, [businessId, navigate]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/businesses/${businessId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, address, ownerName }),
      });
      navigate('/panel');
    } catch {
      navigate('/panel');
    }
  };

  const handleSkip = () => {
    const skips = parseInt(localStorage.getItem('sella_profile_skips') || '0') + 1;
    localStorage.setItem('sella_profile_skips', String(skips));
    navigate('/panel');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-xl font-bold text-gray-900">Completa tu perfil</h2>
          <p className="text-sm text-gray-500 mt-1">Opcional. Nos ayuda a darte mejor soporte.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="cafeteria@correo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección del negocio</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Calle 10 #5-30, Granada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del dueño</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="Carlos Pérez"
            />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={handleSkip} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2">
            Omitir por ahora
          </button>
        </div>
      </div>
    </div>
  );
}
