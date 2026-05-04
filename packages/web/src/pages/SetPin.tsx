import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function SetPin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('id');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!businessId) navigate('/registro');
  }, [businessId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) { setError('Los PIN no coinciden'); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('El PIN debe ser de 4 dígitos'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/businesses/${businessId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error('Error al guardar PIN');
      navigate(`/panel/completar-perfil?id=${businessId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-gray-900">Crea tu PIN de seguridad</h2>
          <p className="text-sm text-gray-500 mt-1">4 dígitos para proteger tu cuenta.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4 dígitos)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="····"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="····"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar PIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
