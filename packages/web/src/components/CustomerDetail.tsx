import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props { customerId: string; onClose: () => void; }

export default function CustomerDetail({ customerId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase.rpc('customer_history', { cust_id: customerId }).then(({ data: d, error }) => {
      if (!error && d) { setData(d); setNotes(d.customer?.notes || ''); }
      setLoading(false);
    });
  }, [customerId]);

  const saveNotes = async () => {
    setSavingNotes(true);
    await supabase.from('customers').update({ notes }).eq('id', customerId);
    setSavingNotes(false);
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const groupByDate = (stamps: any[]) => {
    const g: Record<string, any[]> = {};
    stamps?.forEach((s: any) => { const key = new Date(s.created_at).toISOString().slice(0, 10); if (!g[key]) g[key] = []; g[key].push(s); });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {loading ? <div className="p-10 text-center text-gray-400">Cargando...</div> : !data ? <div className="p-10 text-center text-red-500">Error</div> : (
          <>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 rounded-t-2xl flex items-center justify-between z-10">
              <div><h2 className="text-lg font-bold text-gray-900">👤 {data.customer.name}</h2><p className="text-sm text-gray-500">{data.customer.phone}</p></div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-primary-700">{data.stats.totalStamps}</div><div className="text-xs text-primary-500">Sellos</div></div>
                <div className="bg-amber-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-amber-700">{data.stats.totalRedemptions}</div><div className="text-xs text-amber-500">Canjes</div></div>
                <div className="bg-gray-50 rounded-xl p-3 text-center"><div className="text-2xl font-bold text-gray-700">{data.stats.avgDaysBetweenVisits || '—'}</div><div className="text-xs text-gray-500">Días/vista</div></div>
              </div>
              <div className="text-xs text-gray-400 flex justify-between"><span>📅 Desde: {formatDate(data.stats.firstVisit)}</span><span>🕐 Última: {formatDate(data.stats.lastVisit)}</span></div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">📝 Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes} placeholder="Ej: Prefiere café descafeinado..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none h-20" />
                {savingNotes && <span className="text-xs text-gray-400">Guardando...</span>}
              </div>
              {data.alerts?.length > 0 && data.alerts.map((a: any, i: number) => (
                <div key={i} className={`text-xs p-2.5 rounded-lg font-medium ${a.level === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {a.level === 'danger' ? '🔴' : '⚠️'} {formatDate(a.date)} — {a.msg}
                </div>
              ))}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Historial</h3>
                {!data.stamps?.length ? <p className="text-sm text-gray-400 text-center py-4">Sin visitas</p> :
                  groupByDate(data.stamps).map(([date, stamps]) => {
                    const alert = data.alerts?.find((a: any) => a.date === date);
                    return (
                      <div key={date} className="mb-3">
                        <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${alert?.level === 'danger' ? 'bg-red-500' : alert ? 'bg-amber-500' : 'bg-primary-400'}`} /><span className="text-xs font-medium text-gray-500">{formatDate(date)}</span></div>
                        <div className="ml-4 space-y-1">{stamps.map((s: any) => (<div key={s.id} className="flex items-center gap-2 text-sm text-gray-600"><span className="text-gray-300 text-xs w-12">{formatTime(s.created_at)}</span><span>{s.program?.title || 'Sello'}</span></div>))}
                          {data.redemptions?.filter((r: any) => new Date(r.redeemed_at).toISOString().slice(0, 10) === date).map((r: any) => (<div key={r.id} className="flex items-center gap-2 text-sm text-amber-600 font-medium"><span className="w-12 text-xs text-amber-400">{formatTime(r.redeemed_at)}</span><span>🎁 {r.program?.reward}</span></div>))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
