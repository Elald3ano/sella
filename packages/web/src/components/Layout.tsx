import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PaymentBanner from './PaymentBanner';
import { useAuth } from './AuthProvider';
import { supabase } from '@sella/shared/supabase';

export default function Layout() {
  const navigate = useNavigate();
  const { businessId, businessName, plan, loading, signOut } = useAuth();
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!businessId) { navigate('/login'); return; }

    supabase.from('businesses').select('subscriptions(trial_ends_at)').eq('id', businessId).single()
      .then(({ data, error }) => {
        if (error) console.error('[Layout] Error loading subscription:', error);
        if (data) {
          const sub = Array.isArray(data.subscriptions) ? data.subscriptions[0] : data.subscriptions;
          setTrialEndsAt(sub?.trial_ends_at ?? null);
        }
      });
  }, [businessId, loading, navigate]);

  if (loading || !businessId) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PaymentBanner trialEndsAt={trialEndsAt} plan={plan || ''} bizName={businessName || ''} />
      <div className="flex flex-1">
        <Sidebar onLogout={() => signOut()} />
        <main className="flex-1 p-6 md:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
