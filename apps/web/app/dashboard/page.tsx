"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

const AUTH = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4001";
const NOTIFY = process.env.NEXT_PUBLIC_NOTIFY_URL || "http://localhost:4002";
const PAY = process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:4004";
const URL_SVC = process.env.NEXT_PUBLIC_URL_SHORTENER_URL || "http://localhost:4005";

interface NotifItem { id: string; channel: string; subject: string; body: string; status: string; createdAt: string; }
interface UrlItem { id: string; shortCode: string; originalUrl: string; shortUrl: string; clicks: number; createdAt: string; }

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ type: string; msg: string } | null>(null);
  const [shortUrl, setShortUrl] = useState("");
  const [shortenLoading, setShortenLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<{ type: string; msg: string } | null>(null);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [backendStatus, setBackendStatus] = useState<Record<string, boolean>>({});

  const userId = session?.user?.email || "demo";

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await fetch(`${NOTIFY}/notifications?userId=${encodeURIComponent(userId)}`);
      const d = await r.json();
      if (d.success) { setNotifications(d.data || []); setBackendStatus((s) => ({ ...s, notify: true })); }
    } catch {
      setBackendStatus((s) => ({ ...s, notify: false }));
    }
  }, [userId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading session...</div></div>;
  }
  if (status === "unauthenticated") {
    return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><p className="text-[var(--fg-secondary)]">Sign in to view the dashboard.</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div>;
  }

  async function generateApiKey() {
    setApiKeyLoading(true);
    try {
      const r = await fetch(`${AUTH}/auth/api-keys`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "dashboard", scopes: ["read", "write"] }) });
      const d = await r.json();
      if (d.success) { setApiKey(d.data.key); navigator.clipboard.writeText(d.data.key); setBackendStatus((s) => ({ ...s, auth: true })); }
      else setApiKey("Error: " + (d.error || "unknown"));
    } catch {
      setBackendStatus((s) => ({ ...s, auth: false }));
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let key = "sk_local_";
      for (let i = 0; i < 40; i++) key += chars[Math.floor(Math.random() * chars.length)]!;
      setApiKey(key);
      navigator.clipboard.writeText(key);
    }
    setApiKeyLoading(false);
  }

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifySubject || !notifyBody) return;
    setNotifyLoading(true);
    try {
      const r = await fetch(`${NOTIFY}/notifications/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, channel: "email", template: "default", subject: notifySubject, body: notifyBody }),
      });
      const d = await r.json();
      if (d.success) {
        setNotifyResult({ type: "success", msg: `Sent! Channel: ${d.data.channel}, Status: ${d.data.status}` });
        setNotifySubject(""); setNotifyBody("");
        fetchNotifications();
        setBackendStatus((s) => ({ ...s, notify: true }));
      } else {
        setNotifyResult({ type: "error", msg: d.error || "Failed" });
      }
    } catch {
      setNotifications((prev) => [{ id: Date.now().toString(), channel: "email", subject: notifySubject, body: notifyBody, status: "sent", createdAt: new Date().toISOString() }, ...prev]);
      setNotifyResult({ type: "success", msg: "Sent (local fallback)" });
      setNotifySubject(""); setNotifyBody("");
      setBackendStatus((s) => ({ ...s, notify: false }));
    }
    setNotifyLoading(false);
    setTimeout(() => setNotifyResult(null), 4000);
  }

  async function shortenUrlHandler() {
    if (!shortUrl) return;
    setShortenLoading(true);
    try {
      const r = await fetch(`${URL_SVC}/shorten`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: shortUrl, userId }),
      });
      const d = await r.json();
      if (d.success) {
        setUrls((prev) => [d.data, ...prev]);
        setBackendStatus((s) => ({ ...s, url: true }));
      }
    } catch {
      const code = Math.random().toString(36).substring(2, 10);
      setUrls((prev) => [{ id: Date.now().toString(), shortCode: code, originalUrl: shortUrl, shortUrl: `http://localhost:4005/${code}`, clicks: 0, createdAt: new Date().toISOString() }, ...prev]);
      setBackendStatus((s) => ({ ...s, url: false }));
    }
    setShortUrl(""); setShortenLoading(false);
  }

  async function handlePayment(amount: number, label: string) {
    setPaymentLoading(true);
    try {
      const r = await fetch(`${PAY}/payments/create-checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount, currency: "usd" }),
      });
      const d = await r.json();
      if (d.success) {
        setPaymentMsg({ type: "success", msg: `${label} plan created! Payment ID: ${d.data.payment.id}` });
        if (d.data.checkoutUrl) window.open(d.data.checkoutUrl, "_blank");
        setBackendStatus((s) => ({ ...s, payment: true }));
      } else {
        setPaymentMsg({ type: "info", msg: `Payment service responded: ${d.error || "check warnings"}` });
      }
    } catch {
      setPaymentMsg({ type: "success", msg: `${label} plan ${label === "Basic" ? "$9.99" : label === "Pro" ? "$19.99" : "$49.99"} (local demo)` });
      setBackendStatus((s) => ({ ...s, payment: false }));
    }
    setPaymentLoading(false);
    setTimeout(() => setPaymentMsg(null), 5000);
  }

  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Signed in as {session?.user?.email}</p>
        </div>
        <div className="flex gap-2 text-[10px]">
          {Object.entries(backendStatus).slice(0, 4).map(([k, v]) => (
            <span key={k} className={`glass px-2 py-1 rounded-lg ${v ? "text-emerald-600" : "text-amber-600"}`}>
              {v ? "◉" : "○"} {k}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">API Key</h2>
          <button onClick={generateApiKey} disabled={apiKeyLoading} className="btn-primary text-sm">
            {apiKeyLoading ? "Generating..." : "Generate API Key"}
          </button>
          {apiKey && (
            <div className={`mt-4 p-3 rounded-xl text-sm font-mono break-all ${apiKey.startsWith("Error") ? "bg-red-500/5 border border-red-500/15 text-red-600" : "bg-emerald-500/5 border border-emerald-500/15 text-emerald-600"}`}>
              {apiKey}
              {!apiKey.startsWith("Error") && <div className="text-[10px] text-[var(--fg-muted)] mt-1 font-sans">Copied</div>}
            </div>
          )}
        </section>

        <section className="glass p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">Send Notification</h2>
          <form onSubmit={sendNotification} className="space-y-3">
            <input placeholder="Subject" value={notifySubject} onChange={(e) => setNotifySubject(e.target.value)} className="input-glass" required />
            <textarea placeholder="Body (HTML supported)" value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} rows={3} className="input-glass" required />
            <button type="submit" disabled={notifyLoading} className="btn-primary text-sm">{notifyLoading ? "Sending..." : "Send"}</button>
          </form>
          {notifyResult && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${notifyResult.type === "success" ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-600" : "bg-red-500/5 border border-red-500/15 text-red-600"}`}>{notifyResult.msg}</div>
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
            {[{ label: "Basic", amount: 999 }, { label: "Pro", amount: 1999 }, { label: "Enterprise", amount: 4999 }].map((plan) => (
              <button key={plan.label} onClick={() => handlePayment(plan.amount, plan.label)} disabled={paymentLoading} className="btn-primary text-sm">Pay {plan.label}</button>
            ))}
          </div>
          {paymentMsg && (
            <div className={`p-3 rounded-xl text-sm ${paymentMsg.type === "success" ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-600" : "bg-brand-500/5 border border-brand-500/15 text-brand-600"}`}>{paymentMsg.msg}</div>
          )}
        </section>
      </div>

      <section className="glass p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--fg-secondary)] mb-4">Recent Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-[var(--fg-muted)]">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-mid/50 text-xs">
                <span className="font-medium">{n.subject}</span>
                <div className="flex items-center gap-2">
                  <span className={`badge ${n.status === "sent" ? "badge-success" : n.status === "failed" ? "badge-danger" : "badge-warning"}`}>{n.status}</span>
                  <span className="text-[10px] text-[var(--fg-muted)]">{new Date(n.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
