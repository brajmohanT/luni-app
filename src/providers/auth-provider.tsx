import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/auth/supabase';

type Credentials = {
  email: string;
  password: string;
};

type SignUpResult = {
  requiresEmailConfirmation: boolean;
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signInWithPassword(credentials: Credentials): Promise<void>;
  signUpWithPassword(credentials: Credentials): Promise<SignUpResult>;
  signOut(): Promise<void>;
};

// Shares authentication state and actions with app screens.
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore the stored session and keep it synced with Supabase.
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Unable to restore the Supabase session.', error);
      }

      if (isMounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    }

    void loadSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (isMounted) {
          setSession(nextSession);
          setIsLoading(false);
        }
      },
    );

    // Refresh tokens only while the app is active.
    function handleAppStateChange(nextAppState: string) {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
        return;
      }

      supabase.auth.stopAutoRefresh();
    }

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    handleAppStateChange(AppState.currentState);

    return () => {
      isMounted = false;
      authSubscription.subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const signInWithPassword = useCallback(async ({ email, password }: Credentials) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }
  }, []);

  const signUpWithPassword = useCallback(async ({ email, password }: Credentials) => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      throw error;
    }

    return { requiresEmailConfirmation: data.session === null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, signInWithPassword, signUpWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
