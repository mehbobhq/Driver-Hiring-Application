import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AdminUser } from './types';

interface AuthContextValue {
  session: Session | null;
  admin: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        await supabase.auth.signOut();
        setSession(null);
        setAdmin(null);
      } else {
        setAdmin(data as AdminUser);
      }
      setLoading(false);
    })();

    return () => { active = false; };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ session, admin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
