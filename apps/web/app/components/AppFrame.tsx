"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useAuth } from "../lib/auth";
import { SignInModal } from "../learn/ui";
import { BrandLockup } from "./BrandLockup";

/* Monochrome line icons (stroke = currentColor). No fills, no colour. */
type IconProps = { className?: string };
type IconFn = (p: IconProps) => ReactNode;
const I = ({ children, className }: { children: ReactNode; className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const HomeIcon: IconFn = (p) => <I {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></I>;
const GridIcon: IconFn = (p) => <I {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></I>;
const CalcIcon: IconFn = (p) => <I {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h0M12 11h0M16 11h0M8 15h0M12 15h0M16 15v3" /></I>;
const BookIcon: IconFn = (p) => <I {...p}><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 0 2 2h12" /></I>;
const FileIcon: IconFn = (p) => <I {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></I>;
const ShieldIcon: IconFn = (p) => <I {...p}><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6z" /><path d="m9.5 12 2 2 3.5-4" /></I>;
const BookmarkIcon: IconFn = (p) => <I {...p}><path d="M6 3h12v18l-6-4-6 4z" /></I>;
const ClipboardIcon: IconFn = (p) => <I {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 11h6M9 15h4" /></I>;
const UsersIcon: IconFn = (p) => <I {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.7" /></I>;
const CardIcon: IconFn = (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></I>;
const SearchIcon: IconFn = (p) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></I>;
const UserIcon: IconFn = (p) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>;
const CompareIcon: IconFn = (p) => <I {...p}><path d="M9 4v16M15 4v16" /><rect x="3" y="7" width="6" height="10" rx="1" /><rect x="15" y="5" width="6" height="14" rx="1" /></I>;
const TargetIcon: IconFn = (p) => <I {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></I>;
const LayersIcon: IconFn = (p) => <I {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></I>;
const ActivityIcon: IconFn = (p) => <I {...p}><path d="M3 12h4l3 8 4-16 3 8h4" /></I>;
const SettingsIcon: IconFn = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z" /></I>;
const StoreIcon: IconFn = (p) => <I {...p}><path d="M4 9V5h16v4M4 9l1 11h14l1-11M4 9h16M9 20v-6h6v6" /></I>;
const DocIcon: IconFn = (p) => <I {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></I>;
const MapIcon: IconFn = (p) => <I {...p}><path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6z" /><path d="M9 4v14M15 6v14" /></I>;

type NavLink = { href: string; label: string; icon: IconFn };
type SidebarGroup = { group: string; items: NavLink[] };
type Section = { key: string; label: string; href: string; prefixes: string[]; sidebar: SidebarGroup[] };

const SECTIONS: Section[] = [
  {
    key: "home",
    label: "Home",
    href: "/",
    prefixes: ["/"],
    sidebar: [
      { group: "Overview", items: [{ href: "/", label: "Dashboard", icon: HomeIcon }] },
      {
        group: "Explore",
        items: [
          { href: "/marketplace", label: "Marketplace", icon: GridIcon },
          { href: "/simulate", label: "Simulate", icon: CalcIcon },
          { href: "/learn", label: "Learning", icon: BookIcon },
          { href: "/land-decision-safety", label: "Land safety", icon: ShieldIcon }
        ]
      },
      {
        group: "You",
        items: [
          { href: "/marketplace/watchlist", label: "Watchlist", icon: BookmarkIcon },
          { href: "/marketplace/brief", label: "My brief", icon: ClipboardIcon }
        ]
      }
    ]
  },
  {
    key: "marketplace",
    label: "Marketplace",
    href: "/marketplace",
    prefixes: ["/marketplace"],
    sidebar: [
      {
        group: "Browse",
        items: [
          { href: "/marketplace", label: "Overview", icon: HomeIcon },
          { href: "/marketplace/products", label: "All products", icon: GridIcon },
          { href: "/marketplace/compare", label: "Compare", icon: CompareIcon },
          { href: "/marketplace/finder", label: "Product finder", icon: TargetIcon }
        ]
      },
      {
        group: "You",
        items: [
          { href: "/marketplace/watchlist", label: "Watchlist", icon: BookmarkIcon },
          { href: "/marketplace/brief", label: "My brief", icon: ClipboardIcon }
        ]
      }
    ]
  },
  {
    key: "simulate",
    label: "Simulate",
    href: "/simulate",
    prefixes: ["/simulate"],
    sidebar: [
      {
        group: "Simulate",
        items: [
          { href: "/simulate", label: "Browse products", icon: GridIcon },
          { href: "/land/explore", label: "Land map", icon: MapIcon },
          { href: "/simulate/virtual-portfolio", label: "Virtual portfolio", icon: LayersIcon }
        ]
      }
    ]
  },
  {
    key: "learn",
    label: "Learning",
    href: "/learn",
    prefixes: ["/learn", "/learning", "/product-passports"],
    sidebar: [
      {
        group: "Learn",
        items: [
          { href: "/learn", label: "Dashboard", icon: HomeIcon },
          { href: "/learn/tracks", label: "Tracks", icon: LayersIcon },
          { href: "/learn/explore", label: "Explore", icon: TargetIcon },
          { href: "/learn/practice", label: "Practice", icon: ActivityIcon },
          { href: "/learn/assessments", label: "Assessments", icon: ClipboardIcon }
        ]
      },
      {
        group: "Reference",
        items: [
          { href: "/product-passports", label: "Passports", icon: FileIcon },
          { href: "/learn/resources", label: "Resources", icon: BookIcon },
          { href: "/learn/my-activity", label: "My activity", icon: ActivityIcon }
        ]
      }
    ]
  },
  {
    key: "land",
    label: "Land safety",
    href: "/land-decision-safety",
    prefixes: ["/land-decision-safety", "/land"],
    sidebar: [
      {
        group: "Land Decision Safety",
        items: [
          { href: "/land/explore", label: "Explore map", icon: MapIcon },
          { href: "/land-decision-safety", label: "Overview", icon: ShieldIcon },
          { href: "/land/before-you-pay", label: "Before you pay", icon: BookIcon },
          { href: "/land/checklist", label: "Due-diligence checklist", icon: ClipboardIcon },
          { href: "/land/compare", label: "Compare land", icon: CompareIcon }
        ]
      }
    ]
  },
  {
    key: "account",
    label: "Professionals",
    href: "/professional",
    prefixes: ["/professional", "/provider", "/payments", "/terms"],
    sidebar: [
      {
        group: "Professional",
        items: [
          { href: "/professional/dashboard", label: "Dashboard", icon: HomeIcon },
          { href: "/professional/profile", label: "Profile", icon: UserIcon },
          { href: "/professional/settings", label: "Settings", icon: SettingsIcon }
        ]
      },
      {
        group: "Provider",
        items: [
          { href: "/provider/dashboard", label: "Provider dashboard", icon: StoreIcon },
          { href: "/provider/products", label: "Products", icon: GridIcon }
        ]
      },
      {
        group: "Account",
        items: [
          { href: "/payments/status", label: "Payments", icon: CardIcon },
          { href: "/terms", label: "Terms", icon: DocIcon }
        ]
      }
    ]
  }
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(prefix);
}

function activeSection(pathname: string): Section {
  return SECTIONS.find((s) => s.prefixes.some((p) => matchesPrefix(pathname, p))) ?? SECTIONS[0];
}

function itemMatches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The most specific (longest) matching item href in the section is the active one.
function activeItemHref(pathname: string, section: Section): string | null {
  let best: string | null = null;
  for (const grp of section.sidebar) {
    for (const item of grp.items) {
      if (itemMatches(pathname, item.href) && item.href.length > (best?.length ?? -1)) best = item.href;
    }
  }
  return best;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pesaroute_theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }
  const SunIcon: IconFn = (p) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>;
  const MoonIcon: IconFn = (p) => <I {...p}><path d="M21 12.8A8 8 0 0 1 11.2 3a7 7 0 1 0 9.8 9.8" /></I>;
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-textSecondary transition hover:bg-surfaceSubtle hover:text-textPrimary">
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { ready, isAuthenticated, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Standalone shells that ship their own chrome and must NOT use the app frame:
  //  - "/"            the emerald marketing landing page
  //  - "/professional" the verified-professional portal (its own pro top-nav + sidebar)
  // (Hooks above run unconditionally before this early return.)
  if (pathname === "/" || pathname === "/professional" || pathname.startsWith("/professional/")) {
    return <>{children}</>;
  }

  const section = activeSection(pathname);
  const activeHref = activeItemHref(pathname, section);
  const fullWidth = false;

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/marketplace/products?search=${encodeURIComponent(q)}` : "/marketplace/products");
  }

  const MenuIcon: IconFn = (p) => <I {...p}><path d="M4 6h16M4 12h16M4 18h16" /></I>;
  const CloseIcon: IconFn = (p) => <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>;

  return (
    <div className="min-h-screen bg-background text-textPrimary">
      {/* Top navbar: primary sections. Stays the same on every page. */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-surface">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-textSecondary transition hover:bg-surfaceSubtle hover:text-textPrimary lg:hidden">
            <MenuIcon />
          </button>
          <Link href="/" className="flex shrink-0 items-center lg:w-[13rem]" aria-label="PesaRoute home">
            <BrandLockup markSize={24} textClassName="text-[16px]" />
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-surfaceSubtle p-1 md:flex">
            {SECTIONS.map((s) => {
              const active = s.key === section.key;
              return (
                <Link key={s.key} href={s.href} className={`rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-primary font-semibold text-white" : "text-textSecondary hover:text-textPrimary"}`}>
                  {s.label}
                </Link>
              );
            })}
          </nav>
          <form onSubmit={onSearch} className="ml-auto hidden flex-1 items-center sm:flex md:ml-3 md:max-w-xs">
            <div className="flex w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
              <SearchIcon className="shrink-0 text-textTertiary" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" className="w-full bg-transparent text-sm text-textPrimary placeholder:text-textTertiary focus:outline-none" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2 sm:ml-3">
            <ThemeToggle />
            {ready && isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden max-w-[8rem] truncate text-sm text-textSecondary sm:inline">{user?.first_name || user?.username}</span>
                <button type="button" onClick={signOut} className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-textPrimary transition hover:bg-surfaceSubtle">
                  Sign out
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setSignInOpen(true)} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-primaryDark">
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {open ? <div onClick={() => setOpen(false)} className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden" aria-hidden="true" /> : null}

      {/* Contextual sidebar: changes with the active top-nav section. */}
      <aside className={`fixed bottom-0 left-0 top-14 z-40 flex w-60 flex-col border-r border-sidebarBorder bg-sidebar transition-transform duration-200 ${fullWidth ? "" : "lg:translate-x-0"} ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-3 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-sidebarMuted">{section.label}</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-md text-sidebarMuted hover:bg-sidebarActive">
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {section.sidebar.map((grp) => (
            <div key={grp.group} className="mb-2">
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-sidebarMuted">{grp.group}</p>
              {grp.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={`mb-0.5 flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition ${active ? "border-accent bg-primary/15 font-semibold text-accent" : "border-transparent text-sidebarMuted hover:bg-sidebarActive hover:text-sidebarText"}`}>
                    <Icon className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebarBorder p-3 text-[11px] leading-4 text-sidebarMuted">Educational only. PesaRoute does not hold money or give advice.</div>
      </aside>

      <div className={fullWidth ? "" : "lg:pl-60"}>
        <main className="min-h-[calc(100vh-3.5rem)] bg-background">{children}</main>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
