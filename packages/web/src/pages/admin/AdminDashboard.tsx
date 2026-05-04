import { useEffect, useState } from 'react';

interface BusinessRow {
  id: string;
  name: string;
  phone: string;
  type: string;
  plan: string;
  active: boolean;
  createdAt: string;
  subscription: { plan: string; status: string; trialEndsAt: string; startedAt: string } | null;
  customersCount: number;
  stampsCount: number;
}

interface AdminStats {
  businessesCount: number;
  customersCount: number;
  stampsCount: number;
  byPlan: Record<string, number>;
  trialEnding: number;
}

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('sella_admin_token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const loadData = async () => {
    try {
      const [bRes, sRes] = await Promise.all([
        fetch('/api/admin/businesses', { headers: authHeaders() }),
        fetch('/api/admin/stats', { headers: authHeaders() }),
      ]);
      setBusinesses(await bRes.json());
      setStats(await sRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePlan = async (id: string, plan: string) => {
    setChangingPlan(id);
    setActionMsg('');
    try {
      const res = await fetch(`/api/admin/businesses/${id}/plan`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        setActionMsg(`Plan cambiado a ${plan}`);
        loadData();
      } else {
        const d = await res.json();
        setActionMsg(d.error || 'Error');
      }
    } catch (err) {
      console.error(err);
    }
    setChangingPlan(null);
  };

  const filtered = businesses.filter((b) => {
    if (filter && b.plan !== filter) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.phone.includes(search)) return false;
    return true;
  });

  const daysLeft = (date: string | null) => {
    if (!date) return '';
    const d = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (d < 0) return '⚠️ Venció';
    if (d === 0) return 'Hoy';
    return `${d} días`;
  };

  const planBadge = (plan: string) => {
    const colors: Record<string, string> = {
      trial: 'bg-blue-900/50 text-blue-300 border-blue-700',
      free: 'bg-gray-800 text-gray-300 border-gray-600',
      basic: 'bg-green-900/50 text-green-300 border-green-700',
      pro: 'bg-purple-900/50 text-purple-300 border-purple-700',
    };
    return `text-xs font-medium px-2 py-0.5 rounded-full border ${colors[plan] || colors.free}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-gray-400 text-sm mb-6">Panel de administración de Sella</p>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Negocios</div>
            <div className="text-2xl font-bold text-white">{stats.businessesCount}</div>
            <div className="text-xs text-gray-500 mt-1">
              Trial: {stats.byPlan.trial || 0} · Basic: {stats.byPlan.basic || 0} · Pro: {stats.byPlan.pro || 0}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Clientes totales</div>
            <div className="text-2xl font-bold text-white">{stats.customersCount}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Sellos otorgados</div>
            <div className="text-2xl font-bold text-white">{stats.stampsCount}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-xs mb-1">Trials por vencer (7d)</div>
            <div className={`text-2xl font-bold ${stats.trialEnding > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats.trialEnding}
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="bg-green-900/50 text-green-300 text-sm p-3 rounded-lg mb-4 border border-green-800">
          {actionMsg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300"
        >
          <option value="">Todos los planes</option>
          <option value="trial">Trial</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar negocio..."
          className="text-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 placeholder-gray-500 flex-1 max-w-xs"
        />
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} resultados</span>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Negocio</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Tipo</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Plan</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Trial</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Clientes</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase px-4 py-3">Sellos</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase px-4 py-3">Cambiar plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-200 text-sm">{b.name}</div>
                    <div className="text-gray-500 text-xs">{b.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{b.type}</td>
                  <td className="px-4 py-3">
                    <span className={planBadge(b.plan)}>{b.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${b.subscription && new Date(b.subscription.trialEndsAt) < new Date() ? 'text-red-400' : 'text-gray-400'}`}>
                      {daysLeft(b.subscription?.trialEndsAt || null)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">{b.customersCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{b.stampsCount}</td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={b.plan}
                      onChange={(e) => handleChangePlan(b.id, e.target.value)}
                      disabled={changingPlan === b.id}
                      className="text-xs bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-gray-300 disabled:opacity-50"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
