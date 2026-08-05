import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  solid?: boolean;
};

export function GlassButton({
  children,
  solid = false,
  className = "",
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const skin = solid
    ? "bg-white text-black hover:bg-gray-200"
    : "liquid-glass text-white hover:bg-white/5";

  return (
    <button className={`${base} ${skin} ${className}`} {...rest}>
      {children}
    </button>
  );
}
