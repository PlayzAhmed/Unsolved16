import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "sun-cta";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", style, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95";

    const variantStyles = {
      default:
        "bg-teal text-white hover:bg-teal/90 shadow-md shadow-teal-deep/15",
      "sun-cta":
        "text-ink font-bold shadow-md shadow-sunset/30 hover:shadow-lg transition-transform hover:-translate-y-0.5",
      outline:
        "border border-teal text-teal hover:bg-teal/10 bg-transparent",
      secondary:
        "bg-sand text-teal-deep hover:bg-sand/80 border border-teal/20 shadow-xs",
      ghost:
        "hover:bg-teal/10 text-ink hover:text-teal-deep",
      link: "text-teal underline-offset-4 hover:underline p-0",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-10 w-10",
    };

    const dynamicStyle =
      variant === "sun-cta"
        ? {
            background: "linear-gradient(135deg, #FFC93C 0%, #FF8A3D 100%)",
            ...style,
          }
        : style;

    return (
      <button
        ref={ref}
        style={dynamicStyle}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
