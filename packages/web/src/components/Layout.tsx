import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PaymentBanner from './PaymentBanner';
import { supabase } from '../lib/supabase';

interface BizData {
  id: string;
  name: string;
  plan: string;
  subscription?: { trial_ends_at: string; plan: string };
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
    const { data } = await supabase.from('businesses').select('id, name, plan, subscription(trial_ends_at, plan)').eq('user_id', userId).single();
    if (data) setBusiness(data as any);
  };

  if (!business) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PaymentBanner trialEndsAt={business.subscription?.trial_ends_at || null} plan={business.plan} bizName={business.name} />
      <div className="flex flex-1">
        <Sidebar onLogout={() => supabase.auth.signOut()} />
        <main className="flex-1 p-6 md:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
