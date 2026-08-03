"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const PAY = process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:4004";

const plans = [
  { label: "Basic", amount: 999, features: ["1,000 emails/mo", "Basic analytics", "Email support"] },
  { label: "Pro", amount: 1999, features: ["10,000 emails/mo", "Advanced analytics", "Priority support", "Custom domains"] },
  { label: "Enterprise", amount: 4999, features: ["Unlimited emails", "Dedicated IP", "SLA guarantee", "SSO + RBAC"] },
];

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; msg: string } | null>(null);

  const userId = session?.user?.email || "demo";

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)]">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><p className="text-[var(--fg-secondary)]">Sign in to manage payments.</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div>;

  async function handleCheckout(plan: typeof plans[0]) {
    setLoadingPlan(plan.label); setMessage(null);
    try {
      const r = await fetch(`${PAY}/payments/create-checkout`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: plan.amount, currency: "usd" }),
      });
      const d = await r.json();
      if (d.success) {
        setMessage({ type: "success", msg: `${plan.label} plan created! ID: ${d.data.payment.id}. Invoice generated.` });
        if (d.data.checkoutUrl) window.open(d.data.checkoutUrl, "_blank");
        if (d.idempotent) setMessage({ type: "success", msg: `${plan.label} plan (idempotent replay)` });
      } else {
        setMessage({ type: "info", msg: d.error || "Payment service returned unexpected response" });
      }
    } catch {
      setMessage({ type: "info", msg: "Payment service not running (port 4004). Demo mode." });
    }
    setLoadingPlan(null);
    setTimeout(() => setMessage(null), 6000);
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <h1 className="page-title">Payments</h1>
      <p className="page-subtitle mb-2">Subscription plans via Stripe (payment service on port 4004)</p>
      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm animate-fade-in ${message.type === "success" ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-600" : "bg-brand-500/5 border border-brand-500/15 text-brand-600"}`}>{message.msg}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.label} className="glass p-6 flex flex-col hover:shadow-md transition">
            <h3 className="font-bold text-lg">{plan.label}</h3>
            <p className="text-3xl font-extrabold my-4">${(plan.amount / 100).toFixed(2)}<span className="text-sm font-normal text-[var(--fg-secondary)]">/month</span></p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => <li key={f} className="text-sm text-[var(--fg-secondary)] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>{f}</li>)}
            </ul>
            <button onClick={() => handleCheckout(plan)} disabled={loadingPlan === plan.label} className="w-full btn-primary justify-center text-sm">{loadingPlan === plan.label ? "Processing..." : `Subscribe $${(plan.amount / 100).toFixed(2)}`}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
