"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [saved, setSaved] = useState(false);

  if (status === "loading") return <div className="flex items-center justify-center min-h-[60vh]"><div className="glass px-6 py-3 text-sm text-[var(--fg-secondary)] font-medium">Loading...</div></div>;
  if (status === "unauthenticated") return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><p className="text-[var(--fg-secondary)]">Sign in.</p><Link href="/auth/login" className="btn-primary">Sign In</Link></div>;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-8">
      <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your CloudStack account and preferences</p></div>

      <div className="glass p-6 space-y-5">
        <h2 className="font-bold text-sm">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4f42df]/20 to-[#8b5cf6]/20 flex items-center justify-center font-bold text-lg text-[#4f42df]">{(session?.user?.email || "U")[0]?.toUpperCase()}</div>
          <div>
            <p className="font-bold text-sm">{session?.user?.email || "Loading..."}</p>
            <p className="text-xs text-[var(--fg-secondary)]">Signed in via Google OAuth</p>
          </div>
        </div>

        <div className="space-y-3">
          <div><label className="text-[11px] font-semibold uppercase text-[var(--fg-muted)] block mb-1.5">Display Name</label><input className="input-glass" defaultValue={session?.user?.name || ""} placeholder="Your name" /></div>
          <div><label className="text-[11px] font-semibold uppercase text-[var(--fg-muted)] block mb-1.5">Email</label><input className="input-glass" defaultValue={session?.user?.email || ""} disabled /></div>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }} className="btn-primary text-sm">Save Changes</button>
          {saved && <p className="text-xs font-medium text-emerald-600">Settings saved!</p>}
        </div>
      </div>

      <div className="glass p-6 space-y-5">
        <h2 className="font-bold text-sm">Notifications</h2>
        <div className="space-y-3">
          {[{ label: "Email digests", desc: "Receive weekly summary emails" }, { label: "Payment alerts", desc: "Get notified of successful payments" }, { label: "Security alerts", desc: "New login notifications" }, { label: "Product updates", desc: "New feature announcements" }].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-base)]">
              <div><p className="text-sm font-semibold">{item.label}</p><p className="text-[11px] text-[var(--fg-muted)]">{item.desc}</p></div>
              <div className="w-10 h-6 rounded-full bg-[#4f42df] flex items-center px-0.5 cursor-pointer">
                <div className="w-5 h-5 rounded-full bg-white shadow-sm ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6 space-y-5">
        <h2 className="font-bold text-sm">Danger Zone</h2>
        <p className="text-xs text-[var(--fg-secondary)]">Permanently delete your account and all associated data.</p>
        <button className="btn-danger text-sm">Delete Account</button>
      </div>
    </div>
  );
}
