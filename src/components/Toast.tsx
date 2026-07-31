import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  /** Auto-dismiss duration in ms — 0 means never */
  duration: number;
  /** When the toast was created (for ordering) */
  createdAt: number;
}

interface ToastInput {
  type?: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  /** Override default duration in ms */
  duration?: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
}

// ── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

const MAX_VISIBLE = 3;

// ── Colours ──────────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<
  ToastType,
  { icon: React.FC<{ size?: number }>; border: string; bg: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-200",
    bg: "bg-[#e6f4ea]",
    iconColor: "#059669",
  },
  error: {
    icon: XCircle,
    border: "border-red-200",
    bg: "bg-[#fef2f2]",
    iconColor: "#dc2626",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200",
    bg: "bg-[#fef7e0]",
    iconColor: "#d97706",
  },
  info: {
    icon: Info,
    border: "border-blue-200",
    bg: "bg-[#e0f2fe]",
    iconColor: "#2563eb",
  },
};

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<ToastItem[]>([]);
  const queueRef = useRef<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showNext = useCallback(() => {
    setVisible((prev) => {
      if (prev.length >= MAX_VISIBLE) return prev;
      const queue = queueRef.current;
      if (queue.length === 0) return prev;
      const next = queue.shift()!;
      return [...prev, next];
    });
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      // Clear the auto-dismiss timer if one exists
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }

      setVisible((prev) => {
        const next = prev.filter((t) => t.id !== id);
        // After removing one, try to show the next queued toast
        if (next.length < MAX_VISIBLE && queueRef.current.length > 0) {
          const n = queueRef.current.shift()!;
          return [...next, n];
        }
        return next;
      });
    },
    []
  );

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `toast-${++toastCounter}`;
      const type = input.type ?? "info";
      const duration = input.duration ?? DEFAULT_DURATIONS[type];

      const item: ToastItem = {
        id,
        type,
        title: input.title,
        message: input.message,
        action: input.action,
        duration,
        createdAt: Date.now(),
      };

      // Try to show immediately if under limit
      let shown = false;
      setVisible((prev) => {
        if (prev.length < MAX_VISIBLE) {
          shown = true;
          return [...prev, item];
        }
        return prev;
      });

      if (!shown) {
        queueRef.current = [...queueRef.current, item];
      }

      // Schedule auto-dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [dismiss]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container — fixed top-right */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {visible.map((t) => {
          const style = TOAST_STYLES[t.type];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={[
                "pointer-events-auto",
                "min-w-80 max-w-sm",
                "backdrop-blur-sm shadow-lg",
                "border rounded-lg",
                "flex items-start gap-3 p-4",
                style.bg,
                style.border,
                "animate-slide-in-right",
              ].join(" ")}
              role="alert"
            >
              {/* Icon */}
              <Icon size={20} className="mt-0.5 shrink-0" style={{ color: style.iconColor }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#121212] leading-tight">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-[#121212]/70 mt-0.5 leading-snug">{t.message}</p>
                )}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 text-xs font-medium underline-offset-2 hover:underline text-[#121212]/80 hover:text-[#121212] transition-colors"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded-md text-[#121212]/40 hover:text-[#121212] hover:bg-black/5 transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}