import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Business, Profile } from '@/types/database.types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  business: Business | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBusiness: () => Promise<Business | null>;
  setBusiness: (business: Business | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());

  const fetchProfileAndBusiness = useCallback(async (currentUser: User) => {
    try {
      if (!isSupabaseConfigured()) return;

      // 1. Fetch or create profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileErr && profileErr.code !== 'PGRST116') {
        console.warn('Error fetching profile:', profileErr.message);
      }

      if (profileData) {
        setProfile(profileData as Profile);
      } else {
        // Try creating initial profile
        const fullName = currentUser.user_metadata?.full_name || '';
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            full_name: fullName,
          })
          .select()
          .maybeSingle();

        if (newProfile) {
          setProfile(newProfile as Profile);
        }
      }

      // 2. Fetch business owned by this user
      const { data: bizData, error: bizErr } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bizErr && bizErr.code !== 'PGRST116') {
        console.warn('Error fetching business:', bizErr.message);
      }

      setBusiness(bizData ? (bizData as Business) : null);
    } catch (err) {
      console.error('Error during profile/business initialization:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }, [user]);

  const refreshBusiness = useCallback(async (): Promise<Business | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const biz = data ? (data as Business) : null;
    setBusiness(biz);
    return biz;
  }, [user]);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndBusiness(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfileAndBusiness(currentUser);
      } else {
        setProfile(null);
        setBusiness(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfileAndBusiness]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error };
      if (data.user) {
        await fetchProfileAndBusiness(data.user);
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Login failed') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) return { error };
      return { error: null, user: data.user };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error('Signup failed') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Signout warning:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setBusiness(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        business,
        loading,
        isConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        refreshBusiness,
        setBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
