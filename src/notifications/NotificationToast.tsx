import { X } from "lucide-react";
import { signalColor } from "../components/SignalGauge";
import { Badge } from "../components/ui/Badge";
import { useNotifications } from "./NotificationContext";

// Rendered once at the app shell level (Layout) so a new high-impact story
// pops up no matter which page you're on — the bell dropdown in Header is
// the persistent/queryable history of the same notifications.
export function NotificationToast() {
  const { toast, toastExtraCount, dismissToast } = useNotifications();
  if (!toast) return null;

  const color = signalColor(toast.signal);

  return (
    <div className="animate-slide-in fixed bottom-5 right-5 z-[100] w-[340px]">
      <a
        href={toast.articleUrl || undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismissToast}
        className="focus-ring flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl transition-transform hover:-translate-y-0.5"
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="min-w-0 flex-1">
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
          className="focus-ring h-fit shrink-0 rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
        >
          <X size={14} />
        </button>
      </a>
    </div>
  );
}
