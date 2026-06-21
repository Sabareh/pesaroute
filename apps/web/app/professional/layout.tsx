"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "../lib/auth";

/* Monochrome line icons (stroke = currentColor). */
function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const InboxIcon = () => <Icon><path d="M4 5a2 2 0 0 1 2-2h12v18l-6-3-6 3z" /></Icon>;
const LockIcon = () => <Icon><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
const UserIcon = () => <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>;
const GearIcon = () => <Icon><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z" /></Icon>;
const ShieldCheck = ({ size = 14 }: { size?: number }) => <Icon size={size}><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z" /><path d="m9 12 2 2 4-4" /></Icon>;
const BellIcon = () => <Icon><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></Icon>;

type NavItem = { href: string; label: string; icon: () => ReactNode; badge?: string };
const NAV: NavItem[] = [
  { href: "/professional", label: "Leads inbox", icon: InboxIcon, badge: "3" },
  { href: "/professional/scoped-context", label: "Scoped context", icon: LockIcon },
  { href: "/professional/profile", label: "Profile & specialties", icon: UserIcon },
  { href: "/professional/settings", label: "Settings", icon: GearIcon }
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/professional") return pathname === "/professional";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProfessionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/professional";
  const { user } = useAuth();
  const name = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.username || "Professional";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-textPrimary">
      {/* top nav (professional context) */}
      <header className="sticky top-0 z-50 flex h-[60px] items-center gap-4 border-b border-border bg-surface pr-4 sm:pr-6">
        <Link href="/" className="flex h-[60px] flex-none items-center gap-2.5 border-r border-border pl-5 sm:w-[248px] sm:pl-6">
          <span className="text-lg font-semibold tracking-[-0.015em] text-textPrimary">PesaRoute</span>
          <span className="rounded-full border border-accent/30 bg-accent/[0.12] px-2.5 py-0.5 text-[11px] font-semibold text-primary">Pro</span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full bg-accent/[0.12] px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
          <ShieldCheck />
          Verified professional
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-textSecondary" aria-hidden>
            <BellIcon />
          </span>
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/[0.12] text-xs font-bold text-primary">{initials}</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13px] font-semibold text-textPrimary">{name}</span>
              <span className="block text-[11px] text-textTertiary">Verified advisor</span>
            </span>
          </span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-60px)]">
        {/* sidebar */}
        <aside className="hidden w-[248px] flex-none flex-col bg-sidebar px-3 py-4 md:flex">
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebarMuted">Professional portal</p>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const I = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-r-[10px] border-l-[3px] py-2.5 pl-3 pr-3 text-sm transition ${
                    active ? "border-accent bg-primary/[0.18] font-semibold text-accent" : "border-transparent font-medium text-sidebarMuted hover:bg-white/[0.04] hover:text-sidebarText"
                  }`}
                >
                  <I />
                  <span>{item.label}</span>
                  {item.badge ? <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{item.badge}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-white/[0.08] bg-white/[0.05] p-3.5">
            <div className="flex items-center gap-2 text-accent">
              <ShieldCheck size={15} />
              <p className="text-xs font-semibold text-sidebarText">Privacy by default</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-[1.5] text-sidebarMuted">
              You only ever see what the user explicitly grants. Access expires automatically.
            </p>
          </div>
        </aside>

        {/* main */}
        <main className="min-w-0 flex-1 bg-background px-5 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
