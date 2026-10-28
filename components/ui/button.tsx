import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        /* Brand merah — CTA utama */
        default:
          "bg-brand text-white shadow-brand-sm hover:bg-brand-light hover:shadow-brand",
        /* Outline brand */
        outline:
          "border-2 border-brand text-brand bg-transparent hover:bg-brand-50 hover:border-brand-light",
        /* Ghost */
        ghost:
          "text-brand hover:bg-brand-50 hover:text-brand-light",
        /* Secondary — abu terang */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-brand-100",
        /* Destructive */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /* Link */
        link:
          "text-brand underline-offset-4 hover:underline p-0 h-auto shadow-none",
        /* Dark — untuk CTA section gelap */
        dark:
          "bg-white text-brand font-bold shadow-md hover:bg-brand-50",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-12 rounded-xl px-8 text-base",
        xl:      "h-14 rounded-xl px-10 text-lg",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size:    "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
