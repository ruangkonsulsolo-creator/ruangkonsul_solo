import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-ink text-white",
        secondary:   "bg-paper-raised text-koreksi-deep border border-paper-edge",
        outline:     "border border-current text-slate-900",
        destructive: "bg-red-100 text-red-700",
        success:     "bg-paper-raised text-koreksi-deep",
        warning:     "bg-amber-100 text-amber-700",
        info:        "bg-blue-100 text-blue-700",
        muted:       "bg-paper-sunken text-ink-faint",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
