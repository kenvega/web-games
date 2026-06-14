import type { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  tone?: "light" | "dark";
};

export function TextInput({
  label,
  error = null,
  tone = "light",
  ...props
}: TextInputProps) {
  const isDark = tone === "dark";

  return (
    <label
      className={`grid gap-2 text-sm font-medium ${
        isDark ? "text-slate-200" : "text-slate-800"
      }`}
    >
      <span>{label}</span>
      <input
        className={`min-h-11 rounded-md border px-3 py-2 text-base outline-none transition ${
          isDark
            ? "border-cyan-200/20 bg-slate-950/70 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
        }`}
        {...props}
      />
      {error !== null ? (
        <span
          className={`text-sm font-normal ${
            isDark ? "text-rose-300" : "text-rose-700"
          }`}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}
