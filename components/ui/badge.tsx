import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-brand text-white",
        secondary:   "bg-brand-50 text-brand border border-brand-200",
        outline:     "border border-current text-slate-900",
        destructive: "bg-red-100 text-red-700",
        success:     "bg-brand-50 text-brand",
        warning:     "bg-amber-100 text-amber-700",
        info:        "bg-blue-100 text-blue-700",
        muted:       "bg-muted text-muted-foreground",
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
