import type { ReactNode, MouseEvent } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  hover?: boolean;
  padding?: string;
}

export function GlassCard({ children, className = "", onClick, hover = true, padding = "p-6" }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`${hover ? "glass-card" : "glass"} ${padding} ${className}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
