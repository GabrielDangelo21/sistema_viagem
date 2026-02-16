import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Trips } from './pages/Trips';
import { TripDetails } from './pages/TripDetails';
import { Upgrade } from './pages/Upgrade';
import { AppState, RouteName, CurrentUser } from './types';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './components/UI';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentRoute: 'dashboard',
  });
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const u = await api.getMe();
        setUser(u);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const navigate = (route: RouteName, params?: any) => {
    setAppState({ currentRoute: route, params });
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-50">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
      </div>
    );
  }

  const renderContent = () => {
    switch (appState.currentRoute) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} user={user} />;
      case 'trips':
        return <Trips onNavigate={navigate} user={user} />;
      case 'trip-details':
        return <TripDetails 
            tripId={appState.params?.id} 
            initialTab={appState.params?.initialTab}
            onNavigate={navigate} 
        />;
      case 'upgrade':
        return <Upgrade onNavigate={navigate} />;
      case 'profile':
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Perfil</h1>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-2xl font-bold">
                            {user?.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">{user?.name}</h2>
                            <p className="text-gray-500">{user?.email}</p>
                            <span className="inline-block px-2 py-0.5 mt-2 bg-gray-100 text-gray-600 text-xs rounded-full uppercase font-bold tracking-wider">
                                {user?.plan} Plan
                            </span>
                        </div>
                    </div>
                    <button className="text-red-500 font-medium text-sm hover:underline">Sair da conta</button>
                </div>
            </div>
        );
      default:
        return <Dashboard onNavigate={navigate} user={user} />;
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