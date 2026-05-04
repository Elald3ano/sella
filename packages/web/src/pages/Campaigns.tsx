import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Customer { id: string; name: string; phone: string; last_visit: string | null; }

export default function Campaigns() {
  const [inactive, setInactive] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.from('businesses').select('id,name').eq('user_id', data.session.user.id).single().then(({ data: bd }) => {
        if (!bd) return;
        const d = new Date(); d.setDate(d.getDate() - 15);
        supabase.from('customers').select('id,name,phone,last_visit').eq('business_id', bd.id).lte('last_visit', d.toISOString()).then(({ data: cs }) => setInactive(cs || []));
      });
    });
  }, []);

  const handleSend = async () => {
    setMsg(`[MOCK] Se enviarían ${selected.length} mensajes WhatsApp.`);
    setSelected([]);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reactivar clientes</h1>
      <p className="text-gray-500 text-sm mb-6">Clientes inactivos por más de 15 días.</p>
      {msg && <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">{msg}</div>}
      {inactive.length === 0 ? (
        <div className="text-center py-16"><div className="text-4xl mb-4">🎉</div><h3 className="text-lg font-semibold text-gray-700 mb-2">Sin inactivos</h3><p className="text-sm text-gray-500">Todos tus clientes han visitado recientemente.</p></div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setSelected(selected.length === inactive.length ? [] : inactive.map(c => c.id))} className="text-sm text-primary-600 font-medium hover:underline">{selected.length === inactive.length ? 'Deseleccionar todos' : 'Seleccionar todos'}</button>
            <span className="text-sm text-gray-400">{selected.length} seleccionados</span>
            <button onClick={handleSend} disabled={selected.length === 0} className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">Enviar WhatsApp ({selected.length})</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100"><th className="w-10 px-4 py-3"><input type="checkbox" checked={selected.length === inactive.length} onChange={() => setSelected(selected.length === inactive.length ? [] : inactive.map(c => c.id))} /></th><th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Cliente</th><th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">WhatsApp</th><th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Última visita</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {inactive.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(c.id)} onChange={() => setSelected(s => s.includes(c.id) ? s.filter(x => x !== c.id) : [...s, c.id])} /></td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.phone}</td>
                    <td className="px-4 py-3 text-sm text-orange-600">{c.last_visit ? new Date(c.last_visit).toLocaleDateString('es-CO') : 'Nunca'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
