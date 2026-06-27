import { useToast } from './ToastContext';

/** Renders active toasts, anchored to the bottom of the panel. */
export function Toaster() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="clipinsights__toaster" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`clipinsights__toast clipinsights__toast--${toast.type}`}
          role="status"
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
