import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastContext } from '../context/ToastContext';
import type { Toast } from '../types';

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Benachrichtigungen"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role="alert"
          aria-atomic="true"
        >
          <span className="toast__icon" aria-hidden="true">
            {ICONS[toast.type]}
          </span>
          <span className="toast__message">{toast.message}</span>
          <button
            className="toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Benachrichtigung schließen"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
