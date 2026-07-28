import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  accent,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "focus-ring flex w-full items-center justify-between rounded-md px-1 py-1 text-left",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        <span className="text-sm font-bold">{title}</span>
        <ChevronDown
          size={16}
          className={cn("transition-transform duration-200 ease-[var(--ease-out-expo)]", open && "rotate-180")}
        />
      </button>
      {open && <div className="animate-fade-in mt-2 px-1">{children}</div>}
    </div>
  );
}
