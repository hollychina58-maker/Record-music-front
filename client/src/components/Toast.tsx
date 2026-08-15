import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  exiting?: boolean;
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'UPDATE'; id: string; partial: Partial<Toast> }
  | { type: 'REMOVE'; id: string }
  | { type: 'EXIT'; id: string };

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, opts?: { duration?: number; action?: { label: string; onClick: () => void } }) => string;
  updateToast: (id: string, partial: Partial<Toast>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function nextId(): string {
  return `toast-${++toastId}-${Date.now()}`;
}

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast];
    case 'UPDATE':
      return state.map((t) => (t.id === action.id ? { ...t, ...action.partial } : t));
    case 'EXIT':
      return state.map((t) => (t.id === action.id ? { ...t, exiting: true } : t));
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const addToast = useCallback(
    (type: ToastType, message: string, opts?: { duration?: number; action?: { label: string; onClick: () => void } }) => {
      const id = nextId();
      const duration = type === 'loading' ? undefined : (opts?.duration ?? 4000);
      dispatch({ type: 'ADD', toast: { id, type, message, duration, action: opts?.action } });

      if (duration && duration > 0) {
        setTimeout(() => {
          dispatch({ type: 'EXIT', id });
          setTimeout(() => dispatch({ type: 'REMOVE', id }), 300);
        }, duration);
      }

      return id;
    },
    [],
  );

  const updateToast = useCallback((id: string, partial: Partial<Toast>) => {
    dispatch({ type: 'UPDATE', id, partial });

    if (partial.duration && partial.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'EXIT', id });
        setTimeout(() => dispatch({ type: 'REMOVE', id }), 300);
      }, partial.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'EXIT', id });
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 300);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, updateToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case 'error':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case 'info':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
    case 'loading':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="toast-icon toast-icon--spin">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
  }
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-item--${t.type}${t.exiting ? ' toast-item--exit' : ''}`}
          role="status"
          onMouseEnter={() => {
            if (t.duration) {
              const el = document.querySelector(`[data-toast-id="${t.id}"]`) as HTMLElement | null;
              if (el) el.style.animationPlayState = 'paused';
            }
          }}
          onMouseLeave={() => {
            if (t.duration) {
              const el = document.querySelector(`[data-toast-id="${t.id}"]`) as HTMLElement | null;
              if (el) el.style.animationPlayState = 'running';
            }
          }}
        >
          <div className="toast-body">
            <ToastIcon type={t.type} />
            <span className="toast-message">{t.message}</span>
          </div>
          <div className="toast-actions">
            {t.action && (
              <button className="toast-action-btn" onClick={t.action.onClick}>
                {t.action.label}
              </button>
            )}
            <button
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="toast-close-icon">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {t.duration && t.duration > 0 && (
            <div
              className="toast-progress"
              data-toast-id={t.id}
              style={{ animationDuration: `${t.duration}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
