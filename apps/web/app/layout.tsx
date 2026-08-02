import { AuthProvider } from "@/components/AuthProvider";
import { NavBar } from "@/components/NavBar";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PulseSaaS — Production Platform",
  description: "Notifications, Chat, Payments, URL Shortener, Google Auth, Vector DB, Rate Limiting, and more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">{children}</main>
          <footer className="border-t border-[var(--border-subtle)] py-8 px-4 text-center text-xs text-[var(--fg-muted)]">
            PulseSaaS &mdash; Production SaaS Platform &mdash; Built with Next.js, Node.js, Docker
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
