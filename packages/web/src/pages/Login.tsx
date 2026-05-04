import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from '../components/PhoneInput';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(() => {
    const stored = localStorage.getItem('sella_login_attempts');
    return stored ? parseInt(stored) : 0;
  });
  const [lockedUntil, setLockedUntil] = useState(() => {
    const stored = localStorage.getItem('sella_lockout_until');
    return stored ? parseInt(stored) : 0;
  });

  const isLocked = Date.now() < lockedUntil;
  const secondsLeft = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) return;

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) { setError('Ingresa un número válido'); return; }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) { setError('El PIN debe ser de 4 dígitos'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/businesses/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin }),
      });

      if (res.status === 401) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem('sella_login_attempts', String(newAttempts));

        if (newAttempts >= 3) {
          const lockMs = Date.now() + 5 * 60 * 1000;
          setLockedUntil(lockMs);
          localStorage.setItem('sella_lockout_until', String(lockMs));
          setError('Demasiados intentos. Espera 5 minutos.');
        } else {
          setError(`PIN incorrecto. Te quedan ${3 - newAttempts} intentos.`);
        }
        return;
      }

      if (res.status === 403) {
        const d = await res.json();
        if (d.needSetup) {
          navigate(`/panel/configurar-pin?id=${d.businessId}`);
          return;
        }
        throw new Error(d.error || 'Acceso denegado');
      }

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Credenciales inválidas');
      }

      const business = await res.json();
      localStorage.setItem('sella_business', JSON.stringify(business));
      localStorage.removeItem('sella_login_attempts');
      localStorage.removeItem('sella_lockout_until');
      navigate('/panel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-primary-600">Sella</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-6">WhatsApp + PIN de 4 dígitos</p>

          {isLocked && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              🔒 Bloqueado. Espera {secondsLeft}s para intentar de nuevo.
            </div>
          )}

          {error && !isLocked && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del negocio</label>
              <PhoneInput value={phone} onChange={(p) => setPhone(p)} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN de seguridad</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-center tracking-widest text-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="····"
                disabled={isLocked}
              />
            </div>
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            ¿No tienes cuenta?{' '}
            <button onClick={() => navigate('/registro')} className="text-primary-600 font-medium hover:underline">
              Crear una gratis
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
