import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default: "bg-chip text-muted-foreground",
        accent: "bg-accent-bg text-accent",
        bullish: "bg-bullish-bg text-bullish",
        neutral: "bg-neutral-bg text-neutral",
        bearish: "bg-bearish-bg text-bearish",
        outline: "border border-border-strong text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
