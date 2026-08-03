"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const metrics = [
  { label: "Total Users", value: "12,847", change: "+12.4%", up: true },
  { label: "API Requests", value: "3.2M", change: "+8.1%", up: true },
  { label: "Notifications", value: "48,291", change: "+22.3%", up: true },
  { label: "Avg Response", value: "42ms", change: "-5.2%", up: true },
];

const chartData = [
  { day: "Mon", requests: 45000 },
  { day: "Tue", requests: 52000 },
  { day: "Wed", requests: 48000 },
  { day: "Thu", requests: 61000 },
  { day: "Fri", requests: 55000 },
  { day: "Sat", requests: 32000 },
  { day: "Sun", requests: 28000 },
];
const maxR = Math.max(...chartData.map((d) => d.requests));

export default function AnalyticsPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)] font-medium">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><p className="text-[var(--fg-secondary)]">Sign in.</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div>;

  return (
    <div className="animate-fade-in space-y-8">
      <div><h1 className="page-title">Analytics</h1><p className="page-subtitle">Real-time platform metrics and usage stats</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="glass p-5">
            <div className="stat-label">{m.label}</div>
            <div className="stat-value mt-1">{m.value}</div>
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${m.up ? "text-emerald-600" : "text-red-600"}`}>
              {m.up ? "↑" : "↓"} {m.change}
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-6">
        <h3 className="text-sm font-bold mb-6">API Requests This Week</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {chartData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-[var(--fg-secondary)]">{Math.round(d.requests / 1000)}k</span>
              <div className="w-full bg-gradient-to-t from-[#4f42df] to-[#8b5cf6] rounded-t-md transition-all" style={{ height: `${(d.requests / maxR) * 100}%`, minHeight: "4px" }} />
              <span className="text-[10px] font-semibold text-[var(--fg-muted)]">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h3 className="text-sm font-bold mb-4">Top Endpoints</h3>
          <div className="space-y-3">
            {[{ path: "GET /api/notifications", count: "12,450", pct: "38%" }, { path: "POST /api/auth/login", count: "8,210", pct: "25%" }, { path: "GET /api/urls/:code", count: "5,600", pct: "17%" }, { path: "POST /api/payments", count: "3,100", pct: "9%" }, { path: "WS /chat", count: "2,400", pct: "7%" }].map((e) => (
              <div key={e.path} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-[var(--fg-secondary)] flex-1 truncate">{e.path}</span>
                <span className="text-xs font-bold">{e.count}</span>
                <span className="text-[11px] text-[var(--fg-muted)] w-10 text-right">{e.pct}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-6">
          <h3 className="text-sm font-bold mb-4">Service Health</h3>
          <div className="space-y-3">
            {[{ name: "Auth Service", uptime: "99.98%", latency: "12ms" }, { name: "Notification", uptime: "99.95%", latency: "45ms" }, { name: "Chat (WebSocket)", uptime: "99.99%", latency: "8ms" }, { name: "Payment", uptime: "99.92%", latency: "120ms" }, { name: "URL Shortener", uptime: "99.97%", latency: "6ms" }, { name: "Vector DB", uptime: "99.90%", latency: "250ms" }].map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="glow-dot glow-dot-active" />
                  <span className="text-xs font-semibold">{s.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-[var(--fg-muted)]">{s.latency}</span>
                  <span className="text-[11px] font-bold text-emerald-600">{s.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
