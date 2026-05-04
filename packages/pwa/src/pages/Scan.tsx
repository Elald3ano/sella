import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BusinessInfo from '../components/BusinessInfo';
import StampCard from '../components/StampCard';
import PhoneInput from '../components/PhoneInput';

interface CustomerData {
  customer: {
    id: string;
    name: string;
    stamps: { id: string; program: { id: string; title: string; target: number; reward: string } }[];
    business: { name: string; id: string };
  };
  programCounts: Record<string, number>;
}

type Step = 'welcome' | 'login' | 'register' | 'stamps';

export default function Scan() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<CustomerData | null>(null);
  const [stamping, setStamping] = useState(false);
  const [stampResult, setStampResult] = useState('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [programs, setPrograms] = useState<{ id: string; title: string }[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');

  useEffect(() => {
    if (!businessId) return;
    const stored = localStorage.getItem(`sella_customer_${businessId}`);
    if (stored) {
      setStep('stamps');
      loadStamps(JSON.parse(stored).id);
    }
  }, [businessId]);

  const loadStamps = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/stamps`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        if (d.customer?.business?.id) {
          loadPrograms(d.customer.business.id);
        }
      } else {
        setError('No se pudieron cargar tus sellos. Intenta de nuevo.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al cargar sellos.');
    }
  };

  const loadPrograms = async (bid: string) => {
    try {
      const res = await fetch(`/api/programs/business/${bid}`);
      const progs = await res.json();
      setPrograms(progs.filter((p: { active: boolean }) => p.active));
      if (progs.length === 1) setSelectedProgramId(progs[0].id);
    } catch {
      // silencioso
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      setError('Ingresa un número de teléfono válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, businessId }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Número no encontrado');
      }

      const customer = await res.json();
      localStorage.setItem(`sella_customer_${businessId}`, JSON.stringify(customer));
      setStep('stamps');
      setStampResult(`👋 ¡Hola de nuevo, ${customer.name}!`);
      loadStamps(customer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ingresar');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      setError('Ingresa un número de teléfono válido');
      return;
    }

    setLoading(true);
    setError('');
    setStampResult('');

    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: cleanPhone, businessId }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error del servidor (${res.status})`);
      }

      const customer = await res.json();
      localStorage.setItem(`sella_customer_${businessId}`, JSON.stringify(customer));
      setStep('stamps');
      loadStamps(customer.id);

      if (customer.returning) {
        setStampResult(`👋 ¡Bienvenido de vuelta, ${customer.name}! Tus sellos están intactos.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarte');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVisit = async () => {
    if (!businessId || !data?.customer.id) return;
    setStamping(true);
    setStampResult('');
    setError('');

    try {
      const body: Record<string, string> = { customerId: data.customer.id, businessId };
      if (selectedProgramId) body.programId = selectedProgramId;

      const res = await fetch('/api/stamp-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setStampResult('Ya enviaste una solicitud. El comercio debe aprobarla primero.');
          setHasPendingRequest(true);
          return;
        }
        throw new Error(d.error || 'Error al enviar solicitud');
      }

      setStampResult('✅ Solicitud enviada. El comercio la revisará y aprobará tu sello.');
      setHasPendingRequest(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setStamping(false);
    }
  };

  const goToWelcome = () => {
    if (businessId) localStorage.removeItem(`sella_customer_${businessId}`);
    setStep('welcome');
    setData(null);
    setError('');
    setStampResult('');
    setHasPendingRequest(false);
    setForm({ name: '', phone: '' });
    setPrograms([]);
    setSelectedProgramId('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-primary-600 text-white p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => { goToWelcome(); navigate('/'); }} className="text-white/80 hover:text-white">
            ← Salir
          </button>
          <span className="font-medium">Sella</span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-6">
        {!businessId ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Escanea un QR válido</h3>
            <p className="text-sm text-gray-500">Este enlace no contiene un código de negocio.</p>
          </div>
        ) : (
          <>
            {step === 'welcome' && (
              <div className="text-center pt-12">
                <div className="text-5xl mb-4">☕</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Programa de fidelización</h2>
                <p className="text-gray-500 text-sm mb-10">Acumula sellos y gana premios en este negocio.</p>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep('login')}
                    className="w-full bg-primary-600 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                  >
                    🔑 Ya estoy registrado
                  </button>
                  <button
                    onClick={() => setStep('register')}
                    className="w-full bg-white border-2 border-primary-200 text-primary-600 py-4 rounded-2xl font-semibold text-lg hover:bg-primary-50 transition-colors"
                  >
                    🆕 Soy nuevo
                  </button>
                </div>
              </div>
            )}

            {step === 'login' && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">🔑</div>
                  <h2 className="text-xl font-bold text-gray-900">Ingresa con tu número</h2>
                  <p className="text-sm text-gray-500 mt-1">El mismo WhatsApp con el que te registraste.</p>
                </div>

                <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 border border-gray-100">
                  {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tu WhatsApp</label>
                    <PhoneInput
                      value={form.phone}
                      onChange={(phone) => setForm({ ...form, phone })}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Verificando...' : 'Ingresar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('welcome'); setError(''); }}
                    className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2"
                  >
                    ← Volver
                  </button>
                </form>
              </div>
            )}

            {step === 'register' && (
              <div>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">🆕</div>
                  <h2 className="text-xl font-bold text-gray-900">Crear cuenta</h2>
                  <p className="text-sm text-gray-500 mt-1">Regístrate para empezar a acumular sellos.</p>
                </div>

                <form onSubmit={handleRegister} className="bg-white rounded-2xl p-6 border border-gray-100">
                  {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="María"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tu WhatsApp</label>
                      <PhoneInput
                        value={form.phone}
                        onChange={(phone) => setForm({ ...form, phone })}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Registrando...' : 'Crear cuenta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('welcome'); setError(''); }}
                    className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 py-2"
                  >
                    ← Volver
                  </button>
                </form>
              </div>
            )}

            {step === 'stamps' && data && (
              <div className="space-y-6">
                <BusinessInfo name={data.customer.business.name} businessId={data.customer.business.id} />

                {Object.entries(data.programCounts).map(([programId, count]) => {
                  const program = data.customer.stamps.find((s) => s.program.id === programId)?.program;
                  if (!program) return null;
                  return (
                    <StampCard key={programId} title={program.title} current={count} target={program.target} reward={program.reward} />
                  );
                })}

                {Object.keys(data.programCounts).length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-gray-400">Aún no tienes sellos en este negocio.</p>
                    <p className="text-sm text-gray-400 mt-1">Presiona "Registrar visita" para empezar.</p>
                  </div>
                )}

                {stampResult && (
                  <div className="bg-green-50 text-green-700 text-sm p-4 rounded-xl text-center font-medium">{stampResult}</div>
                )}

                {programs.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">¿Qué compraste hoy?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {programs.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProgramId(p.id)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                            selectedProgramId === p.id
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRegisterVisit}
                  disabled={stamping || hasPendingRequest}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base transition-colors disabled:opacity-50 shadow-lg ${
                    hasPendingRequest ? 'bg-amber-100 text-amber-700' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-200'
                  }`}
                >
                  {stamping ? 'Enviando...' : hasPendingRequest ? '⏳ Esperando aprobación' : '⭐ Registrar visita'}
                </button>

                <button
                  onClick={() => navigate('/premios')}
                  className="w-full bg-white border border-primary-200 text-primary-600 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                >
                  Ver mis premios disponibles
                </button>

                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">
                    Eres <span className="font-medium text-gray-600">{data.customer.name}</span>
                  </p>
                  <button onClick={goToWelcome} className="text-xs text-gray-400 hover:text-red-500 transition-colors underline">
                    No soy yo, usar otra cuenta
                  </button>
                </div>
              </div>
            )}

            {step === 'stamps' && !data && !error && (
              <div className="text-center py-10"><p className="text-gray-400">Cargando tus sellos...</p></div>
            )}

            {error && step === 'stamps' && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg text-center">{error}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
