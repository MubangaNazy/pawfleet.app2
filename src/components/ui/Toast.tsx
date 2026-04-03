import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle };
const COLORS = {
  success: { bg: 'bg-success-light', border: 'border-success', icon: 'text-success', title: 'text-success-dark' },
  error: { bg: 'bg-danger-light', border: 'border-danger', icon: 'text-danger', title: 'text-danger-dark' },
  info: { bg: 'bg-info-light', border: 'border-info', icon: 'text-info', title: 'text-info-dark' },
  warning: { bg: 'bg-warning-light', border: 'border-warning', icon: 'text-warning', title: 'text-warning-dark' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = `t${Date.now()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const ctx: ToastContextType = {
    success: (t, m) => addToast('success', t, m),
    error: (t, m) => addToast('error', t, m),
    info: (t, m) => addToast('info', t, m),
    warning: (t, m) => addToast('warning', t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const Icon = ICONS[toast.type];
          const colors = COLORS[toast.type];
          return (
            <div key={toast.id} className={`toast-enter pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-modal ${colors.bg} ${colors.border}`}>
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${colors.icon}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colors.title}`}>{toast.title}</p>
                {toast.message && <p className="text-xs text-ink-secondary mt-0.5">{toast.message}</p>}
              </div>
              <button onClick={() => remove(toast.id)} className="shrink-0 text-ink-muted hover:text-ink-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
