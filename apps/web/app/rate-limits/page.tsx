"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const endpoints = [
  { path: "/api/auth/*", limit: "20/min", burst: 5, desc: "Login, register, Google OAuth" },
  { path: "/api/notifications/*", limit: "30/min", burst: 10, desc: "Notification send + history" },
  { path: "/api/payments/*", limit: "10/min", burst: 3, desc: "Checkout + webhook endpoints" },
  { path: "/api/urls/*", limit: "100/min", burst: 25, desc: "Shorten + redirect endpoints" },
  { path: "/api/chat/*", limit: "60/min", burst: 15, desc: "Chat REST API" },
  { path: "/api/vectors/*", limit: "20/min", burst: 5, desc: "Embedding + search endpoints" },
];

export default function RateLimitsPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)] font-medium">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="glass p-10 text-center"><div className="text-5xl mb-4">⏱️</div><h2 className="text-xl font-bold mb-2">Sign in</h2><Link href="/auth/login" className="btn-primary">Sign In</Link></div></div>;

  return (
    <div className="animate-fade-in space-y-8 max-w-4xl mx-auto">
      <div><h1 className="page-title">Rate Limiter</h1><p className="page-subtitle">Redis-backed sliding window rate limiting for all API endpoints</p></div>

      <div className="glass p-6 flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-[#4f42df]/10 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f42df" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <h3 className="font-bold mb-1">Sliding Window Algorithm</h3>
          <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">Uses Redis ZSET to track requests within rolling windows. Each request is scored by timestamp. Expired entries are evicted via ZREMRANGEBYSCORE on each check — O(log N) precision with constant memory.</p>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-4">Response Headers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[{ label: "X-RateLimit-Limit", value: "100" }, { label: "X-RateLimit-Remaining", value: "97" }, { label: "X-RateLimit-Reset", value: "1712345678" }].map((h) => (
            <div key={h.label} className="p-4 rounded-xl bg-[var(--bg-base)]">
              <p className="text-[10px] font-bold text-[var(--fg-muted)] font-mono mb-1.5">{h.label}</p>
              <p className="text-lg font-extrabold font-mono">{h.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass overflow-x-auto">
        <table className="w-full text-sm p-6">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-subtle)]">
              <th className="p-4 pb-3">Endpoint</th>
              <th className="p-4 pb-3">Rate</th>
              <th className="p-4 pb-3">Burst</th>
              <th className="p-4 pb-3 hidden sm:table-cell">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep) => (
              <tr key={ep.path} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/50">
                <td className="p-4 font-mono text-xs font-semibold">{ep.path}</td>
                <td className="p-4"><span className="badge badge-info">{ep.limit}</span></td>
                <td className="p-4 text-xs text-[var(--fg-secondary)] font-semibold">{ep.burst}</td>
                <td className="p-4 text-xs text-[var(--fg-secondary)] hidden sm:table-cell">{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-4">Implementation</h3>
        <pre className="text-xs font-mono text-[var(--fg-secondary)] overflow-x-auto p-5 rounded-xl bg-[var(--bg-base)] leading-relaxed">
{`// Redis sliding window — O(log N) per check
async isRateLimited(key: string, config?: RateLimitConfig) {
  const now = Date.now();
  const windowStart = now - (config?.windowMs ?? 60_000);
  const maxReqs = config?.maxRequests ?? 100;

  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= maxReqs) return { limited: true };

  await redis.zadd(key, now, \`\${now}-\${Math.random()}\`);
  await redis.pexpire(key, config?.windowMs ?? 60_000);

  return { limited: false, remaining: maxReqs - count - 1 };
}`}
        </pre>
      </div>
    </div>
  );
}
