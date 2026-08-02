import Link from "next/link";

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
        <path d="M22 12h-6l-2 3H10l-2-3H2" />
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
      </svg>
    ),
    title: "Notifications",
    desc: "Email, SMS, push via Resend & Twilio. BullMQ job queue with retries and dead letter queue.",
    href: "/notifications",
    gradient: "from-indigo-500/20 to-purple-500/10",
    border: "hover:border-indigo-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    ),
    title: "Real-time Chat",
    desc: "Socket.io with MongoDB persistence, rooms, typing indicators, and online presence.",
    href: "/chat",
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "hover:border-emerald-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: "Payments",
    desc: "Stripe checkout sessions, webhooks, subscription plans, and invoice management.",
    href: "/payments",
    gradient: "from-amber-500/20 to-yellow-500/10",
    border: "hover:border-amber-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: "URL Shortener",
    desc: "Custom aliases, click analytics, expiring links, and copy-to-clipboard.",
    href: "/shorten",
    gradient: "from-rose-500/20 to-red-500/10",
    border: "hover:border-rose-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: "Google Auth",
    desc: "NextAuth.js with Google OAuth 2.0, JWT sessions stored in Redis, and RBAC middleware.",
    href: "/auth/login",
    gradient: "from-cyan-500/20 to-sky-500/10",
    border: "hover:border-cyan-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    title: "Vector DB",
    desc: "OpenAI embeddings, Pinecone/pgvector semantic search, and AI tool calling agent.",
    href: "/vector",
    gradient: "from-purple-500/20 to-pink-500/10",
    border: "hover:border-purple-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Rate Limiter",
    desc: "Redis sliding window algorithm with configurable limits per endpoint and IP.",
    href: "/rate-limits",
    gradient: "from-yellow-500/20 to-amber-500/10",
    border: "hover:border-yellow-500/40",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <rect x="2" y="2" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" />
        <circle cx="7" cy="6" r="1" fill="#94a3b8" />
        <circle cx="7" cy="18" r="1" fill="#94a3b8" />
      </svg>
    ),
    title: "Infrastructure",
    desc: "Docker, GitHub Actions CI/CD, Vercel + AWS ECS, Terraform, WAF, Route53 DNS.",
    href: "/infrastructure",
    gradient: "from-slate-500/20 to-gray-500/10",
    border: "hover:border-slate-500/40",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center animate-fade-in">
      <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-[var(--fg-secondary)]">
        <span className="glow-dot glow-dot-active" />
        All systems operational &middot; v1.0.0
      </div>

      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-tight">
        <span className="gradient-text">Pulse</span>SaaS
      </h1>

      <p className="text-lg sm:text-xl text-[var(--fg-secondary)] max-w-2xl mb-10 leading-relaxed">
        A production-ready SaaS platform with notification service, real-time chat, Stripe
        payments, URL shortener, Google OAuth, job queue, rate limiter, and vector database tool
        calling — all deployed to Vercel + AWS with Docker.
      </p>

      <div className="flex gap-4 mb-20">
        <Link href="/auth/login" className="btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Get Started
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          View Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        {features.map((f) => (
          <Link
            key={f.title}
            href={f.href}
            className={`group relative glass-card p-6 text-left bg-gradient-to-br ${f.gradient} ${f.border} cursor-pointer`}
          >
            <div className="mb-4 p-2.5 w-fit rounded-xl bg-surface-high group-hover:scale-110 transition-transform">
              {f.icon}
            </div>
            <h3 className="font-semibold text-sm mb-1.5 group-hover:text-white transition-colors">
              {f.title}
            </h3>
            <p className="text-xs text-[var(--fg-secondary)] leading-relaxed group-hover:text-[var(--fg-primary)]/80 transition-colors">
              {f.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
