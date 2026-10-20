import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "amber" | "emerald";
}

function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    emerald:
      "bg-emerald-600/20 text-emerald-300 border-emerald-500/50",
    amber:
      "bg-amber-500/10 text-amber-400 border-amber-500/30",
    secondary:
      "bg-slate-700/60 text-slate-300 border-slate-600/50",
    outline:
      "text-slate-200 border-slate-700",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
