import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerDetail from '../components/CustomerDetail';

interface Customer {
  id: string;
  name: string;
  phone: string;
  lastVisit: string | null;
  _count: { stamps: number };
  stamps: { program: { title: string; id: string; target: number; reward: string } }[];
}

interface Program {
  id: string;
  title: string;
  target: number;
  reward: string;
}

export default function Customers() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<{ id?: string } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [filter, setFilter] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [stampingCustomer, setStampingCustomer] = useState<string | null>(null);
  const [redeemingCustomer, setRedeemingCustomer] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sella_business');
    if (!stored) { navigate('/login'); return; }
    const b = JSON.parse(stored);
    setBusiness(b);
    loadCustomers(b.id, filter);
    loadPrograms(b.id);
  }, [navigate, filter]);

  const loadCustomers = async (businessId: string, f: string) => {
    try {
      const params = f ? `?filter=${f}` : '';
      const res = await fetch(`/api/customers/business/${businessId}${params}`);
      setCustomers(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadPrograms = async (businessId: string) => {
    try {
      const res = await fetch(`/api/programs/business/${businessId}`);
      const progs = await res.json();
      setPrograms(progs);
      if (progs.length === 1) setSelectedProgramId(progs[0].id);
    } catch (err) { console.error(err); }
  };

  const handleStamp = async (customer: Customer) => {
    if (!business?.id || programs.length === 0) return;
    const pid = programs.length === 1 ? programs[0].id : selectedProgramId;
    if (!pid) return;
    setStampingCustomer(customer.id);
    setActionMsg('');
    try {
      const body: Record<string, string> = { customerId: customer.id, businessId: business.id };
      if (programs.length > 1) body.programId = pid;
      const res = await fetch('/api/stamps/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMsg(`¡Sello ${data.stampCount}/${data.target} para ${customer.name}!`);
        loadCustomers(business.id!, filter);
      }
    } catch (err) { console.error(err); }
    setStampingCustomer(null);
  };

  const handleRedeem = async (customer: Customer) => {
    if (!business?.id || programs.length === 0) return;
    const pid = programs.length === 1 ? programs[0].id : selectedProgramId;
    if (!pid) return;
    setRedeemingCustomer(customer.id);
    setActionMsg('');
    try {
      const res = await fetch('/api/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, programId: pid }),
      });
      if (res.ok) {
        const program = programs.find((p) => p.id === pid);
        setActionMsg(`¡${customer.name} canjeó ${program?.reward || 'su premio'}!`);
        loadCustomers(business.id!, filter);
      } else {
        const d = await res.json();
        setActionMsg(d.error || 'No se pudo canjear');
      }
    } catch (err) { console.error(err); }
    setRedeemingCustomer(null);
  };

  const daysSince = (date: string | null) => {
    if (!date) return 'Nunca';
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Hoy' : days === 1 ? 'Ayer' : `Hace ${days} días`;
  };

  if (!business) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm">{customers.length} clientes fidelizados</p>
        </div>
        <div className="flex items-center gap-2">
          {programs.length > 1 && (
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
          <button onClick={() => { setFilter(''); loadCustomers(business.id!, ''); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === '' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Todos</button>
          <button onClick={() => { setFilter('inactive'); loadCustomers(business.id!, 'inactive'); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'inactive' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Inactivos</button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">{actionMsg}</div>
      )}

      {customers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin clientes todavía</h3>
          <p className="text-sm text-gray-500">Cuando tus clientes escaneen el QR, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">WhatsApp</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Sellos</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Última visita</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedCustomerId(c.id)}>
                    <td className="px-4 py-3"><span className="font-medium text-gray-900 text-sm">{c.name}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">⭐ {c._count.stamps}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${c.lastVisit && filter !== 'inactive' ? 'text-gray-500' : 'text-orange-600 font-medium'}`}>{daysSince(c.lastVisit)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStamp(c)}
                          disabled={stampingCustomer === c.id || programs.length === 0 || (programs.length > 1 && !selectedProgramId)}
                          className="px-2.5 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg hover:bg-primary-100 transition-colors disabled:opacity-50"
                        >
                          {stampingCustomer === c.id ? '...' : '⭐ Dar sello'}
                        </button>
                        <button
                          onClick={() => handleRedeem(c)}
                          disabled={redeemingCustomer === c.id || programs.length === 0 || (programs.length > 1 && !selectedProgramId)}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {redeemingCustomer === c.id ? '...' : '🎁 Canjear'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedCustomerId && (
        <CustomerDetail customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      )}
    </div>
  );
}
