import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Trips } from './pages/Trips';
import { TripDetails } from './pages/TripDetails';
import { Upgrade } from './pages/Upgrade';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { AcceptInvite } from './pages/AcceptInvite';
import { AppState, RouteName, CurrentUser } from './types';
import { api, setAccessToken } from './services/api';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './components/UI';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    // Check for invite token in URL on initial load
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
      return {
        currentRoute: 'invite',
        params: { token: inviteToken }
      };
    }
    return { currentRoute: 'trips' };
  });
  const [user, setUser] = useState<CurrentUser | null>(null);
  // undefined = onAuthStateChange not yet fired; null = fired, no session
  const [session, setSession] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);

  // Effect 1: Subscribe to auth state changes.
  // Callback is SYNCHRONOUS — no async calls here to avoid Supabase lock deadlocks.
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setAccessToken(currentSession?.access_token ?? null);
      setSession(currentSession ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: React to session changes OUTSIDE the onAuthStateChange callback.
  // This avoids deadlocks from calling getSession() or MFA APIs inside the callback.
  useEffect(() => {
    if (session === undefined) return; // Wait for first onAuthStateChange to fire

    if (!session) {
      setUser(null);
      setRequiresMfa(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const initWithSession = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (cancelled) return;
        if (error) throw error;

        if (data?.nextLevel === 'aal2' && data?.currentLevel === 'aal1') {
          setRequiresMfa(true);
          setLoading(false);
        } else {
          setRequiresMfa(false);
          try {
            const u = await api.getMe();
            if (!cancelled) setUser(u);
          } catch (err) {
            console.error('Error fetching profile:', err);
          } finally {
            if (!cancelled) setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error during auth init:', err);
        if (!cancelled) {
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    };

    initWithSession();
    return () => { cancelled = true; };
  }, [session]);

  const checkMfa = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;

    if (data?.nextLevel === 'aal2' && data?.currentLevel === 'aal1') {
      setRequiresMfa(true);
    } else {
      setRequiresMfa(false);
    }
  };

  const navigate = (route: RouteName, params?: any) => {
    // Clean URL if navigating away from invite
    if (route !== 'invite' && window.location.search.includes('invite=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setAppState({ currentRoute: route, params });
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // State update handled by listener
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-50">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (requiresMfa) {
    return <Login mfaChallengeMode onSuccess={() => checkMfa()} />;
  }

  const renderContent = () => {
    switch (appState.currentRoute) {
      case 'trips':
        return <Trips onNavigate={navigate} user={user} />;
      case 'trip-details':
        return <TripDetails
          tripId={appState.params?.id}
          initialTab={appState.params?.initialTab}
          onNavigate={navigate}
        />;
      case 'profile':
        return (
          <Profile
            user={user}
            onUserUpdate={(updated) => setUser(updated)}
            onLogout={handleLogout}
            onNavigate={navigate}
          />
        );
      case 'invite':
        return (
          <AcceptInvite
            token={appState.params?.token}
            onNavigate={navigate}
          />
        );
      default:
        return <Trips onNavigate={navigate} user={user} />;
    }
  };

  return (
    <ToastProvider>
      <Layout currentRoute={appState.currentRoute} onNavigate={navigate}>
        {renderContent()}
      </Layout>
    </ToastProvider>
  );
}
