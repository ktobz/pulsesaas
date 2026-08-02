interface StatBadgeProps {
  value: string | number;
  label: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function StatBadge({ value, label, trend, trendValue }: StatBadgeProps) {
  return (
    <div className="glass p-5 rounded-2xl animate-in relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: `radial-gradient(circle at bottom right, ${
            trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : "#6366f1"
          }, transparent)`,
        }}
      />
      <div className="stat-label relative z-10">{label}</div>
      <div className="stat-value relative z-10 mt-1">{value}</div>
      {trendValue && (
        <div
          className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
            trend === "up"
              ? "text-green-400"
              : trend === "down"
              ? "text-red-400"
              : "text-[var(--fg-secondary)]"
          }`}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </div>
      )}
    </div>
  );
}
