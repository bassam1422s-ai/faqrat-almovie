import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function GlassCard({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={`liquid-glass rounded-2xl p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
