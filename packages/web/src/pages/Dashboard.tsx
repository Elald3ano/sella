import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import QrCode from '../components/QrCode';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '@sella/shared/supabase';

interface Stats { totalCustomers: number; stampsThisMonth: number; redemptionsThisMonth: number; }

interface PendingRequest {
  id: string;
  customer_id: string;
  business_id: string;
  program_id: string | null;
  status: string;
  created_at: string;
  customer: { name: string; phone: string } | null;
  program: { title: string; reward: string } | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { businessId, businessName, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [actionMsg, setActionMsg] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!businessId) { navigate('/login'); return; }
    loadAll();
  }, [businessId, loading, navigate]);

  const loadAll = async () => {
    if (!businessId) return;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [{ count: customers }, { count: stamps }, { count: redemptions }] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
      supabase.from('stamps').select('*', { count: 'exact', head: true }).eq('business_id', businessId).gte('created_at', firstOfMonth),
      supabase.from('redemptions').select('*, program!inner(*)', { count: 'exact', head: true }).eq('program.business_id', businessId).gte('redeemed_at', firstOfMonth),
    ]);
    setStats({ totalCustomers: customers || 0, stampsThisMonth: stamps || 0, redemptionsThisMonth: redemptions || 0 });

    loadPending();
  };

  const loadPending = async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from('stamp_requests')
      .select('*, customer:customers(name, phone), program:programs(title, reward)')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) { console.error('[Dashboard] Error loading pending:', error); return; }
    setPendingRequests((data as PendingRequest[]) || []);
  };

  const handleApprove = async (req: PendingRequest) => {
    setProcessingIds((p) => new Set(p).add(req.id));
    setActionMsg('');
    const { data, error } = await supabase.rpc('approve_stamp_request', { request_id: req.id });
    if (error) setActionMsg(error.message);
    else setActionMsg(data.completed ? `✅ ¡${data.customerName} completó ${data.target} sellos! Puede canjear: ${data.reward}` : `✅ Sello ${data.stampCount}/${data.target} para ${data.customerName}`);
    loadPending();
    setProcessingIds((p) => { const n = new Set(p); n.delete(req.id); return n; });
  };

  const handleReject = async (req: PendingRequest) => {
    setProcessingIds((p) => new Set(p).add(req.id));
    await supabase.from('stamp_requests').update({ status: 'rejected' }).eq('id', req.id);
    setActionMsg(`❌ Solicitud de ${req.customer?.name || 'Cliente'} rechazada`);
    loadPending();
    setProcessingIds((p) => { const n = new Set(p); n.delete(req.id); return n; });
  };

  if (loading || !businessId) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Hola, {businessName}</h1>
      <p className="text-gray-500 text-sm mb-6">Así va tu programa de fidelización este mes.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Clientes fidelizados" value={stats?.totalCustomers ?? 0} icon="👥" />
        <MetricCard label="Sellos este mes" value={stats?.stampsThisMonth ?? 0} icon="⭐" />
        <MetricCard label="Premios canjeados" value={stats?.redemptionsThisMonth ?? 0} icon="🎁" />
      </div>
      {actionMsg && <div className={`text-sm p-3 rounded-lg mb-4 ${actionMsg.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{actionMsg}</div>}

      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔔</span>
            <h3 className="font-semibold text-amber-900">{pendingRequests.length} solicitud{pendingRequests.length !== 1 ? 'es' : ''} pendiente{pendingRequests.length !== 1 ? 's' : ''}</h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between bg-white rounded-lg p-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{req.customer?.name || '?'}</span>
                  <span className="text-gray-400 text-xs">{req.customer?.phone || ''}</span>
                  {req.program && <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 py-0.5 rounded-full">{req.program.title}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleReject(req)} disabled={processingIds.has(req.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">Rechazar</button>
                  <button onClick={() => handleApprove(req)} disabled={processingIds.has(req.id)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
                    {processingIds.has(req.id) ? '...' : '✅ Aprobar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {businessId && (
        <div className="grid md:grid-cols-2 gap-6">
          <QrCode businessId={businessId} />
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Acciones rápidas</h3>
            <div className="space-y-3">
              <button onClick={() => navigate('/panel/programas')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"><span className="font-medium text-gray-900 text-sm">Configurar programa</span><p className="text-xs text-gray-500">Define sellos y recompensas</p></button>
              <button onClick={() => navigate('/panel/clientes')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"><span className="font-medium text-gray-900 text-sm">Ver clientes</span><p className="text-xs text-gray-500">Revisa quién está activo y quién no</p></button>
              <button onClick={() => navigate('/panel/campanas')} className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"><span className="font-medium text-gray-900 text-sm">Reactivar clientes</span><p className="text-xs text-gray-500">Envía mensajes por WhatsApp</p></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
