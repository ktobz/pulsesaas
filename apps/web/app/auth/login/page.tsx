"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers").then((r) => r.json()).then((d) => setHasGoogle(!!d.google)).catch(() => {});
  }, []);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setStatus(null);
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    if (result?.error) {
      setStatus({ type: "error", msg: result.error === "CredentialsSignin" ? "Invalid email or password" : result.error });
      setLoading(false);
    } else if (result?.ok) {
      window.location.href = callbackUrl;
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true); setStatus(null);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="flex items-center justify-center min-h-[85vh]">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4f42df] to-[#8b5cf6] flex items-center justify-center text-white text-lg font-bold mx-auto mb-4">C</div>
          <h1 className="text-2xl font-extrabold tracking-[-0.03em] mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] font-medium">
            {mode === "login" ? "Sign in to your CloudStack account" : "Start building in seconds"}
          </p>
        </div>

        <div className="glass p-8">
          {errorParam && (
            <div className="p-3.5 rounded-xl mb-4 text-sm font-medium bg-amber-50 border border-amber-200 text-amber-700">
              {errorParam === "OAuthAccountNotLinked"
                ? "This email is registered with a different sign-in method."
                : errorParam === "OAuthSignin"
                ? "Google OAuth not configured. Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to .env.local, or use email/password."
                : errorParam === "OAuthCallback"
                ? "OAuth callback failed. Ensure http://localhost:3000/api/auth/callback/google is in your Google Cloud Console redirect URIs."
                : `Authentication error: ${errorParam}`}
            </div>
          )}

          {status && (
            <div className={`p-3.5 rounded-xl mb-4 text-sm font-medium ${status.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>{status.msg}</div>
          )}

          <form onSubmit={handleCredentials} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-1.5">Full Name</label>
                <input type="text" placeholder="Alex Johnson" value={name} onChange={(e) => setName(e.target.value)} className="input-glass" required />
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-1.5">Email</label>
              <input type="email" placeholder="alex@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-glass" required />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] block mb-1.5">Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="input-glass" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm">
              {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {hasGoogle && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-strong)]" /></div>
                <div className="relative flex justify-center text-[11px] uppercase font-semibold tracking-wider"><span className="bg-white px-3 text-[var(--fg-muted)]">or continue with</span></div>
              </div>
              <button onClick={handleGoogleSignIn} disabled={loading} className="w-full border border-[var(--border-strong)] py-2.5 rounded-[10px] font-semibold text-sm hover:bg-[var(--bg-elevated)] transition flex items-center justify-center gap-3 disabled:opacity-50">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {loading ? "Redirecting..." : "Continue with Google"}
              </button>
            </>
          )}

          <p className="mt-5 text-center text-sm text-[var(--fg-secondary)] font-medium">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setStatus(null); }} className="font-bold text-[#4f42df] hover:underline"> {mode === "login" ? "Sign up" : "Sign in"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]"><div className="glass px-8 py-4 text-sm text-[var(--fg-secondary)] font-medium">Loading...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
