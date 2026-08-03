import Link from "next/link";

const features = [
  { icon: "⚡", title: "Notifications", desc: "Multi-channel messaging with BullMQ queue, retry logic, and dead letter queue", href: "/notifications" },
  { icon: "💬", title: "Real-time Chat", desc: "WebSocket rooms, DMs, typing indicators, online presence", href: "/chat" },
  { icon: "💳", title: "Payments", desc: "Stripe checkout, webhooks, PDF invoices, idempotency", href: "/payments" },
  { icon: "🔗", title: "URL Shortener", desc: "Custom aliases, click tracking, expiring links", href: "/shorten" },
  { icon: "🔐", title: "Google OAuth", desc: "NextAuth.js with Google sign-in, JWT, RBAC", href: "/auth/login" },
  { icon: "🧠", title: "Vector DB", desc: "Semantic search, embeddings, tool calling agent", href: "/vector" },
  { icon: "🛡️", title: "Rate Limiter", desc: "Sliding window with Redis, per-endpoint config", href: "/rate-limits" },
  { icon: "☁️", title: "Docker + AWS", desc: "ECS Fargate, Terraform, Route53, WAF, CI/CD", href: "/infrastructure" },
];

const trendingPeople = [
  { name: "Alex Johnson", role: "Staff Engineer", avatar: "AJ", initials: "AJ", repo: "cloudstack/api-gateway", stars: "2.4k" },
  { name: "Sarah Chen", role: "Platform Lead", avatar: "SC", initials: "SC", repo: "cloudstack/notifications", stars: "1.8k" },
  { name: "Marcus Rivera", role: "DevOps Architect", avatar: "MR", initials: "MR", repo: "terraform-modules", stars: "3.1k" },
  { name: "Priya Patel", role: "AI/ML Engineer", avatar: "PP", initials: "PP", repo: "cloudstack/vector-db", stars: "2.9k" },
  { name: "David Kim", role: "Security Lead", avatar: "DK", initials: "DK", repo: "cloudstack/auth", stars: "1.5k" },
  { name: "Emma Wilson", role: "Frontend Lead", avatar: "EW", initials: "EW", repo: "cloudstack/web", stars: "2.2k" },
];

export default function Home() {
  return (
    <div className="animate-fade-in space-y-24 pb-16">
      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-16 sm:pt-28">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[1.08] mb-6 max-w-4xl">
          Infrastructure for
          <br />
          <span className="gradient-text">modern SaaS teams</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--fg-secondary)] max-w-xl mb-10 leading-relaxed font-medium">
          CloudStack ships with notifications, real-time chat, Stripe payments, URL shortener,
          Google OAuth, job queue, rate limiter, and vector DB — all wired together, one command.
        </p>
        <div className="flex gap-4">
          <Link href="/auth/login" className="btn-primary text-sm px-8 py-3">Start Building →</Link>
          <Link href="/dashboard" className="btn-secondary text-sm px-8 py-3">View Dashboard</Link>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] mb-3">Everything included</h2>
          <p className="text-sm text-[var(--fg-secondary)] font-medium">Eight production services, running in one command.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Link key={f.title} href={f.href} className="group glass-card p-6 text-left">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-sm mb-1 group-hover:text-[#4f42df] transition-colors">{f.title}</h3>
              <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending People */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] mb-1">Trending people</h2>
            <p className="text-sm text-[var(--fg-secondary)] font-medium">Top contributors building on CloudStack</p>
          </div>
          <Link href="/trending" className="text-sm font-semibold text-[#4f42df] hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingPeople.map((p) => (
            <div key={p.name} className="glass-card p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#4f42df]/20 to-[#8b5cf6]/20 flex items-center justify-center font-bold text-sm text-[#4f42df] shrink-0">
                {p.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm">{p.name}</h4>
                <p className="text-xs text-[var(--fg-secondary)] font-medium">{p.role}</p>
                <p className="text-[11px] text-[var(--fg-muted)] mt-0.5 font-mono truncate">{p.repo}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[var(--fg-secondary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                {p.stars}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <div className="glass p-12 sm:p-16 rounded-[var(--radius-xl)] max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] mb-3">Start building today</h2>
          <p className="text-sm text-[var(--fg-secondary)] font-medium mb-8 max-w-md mx-auto leading-relaxed">
            Start all 7 microservices and the frontend with one command. No Docker required.
            Deploy to Vercel and AWS when you're ready.
          </p>
          <Link href="/auth/login" className="btn-primary text-sm px-8 py-3">Get Started Free</Link>
        </div>
      </section>
    </div>
  );
}
