import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StampCard from '../components/StampCard';
import { supabase } from '../lib/supabase';

interface SavedCustomer { id: string; name: string; businessId: string; }

export default function MyStamps() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedCustomer[]>([]);
  const [programs, setPrograms] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cs: SavedCustomer[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sella_customer_')) {
        const bizId = key.replace('sella_customer_', '');
        const d = JSON.parse(localStorage.getItem(key) || '{}');
        cs.push({ id: d.id, name: d.name, businessId: bizId });
      }
    }
    setSaved(cs);
    Promise.all(cs.map(async c => {
      const ids = c.businessId.slice(0,8);
      try {
        const { data } = await supabase.rpc('customer_history', { cust_id: c.id });
        return { businessId: c.businessId, bizName: data?.customer?.business?.name || ids, stamps: data?.stamps, redemptions: data?.redemptions, stats: data?.stats };
      } catch { return { businessId: c.businessId, bizName: ids }; }
    })).then(results => {
      const m: Record<string, any[]> = {};
      results.forEach(r => { m[r.businessId] = [r]; });
      setPrograms(m);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-primary-600 text-white p-4"><div className="max-w-md mx-auto flex items-center gap-3"><button onClick={() => navigate('/')} className="text-white/80 hover:text-white">← Volver</button><span className="font-medium">Mis Sellos</span></div></div>
      <div className="flex-1 max-w-md mx-auto w-full p-6">
        {loading ? <div className="text-center py-16 text-gray-400">Cargando...</div> : saved.length === 0 ? <div className="text-center py-16"><div className="text-4xl mb-4">🔍</div><h3 className="text-lg font-semibold text-gray-700 mb-2">Sin sellos</h3><p className="text-sm text-gray-500">Escanea el QR de tu tienda favorita.</p></div> : (
          <div className="space-y-6">
            {saved.map(c => (
              <div key={c.businessId}>
                <h3 className="font-semibold text-gray-900 mb-3">{c.name || `Negocio ${c.businessId.slice(0,8)}`}</h3>
                {programs[c.businessId]?.[0]?.stats ? (
                  <StampCard title="Sellos acumulados" current={programs[c.businessId][0].stats.totalStamps || 0} target={10} reward="Próximamente" />
                ) : <p className="text-sm text-gray-400">Sin programas activos.</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
