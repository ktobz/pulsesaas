"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const PAYMENT_URL = process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:4004";

const plans = [
  { label: "Basic", amount: 999, features: ["1,000 emails/mo", "Basic analytics", "Email support"] },
  { label: "Pro", amount: 1999, features: ["10,000 emails/mo", "Advanced analytics", "Priority support", "Custom domains"] },
  { label: "Enterprise", amount: 4999, features: ["Unlimited emails", "Dedicated IP", "SLA guarantee", "SSO + RBAC"] },
];

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        <p className="text-[var(--muted)]">Sign in to manage payments.</p>
        <Link href="/auth/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Sign In
        </Link>
      </div>
    );
  }

  async function handleCheckout(plan: typeof plans[0]) {
    setLoadingPlan(plan.label);
    setMessage(null);
    try {
      const res = await fetch(`${PAYMENT_URL}/payments/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.email || "demo",
          amount: plan.amount,
          currency: "usd",
        }),
      });
      const data = await res.json();
      if (data.success && data.data.checkoutUrl) {
        window.open(data.data.checkoutUrl, "_blank");
        setMessage(`Redirecting to Stripe for ${plan.label} plan...`);
      } else {
        setMessage("Payment service not configured. Add STRIPE_SECRET_KEY to .env or start payment service with: pnpm run dev --filter=@saas/payment-service");
      }
    } catch {
      setMessage("Payment service not running. Start it with: pnpm run dev --filter=@saas/payment-service");
    }
    setLoadingPlan(null);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Payments</h1>

      {message && (
        <div className="mb-6 p-4 rounded-lg text-sm bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
          {message}
        </div>
      )}

      <p className="text-[var(--muted)] mb-8">
        Process payments via Stripe. Click a plan to start a checkout session.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.label}
            className="border border-[var(--border)] rounded-xl p-6 flex flex-col hover:shadow-lg transition"
          >
            <h3 className="font-bold text-lg">{plan.label}</h3>
            <p className="text-3xl font-extrabold my-4">
              ${(plan.amount / 100).toFixed(2)}
              <span className="text-sm font-normal text-[var(--muted)]">/month</span>
            </p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-[var(--muted)] flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(plan)}
              disabled={loadingPlan === plan.label}
              className="w-full bg-[#635bff] text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loadingPlan === plan.label ? "Redirecting..." : `Pay $${(plan.amount / 100).toFixed(2)}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
