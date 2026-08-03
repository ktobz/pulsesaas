"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const trending = [
  { name: "Alex Johnson", role: "Staff Engineer", initials: "AJ", repo: "cloudstack/api-gateway", stars: "2.4k", commits: 847, color: "from-blue-500/30 to-indigo-500/30" },
  { name: "Sarah Chen", role: "Platform Lead", initials: "SC", repo: "cloudstack/notifications", stars: "1.8k", commits: 623, color: "from-purple-500/30 to-pink-500/30" },
  { name: "Marcus Rivera", role: "DevOps Architect", initials: "MR", repo: "terraform-modules", stars: "3.1k", commits: 1204, color: "from-amber-500/30 to-orange-500/30" },
  { name: "Priya Patel", role: "AI/ML Engineer", initials: "PP", repo: "cloudstack/vector-db", stars: "2.9k", commits: 956, color: "from-emerald-500/30 to-teal-500/30" },
  { name: "David Kim", role: "Security Lead", initials: "DK", repo: "cloudstack/auth", stars: "1.5k", commits: 412, color: "from-cyan-500/30 to-sky-500/30" },
  { name: "Emma Wilson", role: "Frontend Lead", initials: "EW", repo: "cloudstack/web", stars: "2.2k", commits: 789, color: "from-rose-500/30 to-red-500/30" },
  { name: "James Okonkwo", role: "Backend Lead", initials: "JO", repo: "cloudstack/chat-service", stars: "1.9k", commits: 534, color: "from-green-500/30 to-lime-500/30" },
  { name: "Lina Zhao", role: "Data Engineer", initials: "LZ", repo: "cloudstack/analytics", stars: "2.7k", commits: 678, color: "from-violet-500/30 to-fuchsia-500/30" },
  { name: "Tom Berenger", role: "SRE", initials: "TB", repo: "cloudstack/infra", stars: "1.3k", commits: 345, color: "from-slate-500/30 to-gray-500/30" },
  { name: "Aisha Mohammed", role: "Full Stack", initials: "AM", repo: "cloudstack/shorten", stars: "1.1k", commits: 289, color: "from-pink-500/30 to-rose-500/30" },
  { name: "Carlos Mendez", role: "Mobile Lead", initials: "CM", repo: "cloudstack/mobile", stars: "2.1k", commits: 567, color: "from-yellow-500/30 to-amber-500/30" },
  { name: "Nina Ivanova", role: "UX Engineer", initials: "NI", repo: "cloudstack/design-system", stars: "1.7k", commits: 445, color: "from-fuchsia-500/30 to-purple-500/30" },
];

const timeframes = ["Today", "This Week", "This Month", "All Time"];
const categories = ["All", "Engineers", "Designers", "Data", "DevOps"];

export default function TrendingPage() {
  const { data: session, status } = useSession();
  const [tf, setTf] = useState("This Week");
  const [cat, setCat] = useState("All");

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)] font-medium">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="glass p-10 text-center"><div className="text-5xl mb-4">🔥</div><h2 className="text-xl font-bold mb-2">Sign in to see trending</h2><p className="text-sm text-[var(--fg-secondary)] mb-6">Discover top contributors on CloudStack.</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div></div>;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Trending People</h1>
          <p className="page-subtitle">Top contributors building infrastructure for modern teams</p>
        </div>
        <div className="flex gap-2">
          {timeframes.map((t) => (
            <button key={t} onClick={() => setTf(t)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${tf === t ? "bg-[#4f42df] text-white" : "glass hover:border-[#4f42df]/40 text-[var(--fg-secondary)]"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${cat === c ? "bg-[#4f42df]/10 text-[#4f42df] border border-[#4f42df]/20" : "glass text-[var(--fg-secondary)] hover:border-[#4f42df]/30"}`}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trending.map((p, i) => (
          <div key={p.name} className="glass-card p-5 flex items-center gap-4 animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <span className="text-xs font-bold text-[var(--fg-muted)] w-5">#{i + 1}</span>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center font-bold text-sm text-[#4f42df] shrink-0`}>{p.initials}</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">{p.name}</h4>
              <p className="text-[11px] text-[var(--fg-secondary)] font-medium">{p.role}</p>
              <p className="text-[10px] text-[var(--fg-muted)] mt-0.5 font-mono truncate">{p.repo}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-xs font-bold text-[var(--fg-secondary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                {p.stars}
              </div>
              <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">{p.commits} commits</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
