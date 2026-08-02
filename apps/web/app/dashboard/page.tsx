"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4001";
const NOTIFY_URL = process.env.NEXT_PUBLIC_NOTIFY_URL || "http://localhost:4002";
const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:4004";
const URL_URL = process.env.NEXT_PUBLIC_URL_SHORTENER_URL || "http://localhost:4005";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<
    { id: string; subject: string; status: string; createdAt: string }[]
  >([]);
  const [urls, setUrls] = useState<
    { id: string; shortCode: string; originalUrl: string; clicks: number; createdAt: string }[]
  >([]);
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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[var(--muted)]">Loading session...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[var(--muted)]">You must be signed in to view this page.</p>
        <Link href="/auth/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Sign In
        </Link>
      </div>
    );
  }

  const userId = session?.user?.email || "demo";

  async function createApiKey() {
    setApiKeyLoading(true);
    setApiKey("");
    try {
      const res = await fetch(`${AUTH_URL}/auth/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "dashboard-key", scopes: ["read", "write"] }),
      });
      const data = await res.json();
      if (data.success) {
        setApiKey(data.data.key);
      }
    } catch {
      setApiKey("Error: Auth service not running. Start it with: pnpm run dev --filter=@saas/auth-service");
    }
    setApiKeyLoading(false);
  }

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifySubject || !notifyBody) return;
    setNotifyLoading(true);
    setNotifyResult(null);
    try {
      const res = await fetch(`${NOTIFY_URL}/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          channel: "email",
          template: "default",
          subject: notifySubject,
          body: notifyBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifyResult("Notification queued successfully!");
        setNotifySubject("");
        setNotifyBody("");
      } else {
        setNotifyResult("Error: " + (data.error || "Unknown error"));
      }
    } catch {
      setNotifyResult("Notification service not running. Start it with: pnpm run dev --filter=@saas/notification-service");
    }
    setNotifyLoading(false);
  }

  async function shortenUrlHandler() {
    if (!shortUrl) return;
    setShortenLoading(true);
    try {
      const res = await fetch(`${URL_URL}/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: shortUrl, userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUrls((prev) => [data.data, ...prev]);
        setShortUrl("");
      }
    } catch {
      alert("URL shortener service not running. Start it with: pnpm run dev --filter=@saas/url-shortener");
    }
    setShortenLoading(false);
  }

  async function handlePayment(amount: number, label: string) {
    setPaymentLoading(true);
    setPaymentMsg(null);
    try {
      const res = await fetch(`${PAYMENT_URL}/payments/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount, currency: "usd" }),
      });
      const data = await res.json();
      if (data.success && data.data.checkoutUrl) {
        window.open(data.data.checkoutUrl, "_blank");
        setPaymentMsg(`Redirecting to Stripe checkout for ${label} plan...`);
      } else {
        setPaymentMsg("Stripe not configured. Add STRIPE_SECRET_KEY to .env or start payment service.");
      }
    } catch {
      setPaymentMsg("Payment service not running. Start it with: pnpm run dev --filter=@saas/payment-service");
    }
    setPaymentLoading(false);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted)]">
          Signed in as {session?.user?.email} &middot; via {session?.user?.name ? "credentials" : "Google"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Key */}
        <section className="border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-3">API Key Management</h2>
          <button
            onClick={createApiKey}
            disabled={apiKeyLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {apiKeyLoading ? "Generating..." : "Generate API Key"}
          </button>
          {apiKey && (
            <div
              className={`mt-3 p-3 rounded-lg text-sm font-mono break-all ${
                apiKey.startsWith("Error") ? "bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200" : "bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200"
              }`}
            >
              {apiKey}
            </div>
          )}
        </section>

        {/* Send Notification */}
        <section className="border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-3">Send Notification</h2>
          <form onSubmit={sendNotification} className="space-y-3">
            <input
              placeholder="Subject"
              value={notifySubject}
              onChange={(e) => setNotifySubject(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-transparent text-sm"
              required
            />
            <textarea
              placeholder="Body (HTML supported)"
              value={notifyBody}
              onChange={(e) => setNotifyBody(e.target.value)}
              rows={3}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-transparent text-sm"
              required
            />
            <button
              type="submit"
              disabled={notifyLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {notifyLoading ? "Sending..." : "Send Email"}
            </button>
          </form>
          {notifyResult && (
            <div className={`mt-3 p-2 rounded-lg text-sm ${
              notifyResult.startsWith("Notification") ? "bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200" : "bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200"
            }`}>
              {notifyResult}
            </div>
          )}
        </section>

        {/* URL Shortener */}
        <section className="border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-3">URL Shortener</h2>
          <div className="flex gap-2">
            <input
              placeholder="https://example.com/long-url"
              value={shortUrl}
              onChange={(e) => setShortUrl(e.target.value)}
              className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 bg-transparent text-sm"
            />
            <button
              onClick={shortenUrlHandler}
              disabled={shortenLoading || !shortUrl}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 shrink-0 disabled:opacity-50"
            >
              {shortenLoading ? "..." : "Shorten"}
            </button>
          </div>
          {urls.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-auto">
              {urls.map((u) => (
                <div key={u.id} className="flex justify-between items-center text-sm p-2 border border-[var(--border)] rounded-lg">
                  <span className="font-mono text-blue-600">{u.shortCode}</span>
                  <span className="text-[var(--muted)] truncate max-w-[200px]">{u.originalUrl}</span>
                  <span>{u.clicks} clicks</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payments */}
        <section className="border border-[var(--border)] rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-3">Stripe Payments</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Basic", amount: 999 },
              { label: "Pro", amount: 1999 },
              { label: "Enterprise", amount: 4999 },
            ].map((plan) => (
              <button
                key={plan.label}
                onClick={() => handlePayment(plan.amount, plan.label)}
                disabled={paymentLoading}
                className="bg-[#635bff] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
              >
                {plan.label} ${(plan.amount / 100).toFixed(2)}
              </button>
            ))}
          </div>
          {paymentMsg && (
            <div className="mt-3 p-2 rounded-lg text-sm bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
              {paymentMsg}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
