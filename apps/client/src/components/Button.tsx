import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-teal-700 bg-teal-700 text-white hover:bg-teal-800 disabled:border-slate-300 disabled:bg-slate-300",
  secondary:
    "border-slate-300 bg-white text-slate-900 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400",
  danger:
    "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400",
  ghost:
    "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400"
};

export function Button({
  children,
  variant = "secondary",
  icon,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
