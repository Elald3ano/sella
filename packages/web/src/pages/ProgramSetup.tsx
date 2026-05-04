import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Program { id: string; title: string; target: number; reward: string }

export default function ProgramSetup() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', target: '10', reward: '' });

  useEffect(() => { loadPrograms(); }, []);

  const loadPrograms = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data: bd } = await supabase.from('businesses').select('id').eq('user_id', session.user.id).single();
    if (!bd) return;
    const { data } = await supabase.from('programs').select('*').eq('business_id', bd.id).eq('active', true);
    setPrograms(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data: bd } = await supabase.from('businesses').select('id').eq('user_id', session.user.id).single();
    if (!bd) return;
    setLoading(true);
    await supabase.from('programs').insert({ business_id: bd.id, title: form.title, target: Number(form.target), reward: form.reward });
    setForm({ title: '', target: '10', reward: '' });
    setShowForm(false);
    setLoading(false);
    loadPrograms();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Programas</h1><p className="text-gray-500 text-sm">Configurá tus programas de fidelización.</p></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors">{showForm ? 'Cancelar' : 'Nuevo programa'}</button>
      </div>
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Los 10 cafés" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sellos necesarios</label><input type="number" required min="1" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Premio</label><input type="text" required value={form.reward} onChange={e => setForm({ ...form, reward: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="1 café gratis" /></div>
            </div>
            <button type="submit" disabled={loading} className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50">{loading ? 'Creando...' : 'Crear programa'}</button>
          </form>
        </div>
      )}
      {programs.length === 0 && !showForm && (
        <div className="text-center py-16"><div className="text-4xl mb-4">⭐</div><h3 className="text-lg font-semibold text-gray-700 mb-2">Sin programas</h3><p className="text-sm text-gray-500 mb-4">Crea tu primer programa de fidelización.</p><button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors">Crear programa</button></div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {programs.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
            <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2"><span>{p.target} sellos</span><span>→</span><span className="font-medium text-primary-600">{p.reward}</span></div>
            <div className="flex gap-1 mt-3">{Array.from({ length: p.target }).map((_, i) => (<div key={i} className="w-5 h-5 rounded-full border border-gray-300 bg-gray-50" />))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
