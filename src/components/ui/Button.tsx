import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-all duration-150 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow-xs hover:bg-accent-hover active:scale-[0.98]",
        outline:
          "border border-border-strong bg-surface text-foreground shadow-xs hover:bg-hover active:scale-[0.98]",
        ghost: "text-muted-foreground hover:bg-hover hover:text-foreground",
        subtle: "bg-surface-2 text-foreground hover:bg-hover",
        accentOutline: "border border-accent/40 text-accent bg-accent-bg hover:bg-accent/20",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-9 rounded-lg px-4 text-sm",
        lg: "h-11 rounded-xl px-5 text-sm",
        icon: "h-9 w-9 rounded-full",
        iconSm: "h-7 w-7 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
