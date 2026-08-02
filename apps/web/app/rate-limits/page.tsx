"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const endpoints = [
  { path: "/api/auth/*", limit: "20 req/min", burst: 5, description: "Authentication endpoints — login, register, Google OAuth" },
  { path: "/api/notifications/*", limit: "30 req/min", burst: 10, description: "Notification send + history endpoints" },
  { path: "/api/payments/*", limit: "10 req/min", burst: 3, description: "Payment checkout and webhook endpoints" },
  { path: "/api/urls/*", limit: "100 req/min", burst: 25, description: "URL shortening and redirect endpoints" },
  { path: "/api/chat/*", limit: "60 req/min", burst: 15, description: "Chat REST API endpoints" },
  { path: "/api/vectors/*", limit: "20 req/min", burst: 5, description: "Vector embedding and search endpoints" },
];

export default function RateLimitsPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x23F1;&#xFE0F;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to view rate limits</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Monitor per-endpoint rate limiting configuration.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="page-title">Rate Limiter</h1>
        <p className="page-subtitle">Redis-backed sliding window rate limiting for all API endpoints</p>
      </div>

      {/* Algorithm card */}
      <div className="glass p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold mb-1">Sliding Window Algorithm</h3>
            <p className="text-sm text-[var(--fg-secondary)]">
              Uses Redis sorted sets (ZSET) to track requests within a rolling time window. Each request
              is scored by timestamp. Expired entries are evicted on each check using ZREMRANGEBYSCORE,
              providing O(log N) precision with minimum memory overhead.
            </p>
          </div>
        </div>
      </div>

      {/* Response headers */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
          Response Headers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "X-RateLimit-Limit", value: "100" },
            { label: "X-RateLimit-Remaining", value: "97" },
            { label: "X-RateLimit-Reset", value: "1700000000" },
          ].map((h) => (
            <div key={h.label} className="p-3 rounded-xl bg-surface-mid/50">
              <p className="text-[10px] text-[var(--fg-muted)] font-mono mb-1">{h.label}</p>
              <p className="text-sm font-mono font-semibold">{h.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint configs */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
          Endpoint Configurations
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-subtle)]">
                <th className="pb-3 font-semibold">Endpoint</th>
                <th className="pb-3 font-semibold">Rate Limit</th>
                <th className="pb-3 font-semibold">Burst</th>
                <th className="pb-3 font-semibold hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep) => (
                <tr key={ep.path} className="border-b border-[var(--border-subtle)] hover:bg-surface-mid/30 transition">
                  <td className="py-3 font-mono text-xs">{ep.path}</td>
                  <td className="py-3">
                    <span className="badge badge-info">{ep.limit}</span>
                  </td>
                  <td className="py-3 text-[var(--fg-secondary)]">{ep.burst}</td>
                  <td className="py-3 text-xs text-[var(--fg-secondary)] hidden sm:table-cell">{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Implementation */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
          Implementation
        </h3>
        <pre className="text-xs font-mono text-[var(--fg-secondary)] overflow-x-auto p-4 rounded-xl bg-surface-base">
{`// packages/rate-limiter/src/index.ts

import Redis from 'ioredis';

export class RateLimiter {
  private redis: Redis;

  async isRateLimited(identifier: string, config?: Partial<RateLimitConfig>) {
    const windowMs = config?.windowMs ?? 60_000;
    const maxRequests = config?.maxRequests ?? 100;
    const now = Date.now();
    const key = \`rate_limit:\${identifier}\`;

    await this.redis.zremrangebyscore(key, 0, now - windowMs);
    const count = await this.redis.zcard(key);

    if (count >= maxRequests) return { limited: true };

    await this.redis.zadd(key, now, \`\${now}-\${Math.random()}\`);
    await this.redis.pexpire(key, windowMs);

    return { limited: false };
  }
}`}
        </pre>
      </div>
    </div>
  );
}
