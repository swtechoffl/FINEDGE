import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground transition-colors",
        "hover:border-border-strong",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
