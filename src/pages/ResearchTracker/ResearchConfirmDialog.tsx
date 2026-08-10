import { TriangleAlert, X } from "lucide-react";
import { Button } from "../../components/ui/Button";

// An in-app replacement for window.confirm — used for both single and bulk
// delete. Browsers offer a "prevent this page from creating additional
// dialogs" checkbox after repeated confirm() calls in a short span (exactly
// what a delete-heavy session can trigger); once checked, every future
// confirm() silently returns false with no visible error, which looks
// indistinguishable from "delete is broken." A dialog this app owns can't be
// silenced that way.
export function ResearchConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="animate-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <TriangleAlert size={15} className="text-bearish" /> {title}
          </span>
          <button
            onClick={onCancel}
            className="focus-ring rounded-full p-1 text-subtle-foreground hover:bg-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <p className="px-5 py-4 text-sm text-muted-foreground">{message}</p>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="bg-bearish text-white hover:bg-bearish/90"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
