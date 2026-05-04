import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PaymentBanner from './PaymentBanner';

interface BizData {
  id: string;
  name: string;
  pin?: string;
  email?: string;
  plan: string;
  subscription?: { trialEndsAt: string; plan: string };
}

export default function Layout() {
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BizData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sella_business');
    if (!stored) { navigate('/login'); return; }

    const b = JSON.parse(stored);

    if (!b.pin && !window.location.pathname.includes('configurar-pin')) {
      navigate(`/panel/configurar-pin?id=${b.id}`);
      return;
    }

    const hasProfile = b.email || b.address || b.ownerName;
    const skips = parseInt(localStorage.getItem('sella_profile_skips') || '0');
    if (!hasProfile && skips < 3 && !window.location.pathname.includes('completar-perfil')) {
      navigate(`/panel/completar-perfil?id=${b.id}`);
      return;
    }

    setBusiness(b);
  }, [navigate]);

  if (!business) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PaymentBanner trialEndsAt={business.subscription?.trialEndsAt || null} plan={business.plan} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
