import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '@sella/shared/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  businessId: string | null;
  businessName: string | null;
  plan: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  const loadBusiness = async (u: User) => {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, plan')
      .eq('user_id', u.id)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Error loading business:', error);
      setBusinessId(null);
      setBusinessName(null);
      setPlan(null);
      return;
    }

    if (!data) {
      await new Promise((res) => setTimeout(res, 2000));

      const { data: retryData, error: retryError } = await supabase
        .from('businesses')
        .select('id, name, plan')
        .eq('user_id', u.id)
        .maybeSingle();

      if (retryError) {
        console.error('[Auth] Error loading business (retry):', retryError);
        setBusinessId(null);
        setBusinessName(null);
        setPlan(null);
        return;
      }

      if (!retryData) {
        await supabase.auth.signOut();
        setBusinessId(null);
        setBusinessName(null);
        setPlan(null);
        return;
      }

      setBusinessId(retryData.id ?? null);
      setBusinessName(retryData.name ?? null);
      setPlan(retryData.plan ?? null);
      return;
    }

    setBusinessId(data.id ?? null);
    setBusinessName(data.name ?? null);
    setPlan(data.plan ?? null);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(s);

        if (s?.user) {
          const admin = (s.user.user_metadata?.role) === 'admin';
          if (admin) {
            setBusinessId(null);
            setBusinessName(null);
            setPlan(null);
          } else {
            await loadBusiness(s.user);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        const admin = (s.user.user_metadata?.role) === 'admin';
        if (admin) {
          setBusinessId(null);
          setBusinessName(null);
          setPlan(null);
        } else {
          loadBusiness(s.user);
        }
      } else {
        setBusinessId(null);
        setBusinessName(null);
        setPlan(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const isAdmin = (user?.user_metadata?.role) === 'admin';

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, businessId, businessName, plan, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
