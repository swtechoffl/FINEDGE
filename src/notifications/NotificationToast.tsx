import { Sparkles, X } from "lucide-react";
import { signalColor } from "../components/SignalGauge";
import { Badge } from "../components/ui/Badge";
import { useNotifications } from "./NotificationContext";

// Rendered once at the app shell level (Layout) so a new high-impact story
// pops up no matter which page you're on — the bell dropdown in Header is
// the persistent/queryable history of the same notifications.
//
// Mobile: full-width friendly banner sitting just above the bottom tab bar.
// Desktop (sm+): a floating card anchored to the bottom-right corner.
export function NotificationToast() {
  const { toast, toastExtraCount, dismissToast } = useNotifications();
  if (!toast) return null;

  const color = signalColor(toast.signal);

  return (
    <div className="animate-toast-in fixed inset-x-3 bottom-20 z-[100] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[360px]">
      <a
        href={toast.articleUrl || undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismissToast}
        className="focus-ring flex items-start gap-3 rounded-3xl border border-border bg-surface p-3.5 shadow-xl transition-transform hover:-translate-y-0.5 sm:rounded-2xl sm:p-4"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color}1f` }}
        >
          <Sparkles size={18} style={{ color }} />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-1 flex items-center gap-2">
            <Badge size="sm">{toast.category}</Badge>
            <span className="text-[10px] text-subtle-foreground">{toast.source}</span>
          </div>
          <div className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{toast.headline}</div>
          {toastExtraCount > 0 && (
            <div className="mt-1 text-xs text-subtle-foreground">+{toastExtraCount} more high-impact update(s)</div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dismissToast();
          }}
          className="focus-ring shrink-0 rounded-full p-1.5 text-subtle-foreground hover:bg-hover hover:text-foreground"
        >
          <X size={14} />
        </button>
      </a>
    </div>
  );
}
