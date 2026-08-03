import { AuthProvider } from "@/components/AuthProvider";
import { NavBar } from "@/components/NavBar";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CloudStack — Build Production SaaS",
  description: "Notifications, Chat, Payments, URL Shortener, Google Auth, Vector DB, Rate Limiting — all in one platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-5 sm:px-6 py-10">{children}</main>
          <footer className="border-t border-[var(--border-subtle)] py-8 px-5 text-center text-xs text-[var(--fg-muted)] font-medium">
            CloudStack &mdash; Production Infrastructure for Modern Teams
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
