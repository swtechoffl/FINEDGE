import { useState } from "react";
import { ChevronDown, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import type { BoardMeta } from "./boards";

export function BoardSwitcher({
  boards,
  currentId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: {
  boards: BoardMeta[];
  currentId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = boards.find((b) => b.id === currentId);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} title="Switch or manage boards">
        <Layers size={14} />
        <span className="max-w-32 truncate">{current?.name ?? "Board"}</span>
        <ChevronDown size={14} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <div className="max-h-72 overflow-y-auto py-1">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="group flex items-center gap-1 px-2 py-1.5 hover:bg-hover"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch(board.id);
                      setOpen(false);
                    }}
                    className="focus-ring min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-sm font-medium"
                  >
                    <span className={board.id === currentId ? "text-accent" : "text-foreground"}>{board.name}</span>
                  </button>
                  <button
                    type="button"
                    title="Rename board"
                    onClick={() => onRename(board.id)}
                    className="focus-ring rounded p-1 text-subtle-foreground opacity-0 transition-opacity hover:bg-hover hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      title="Delete board"
                      onClick={() => onDelete(board.id)}
                      className="focus-ring rounded p-1 text-subtle-foreground opacity-0 transition-opacity hover:bg-bearish/10 hover:text-bearish group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
              className="focus-ring flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm font-medium text-accent hover:bg-hover"
            >
              <Plus size={14} />
              New board
            </button>
          </div>
        </>
      )}
    </div>
  );
}
