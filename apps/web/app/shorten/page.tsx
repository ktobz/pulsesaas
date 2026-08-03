"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

const URL_SVC = process.env.NEXT_PUBLIC_URL_SHORTENER_URL || "http://localhost:4005";

interface UrlItem { id: string; shortCode: string; originalUrl: string; shortUrl: string; clicks: number; createdAt: string; }

export default function ShortenPage() {
  const { data: session, status } = useSession();
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [result, setResult] = useState<{ shortUrl: string; shortCode: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeLookup, setCodeLookup] = useState("");
  const [stats, setStats] = useState<{ clicks: number; originalUrl?: string; createdAt?: string } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [urls, setUrls] = useState<UrlItem[]>([]);

  const userId = session?.user?.email || "demo";

  useEffect(() => {
    fetch(`${URL_SVC}/api/urls`).then((r) => r.json()).then((d) => d.success && setUrls(d.data || [])).catch(() => {});
  }, []);

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><p className="text-[var(--fg-secondary)]">Sign in to use the URL shortener.</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div>;

  async function handleShorten() {
    setError(""); setResult(null);
    if (!originalUrl) return;
    setLoading(true);
    try {
      const r = await fetch(`${URL_SVC}/shorten`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originalUrl, customCode: customCode || undefined, userId }) });
      const d = await r.json();
      if (d.success) { setResult(d.data); setOriginalUrl(""); setCustomCode(""); setUrls((prev) => [d.data, ...prev]); }
      else setError(d.error || "Failed");
    } catch { setError("URL shortener not running (port 4005)"); }
    setLoading(false);
  }

  async function lookupStats() {
    setStats(null); setError("");
    if (!codeLookup) return;
    setStatsLoading(true);
    try {
      const r = await fetch(`${URL_SVC}/api/urls/${codeLookup}/stats`);
      const d = await r.json();
      if (d.success) setStats(d.data);
      else setError(d.error || "Not found");
    } catch { setError("Service unavailable"); }
    setStatsLoading(false);
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-8">
      <div><h1 className="page-title">URL Shortener</h1><p className="page-subtitle">Shorten URLs with the URL service (port 4005)</p></div>

      <div className="glass p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)]">Create Short Link</h2>
        <input placeholder="https://example.com/very-long-url" value={originalUrl} onChange={(e) => setOriginalUrl(e.target.value)} className="input-glass" />
        <input placeholder="Custom code (optional)" value={customCode} onChange={(e) => setCustomCode(e.target.value)} className="input-glass" />
        <button onClick={handleShorten} disabled={loading || !originalUrl} className="btn-primary text-sm">{loading ? "Shortening..." : "Shorten URL"}</button>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        {result && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
            <p className="font-mono text-sm text-emerald-600 break-all">{result.shortUrl}</p>
            <div className="flex gap-2"><button onClick={() => copyToClipboard(result.shortUrl)} className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700">{copied ? "Copied!" : "Copy"}</button><span className="text-xs text-[var(--fg-muted)] self-center">Code: {result.shortCode}</span></div>
          </div>
        )}
      </div>

      <div className="glass p-6 space-y-4">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)]">Link Stats</h2>
        <div className="flex gap-2"><input placeholder="Short code (e.g. abc123)" value={codeLookup} onChange={(e) => setCodeLookup(e.target.value)} className="input-glass flex-1" /><button onClick={lookupStats} disabled={statsLoading || !codeLookup} className="btn-primary text-sm">Lookup</button></div>
        {stats && <div className="p-4 rounded-xl bg-surface-mid/50 space-y-1 text-xs"><p>Total clicks: <strong>{stats.clicks}</strong></p>{stats.originalUrl && <p className="text-[var(--fg-muted)] truncate">URL: {stats.originalUrl}</p>}</div>}
      </div>

      <div className="glass p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">All Links</h2>
        {urls.length === 0 ? <p className="text-sm text-[var(--fg-muted)]">No URLs yet.</p> : (
          <div className="space-y-2">
            {urls.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-mid/50 text-xs">
                <span className="font-mono text-brand-600">/{u.shortCode}</span>
                <span className="text-[var(--fg-muted)] truncate max-w-[280px]">{u.originalUrl}</span>
                <span className="text-[var(--fg-muted)]">{u.clicks} clicks</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
