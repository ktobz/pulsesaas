"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/chat", label: "Chat" },
  { href: "/payments", label: "Payments" },
  { href: "/shorten", label: "Shorten" },
  { href: "/vector", label: "Vector" },
  { href: "/trending", label: "Trending" },
];

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuth = status === "authenticated";

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return `text-[13px] font-semibold px-3 py-1.5 rounded-[10px] transition-all ${
      active ? "bg-[#4f42df]/10 text-[#4f42df]" : "text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-elevated)]"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-lg tracking-[-0.02em] flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-[#4f42df] to-[#8b5cf6] flex items-center justify-center text-white text-[10px] font-bold">C</span>
          <span className="gradient-text">Cloud</span>Stack
        </Link>

        <div className="hidden lg:flex gap-0.5 items-center">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>{link.label}</Link>
          ))}

          {status === "loading" ? (
            <span className="text-xs px-4 py-1.5 text-[var(--fg-muted)]">Loading...</span>
          ) : isAuth ? (
            <div className="flex items-center gap-3 ml-3 pl-3 border-l border-[var(--border-subtle)]">
              {session?.user?.image && (
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full ring-2 ring-[#4f42df]/20" />
              )}
              <span className="text-xs font-medium text-[var(--fg-secondary)] max-w-[120px] truncate">{session?.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-danger text-xs px-3 py-1.5">Logout</button>
            </div>
          ) : (
            <Link href="/auth/login" className="btn-primary text-xs px-4 py-1.5 ml-3">Sign In</Link>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-2">
          {isAuth ? (
            <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-danger text-xs px-3 py-1.5">Logout</button>
          ) : (
            <Link href="/auth/login" className="btn-primary text-xs px-3 py-1.5">Sign In</Link>
          )}
        </div>
      </div>

      <div className="lg:hidden flex overflow-x-auto gap-1 px-5 pb-2">
        {navLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link key={link.href} href={link.href}
              className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${active ? "bg-[#4f42df]/10 text-[#4f42df]" : "text-[var(--fg-secondary)]"}`}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
