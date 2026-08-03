import type { Metadata } from "next";
import Link from "next/link";

const pages = [
  { name: "Dashboard", desc: "Overview of all services, notifications, payments, and API keys", href: "/dashboard", icon: "⊞" },
  { name: "Notifications", desc: "Compose multi-channel notifications with templates and history", href: "/notifications", icon: "⚡" },
  { name: "Real-time Chat", desc: "WebSocket rooms, DMs, typing indicators, and online presence", href: "/chat", icon: "💬" },
  { name: "Payments", desc: "Stripe checkout, PDF invoices, idempotency keys, webhooks", href: "/payments", icon: "💳" },
  { name: "URL Shortener", desc: "Custom aliases, click tracking, link expiration, stats", href: "/shorten", icon: "🔗" },
  { name: "Google OAuth", desc: "NextAuth.js with Google sign-in, JWT sessions, RBAC middleware", href: "/auth/login", icon: "🔐" },
  { name: "Vector DB", desc: "Semantic search, text embeddings, AI tool calling agent", href: "/vector", icon: "🧠" },
  { name: "Rate Limiter", desc: "Redis sliding window, configurable per-endpoint, 429 handling", href: "/rate-limits", icon: "🛡️" },
  { name: "Infrastructure", desc: "Docker, Terraform, GitHub Actions, Vercel + AWS ECS deployment", href: "/infrastructure", icon: "☁️" },
  { name: "Trending", desc: "Top contributors, engagement stats, community leaderboard", href: "/trending", icon: "🔥" },
  { name: "Analytics", desc: "Real-time platform metrics, request charts, service health", href: "/analytics", icon: "📊" },
  { name: "Settings", desc: "Manage profile, API keys, team members, and notifications", href: "/settings", icon: "⚙️" },
];

export default function DocsPage() {
  return (
    <div className="animate-fade-in space-y-8">
      <div><h1 className="page-title">API Documentation</h1><p className="page-subtitle">CloudStack platform services and endpoints reference</p></div>

      <div className="glass p-6 space-y-4">
        <h2 className="font-bold text-sm">Authentication</h2>
        <p className="text-xs text-[var(--fg-secondary)]">All API endpoints require either a JWT Bearer token or API key.</p>
        <pre className="bg-[var(--bg-base)] p-4 rounded-xl text-xs font-mono text-[var(--fg-secondary)] overflow-x-auto">
{`curl -X POST http://localhost:4001/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@cloudstack.io","password":"****"}'

# Response: { "success": true, "data": { "token": "eyJ...", "user": {...} } }

# Use token:
curl http://localhost:4002/notifications?userId=user@cloudstack.io \\
  -H "Authorization: Bearer eyJ..."`}
        </pre>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((p) => (
          <Link key={p.name} href={p.href} className="glass-card p-5 text-left">
            <div className="text-xl mb-2">{p.icon}</div>
            <h3 className="font-bold text-sm mb-1">{p.name}</h3>
            <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">{p.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
