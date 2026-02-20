import React from 'react';
import { Home, Map, PlusCircle, Crown, User as UserIcon, LogOut } from 'lucide-react';
import { RouteName } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: RouteName;
  onNavigate: (route: RouteName) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentRoute, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'trips', label: 'Viagens', icon: Map },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
  ];

  return (
    <div className="flex h-[100dvh] bg-gray-50 text-slate-900 font-sans overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-brand-600 tracking-tight flex items-center gap-2">
            <Map className="w-8 h-8" />
            TripNest
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as RouteName)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="md:max-w-5xl mx-auto pb-24 md:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav - Enhanced with safe area */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 z-50 px-6 pt-2 pb-2 safe-area-bottom">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as RouteName)}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all ${isActive
                  ? 'text-brand-600'
                  : 'text-gray-400 active:text-gray-600'
                  }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {isActive && <div className="w-4 h-0.5 bg-brand-500 rounded-full mt-0.5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};