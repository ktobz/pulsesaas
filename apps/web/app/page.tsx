import Link from "next/link";

const features = [
  { icon: "⚡", title: "Notifications", desc: "Multi-channel messaging with BullMQ job queue, retry logic, and dead letter queue", href: "/notifications", ring: "ring-indigo-500/20" },
  { icon: "💬", title: "Real-time Chat", desc: "WebSocket rooms, DMs, typing indicators, and online presence via Socket.io", href: "/chat", ring: "ring-emerald-500/20" },
  { icon: "💳", title: "Payments", desc: "Stripe checkout, webhooks, PDF invoices, and idempotency key support", href: "/payments", ring: "ring-amber-500/20" },
  { icon: "🔗", title: "URL Shortener", desc: "Custom aliases, geo-aware click tracking, and expiring links", href: "/shorten", ring: "ring-rose-500/20" },
  { icon: "🔐", title: "Google OAuth", desc: "NextAuth.js with Google sign-in, JWT sessions, and RBAC guards", href: "/auth/login", ring: "ring-cyan-500/20" },
  { icon: "🧠", title: "Vector DB", desc: "Semantic search, OpenAI embeddings, and AI tool calling agent", href: "/vector", ring: "ring-purple-500/20" },
  { icon: "🛡️", title: "Rate Limiting", desc: "Sliding window algorithm with Redis, configurable per-endpoint", href: "/rate-limits", ring: "ring-yellow-500/20" },
  { icon: "☁️", title: "Infrastructure", desc: "Docker, GitHub Actions, Vercel + AWS ECS, Terraform, WAF, DNS", href: "/infrastructure", ring: "ring-slate-500/20" },
];

const stats = [
  { value: "7", label: "Microservices" },
  { value: "8", label: "Endpoints" },
  { value: "99.9%", label: "Uptime target" },
  { value: "0ms", label: "Cold start" },
];

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-16 pb-10 sm:pt-24 sm:pb-16">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6 max-w-4xl">
          Build production SaaS
          <br />
          <span className="gradient-text">without the boilerplate</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--fg-secondary)] max-w-xl mb-10 leading-relaxed">
          PulseSaaS ships with notification service, real-time chat, Stripe payments, URL
          shortener, Google OAuth, job queue, rate limiter, and vector DB — all wired together,
          all running in one command.
        </p>
        <div className="flex gap-4 mb-16">
          <Link href="/auth/login" className="btn-primary text-sm px-8 py-3">
            Start Building
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </Link>
          <Link href="/dashboard" className="btn-secondary text-sm px-8 py-3">
            Live Demo
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-2xl">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">{s.value}</div>
              <div className="text-xs text-[var(--fg-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">Everything you need</h2>
          <p className="text-sm text-[var(--fg-secondary)]">Eight production-grade services, one command.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className={`group glass-card p-5 text-left ring-1 ${f.ring} transition-all duration-300`}
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-brand-600 transition-colors">
                {f.title}
              </h3>
              <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pb-20">
        <div className="glass p-10 sm:p-16 rounded-3xl max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            One command to production
          </h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-8 max-w-md mx-auto">
            Start all 7 microservices and the frontend with a single command. No Docker
            required. Add your API keys and deploy to Vercel + AWS.
          </p>
          <div className="flex justify-center">
            <Link href="/auth/login" className="btn-primary text-sm px-8 py-3">
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
