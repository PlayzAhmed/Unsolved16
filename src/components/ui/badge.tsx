import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "amber"
    | "emerald"
    | "teal"
    | "sun"
    | "leaf";
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-teal/10 text-teal border-teal/30",
    teal: "bg-teal/10 text-teal border-teal/30",
    sun: "bg-sun/30 text-teal-deep border-sun/60 font-bold",
    leaf: "bg-leaf/15 text-leaf border-leaf/30",
    emerald: "bg-leaf/15 text-leaf border-leaf/30",
    amber: "bg-sun/30 text-teal-deep border-sun/60",
    secondary: "bg-white/80 text-ink border-teal/20",
    outline: "text-ink border-teal/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
