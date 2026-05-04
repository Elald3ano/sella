import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PhoneInput from '../components/PhoneInput';

const BUSINESS_TYPES = ['cafeteria', 'panaderia', 'jugueria', 'barberia', 'lavanderia', 'otro'] as const;

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    type: 'cafeteria' as string,
    email: '',
    password: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre del negocio es requerido'); return; }

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) { setError('Ingresá un número de teléfono válido'); return; }
    if (!form.email || !form.password) { setError('Correo y contraseña son requeridos'); return; }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setLoading(true);
    setError('');

    const { error: authErr } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (authErr) { setError(authErr.message); setLoading(false); return; }

    const { error: bizErr } = await supabase.rpc('register_business', {
      p_name: form.name.trim(),
      p_phone: cleanPhone,
      p_type: form.type,
      p_email: form.email,
    });

    if (bizErr) { setError(bizErr.message); setLoading(false); return; }

    setStep(2);
    setLoading(false);
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
              <h2 className="text-xl font-bold text-gray-900 mb-1">Creá tu cuenta gratis</h2>
              <p className="text-sm text-gray-500 mb-6">30 días de prueba. Sin tarjeta.</p>

              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Cafetería La Esperanza" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del negocio</label>
                  <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negocio</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tu correo electrónico</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="cafeteria@correo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (mín. 6 caracteres)</label>
                  <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full mt-6 bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50">
                {loading ? 'Creando...' : 'Crear cuenta gratis'}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">¡{form.name} está listo!</h2>
              <p className="text-sm text-gray-500 mb-6">Ya podés configurar tu programa de fidelización.</p>
              <button onClick={() => navigate('/panel')}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors">
                Ir al panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
