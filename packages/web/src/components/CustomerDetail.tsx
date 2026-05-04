import { useEffect, useState } from 'react';

interface Stamp {
  id: string;
  createdAt: string;
  program: { id: string; title: string };
}

interface Redemption {
  id: string;
  redeemedAt: string;
  program: { title: string; reward: string };
}

interface HistoryData {
  customer: {
    id: string;
    name: string;
    phone: string;
    createdAt: string;
    lastVisit: string | null;
    notes?: string | null;
  };
  stamps: Stamp[];
  redemptions: Redemption[];
  stats: {
    totalStamps: number;
    totalRedemptions: number;
    avgDaysBetweenVisits: number;
    firstVisit: string | null;
    lastVisit: string | null;
  };
  alerts: { date: string; count: number; level: string; msg: string }[];
}

interface Props {
  customerId: string;
  onClose: () => void;
}

export default function CustomerDetail({ customerId, onClose }: Props) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/customers/${customerId}/history`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setNotes(d?.customer?.notes || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [customerId]);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch(`/api/customers/${customerId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    } catch (err) {
      console.error(err);
    }
    setSavingNotes(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatTime = (d: string) => {
    return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  };

  const groupByDate = (stamps: Stamp[]) => {
    const groups: Record<string, Stamp[]> = {};
    stamps.forEach((s) => {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const alertCount = (date: string) => {
    return data?.alerts.find((a) => a.date === date);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : !data ? (
          <div className="p-10 text-center text-red-500">Error al cargar historial</div>
        ) : (
          <>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 rounded-t-2xl flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">👤 {data.customer.name}</h2>
                <p className="text-sm text-gray-500">{data.customer.phone}</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-primary-700">{data.stats.totalStamps}</div>
                  <div className="text-xs text-primary-500">Sellos</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{data.stats.totalRedemptions}</div>
                  <div className="text-xs text-amber-500">Canjes</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700">{data.stats.avgDaysBetweenVisits || '—'}</div>
                  <div className="text-xs text-gray-500">Días entre visitas</div>
                </div>
              </div>

              <div className="text-xs text-gray-400 flex justify-between">
                <span>📅 Desde: {formatDate(data.stats.firstVisit)}</span>
                <span>🕐 Última: {formatDate(data.stats.lastVisit)}</span>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">📝 Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Ej: Prefiere café descafeinado. Viene los lunes..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:ring-2 focus:ring-primary-500 outline-none h-20"
                />
                {savingNotes && <span className="text-xs text-gray-400">Guardando...</span>}
              </div>

              {data.alerts.length > 0 && (
                <div className="space-y-1.5">
                  {data.alerts.map((a, i) => (
                    <div
                      key={i}
                      className={`text-xs p-2.5 rounded-lg font-medium ${
                        a.level === 'danger'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {a.level === 'danger' ? '🔴' : '⚠️'} {formatDate(a.date)} — {a.msg}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Historial de visitas</h3>
                {data.stamps.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin visitas registradas</p>
                ) : (
                  <div className="space-y-4">
                    {groupByDate(data.stamps).map(([date, stamps]) => {
                      const alert = alertCount(date);
                      const isRedemptionDate = data.redemptions.some(
                        (r) => new Date(r.redeemedAt).toISOString().slice(0, 10) === date
                      );
                      return (
                        <div key={date}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-2 h-2 rounded-full mt-0.5 ${
                              alert?.level === 'danger' ? 'bg-red-500' : alert ? 'bg-amber-500' : 'bg-primary-400'
                            }`} />
                            <span className="text-xs font-medium text-gray-500">{formatDate(date)}</span>
                            {alert && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                alert.level === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {alert.level === 'danger' ? 'Alerta' : `${alert.count}x`}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 space-y-1">
                            {stamps.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-gray-300 text-xs w-12">{formatTime(s.createdAt)}</span>
                                <span>{s.program.title}</span>
                              </div>
                            ))}
                            {isRedemptionDate && data.redemptions
                              .filter((r) => new Date(r.redeemedAt).toISOString().slice(0, 10) === date)
                              .map((r) => (
                                <div key={r.id} className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                                  <span className="w-12 text-xs text-amber-400">
                                    {formatTime(r.redeemedAt)}
                                  </span>
                                  <span>🎁 Canjeó: {r.program.reward}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
