import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Trips } from './pages/Trips';
import { TripDetails } from './pages/TripDetails';
import { Upgrade } from './pages/Upgrade';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { AppState, RouteName, CurrentUser } from './types';
import { api, setAccessToken } from './services/api';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './components/UI';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentRoute: 'trips',
  });
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Remove getSession() to avoid locking collisions with onAuthStateChange.
    // onAuthStateChange fires 'INITIAL_SESSION' instantly, handling the first load safely.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setAccessToken(session?.access_token ?? null);
      setSession(session);
      if (session) {
        await checkMfa();
      } else {
        setUser(null);
        setRequiresMfa(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkMfa = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;

      if (data?.nextLevel === 'aal2' && data?.currentLevel === 'aal1') {
        setRequiresMfa(true);
        setLoading(false);
      } else {
        setRequiresMfa(false);
        fetchProfile();
      }
    } catch (err) {
      console.error('Error checking MFA:', err);
      supabase.auth.signOut();
    }
  };

  const fetchProfile = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If error (e.g. network), we might wanna show specific error or logout
    } finally {
      setLoading(false);
    }
  };

  const navigate = (route: RouteName, params?: any) => {
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