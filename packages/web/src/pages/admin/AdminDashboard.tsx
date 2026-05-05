import { useEffect, useState } from 'react';
import { supabase } from '@sella/shared/supabase';

interface BizRow { id: string; name: string; phone: string; type: string; plan: string; active: boolean; created_at: string; subscription: any; }
interface Stats { businessesCount: number; customersCount: number; stampsCount: number; byPlan: Record<string,number>; trialEnding: number; }

export default function AdminDashboard() {
  const [bizs, setBizs] = useState<BizRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: bd } = await supabase.from('businesses').select('*, subscription(*)').order('created_at', { ascending: false });
    setBizs(bd || []);

    const { count: bizCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true });
    const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: stampCount } = await supabase.from('stamps').select('*', { count: 'exact', head: true });

    const plans: Record<string,number> = {};
    (bd || []).forEach(b => { plans[b.plan] = (plans[b.plan] || 0) + 1; });

    const next7 = new Date(); next7.setDate(next7.getDate() + 7);
    const { count: trialEnding } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').eq('plan', 'trial').lte('trial_ends_at', next7.toISOString());

    setStats({ businessesCount: bizCount || 0, customersCount: custCount || 0, stampsCount: stampCount || 0, byPlan: plans, trialEnding: trialEnding || 0 });
  };

  const changePlan = async (id: string, plan: string) => {
    await supabase.from('businesses').update({ plan }).eq('id', id);
    await supabase.from('subscriptions').update({ plan, started_at: new Date().toISOString() }).eq('business_id', id);
    setMsg(`Plan cambiado a ${plan}`);
    loadData();
  };

  const filtered = bizs.filter(b => {
    if (filter && b.plan !== filter) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.phone.includes(search)) return false;
    return true;
  });

  const daysLeft = (d: string) => {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return '⚠️ Venció'; if (days === 0) return 'Hoy'; return `${days} días`;
  };

  const planColor = (p: string) => ({ trial: 'bg-blue-900/50 text-blue-300 border-blue-700', free: 'bg-gray-800 text-gray-300 border-gray-600', basic: 'bg-green-900/50 text-green-300 border-green-700', pro: 'bg-purple-900/50 text-purple-300 border-purple-700' })[p] || '';

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">Panel de administración de Sella</p>
      {stats && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="text-gray-400 text-xs mb-1">Negocios</div><div className="text-2xl font-bold text-white">{stats.businessesCount}</div><div className="text-xs text-gray-500 mt-1">Trial: {stats.byPlan.trial||0} · Basic: {stats.byPlan.basic||0}</div></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="text-gray-400 text-xs mb-1">Clientes</div><div className="text-2xl font-bold text-white">{stats.customersCount}</div></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="text-gray-400 text-xs mb-1">Sellos</div><div className="text-2xl font-bold text-white">{stats.stampsCount}</div></div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><div className="text-gray-400 text-xs mb-1">Trials por vencer</div><div className={`text-2xl font-bold ${stats.trialEnding>0?'text-amber-400':'text-white'}`}>{stats.trialEnding}</div></div>
      </div>}
      {msg && <div className="bg-green-900/50 text-green-300 text-sm p-3 rounded-lg mb-4 border border-green-800">{msg}</div>}
      <div className="flex items-center gap-3 mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300"><option value="">Todos</option><option value="trial">Trial</option><option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option></select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 placeholder-gray-500 flex-1 max-w-xs" />
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} resultados</span>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-700"><th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Negocio</th><th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Tipo</th><th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Plan</th><th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Trial</th><th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Cambiar</th></tr></thead>
          <tbody className="divide-y divide-gray-700/50">
            {filtered.map(b => (
              <tr key={b.id} className="hover:bg-gray-750">
                <td className="px-4 py-3"><div className="font-medium text-gray-200 text-sm">{b.name}</div><div className="text-gray-500 text-xs">{b.phone}</div></td>
                <td className="px-4 py-3 text-sm text-gray-400">{b.type}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${planColor(b.plan)}`}>{b.plan}</span></td>
                <td className="px-4 py-3"><span className={`text-xs ${b.subscription && new Date(b.subscription.trial_ends_at) < new Date() ? 'text-red-400' : 'text-gray-400'}`}>{b.subscription ? daysLeft(b.subscription.trial_ends_at) : ''}</span></td>
                <td className="px-4 py-3 text-right"><select value={b.plan} onChange={e => changePlan(b.id, e.target.value)} className="text-xs bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-gray-300"><option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option></select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
