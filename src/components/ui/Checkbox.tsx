import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onCheckedChange}
      className={cn(
        "focus-ring flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
        checked ? "border-accent bg-accent" : "border-border-strong bg-surface hover:border-accent/50",
        className,
      )}
    >
      {checked && <Check size={11} strokeWidth={3} className="text-accent-foreground" />}
    </button>
  );
}
