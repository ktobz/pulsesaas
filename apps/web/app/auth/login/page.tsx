"use client";

import { Suspense, useState } from "react";
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

  const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4001";

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (mode === "register") {
      try {
        const res = await fetch(`${AUTH_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus({ type: "success", msg: "Account created! Signing in..." });
          setMode("login");
          setPassword("");
        } else {
          setStatus({ type: "error", msg: data.error || "Registration failed" });
          setLoading(false);
          return;
        }
      } catch {
        setStatus({ type: "error", msg: "Auth service not running. Register with any credentials for dev mode." });
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setStatus({ type: "error", msg: result.error === "CredentialsSignin" ? "Invalid email or password" : result.error });
      setLoading(false);
    } else if (result?.ok) {
      window.location.href = callbackUrl;
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setStatus(null);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md border border-[var(--border)] rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {errorParam && (
          <div className="p-3 rounded-lg mb-4 text-sm bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200">
            {errorParam === "OAuthAccountNotLinked"
              ? "This email is already registered with a different sign-in method."
              : `Authentication error: ${errorParam}`}
          </div>
        )}

        {status && (
          <div
            className={`p-3 rounded-lg mb-4 text-sm ${
              status.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200"
                : "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {status.msg}
          </div>
        )}

        <form onSubmit={handleCredentials} className="space-y-4">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[var(--border)] rounded-lg px-4 py-2.5 bg-transparent"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[var(--border)] rounded-lg px-4 py-2.5 bg-transparent"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[var(--border)] rounded-lg px-4 py-2.5 bg-transparent"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--bg)] px-2 text-[var(--muted)]">or</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full border border-[var(--border)] py-2.5 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Redirecting..." : "Continue with Google"}
        </button>

        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setStatus(null);
            }}
            className="text-blue-600 hover:underline"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="glass px-8 py-4 text-sm text-[var(--fg-secondary)]">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
