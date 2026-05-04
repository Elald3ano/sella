import { useState, useEffect } from 'react';

interface Business {
  id: string;
  name: string;
  type: string;
  plan: string;
}

export function useAuth() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('sella_business');
    if (stored) {
      setBusiness(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = (b: Business) => {
    localStorage.setItem('sella_business', JSON.stringify(b));
    setBusiness(b);
  };

  const logout = () => {
    localStorage.removeItem('sella_business');
    setBusiness(null);
  };

  return { business, loading, login, logout };
}
