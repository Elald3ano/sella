import { useEffect, useState } from 'react';
import { supabase } from '@sella/shared/supabase';
import { useAuth } from '../components/AuthProvider';
import CustomerDetail from '../components/CustomerDetail';

interface Customer {
  id: string; name: string; phone: string; last_visit: string | null; business_id: string;
}

interface Program {
  id: string; title: string; target: number; reward: string;
}

export default function Customers() {
  const { businessId, loading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState('');

  useEffect(() => {
    if (loading || !businessId) return;
    loadCustomers(businessId);
    loadPrograms(businessId);
  }, [businessId, loading]);

  const loadCustomers = async (bid: string) => {
    let q = supabase.from('customers').select('*').eq('business_id', bid).order('last_visit', { ascending: false, nullsFirst: false });
    if (filter === 'inactive') {
      const d = new Date(); d.setDate(d.getDate() - 15);
      q = q.lte('last_visit', d.toISOString());
    }
    const { data } = await q;
    setCustomers(data || []);
  };

  const loadPrograms = async (bid: string) => {
    const { data } = await supabase.from('programs').select('*').eq('business_id', bid).eq('active', true);
    setPrograms(data || []);
    if (data?.length === 1) setSelectedProgramId(data[0].id);
  };

  const handleStamp = async (c: Customer) => {
    const pid = programs.length === 1 ? programs[0].id : selectedProgramId;
    if (!pid || !businessId) return;
    const { error } = await supabase.from('stamps').insert({ customer_id: c.id, business_id: c.business_id, program_id: pid });
    if (error) setActionMsg(error.message);
    else { setActionMsg(`¡Sello para ${c.name}!`); loadCustomers(businessId); }
  };

  const handleRedeem = async (c: Customer) => {
    const pid = programs.length === 1 ? programs[0].id : selectedProgramId;
    if (!pid || !businessId) return;
    const { data, error } = await supabase.rpc('redeem', { customer_id: c.id, program_id: pid });
    if (error) setActionMsg(error.message);
    else if ((data as any).error) setActionMsg((data as any).error);
    else { setActionMsg(`¡${c.name} canjeó ${(data as any).reward}!`); loadCustomers(businessId); }
  };

  const daysSince = (d: string | null) => {
    if (!d) return 'Nunca';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`;
  };

  if (loading || !businessId) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Clientes</h1><p className="text-gray-500 text-sm">{customers.length} clientes</p></div>
        <div className="flex items-center gap-2">
          {programs.length > 1 && <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700">{programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}
          <button onClick={() => { setFilter(''); loadCustomers(businessId); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === '' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
          <button onClick={() => { setFilter('inactive'); loadCustomers(businessId); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'inactive' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Inactivos</button>
        </div>
      </div>
      {actionMsg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">{actionMsg}</div>}

      {customers.length === 0 ? (
        <div className="text-center py-16"><div className="text-4xl mb-4">👥</div><h3 className="text-lg font-semibold text-gray-700 mb-2">Sin clientes todavía</h3><p className="text-sm text-gray-500">Cuando escaneen el QR, aparecerán aquí.</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100"><th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Cliente</th><th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">WhatsApp</th><th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Última visita</th><th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Acción</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedId(c.id)}>
                    <td className="px-4 py-3"><span className="font-medium text-gray-900 text-sm">{c.name}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                    <td className="px-4 py-3"><span className={`text-sm ${c.last_visit && filter !== 'inactive' ? 'text-gray-500' : 'text-orange-600 font-medium'}`}>{daysSince(c.last_visit)}</span></td>
                    <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleStamp(c)} disabled={programs.length === 0 || (programs.length > 1 && !selectedProgramId)} className="px-2.5 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50">⭐ Dar sello</button>
                      <button onClick={() => handleRedeem(c)} disabled={programs.length === 0 || (programs.length > 1 && !selectedProgramId)} className="px-2.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50">🎁 Canjear</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedId && <CustomerDetail customerId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
