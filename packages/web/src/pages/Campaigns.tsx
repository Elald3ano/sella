import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  name: string;
  phone: string;
  lastVisit: string | null;
  _count: { stamps: number };
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<{ id?: string; name?: string } | null>(null);
  const [inactiveCustomers, setInactiveCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sella_business');
    if (!stored) {
      navigate('/login');
      return;
    }
    const b = JSON.parse(stored);
    setBusiness(b);
    loadInactive(b.id);
  }, [navigate]);

  const loadInactive = async (businessId: string) => {
    try {
      const res = await fetch(`/api/customers/business/${businessId}?filter=inactive`);
      const data = await res.json();
      setInactiveCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === inactiveCustomers.length) {
      setSelected([]);
    } else {
      setSelected(inactiveCustomers.map((c) => c.id));
    }
  };

  const handleSend = async () => {
    if (!business?.id || selected.length === 0) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/whatsapp/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, customerIds: selected }),
      });
      const data = await res.json();
      setResult(data);
      setSelected([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const daysSince = (date: string | null) => {
    if (!date) return 'Nunca';
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return `Hace ${days} días`;
  };

  if (!business) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reactivar clientes</h1>
      <p className="text-gray-500 text-sm mb-6">
        Clientes que no han visitado {business.name} en más de 15 días.
        Envíales un mensaje por WhatsApp para que vuelvan.
      </p>

      {result && (
        <div className={`p-4 rounded-lg mb-6 text-sm ${result.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {result.sent} mensajes enviados{result.failed > 0 ? ` · ${result.failed} fallidos` : ''}
        </div>
      )}

      {inactiveCustomers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay clientes inactivos</h3>
          <p className="text-sm text-gray-500">Todos tus clientes han visitado recientemente.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={toggleAll}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              {selected.length === inactiveCustomers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
            <span className="text-sm text-gray-400">{selected.length} seleccionados</span>
            <button
              onClick={handleSend}
              disabled={selected.length === 0 || sending}
              className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {sending ? 'Enviando...' : `Enviar WhatsApp (${selected.length})`}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.length === inactiveCustomers.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">WhatsApp</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Inactivo desde</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Sellos acumulados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inactiveCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{c.phone}</td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-orange-600 font-medium">{daysSince(c.lastVisit)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-primary-600 font-medium">⭐ {c._count.stamps}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mt-8 bg-primary-50 rounded-xl p-6 border border-primary-100">
        <h3 className="font-semibold text-gray-900 mb-2">¿Cómo funciona?</h3>
        <p className="text-sm text-gray-600">
          Selecciona los clientes inactivos y presiona "Enviar WhatsApp". Cada cliente recibirá un mensaje
          personalizado invitándolo a volver a {business.name}. Necesitas tener configurado WhatsApp Business API
          en tu cuenta para que funcione.
        </p>
      </div>
    </div>
  );
}
