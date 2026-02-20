import React, { useState, createContext, useContext, useEffect } from 'react';
import { Loader2, X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', loading, className = '', disabled, ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200 focus:ring-brand-500",
    secondary: "bg-brand-100 text-brand-900 hover:bg-brand-200 focus:ring-brand-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500"
  };

  const sizes = {
    sm: "px-3 py-2 text-sm min-h-[36px]",
    md: "px-4 py-2.5 text-sm min-h-[44px]",
    lg: "px-6 py-3.5 text-base min-h-[48px]"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

// --- MODAL (Full-screen on mobile) ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Mobile: slide-up sheet from bottom. Desktop: centered card */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[92dvh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          {/* Mobile drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full sm:hidden" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- BADGE ---
export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    planned: 'bg-blue-50 text-blue-700 border-blue-200',
    ongoing: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
    confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    canceled: 'bg-red-50 text-red-700 border-red-200',
  };

  const labels: Record<string, string> = {
    planned: 'Planejada',
    ongoing: 'Em Andamento',
    completed: 'Concluída',
    confirmed: 'Confirmada',
    pending: 'Pendente',
    canceled: 'Cancelada'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100'}`}>
      {labels[status] || status}
    </span>
  );
};

// --- EMPTY STATE ---
export const EmptyState: React.FC<{ title: string, description: string, icon: React.ElementType, action?: React.ReactNode }> = ({ title, description, icon: Icon, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

// --- TOAST SYSTEM (repositioned for mobile bottom nav) ---

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toast: (props: Omit<ToastProps, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = ({ title, message, type = 'info' }: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Mobile: above bottom nav (bottom-20). Desktop: bottom-right corner */}
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-[110] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-white border border-gray-100 shadow-lg rounded-xl p-4 w-full md:w-80 animate-in slide-in-from-bottom fade-in duration-300 flex items-start gap-3"
          >
            <div className={`mt-0.5 shrink-0 ${t.type === 'success' ? 'text-green-500' :
                t.type === 'error' ? 'text-red-500' : 'text-blue-500'
              }`}>
              {t.type === 'success' && <CheckCircle size={18} />}
              {t.type === 'error' && <AlertCircle size={18} />}
              {t.type === 'info' && <Info size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <h4 className="text-sm font-semibold text-gray-900">{t.title}</h4>}
              <p className="text-sm text-gray-600 leading-snug">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};