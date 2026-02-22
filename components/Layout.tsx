import React from 'react';
import { Home, Map, PlusCircle, Crown, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';
import { RouteName } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: RouteName;
  onNavigate: (route: RouteName) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentRoute, onNavigate }) => {
  const { actualTheme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'trips', label: 'Início', icon: Home },
    { id: 'profile', label: 'Perfil', icon: UserIcon },
  ];

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">

      {/* Mobile Theme Toggle (Floating Top Right) */}
      <button
        onClick={toggleTheme}
        className="md:hidden fixed top-4 right-4 z-50 p-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full shadow-sm transition-all"
        title="Alternar Tema"
      >
        {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-200">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-500 tracking-tight flex items-center gap-2">
            <Map className="w-8 h-8" />
            TripNest
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Alternar Tema"
          >
            {actualTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
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
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400 font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 z-50 px-6 pt-2 pb-2 safe-area-bottom transition-colors duration-200">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as RouteName)}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all ${isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-400 active:text-slate-600 dark:text-slate-500 dark:active:text-slate-300'
                  }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {isActive && <div className="w-4 h-0.5 bg-brand-500 dark:bg-brand-400 rounded-full mt-0.5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};