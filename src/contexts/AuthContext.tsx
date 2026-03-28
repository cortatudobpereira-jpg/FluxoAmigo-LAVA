import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/supabaseQuery';
import type { User, Session } from '@supabase/supabase-js';

const ROLE_STORAGE_KEY = 'fluxoamigo_user_role';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'user' | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<'admin' | 'user' | null>(
    () => (localStorage.getItem(ROLE_STORAGE_KEY) as 'admin' | 'user') || null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard: prevents onAuthStateChange from running fetchRole during initialization
  const initializedRef = useRef(false);
  // Keeps the latest role value accessible inside closures (fixes stale closure bug)
  const roleRef = useRef(role);

  // Unified setter: keeps state, ref, and localStorage in sync
  const updateRole = useCallback((newRole: 'admin' | 'user' | null) => {
    roleRef.current = newRole;
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } else {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
  }, []);

  // Fetches the user role from the database.
  // `currentRole` is the fallback: if the query fails/times out, the role stays unchanged.
  // This prevents the admin→user downgrade bug.
  const fetchRole = async (userId: string, currentRole: 'admin' | 'user' | null = null): Promise<'admin' | 'user'> => {
    const fallback = currentRole ?? 'user';
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single(),
        5000
      );
      
      if (error) {
        console.error('Error fetching role:', error);
        // On error, keep the current role instead of downgrading
        return fallback;
      }

      if (data) {
        console.log('Role found for user:', userId, data.role);
        return data.role as 'admin' | 'user';
      } else {
        console.warn('No profile found for user:', userId, 'keeping current role:', fallback);
        return fallback;
      }
    } catch (err) {
      console.error('Catch error fetching role:', err);
      return fallback;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timed out, forcing loading false.');
          initializedRef.current = true;
          setLoading(false);
        }
      }, 5000);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // During init, currentRole is null → defaults to 'user' if query fails (expected)
            const fetchedRole = await fetchRole(session.user.id, null);
            if (mounted) updateRole(fetchedRole);
          } else {
            updateRole(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setUser(null);
          setSession(null);
          updateRole(null);
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (!mounted) return;

      // Skip ALL events until initializeAuth has finished.
      if (!initializedRef.current) {
        console.log('Skipping auth event during initialization:', event);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        updateRole(null);
        setLoading(false);
        return;
      }

      // TOKEN_REFRESHED: just update session, never re-fetch role
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        setUser(session?.user ?? null);
        return;
      }

      // SIGNED_IN: fetch role, but preserve current role on failure
      if (event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Pass current role via ref so we NEVER downgrade on failure (fixes stale closure)
          const fetchedRole = await fetchRole(session.user.id, roleRef.current);
          if (mounted) updateRole(fetchedRole);
        } else {
          updateRole(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro ao entrar.' };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { full_name: name }
        }
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro ao cadastrar.' };
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);
      updateRole(null);
      localStorage.removeItem(ROLE_STORAGE_KEY);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
