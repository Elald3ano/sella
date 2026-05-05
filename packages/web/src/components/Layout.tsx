import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PaymentBanner from './PaymentBanner';
import { supabase } from '../lib/supabase';

interface BizData {
  id: string;
  name: string;
  plan: string;
  subscriptions?: { trial_ends_at: string; plan: string } | { trial_ends_at: string; plan: string }[];
}

export default function Layout() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BizData | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      loadBusiness(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
      else loadBusiness(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadBusiness = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('businesses').select('id, name, plan, subscriptions(trial_ends_at, plan)').eq('user_id', userId).single();
      if (error) console.error('[Layout] Error loading business:', error);
      if (data) setBusiness(data as any);
    } catch (err) {
      console.error('[Layout] Unexpected error:', err);
    }
  };

  if (!business) return null;

  const sub = business.subscriptions ? (Array.isArray(business.subscriptions) ? business.subscriptions[0] : business.subscriptions) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PaymentBanner trialEndsAt={sub?.trial_ends_at || null} plan={business.plan} bizName={business.name} />
      <div className="flex flex-1">
        <Sidebar onLogout={() => supabase.auth.signOut()} />
        <main className="flex-1 p-6 md:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
