"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

const services = [
  { name: "Next.js Web App", url: "http://localhost:3000", port: 3000, env: "Vercel (production)", status: "operational" },
  { name: "Auth Service", url: "http://localhost:4001", port: 4001, env: "AWS ECS Fargate", status: "operational" },
  { name: "Notification Service", url: "http://localhost:4002", port: 4002, env: "AWS ECS Fargate", status: "pending" },
  { name: "Chat Service", url: "http://localhost:4003", port: 4003, env: "AWS ECS Fargate", status: "pending" },
  { name: "Payment Service", url: "http://localhost:4004", port: 4004, env: "AWS ECS Fargate", status: "pending" },
  { name: "URL Shortener", url: "http://localhost:4005", port: 4005, env: "AWS ECS Fargate", status: "pending" },
  { name: "Vector Service", url: "http://localhost:4006", port: 4006, env: "AWS ECS Fargate", status: "pending" },
  { name: "Job Worker", url: "n/a", port: null, env: "AWS ECS Fargate", status: "pending" },
];

const infraItems = [
  { layer: "DNS & CDN", tech: "Route53 + CloudFront", desc: "Global DNS routing with CDN edge caching" },
  { layer: "Frontend Hosting", tech: "Vercel", desc: "Automatic deployments from GitHub main branch" },
  { layer: "Load Balancer", tech: "AWS ALB", desc: "Application Load Balancer with SSL termination" },
  { layer: "WAF / Firewall", tech: "AWS WAF + Security Groups", desc: "SQL injection, XSS, rate limiting, port scan protection" },
  { layer: "Compute", tech: "AWS ECS Fargate", desc: "Serverless container orchestration (7 services)" },
  { layer: "PostgreSQL", tech: "AWS RDS Multi-AZ", desc: "Primary database with automated backups" },
  { layer: "Redis", tech: "AWS ElastiCache", desc: "In-memory cache, sessions, rate limiting, job queue" },
  { layer: "MongoDB", tech: "AWS DocumentDB", desc: "Chat message persistence and audit logs" },
  { layer: "CI/CD", tech: "GitHub Actions + ECR", desc: "Lint → Test → Build → Push ECR → Deploy ECS" },
  { layer: "IaC", tech: "Terraform", desc: "Infrastructure as Code, all AWS resources declared" },
  { layer: "Secrets", tech: "AWS Secrets Manager", desc: "Encrypted secrets for DB creds, API keys, tokens" },
  { layer: "Monitoring", tech: "CloudWatch + ECS Insights", desc: "Logs, metrics, container health dashboards" },
];

export default function InfrastructurePage() {
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
          <div className="text-5xl mb-4">&#x1F6E0;&#xFE0F;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to view infrastructure</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Monitor service health and deployment architecture.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="page-title">Infrastructure</h1>
        <p className="page-subtitle">Docker, GitHub Actions, Vercel + AWS ECS, Terraform, WAF, Route53</p>
      </div>

      {/* Service Health */}
      <div className="glass p-6">
        <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
          Service Health
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-subtle)]">
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">Port</th>
                <th className="pb-3 font-semibold hidden sm:table-cell">Production Env</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.name} className="border-b border-[var(--border-subtle)] hover:bg-surface-mid/30">
                  <td className="py-3 font-semibold text-xs">{s.name}</td>
                  <td className="py-3 font-mono text-xs text-[var(--fg-secondary)]">{s.port ?? "—"}</td>
                  <td className="py-3 text-xs text-[var(--fg-secondary)] hidden sm:table-cell">{s.env}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <span className={`glow-dot ${s.status === "operational" ? "glow-dot-active" : "glow-dot-inactive"}`} />
                      <span className="text-xs capitalize">{s.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture layers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {infraItems.map((item) => (
          <div key={item.layer} className="glass p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{item.layer}</p>
            <p className="font-bold text-sm mt-1">{item.tech}</p>
            <p className="text-xs text-[var(--fg-secondary)] mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Deployment diagram */}
      <div className="glass p-8 text-center">
        <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-6">
          Deployment Flow
        </h3>
        <div className="flex flex-col items-center gap-3">
          <div className="px-5 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs font-mono text-brand-400">
            GitHub Push → main
          </div>
          <span className="text-[var(--fg-muted)] text-lg">&#x2193;</span>
          <div className="flex gap-4 flex-wrap justify-center">
            <div className="glass px-4 py-2 rounded-lg text-xs">
              <span className="text-emerald-400 font-semibold">GH Actions</span>
              <p className="text-[var(--fg-muted)] mt-0.5">Lint / Test / Build</p>
            </div>
            <div className="glass px-4 py-2 rounded-lg text-xs">
              <span className="text-amber-400 font-semibold">Docker Build</span>
              <p className="text-[var(--fg-muted)] mt-0.5">Push to ECR</p>
            </div>
          </div>
          <span className="text-[var(--fg-muted)] text-lg">&#x2193;</span>
          <div className="flex gap-4 flex-wrap justify-center">
            <div className="glass px-4 py-2 rounded-lg text-xs border border-slate-500/30">
              <span className="text-slate-400 font-semibold">Vercel</span>
              <p className="text-[var(--fg-muted)] mt-0.5">myapp.com</p>
            </div>
            <span className="text-[var(--fg-muted)] self-center">+</span>
            <div className="glass px-4 py-2 rounded-lg text-xs border border-indigo-500/30">
              <span className="text-indigo-400 font-semibold">AWS ECS Fargate</span>
              <p className="text-[var(--fg-muted)] mt-0.5">api.myapp.com</p>
            </div>
          </div>
          <span className="text-[var(--fg-muted)] text-lg">&#x2193;</span>
          <div className="flex gap-3 flex-wrap justify-center">
            <div className="glass px-3 py-1.5 rounded-lg text-[10px] bg-brand-500/5">RDS PostgreSQL</div>
            <div className="glass px-3 py-1.5 rounded-lg text-[10px] bg-brand-500/5">ElastiCache Redis</div>
            <div className="glass px-3 py-1.5 rounded-lg text-[10px] bg-brand-500/5">DocumentDB MongoDB</div>
            <div className="glass px-3 py-1.5 rounded-lg text-[10px] bg-brand-500/5">WAF + Route53</div>
          </div>
        </div>
      </div>
    </div>
  );
}
