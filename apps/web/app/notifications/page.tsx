"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface Notification {
  id: string;
  channel: string;
  template: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
}

const templates = [
  { id: "welcome", name: "Welcome Email", subject: "Welcome to PulseSaaS!", icon: "\uD83C\uDF1F" },
  { id: "invoice", name: "Invoice Ready", subject: "Your invoice is ready", icon: "\uD83D\uDCC4" },
  { id: "reset", name: "Password Reset", subject: "Reset your password", icon: "\uD83D\uDD10" },
  { id: "alert", name: "Security Alert", subject: "New login detected", icon: "\uD83D\uDEA8" },
  { id: "reminder", name: "Reminder", subject: "Upcoming event", icon: "\u23F0" },
  { id: "promo", name: "Promotional", subject: "Special offer inside", icon: "\uD83C\uDF89" },
];

const channels = [
  { id: "email" as const, name: "Email", icon: "\u2709\uFE0F" },
  { id: "sms" as const, name: "SMS", icon: "\uD83D\uDCF1" },
  { id: "push" as const, name: "Push", icon: "\uD83D\uDD14" },
];

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [composeChannel, setComposeChannel] = useState("email");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("local_notifications_full");
      if (saved) setNotifications(JSON.parse(saved));
    } catch {}
  }, []);

  function persist(items: Notification[]) {
    setNotifications(items);
    localStorage.setItem("local_notifications_full", JSON.stringify(items));
  }

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="glass p-10 text-center">
          <div className="text-5xl mb-4">&#x1F514;</div>
          <h2 className="text-xl font-bold mb-2">Sign in to manage notifications</h2>
          <p className="text-sm text-[var(--fg-secondary)] mb-6">Send and track multi-channel notifications.</p>
          <Link href="/auth/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!composeSubject || !composeBody) return;
    setSending(true);
    setSendResult(null);
    const notif: Notification = {
      id: Date.now().toString(),
      channel: composeChannel,
      template: activeTemplate || "custom",
      subject: composeSubject,
      body: composeBody,
      status: "sent",
      createdAt: new Date().toISOString(),
    };
    persist([notif, ...notifications]);
    setSendResult({ type: "success", msg: "Notification sent! (local mode)" });
    setComposeSubject("");
    setComposeBody("");
    setActiveTemplate(null);
    setSending(false);
    setTimeout(() => setSendResult(null), 4000);
  }

  function applyTemplate(tpl: typeof templates[0]) {
    setActiveTemplate(tpl.id);
    setComposeSubject(tpl.subject);
    setComposeBody(`<h2>${tpl.name}</h2><p>Hello,</p><p>This is your ${tpl.name.toLowerCase()} notification from PulseSaaS.</p>`);
  }

  const sent = notifications.filter((n) => n.status === "sent").length;
  const failed = notifications.filter((n) => n.status === "failed").length;
  const deliveryRate = notifications.length > 0 ? Math.round((sent / notifications.length) * 100) : 100;

  let filtered = notifications;
  if (filterChannel) filtered = filtered.filter((n) => n.channel === filterChannel);
  if (filterStatus) filtered = filtered.filter((n) => n.status === filterStatus);

  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 86400000;
  const td = filtered.filter((n) => new Date(n.createdAt).getTime() >= today);
  const yd = filtered.filter((n) => new Date(n.createdAt).getTime() >= yesterday && new Date(n.createdAt).getTime() < today);
  const od = filtered.filter((n) => new Date(n.createdAt).getTime() < yesterday);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Compose and track multi-channel notifications (local mode)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl"><div className="stat-label">Sent</div><div className="stat-value text-emerald-500">{sent}</div></div>
        <div className="glass p-5 rounded-2xl"><div className="stat-label">Delivery Rate</div><div className="stat-value text-brand-500">{deliveryRate}%</div></div>
        <div className="glass p-5 rounded-2xl"><div className="stat-label">Pending</div><div className="stat-value text-amber-500">0</div></div>
        <div className="glass p-5 rounded-2xl"><div className="stat-label">Failed</div><div className="stat-value text-red-500">{failed}</div></div>
      </div>

      <div className="glass p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-secondary)] mb-3">Templates</h3>
        <div className="flex flex-wrap gap-2">
          {templates.map((tpl) => (
            <button key={tpl.id} onClick={() => applyTemplate(tpl)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTemplate === tpl.id ? "bg-brand-600 text-white" : "glass hover:border-brand-500/40"
              }`}>
              <span className="text-base">{tpl.icon}</span> {tpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-secondary)] mb-4">Compose</h3>
            {sendResult && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-medium ${sendResult.type === "success" ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-600" : "bg-red-500/5 border border-red-500/15 text-red-600"}`}>
                {sendResult.msg}
              </div>
            )}
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-2">Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {channels.map((ch) => (
                    <button key={ch.id} type="button" onClick={() => setComposeChannel(ch.id)}
                      className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        composeChannel === ch.id ? "bg-brand-600 text-white" : "glass hover:border-brand-500/40"
                      }`}>
                      <span>{ch.icon}</span> {ch.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-2">Subject</label>
                <input className="input-glass" placeholder="Notification subject..." value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} required />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-2">Body (HTML)</label>
                <textarea className="input-glass min-h-[100px] resize-y text-xs" placeholder="Notification body..." value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={4} required />
              </div>
              <button type="submit" disabled={sending} className="btn-primary w-full justify-center text-sm">
                {sending ? "Sending..." : "Send Notification"}
              </button>
            </form>
          </div>

          <div className="glass p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-secondary)] mb-4">By Channel</h3>
            <div className="space-y-3">
              {channels.map((ch) => {
                const count = notifications.filter((n) => n.channel === ch.id).length;
                const pct = notifications.length > 0 ? Math.round((count / notifications.length) * 100) : 0;
                return (
                  <div key={ch.id} className="flex items-center gap-3">
                    <span className="text-sm w-6">{ch.icon}</span>
                    <span className="text-xs text-[var(--fg-secondary)] w-12">{ch.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-mid overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[var(--fg-muted)] font-mono">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="glass p-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase text-[var(--fg-muted)]">Filter:</span>
            {[{ id: null, label: "All" }, { id: "email", label: "Email" }, { id: "sms", label: "SMS" }, { id: "push", label: "Push" }].map((f) => (
              <button key={String(f.id)} onClick={() => setFilterChannel(f.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${filterChannel === f.id ? "bg-brand-600 text-white" : "text-[var(--fg-secondary)] hover:bg-surface-mid"}`}>{f.label}</button>
            ))}
            <span className="w-px h-4 bg-[var(--border-subtle)]" />
            {[{ id: null, label: "All" }, { id: "sent", label: "Sent" }, { id: "pending", label: "Pending" }, { id: "failed", label: "Failed" }].map((f) => (
              <button key={String(f.id)} onClick={() => setFilterStatus(f.id)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${filterStatus === f.id ? "bg-brand-600 text-white" : "text-[var(--fg-secondary)] hover:bg-surface-mid"}`}>{f.label}</button>
            ))}
            {(filterChannel || filterStatus) && (
              <button onClick={() => { setFilterChannel(null); setFilterStatus(null); }} className="ml-auto text-[10px] font-semibold text-brand-500">Clear</button>
            )}
          </div>

          <div className="glass p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-secondary)] mb-6">History</h3>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">&#x1F4ED;</div>
                <p className="text-sm text-[var(--fg-secondary)]">No notifications yet</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1">Send one using the compose panel</p>
              </div>
            ) : (
              <div className="space-y-6">
                {[{ label: "Today", items: td }, { label: "Yesterday", items: yd }, { label: "Older", items: od }].filter((g) => g.items.length > 0).map((group) => (
                  <div key={group.label}>
                    <div className="text-[10px] font-semibold uppercase text-[var(--fg-muted)] mb-3">{group.label}</div>
                    <div className="space-y-2">
                      {group.items.map((n) => (
                        <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-mid/50 transition border border-transparent hover:border-[var(--border-subtle)]">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${n.channel === "email" ? "bg-indigo-500/10" : n.channel === "sms" ? "bg-emerald-500/10" : "bg-purple-500/10"}`}>
                            {n.channel === "email" ? "\u2709\uFE0F" : n.channel === "sms" ? "\uD83D\uDCF1" : "\uD83D\uDD14"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs truncate">{n.subject}</span>
                              <span className={`badge ${n.status === "sent" ? "badge-success" : n.status === "failed" ? "badge-danger" : "badge-warning"}`}>{n.status}</span>
                            </div>
                            <p className="text-[10px] text-[var(--fg-muted)] mt-0.5 line-clamp-1">{n.body.replace(/<[^>]*>/g, "").slice(0, 80)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-[var(--fg-muted)]">{new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
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
