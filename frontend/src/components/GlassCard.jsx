import React from "react";
import { cn } from "@/lib/utils";

// Reusable Apple-style glass surface.
export const GlassCard = React.forwardRef(
  ({ className, children, hover = false, strong = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          strong ? "glass-strong" : "glass",
          "rounded-[24px]",
          hover &&
            "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(15,23,42,0.10)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
