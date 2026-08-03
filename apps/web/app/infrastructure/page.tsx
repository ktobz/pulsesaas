"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const layers = [
  { layer: "DNS", tech: "Route53 + CloudFront", desc: "Global DNS with CDN edge caching", icon: "🌐" },
  { layer: "Frontend", tech: "Vercel", desc: "Auto-deploys from GitHub, SSR + edge functions", icon: "▲" },
  { layer: "Load Balancer", tech: "AWS ALB", desc: "SSL termination, path-based routing to services", icon: "⚖️" },
  { layer: "Firewall", tech: "AWS WAF + SG", desc: "SQLi, XSS protection, rate limiting, port scan guard", icon: "🛡️" },
  { layer: "Compute", tech: "ECS Fargate", desc: "7 serverless containers, auto-scaling per service", icon: "🚀" },
  { layer: "PostgreSQL", tech: "RDS Multi-AZ", desc: "Primary DB with automated daily backups + replicas", icon: "🐘" },
  { layer: "Redis", tech: "ElastiCache", desc: "Session cache, rate limits, job queue backing store", icon: "⚡" },
  { layer: "MongoDB", tech: "DocumentDB", desc: "Chat message persistence and audit trail logs", icon: "🍃" },
  { layer: "CI/CD", tech: "GitHub Actions", desc: "Lint → Test → Build → Push ECR → Deploy ECS", icon: "🔄" },
  { layer: "IaC", tech: "Terraform", desc: "All AWS resources declared as code, version controlled", icon: "🏗️" },
  { layer: "Secrets", tech: "Secrets Manager", desc: "Encrypted DB creds, API keys, OAuth tokens", icon: "🔑" },
  { layer: "Monitoring", tech: "CloudWatch", desc: "Log aggregation, metrics dashboards, alert policies", icon: "📊" },
];

const services = [
  { name: "Next.js Web", port: 3000, env: "Vercel", status: "operational" },
  { name: "Auth Service", port: 4001, env: "AWS ECS", status: "operational" },
  { name: "Notification", port: 4002, env: "AWS ECS", status: "operational" },
  { name: "Chat (WS)", port: 4003, env: "AWS ECS", status: "operational" },
  { name: "Payment", port: 4004, env: "AWS ECS", status: "operational" },
  { name: "URL Shortener", port: 4005, env: "AWS ECS", status: "operational" },
  { name: "Vector DB", port: 4006, env: "AWS ECS", status: "operational" },
  { name: "Worker (BullMQ)", port: 0, env: "AWS ECS", status: "operational" },
];

export default function InfrastructurePage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)] font-medium">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="glass p-10 text-center"><div className="text-5xl mb-4">🛠️</div><h2 className="text-xl font-bold mb-2">Sign in</h2><Link href="/auth/login" className="btn-primary">Sign In</Link></div></div>;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="page-title">Infrastructure</h1>
        <p className="page-subtitle">Docker, GitHub Actions, Vercel + AWS ECS, Terraform, WAF, Route53</p>
      </div>

      {/* Service health */}
      <div className="glass p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-5">Service Health</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-subtle)]">
                <th className="pb-3">Service</th>
                <th className="pb-3">Port</th>
                <th className="pb-3 hidden sm:table-cell">Prod Env</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.name} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]/50 transition">
                  <td className="py-3 font-semibold text-xs">{s.name}</td>
                  <td className="py-3 font-mono text-xs text-[var(--fg-secondary)]">{s.port || "—"}</td>
                  <td className="py-3 text-xs text-[var(--fg-secondary)] hidden sm:table-cell">{s.env}</td>
                  <td className="py-3"><span className="flex items-center gap-2"><span className="glow-dot glow-dot-active" /><span className="text-xs font-semibold capitalize">{s.status}</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture layers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {layers.map((item) => (
          <div key={item.layer} className="glass-card p-5">
            <div className="text-xl mb-2">{item.icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">{item.layer}</p>
            <p className="font-bold text-sm mt-1">{item.tech}</p>
            <p className="text-[11px] text-[var(--fg-secondary)] mt-1 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Deploy flow */}
      <div className="glass p-8 text-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)] mb-6">Pipeline</h3>
        <div className="flex flex-col items-center gap-2">
          <div className="px-5 py-2 rounded-xl bg-[#4f42df]/5 border border-[#4f42df]/15 text-xs font-bold font-mono text-[#4f42df]">git push → main</div>
          <span className="text-[var(--fg-muted)] text-base">↓</span>
          <div className="flex gap-3 flex-wrap justify-center">
            <div className="glass px-4 py-2 rounded-xl text-xs font-semibold">GH Actions CI</div>
            <div className="glass px-4 py-2 rounded-xl text-xs font-semibold">Docker Build</div>
            <div className="glass px-4 py-2 rounded-xl text-xs font-semibold">Push ECR</div>
          </div>
          <span className="text-[var(--fg-muted)] text-base">↓</span>
          <div className="flex gap-3 flex-wrap justify-center">
            <div className="glass px-4 py-2 rounded-xl text-xs font-semibold border-l-2 border-[#4f42df]">Vercel Deploy</div>
            <span className="text-[var(--fg-muted)] self-center text-xs">+</span>
            <div className="glass px-4 py-2 rounded-xl text-xs font-semibold border-l-2 border-[#8b5cf6]">ECS Deploy</div>
          </div>
          <span className="text-[var(--fg-muted)] text-base">↓</span>
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="glass px-3 py-1.5 rounded-lg text-[11px] font-semibold">RDS PG</span>
            <span className="glass px-3 py-1.5 rounded-lg text-[11px] font-semibold">ElastiCache</span>
            <span className="glass px-3 py-1.5 rounded-lg text-[11px] font-semibold">DocumentDB</span>
            <span className="glass px-3 py-1.5 rounded-lg text-[11px] font-semibold">WAF + DNS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
