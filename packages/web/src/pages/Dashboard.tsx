import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import QrCode from '../components/QrCode';

interface Stats {
  totalCustomers: number;
  stampsThisMonth: number;
  redemptionsThisMonth: number;
}

interface Program {
  id: string;
  title: string;
  target: number;
  reward: string;
}

interface PendingRequest {
  id: string;
  customerId: string;
  status: string;
  createdAt: string;
  customer: { name: string; phone: string };
  program: Program | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<{ id?: string; name?: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [allPrograms, setAllPrograms] = useState<Program[]>([]);
  const [actionMsg, setActionMsg] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [approveProgramId, setApproveProgramId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('sella_business');
    if (!stored) { navigate('/login'); return; }
    const b = JSON.parse(stored);
    setBusiness(b);
    fetch(`/api/businesses/${b.id}/stats`).then(r => r.json()).then(setStats).catch(console.error);
    loadPending(b.id);
    loadPrograms(b.id);
  }, [navigate]);

  const loadPending = async (businessId: string) => {
    try {
      const res = await fetch(`/api/stamp-requests/business/${businessId}`);
      setPendingRequests(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadPrograms = async (businessId: string) => {
    try {
      const res = await fetch(`/api/programs/business/${businessId}`);
      const progs = await res.json();
      setAllPrograms(progs.filter((p: Program) => p));
    } catch (err) { console.error(err); }
  };

  const handleApprove = async (request: PendingRequest, programIdOverride?: string) => {
    if (!business?.id) return;
    setProcessingIds((prev) => new Set(prev).add(request.id));
    setActionMsg('');

    try {
      const body: Record<string, string> = {};
      const effectiveProgramId = programIdOverride || request.program?.id;
      if (effectiveProgramId && allPrograms.length > 1) {
        body.programId = effectiveProgramId;
      }

      const res = await fetch(`/api/stamp-requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: allPrograms.length > 1 ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();

      if (res.ok) {
        setActionMsg(
          data.completed
            ? `✅ Aprobado. ¡${data.customerName} completó ${data.target} sellos y puede canjear: ${data.reward}!`
            : `✅ Sello ${data.stampCount}/${data.target} para ${data.customerName}`
        );
      } else {
        setActionMsg(data.error || 'Error al aprobar');
      }
      loadPending(business.id);
    } catch (err) {
      console.error(err);
      setActionMsg('Error de conexión al aprobar la solicitud');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleReject = async (request: PendingRequest) => {
    if (!business?.id) return;
    setProcessingIds((prev) => new Set(prev).add(request.id));
    try {
      await fetch(`/api/stamp-requests/${request.id}/reject`, { method: 'POST' });
      setActionMsg(`❌ Solicitud de ${request.customer.name} rechazada`);
      loadPending(business.id);
    } catch (err) { console.error(err); setActionMsg('Error al rechazar la solicitud'); }
    finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  if (!business) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Hola, {business.name}</h1>
      <p className="text-gray-500 text-sm mb-6">Así va tu programa de fidelización este mes.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Clientes fidelizados" value={stats?.totalCustomers ?? 0} icon="👥" />
        <MetricCard label="Sellos este mes" value={stats?.stampsThisMonth ?? 0} icon="⭐" />
        <MetricCard label="Premios canjeados" value={stats?.redemptionsThisMonth ?? 0} icon="🎁" />
      </div>

      {actionMsg && (
        <div className={`text-sm p-3 rounded-lg mb-4 ${actionMsg.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {actionMsg}
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔔</span>
            <h3 className="font-semibold text-amber-900">
              {pendingRequests.length} solicitud{pendingRequests.length !== 1 ? 'es' : ''} pendiente{pendingRequests.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-white rounded-lg p-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{req.customer.name}</span>
                  <span className="text-gray-400 text-xs">{req.customer.phone}</span>
                  {req.program && (
                    <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {req.program.title}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs">
                    {new Date(req.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {allPrograms.length > 1 && (
                    <select
                      value={approveProgramId || req.program?.id || allPrograms[0]?.id || ''}
                      onChange={(e) => setApproveProgramId(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                    >
                      {allPrograms.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => handleReject(req)}
                    disabled={processingIds.has(req.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(req, allPrograms.length > 1 ? (approveProgramId || req.program?.id || allPrograms[0]?.id) : undefined)}
                    disabled={processingIds.has(req.id)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {processingIds.has(req.id) ? '...' : '✅ Aprobar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {business.id && (
        <div className="grid md:grid-cols-2 gap-6">
          <QrCode businessId={business.id} />
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acciones rápidas</h3>
            <div className="space-y-3">
              <button onClick={() => navigate('/panel/programas')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <span className="font-medium text-gray-900 text-sm">Configurar programa</span>
                <p className="text-xs text-gray-500">Define sellos y recompensas</p>
              </button>
              <button onClick={() => navigate('/panel/clientes')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <span className="font-medium text-gray-900 text-sm">Ver clientes</span>
                <p className="text-xs text-gray-500">Revisa quién está activo y quién no</p>
              </button>
              <button onClick={() => navigate('/panel/campanas')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors">
                <span className="font-medium text-gray-900 text-sm">Reactivar clientes</span>
                <p className="text-xs text-gray-500">Envía mensajes por WhatsApp</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
