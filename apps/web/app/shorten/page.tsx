"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const URL_URL = process.env.NEXT_PUBLIC_URL_SHORTENER_URL || "http://localhost:4005";

export default function ShortenPage() {
  const { data: session, status } = useSession();
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [result, setResult] = useState<{ shortUrl: string; shortCode: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ clicks: number; originalUrl?: string; createdAt?: string } | null>(null);
  const [codeLookup, setCodeLookup] = useState("");
  const [statsLoading, setStatsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--muted)]">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[var(--muted)]">Sign in to use the URL shortener.</p>
        <Link href="/auth/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Sign In
        </Link>
      </div>
    );
  }

  async function handleShorten() {
    setError("");
    setResult(null);
    if (!originalUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${URL_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl,
          customCode: customCode || undefined,
          userId: session?.user?.email || "demo",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setOriginalUrl("");
        setCustomCode("");
      } else {
        setError(data.error || "Failed to shorten URL");
      }
    } catch {
      setError("URL shortener service not running. Start it with: pnpm run dev --filter=@saas/url-shortener");
    }
    setLoading(false);
  }

  async function lookupStats() {
    setStats(null);
    setError("");
    if (!codeLookup) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`${URL_URL}/api/urls/${codeLookup}/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || "Not found");
      }
    } catch {
      setError("URL shortener service not running.");
    }
    setStatsLoading(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold">URL Shortener</h1>

      <div className="border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Create Short Link</h2>
        <input
          placeholder="https://example.com/very-long-url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          className="w-full border border-[var(--border)] rounded-lg px-4 py-2.5 bg-transparent"
        />
        <input
          placeholder="Custom code (optional)"
          value={customCode}
          onChange={(e) => setCustomCode(e.target.value)}
          className="w-full border border-[var(--border)] rounded-lg px-4 py-2.5 bg-transparent"
        />
        <button
          onClick={handleShorten}
          disabled={loading || !originalUrl}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Shortening..." : "Shorten URL"}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {result && (
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg space-y-2">
            <p className="font-mono text-green-700 dark:text-green-200 break-all">
              {result.shortUrl}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(result.shortUrl)}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <span className="text-sm text-[var(--muted)] self-center">
                Code: {result.shortCode}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg">Link Stats</h2>
        <div className="flex gap-2">
          <input
            placeholder="Short code (e.g. abc123)"
            value={codeLookup}
            onChange={(e) => setCodeLookup(e.target.value)}
            className="flex-1 border border-[var(--border)] rounded-lg px-4 py-2 bg-transparent"
          />
          <button
            onClick={lookupStats}
            disabled={statsLoading || !codeLookup}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {statsLoading ? "..." : "Lookup"}
          </button>
        </div>
        {stats && (
          <div className="p-4 border border-[var(--border)] rounded-lg space-y-1 text-sm">
            <p>Total clicks: <strong>{stats.clicks}</strong></p>
            {stats.originalUrl && <p className="text-[var(--muted)] truncate">URL: {stats.originalUrl}</p>}
            {stats.createdAt && <p className="text-[var(--muted)]">Created: {new Date(stats.createdAt).toLocaleDateString()}</p>}
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
}
