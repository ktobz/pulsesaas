"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const NOTIFY_URL = process.env.NEXT_PUBLIC_NOTIFY_URL || "http://localhost:4002";

interface Notification {
  id: string;
  userId: string;
  channel: string;
  template: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

const templates = [
  { id: "welcome", name: "Welcome Email", subject: "Welcome to PulseSaaS!", icon: "\uD83C\uDF1F" },
  { id: "invoice", name: "Invoice Ready", subject: "Your invoice is ready", icon: "\uD83D\uDCC4" },
  { id: "reset", name: "Password Reset", subject: "Reset your password", icon: "\uD83D\uDD10" },
  { id: "alert", name: "Security Alert", subject: "Security alert: new login", icon: "\uD83D\uDEA8" },
  { id: "reminder", name: "Reminder", subject: "Upcoming event reminder", icon: "\u23F0" },
  { id: "promo", name: "Promotional", subject: "Special offer for you", icon: "\uD83C\uDF89" },
];

const channels = [
  { id: "email", name: "Email", icon: "\u2709\uFE0F", color: "indigo" },
  { id: "sms", name: "SMS", icon: "\uD83D\uDCF1", color: "green" },
  { id: "push", name: "Push", icon: "\uD83D\uDD14", color: "purple" },
];

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeChannel, setComposeChannel] = useState("email");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    try {
      const res = await fetch(`${NOTIFY_URL}/notifications?userId=${session.user.email}`);
      const data = await res.json();
      if (data.success) setNotifications(data.data || []);
    } catch {}
    setLoading(false);
  }, [session?.user?.email]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading session...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x1F514;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to manage notifications</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Send and track email, SMS, and push notifications.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!composeSubject || !composeBody) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${NOTIFY_URL}/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.email,
          channel: composeChannel,
          template: activeTemplate || "default",
          subject: composeSubject,
          body: composeBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult({ type: "success", msg: "Notification queued!" });
        setComposeSubject("");
        setComposeBody("");
        setActiveTemplate(null);
        fetchNotifications();
        setTimeout(() => setSendResult(null), 4000);
      } else {
        setSendResult({ type: "error", msg: data.error || "Failed to send" });
      }
    } catch {
      setSendResult({ type: "error", msg: "Notification service not running. Start it with: pnpm run dev --filter=@saas/notification-service" });
    }
    setSending(false);
  }

  function applyTemplate(tpl: typeof templates[0]) {
    setActiveTemplate(tpl.id);
    setComposeSubject(tpl.subject);
    setComposeBody(`<h2>${tpl.name}</h2><p>Hello {{name}},</p><p>This is a sample ${tpl.name.toLowerCase()} notification.</p><p>Thank you for using PulseSaaS!</p>`);
  }

  const sent = notifications.filter((n) => n.status === "sent").length;
  const failed = notifications.filter((n) => n.status === "failed").length;
  const pending = notifications.filter((n) => n.status === "pending").length;
  const deliveryRate = notifications.length > 0 ? Math.round((sent / notifications.length) * 100) : 0;

  let filteredNotifications = notifications;
  if (filterChannel) filteredNotifications = filteredNotifications.filter((n) => n.channel === filterChannel);
  if (filterStatus) filteredNotifications = filteredNotifications.filter((n) => n.status === filterStatus);

  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const todayMsgs = filteredNotifications.filter((n) => new Date(n.createdAt).getTime() >= today);
  const yesterdayMsgs = filteredNotifications.filter((n) => {
    const t = new Date(n.createdAt).getTime();
    return t >= yesterday && t < today;
  });
  const olderMsgs = filteredNotifications.filter((n) => new Date(n.createdAt).getTime() < yesterday);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Compose, send, and track multi-channel notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="glow-dot glow-dot-active" />
          <span className="text-xs text-[var(--fg-secondary)]">Live updates every 8s</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl animate-in">
          <div className="stat-label">Total Sent</div>
          <div className="stat-value text-emerald-400">{sent.toLocaleString()}</div>
        </div>
        <div className="glass p-5 rounded-2xl animate-in" style={{ animationDelay: "0.1s" }}>
          <div className="stat-label">Delivery Rate</div>
          <div className="stat-value text-indigo-400">{deliveryRate}%</div>
        </div>
        <div className="glass p-5 rounded-2xl animate-in" style={{ animationDelay: "0.2s" }}>
          <div className="stat-label">Pending</div>
          <div className="stat-value text-amber-400">{pending}</div>
        </div>
        <div className="glass p-5 rounded-2xl animate-in" style={{ animationDelay: "0.3s" }}>
          <div className="stat-label">Failed</div>
          <div className="stat-value text-red-400">{failed}</div>
        </div>
      </div>

      {/* Template gallery */}
      <div className="glass p-6 animate-in" style={{ animationDelay: "0.15s" }}>
        <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
          Templates
        </h3>
        <div className="flex flex-wrap gap-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTemplate === tpl.id
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                  : "glass hover:border-brand-500/40 text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
              }`}
            >
              <span className="text-base">{tpl.icon}</span>
              {tpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6 animate-in" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
              Compose
            </h3>

            {sendResult && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-medium ${
                  sendResult.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {sendResult.msg}
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-2">
                  Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setComposeChannel(ch.id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        composeChannel === ch.id
                          ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                          : "glass hover:border-brand-500/40 text-[var(--fg-secondary)]"
                      }`}
                    >
                      <span>{ch.icon}</span> {ch.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-2">
                  Subject
                </label>
                <input
                  className="input-glass"
                  placeholder="Enter notification subject..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-2">
                  Body (HTML)
                </label>
                <textarea
                  className="input-glass min-h-[120px] resize-y font-mono text-xs"
                  placeholder="<p>Write your notification body...</p>"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send Notification
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Channel breakdown */}
          <div className="glass p-6 animate-in" style={{ animationDelay: "0.25s" }}>
            <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-4">
              By Channel
            </h3>
            <div className="space-y-3">
              {channels.map((ch) => {
                const count = notifications.filter((n) => n.channel === ch.id).length;
                const pct = notifications.length > 0 ? Math.round((count / notifications.length) * 100) : 0;
                return (
                  <div key={ch.id} className="flex items-center gap-3">
                    <span className="text-sm w-6">{ch.icon}</span>
                    <span className="text-xs text-[var(--fg-secondary)] w-16">{ch.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-high overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--fg-muted)] font-mono w-10 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* History panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filters */}
          <div className="glass p-4 flex flex-wrap items-center gap-3 animate-in" style={{ animationDelay: "0.2s" }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              Filter:
            </span>
            {[
              { id: null, label: "All" },
              { id: "email", label: "Email" },
              { id: "sms", label: "SMS" },
              { id: "push", label: "Push" },
            ].map((f) => (
              <button
                key={String(f.id)}
                onClick={() => setFilterChannel(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterChannel === f.id
                    ? "bg-brand-600 text-white"
                    : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-surface-mid"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="w-px h-5 bg-[var(--border-subtle)]" />
            {[
              { id: null, label: "All" },
              { id: "sent", label: "Sent" },
              { id: "pending", label: "Pending" },
              { id: "failed", label: "Failed" },
            ].map((f) => (
              <button
                key={String(f.id)}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === f.id
                    ? "bg-brand-600 text-white"
                    : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-surface-mid"
                }`}
              >
                {f.label}
              </button>
            ))}
            {(filterChannel || filterStatus) && (
              <button
                onClick={() => { setFilterChannel(null); setFilterStatus(null); }}
                className="ml-auto text-[10px] font-semibold text-brand-400 hover:text-brand-300"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* History feed */}
          <div className="glass p-6 animate-in" style={{ animationDelay: "0.25s" }}>
            <h3 className="text-sm font-semibold text-[var(--fg-secondary)] uppercase tracking-wider mb-6">
              History
            </h3>

            {loading && filteredNotifications.length === 0 ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="shimmer rounded-xl h-16" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">&#x1F4ED;</div>
                <p className="text-sm text-[var(--fg-secondary)]">No notifications yet</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">Send your first notification using the compose panel</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[{ label: "Today", items: todayMsgs }, { label: "Yesterday", items: yesterdayMsgs }, { label: "Older", items: olderMsgs }]
                  .filter((g) => g.items.length > 0)
                  .map((group) => (
                    <div key={group.label}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3 sticky top-0 z-10 bg-surface-base/90 backdrop-blur-sm py-1">
                        {group.label}
                      </div>
                      <div className="space-y-2">
                        {group.items.map((n) => (
                          <div
                            key={n.id}
                            className="flex items-start gap-4 p-4 rounded-xl hover:bg-surface-mid/50 transition border border-transparent hover:border-[var(--border-subtle)]"
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                                n.channel === "email"
                                  ? "bg-indigo-500/10"
                                  : n.channel === "sms"
                                  ? "bg-emerald-500/10"
                                  : "bg-purple-500/10"
                              }`}
                            >
                              {n.channel === "email" ? "\u2709\uFE0F" : n.channel === "sms" ? "\uD83D\uDCF1" : "\uD83D\uDD14"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">{n.subject}</span>
                                <span
                                  className={`badge ${
                                    n.status === "sent"
                                      ? "badge-success"
                                      : n.status === "failed"
                                      ? "badge-danger"
                                      : "badge-warning"
                                  }`}
                                >
                                  {n.status}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--fg-muted)] mt-1 line-clamp-1">
                                {n.body.replace(/<[^>]*>/g, "").slice(0, 100)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] text-[var(--fg-muted)]">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              {n.sentAt && (
                                <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">
                                  sent {Math.round((new Date(n.sentAt).getTime() - new Date(n.createdAt).getTime()) / 1000)}s
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
