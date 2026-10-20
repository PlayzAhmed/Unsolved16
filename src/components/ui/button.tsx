import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95";

    const variantStyles = {
      default:
        "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40",
      outline:
        "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200 hover:border-slate-600",
      secondary:
        "bg-slate-700 text-slate-100 hover:bg-slate-600 shadow-sm",
      ghost:
        "hover:bg-slate-800 text-slate-300 hover:text-slate-100",
      link: "text-emerald-400 underline-offset-4 hover:underline p-0",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
