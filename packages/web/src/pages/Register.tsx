import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from '../components/PhoneInput';

const BUSINESS_TYPES = [
  'cafeteria',
  'panaderia',
  'jugueria',
  'barberia',
  'lavanderia',
  'otro',
] as const;

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [business, setBusiness] = useState<{ id?: string; name?: string }>({});

  const [form, setForm] = useState({
    name: '',
    phone: '',
    type: 'cafeteria' as string,
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      setError('Ingresa un número de teléfono válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/businesses/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: cleanPhone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al registrar');
      }

      const data = await res.json();
      setBusiness(data);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-primary-600">Sella</span>
          <div className="mt-4 flex justify-center gap-2">
            <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-primary-600' : 'bg-gray-300'}`} />
            <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {step === 1 && (
            <form onSubmit={handleRegister}>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Crea tu cuenta gratis</h2>
              <p className="text-sm text-gray-500 mb-6">Sin tarjeta de crédito. Empieza ya.</p>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    placeholder="Ej: Cafetería La Esperanza"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del negocio</label>
                  <PhoneInput
                    value={form.phone}
                    onChange={(phone) => setForm({ ...form, phone })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negocio</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡{business.name} está listo!</h2>
              <p className="text-sm text-gray-500 mb-6">Ahora crea un PIN de seguridad para proteger tu cuenta.</p>
              <button
                onClick={() => navigate(`/panel/configurar-pin?id=${business.id}`)}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors"
              >
                🔐 Configurar PIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
