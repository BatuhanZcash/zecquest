"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Compass,
  Download,
  Gamepad2,
  Gift,
  Globe,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  PenSquare,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  ShieldQuestion,
  Sun,
  Trophy,
  User,
  X,
} from "lucide-react";
import { Logo, LogoMark, ZcashMark } from "./Logo";
import { Avatar } from "./ui";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth, hasRole } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import { SITE } from "@/lib/config";
import { useInstallPrompt } from "@/lib/pwa";
import type { Role } from "@/lib/types";

type NavItem = { href: string; key: DictKey; icon: typeof Home; role?: Role };
const NAV: NavItem[] = [
  { href: "/", key: "nav_home", icon: Home },
  { href: "/events", key: "nav_events", icon: Radio },
  { href: "/explore", key: "nav_explore", icon: Compass },
  { href: "/join", key: "nav_join", icon: Gamepad2 },
  { href: "/leaderboard", key: "nav_leaderboard", icon: Trophy },
  { href: "/studio", key: "nav_studio", icon: PenSquare, role: "creator" },
  { href: "/admin", key: "nav_admin", icon: ShieldCheck, role: "admin" },
  { href: "/about", key: "nav_about", icon: ShieldQuestion },
];

/** Projeksiyon (host) ve telefon (play) ekranları kabuksuz, tam ekran çalışır */
const BARE = [/^\/host\//, /^\/play\//];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [drawer, setDrawer] = useState(false);
  const [fab, setFab] = useState(false);

  useEffect(() => {
    setDrawer(false);
    setFab(false);
  }, [pathname]);

  if (BARE.some((r) => r.test(pathname))) return <>{children}</>;

  return (
    <div className="min-h-screen bg-app">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-card lg:flex">
        <Sidebar pathname={pathname} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] animate-rise flex-col overflow-y-auto border-r border-line bg-card">
            <button aria-label="Close" onClick={() => setDrawer(false)} className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:text-ink">
              <X className="h-5 w-5" />
            </button>
            <Sidebar pathname={pathname} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[232px]">
        <TopBar pathname={pathname} onMenu={() => setDrawer(true)} />
        {!isConfigured && <ConfigBanner />}
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-8 lg:pb-12">{children}</main>
        <Footer />
      </div>

      <div className="fixed bottom-5 right-5 z-40 lg:hidden">
        {fab && <FabMenu />}
        <button
          aria-label="Quick menu"
          onClick={() => setFab((f) => !f)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zec text-[#1A1506] shadow-press transition active:translate-y-[2px] active:shadow-none"
        >
          {fab ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}

function ConfigBanner() {
  const { t } = useI18n();
  return <div className="border-b border-line bg-tint px-4 py-2 text-center text-[13px] font-medium text-accent">{t("err_not_configured")}</div>;
}

function Sidebar({ pathname }: { pathname: string }) {
  const { t, lt } = useI18n();
  const { profile } = useAuth();
  const install = useInstallPrompt();
  return (
    <>
      <Link href="/" className="flex h-[64px] items-center px-5">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-0.5 px-3 pt-2">
        {NAV.filter((n) => !n.role || hasRole(profile, n.role)).map(({ href, key, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors ${
                active ? "bg-tint text-accent" : "text-muted hover:bg-input hover:text-ink"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 p-4">
        {install.available && (
          <button onClick={install.prompt} className="btn-ghost w-full py-2 text-[13px]">
            <Download className="h-4 w-4" />
            {t("install_app")}
          </button>
        )}
        <a
          href={SITE.promo.href}
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-xl border border-zec/30 bg-tint p-3.5 transition hover:border-zec/70"
        >
          <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-zec/20 blur-2xl" />
          <div className="relative flex items-center gap-2.5">
            <ZcashMark size={30} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-tight text-ink">{lt(SITE.promo.title)}</p>
              <p className="text-[12px] font-medium text-accent">z.cash</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-accent transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <p className="relative mt-2 text-[12px] leading-snug text-muted">{lt(SITE.promo.body)}</p>
        </a>
      </div>
    </>
  );
}

function TopBar({ pathname, onMenu }: { pathname: string; onMenu: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState("");
  const current = NAV.find((n) => isActive(n.href, pathname));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/explore${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-[64px] items-center gap-2 border-b border-line bg-card px-3 sm:px-6">
      <button onClick={onMenu} aria-label={t("menu")} className="rounded-lg p-2 text-muted hover:text-ink lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/" className="lg:hidden" aria-label={SITE.name}>
        <LogoMark size={30} />
      </Link>
      <span className="ml-1 hidden text-[15px] font-semibold sm:inline lg:ml-0">{current ? t(current.key) : ""}</span>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <form onSubmit={submit} className="hidden md:block">
          <label className="flex h-9 w-60 items-center gap-2 rounded-[10px] border border-line bg-input px-3 text-[14px] text-soft focus-within:border-zec focus-within:ring-2 focus-within:ring-zec/25">
            <Search className="h-4 w-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full bg-transparent text-ink outline-none placeholder:text-soft"
            />
          </label>
        </form>
        <button onClick={toggle} aria-label={t("theme")} className="rounded-lg p-2 text-muted hover:text-ink">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setLang(lang === "tr" ? "en" : "tr")}
          className="flex items-center gap-1 rounded-lg p-2 text-sm font-semibold text-muted hover:text-ink"
          aria-label="Language"
        >
          <Globe className="h-5 w-5" />
          <span className="hidden sm:inline">{lang.toUpperCase()}</span>
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const { t } = useI18n();
  const { ready, session, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!ready) return <div className="ml-1 h-9 w-9 animate-pulse rounded-full bg-input" />;

  if (!session) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className="btn-zec ml-1 px-4 py-2 text-sm">
        <User className="h-4 w-4" />
        {t("sign_in")}
      </Link>
    );
  }

  const name = profile?.display_name || profile?.username || "…";
  return (
    <div ref={ref} className="relative ml-1">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 pr-1 hover:bg-input sm:pr-3" aria-label={t("nav_profile")}>
        <Avatar name={name} size={34} />
        <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:inline">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-56 animate-pop overflow-hidden rounded-xl2 border border-line bg-elevated p-1.5 shadow-card">
          {profile?.username && (
            <>
              <MenuLink href={`/u/${profile.username}`} icon={User} label={t("nav_profile")} />
              <MenuLink href="/me/prizes" icon={Gift} label={t("nav_prizes")} />
              <MenuLink href="/me" icon={Settings} label={t("nav_settings")} />
            </>
          )}
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#E8742A] hover:bg-input"
          >
            <LogOut className="h-4 w-4" />
            {t("sign_out")}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon: Icon, label }: { href: string; icon: typeof Home; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-input">
      <Icon className="h-4 w-4 text-accent" />
      {label}
    </Link>
  );
}

function FabMenu() {
  const { t } = useI18n();
  const items = [NAV[3], NAV[1], NAV[2], NAV[4], NAV[0]];
  return (
    <div className="absolute bottom-[72px] right-0 w-56 animate-pop overflow-hidden rounded-xl2 border border-line bg-elevated p-1.5 shadow-card">
      {items.map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-input">
          <Icon className="h-4 w-4 text-accent" />
          {t(key)}
        </Link>
      ))}
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mx-auto mt-8 w-full max-w-[1240px] px-4 pb-24 sm:px-8 lg:pb-8">
      <div className="flex flex-col gap-4 border-t border-line pt-6 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={24} />
          <span>
            © {new Date().getFullYear()} {SITE.name}. {t("footer_rights")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-ink">{t("nav_about")}</Link>
          <Link href="/terms" className="hover:text-ink">{t("terms")}</Link>
          <Link href="/privacy" className="hover:text-ink">{t("privacy")}</Link>
          <a href={SITE.x} target="_blank" rel="noreferrer" aria-label="X" className="hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.828l-5.35-6.99L4.7 22H1.44l8.02-9.17L1 2h6.997l4.836 6.39L18.244 2Zm-1.196 18h1.88L7.03 3.9H5.01L17.048 20Z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
