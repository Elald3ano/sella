import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StampCard from '../components/StampCard';

interface SavedCustomer {
  id: string;
  name: string;
  businessId: string;
}

interface ProgramData {
  title: string;
  target: number;
  reward: string;
  stamps: number;
  completed: boolean;
}

export default function MyStamps() {
  const navigate = useNavigate();
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [programs, setPrograms] = useState<Record<string, ProgramData[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const customers: SavedCustomer[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sella_customer_')) {
        const businessId = key.replace('sella_customer_', '');
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        customers.push({ id: data.id, name: data.name, businessId });
      }
    }
    setSavedCustomers(customers);

    Promise.all(
      customers.map(async (c) => {
        try {
          const res = await fetch(`/api/customers/${c.id}/stamps`);
          if (!res.ok) return { businessId: c.businessId, programs: [] };
          const data = await res.json();
          return { businessId: c.businessId, data };
        } catch {
          return { businessId: c.businessId, programs: [] };
        }
      })
    ).then((results) => {
      const map: Record<string, ProgramData[]> = {};
      results.forEach((r) => {
        if ('data' in r && r.data) {
          const d = r.data as {
            customer: {
              business: { name: string };
              stamps: { program: { id: string; title: string; target: number; reward: string } }[];
            };
            programCounts: Record<string, number>;
          };
          const progs: ProgramData[] = [];
          Object.entries(d.programCounts).forEach(([pid, count]) => {
            const prog = d.customer.stamps?.find((s: { program: { id: string } }) => s.program.id === pid)?.program;
            if (prog) {
              progs.push({
                title: prog.title,
                target: prog.target,
                reward: prog.reward,
                stamps: count,
                completed: count >= prog.target,
              });
            }
          });
          map[r.businessId] = progs;
        }
      });
      setPrograms(map);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-primary-600 text-white p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/80 hover:text-white">
            ← Volver
          </button>
          <span className="font-medium">Mis Sellos</span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando...</div>
        ) : savedCustomers.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin sellos</h3>
            <p className="text-sm text-gray-500">
              Escanea el QR de tu tienda favorita para empezar a acumular.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {savedCustomers.map((c) => (
              <div key={c.businessId}>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {c.name || `Negocio ${c.businessId.slice(0, 8)}`}
                </h3>
                {programs[c.businessId]?.length ? (
                  programs[c.businessId].map((p, i) => (
                    <div key={i} className="mb-3">
                      <StampCard
                        title={p.title}
                        current={p.stamps}
                        target={p.target}
                        reward={p.reward}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">Sin programas activos.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
