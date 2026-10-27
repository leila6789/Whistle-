import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-display text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c140c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#d7b48a] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-[#1c140c] text-[#f4efe4] hover:bg-[#2a2118]",
        orange: "bg-[#e25b1a] text-[#1a1008] hover:bg-[#c84e14] active:translate-y-px",
        ghost: "bg-transparent text-[#1c140c] hover:bg-[#1c140c]/8",
        outline: "border border-[#1c140c] bg-transparent text-[#1c140c] hover:bg-[#1c140c]/8",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-14 w-full px-6 text-xl tracking-[0.08em]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : "button"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
