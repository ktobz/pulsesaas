"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface StoredUrl { id: string; shortCode: string; originalUrl: string; clicks: number; createdAt: string }
interface StoredNotification { id: string; subject: string; status: string; createdAt: string }

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState("");
  const [shortenLoading, setShortenLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [urls, setUrls] = useState<StoredUrl[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("local_notifications");
      if (saved) setNotifications(JSON.parse(saved));
    } catch {}
    try {
      const saved = localStorage.getItem("local_urls");
      if (saved) setUrls(JSON.parse(saved));
    } catch {}
  }, []);

  function persistNotifications(items: StoredNotification[]) {
    setNotifications(items);
    localStorage.setItem("local_notifications", JSON.stringify(items));
  }

  function persistUrls(items: StoredUrl[]) {
    setUrls(items);
    localStorage.setItem("local_urls", JSON.stringify(items));
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading session...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[var(--fg-secondary)]">Sign in to view the dashboard.</p>
        <Link href="/auth/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  function generateApiKey() {
    setApiKeyLoading(true);
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = "sk_";
    for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)]!;
    setApiKey(key);
    setApiKeyLoading(false);
    navigator.clipboard.writeText(key);
  }

  function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifySubject || !notifyBody) return;
    setNotifyLoading(true);
    const notif: StoredNotification = {
      id: Date.now().toString(),
      subject: notifySubject,
      status: "sent",
      createdAt: new Date().toISOString(),
    };
    persistNotifications([notif, ...notifications]);
    setNotifyResult("Notification sent successfully! (local mode)");
    setNotifySubject("");
    setNotifyBody("");
    setNotifyLoading(false);
    setTimeout(() => setNotifyResult(null), 3000);
  }

  function shortenUrlHandler() {
    if (!shortUrl) return;
    setShortenLoading(true);
    const code = Math.random().toString(36).substring(2, 10);
    const url: StoredUrl = {
      id: Date.now().toString(),
      shortCode: code,
      originalUrl: shortUrl,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };
    persistUrls([url, ...urls]);
    setShortUrl("");
    setShortenLoading(false);
  }

  function handlePayment(label: string) {
    setPaymentLoading(true);
    setPaymentMsg(`Opening Stripe checkout for ${label} plan (${
      label === "Basic" ? "9.99" : label === "Pro" ? "19.99" : "49.99"
    })...`);
    setTimeout(() => {
      setPaymentLoading(false);
      setPaymentMsg(`Payment for ${label} plan completed! (demo mode)`);
      setTimeout(() => setPaymentMsg(null), 4000);
    }, 1500);
  }

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Signed in as {session?.user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">API Key</h2>
          <button onClick={generateApiKey} disabled={apiKeyLoading} className="btn-primary text-sm">
            {apiKeyLoading ? "Generating..." : "Generate API Key"}
          </button>
          {apiKey && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-sm font-mono text-emerald-600 break-all">
              {apiKey}
              <div className="text-[10px] text-[var(--fg-muted)] mt-1 font-sans">Copied to clipboard</div>
            </div>
          )}
        </section>

        <section className="glass p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">Send Notification</h2>
          <form onSubmit={sendNotification} className="space-y-3">
            <input placeholder="Subject" value={notifySubject} onChange={(e) => setNotifySubject(e.target.value)} className="input-glass" required />
            <textarea placeholder="Body" value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} rows={3} className="input-glass" required />
            <button type="submit" disabled={notifyLoading} className="btn-primary text-sm">{notifyLoading ? "Sending..." : "Send"}</button>
          </form>
          {notifyResult && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-sm text-emerald-600">{notifyResult}</div>
          )}
        </section>

        <section className="glass p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">URL Shortener</h2>
          <div className="flex gap-2">
            <input placeholder="https://example.com/long-url" value={shortUrl} onChange={(e) => setShortUrl(e.target.value)} className="input-glass flex-1" />
            <button onClick={shortenUrlHandler} disabled={shortenLoading || !shortUrl} className="btn-primary text-sm shrink-0">Shorten</button>
          </div>
          {urls.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              {urls.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-mid/50">
                  <span className="font-mono text-brand-600">/{u.shortCode}</span>
                  <span className="text-[var(--fg-muted)] truncate max-w-[180px]">{u.originalUrl}</span>
                  <span className="text-[var(--fg-muted)]">{u.clicks} clicks</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">Stripe Payments</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {["Basic", "Pro", "Enterprise"].map((label) => (
              <button key={label} onClick={() => handlePayment(label)} disabled={paymentLoading} className="btn-primary text-sm">
                Pay {label}
              </button>
            ))}
          </div>
          {paymentMsg && (
            <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/15 text-sm text-brand-600">{paymentMsg}</div>
          )}
        </section>
      </div>

      <section className="glass p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">Recent Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No notifications yet. Send one above!</p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-mid/50 text-xs">
                <span>{n.subject}</span>
                <span className="badge badge-success">{n.status}</span>
                <span className="text-[var(--fg-muted)]">{new Date(n.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
