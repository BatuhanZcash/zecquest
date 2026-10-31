"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Compass,
  Download,
  Gamepad2,
  Gift,
  Globe,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  PenSquare,
  Radio,
  Settings,
  ShieldCheck,
  ShieldQuestion,
  Sun,
  Trophy,
  User,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "./ui";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth, hasRole } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import { SITE } from "@/lib/config";
import { useInstallPrompt } from "@/lib/pwa";
import type { Role } from "@/lib/types";

type NavItem = { href: string; key: DictKey; icon: typeof Home; role?: Role; competitions?: boolean };
const NAV_ALL: NavItem[] = [
  { href: "/", key: "nav_home", icon: Home },
  { href: "/events", key: "nav_events", icon: Radio, competitions: true },
  { href: "/explore", key: "nav_explore", icon: Compass },
  { href: "/leaderboard", key: "nav_leaderboard", icon: Trophy },
  { href: "/organizers", key: "nav_organizers", icon: Megaphone },
  { href: "/about", key: "nav_about", icon: ShieldQuestion },
  { href: "/studio", key: "nav_studio", icon: PenSquare, role: "creator" },
  { href: "/admin", key: "nav_admin", icon: ShieldCheck, role: "admin" },
];
const NAV = NAV_ALL.filter((n) => SITE.competitions || !n.competitions);

/** Projeksiyon (host) ve telefon (play) ekranları kabuksuz, tam ekran çalışır */
const BARE = [/^\/host\//, /^\/play\//];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

function useNav() {
  const { profile } = useAuth();
  return NAV.filter((n) => !n.role || (hasRole(profile, n.role) && !profile?.is_guest));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [pathname]);

  if (BARE.some((r) => r.test(pathname))) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col bg-app">
      <TopNav pathname={pathname} />
      {!isConfigured && <ConfigBanner />}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-14 lg:pt-8">{children}</main>
      <Footer />
      <MobileTabBar pathname={pathname} onMenu={() => setMenu(true)} />
      {menu && <MobileMenu pathname={pathname} onClose={() => setMenu(false)} />}
    </div>
  );
}

function ConfigBanner() {
  const { t } = useI18n();
  return <div className="border-b border-line bg-tint px-4 py-2 text-center text-[13px] font-medium text-accent">{t("err_not_configured")}</div>;
}

/* ---------------------------------------------------------------------
   Üst menü: logo, bağlantılar, oda kodu kutusu, tema/dil, hesap
   --------------------------------------------------------------------- */
function TopNav({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  // Rol araçları (Stüdyo, Yönetim) hesap menüsünde; üst menü sade kalır
  const nav = useNav().filter((n) => n.href !== "/" && !n.role);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label={SITE.name} className="shrink-0">
          <Logo size={30} />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map(({ href, key }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors ${
                  active ? "bg-ink text-card" : "text-muted hover:bg-input hover:text-ink"
                }`}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <HeaderJoin className="hidden md:flex lg:hidden xl:flex" />
          <ThemeLangButtons className="hidden lg:flex" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/** Her sayfada görünen oda kodu kutusu: 6 haneyi yaz, Enter'a bas, odaya gir */
function HeaderJoin({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const digits = code.replace(/\D/g, "").slice(0, 6);
  const ready = digits.length === 6;
  const shown = digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) {
          router.push(`/play/${digits}`);
          setCode("");
        }
      }}
      className={`h-10 items-center rounded-full border border-line bg-input pl-4 pr-1 transition focus-within:border-zec focus-within:bg-card focus-within:ring-2 focus-within:ring-zec/30 ${className}`}
    >
      <label className="sr-only" htmlFor="header-code">
        {t("room_code")}
      </label>
      <input
        id="header-code"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("header_code_placeholder")}
        className="w-[128px] bg-transparent text-[14px] font-semibold tabular-nums tracking-[0.06em] text-ink outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-soft"
      />
      <button
        disabled={!ready}
        aria-label={t("join")}
        className="flex h-8 items-center gap-1 rounded-full bg-zec px-3 text-[13px] font-semibold text-[#14161B] transition disabled:bg-transparent disabled:text-soft"
      >
        {t("join")}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

function ThemeLangButtons({ className = "" }: { className?: string }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  return (
    <div className={`items-center gap-0.5 ${className}`}>
      <button onClick={toggle} aria-label={t("theme")} className="rounded-full p-2 text-muted transition hover:bg-input hover:text-ink">
        {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
      <button
        onClick={() => setLang(lang === "tr" ? "en" : "tr")}
        className="flex items-center gap-1 rounded-full px-2 py-2 text-[13px] font-semibold text-muted transition hover:bg-input hover:text-ink"
        aria-label="Language"
      >
        <Globe className="h-[18px] w-[18px]" />
        {lang.toUpperCase()}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------
   Telefon: alt sekme çubuğu (ortada Katıl) ve menü paneli
   --------------------------------------------------------------------- */
function MobileTabBar({ pathname, onMenu }: { pathname: string; onMenu: () => void }) {
  const { t } = useI18n();

  const Tab = ({ href, label, Icon }: { href: string; label: string; Icon: typeof Home }) => {
    const active = isActive(href, pathname);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-ink" : "text-soft"}`}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} />
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-end px-2">
        <Tab href="/" label={t("nav_home")} Icon={Home} />
        <Tab href="/explore" label={t("nav_explore")} Icon={Compass} />
        <Link href="/join" className="flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-bold text-ink">
          <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-zec text-[#14161B] ring-4 ring-app">
            <Gamepad2 className="h-6 w-6" />
          </span>
          {t("join")}
        </Link>
        <Tab href="/leaderboard" label={t("nav_leaderboard")} Icon={Trophy} />
        <button onClick={onMenu} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-soft">
          <Menu className="h-[22px] w-[22px]" strokeWidth={1.8} />
          {t("menu")}
        </button>
      </div>
    </nav>
  );
}

function MobileMenu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const { t } = useI18n();
  const nav = useNav();
  const install = useInstallPrompt();
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-rise overflow-y-auto rounded-t-3xl bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <Logo size={26} />
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-input">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid grid-cols-2 gap-2">
          {nav.map(({ href, key, icon: Icon }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-[14px] font-semibold ${
                  active ? "border-ink bg-ink text-card" : "border-line bg-app text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line px-2 py-1">
          <ThemeLangButtons className="flex" />
          {install.available && (
            <button onClick={install.prompt} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-accent">
              <Download className="h-4 w-4" />
              {t("install_app")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   Hesap menüsü
   --------------------------------------------------------------------- */
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
      <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className="btn-ink ml-1 px-4 py-2">
        {t("sign_in")}
      </Link>
    );
  }

  const name = profile?.display_name || profile?.username || "…";
  const guest = !!profile?.is_guest;
  return (
    <div ref={ref} className="relative ml-1">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition hover:bg-input sm:pr-3" aria-label={t("nav_profile")}>
        <Avatar name={name} size={34} />
        <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:inline">{name}</span>
        {guest && <span className="hidden rounded-full bg-input px-2 py-0.5 text-[11px] font-semibold text-muted sm:inline">{t("guest_badge")}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-56 animate-pop overflow-hidden rounded-2xl border border-line bg-elevated p-1.5 shadow-card">
          {guest && <MenuLink href="/login" icon={User} label={t("guest_create_account")} />}
          {!guest && profile?.username && (
            <>
              {hasRole(profile, "creator") && <MenuLink href="/studio" icon={PenSquare} label={t("nav_studio")} />}
              {hasRole(profile, "admin") && <MenuLink href="/admin" icon={ShieldCheck} label={t("nav_admin")} />}
              <MenuLink href={`/u/${profile.username}`} icon={User} label={t("nav_profile")} />
              {SITE.competitions && <MenuLink href="/me/prizes" icon={Gift} label={t("nav_prizes")} />}
              <MenuLink href="/me" icon={Settings} label={t("nav_settings")} />
            </>
          )}
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#D93036] hover:bg-input"
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
      <Icon className="h-4 w-4 text-muted" />
      {label}
    </Link>
  );
}

/* ---------------------------------------------------------------------
   Alt bilgi
   --------------------------------------------------------------------- */
function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line bg-card pb-24 lg:pb-0">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo size={26} />
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{t("footer_about")}</p>
          <a href={SITE.promo.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[14px] font-semibold text-accent hover:underline">
            {t("footer_zcash_link")}
          </a>
        </div>
        <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-[14px] text-muted">
          <Link href="/organizers" className="hover:text-ink">
            {t("nav_organizers")}
          </Link>
          <Link href="/about" className="hover:text-ink">
            {t("nav_about")}
          </Link>
          <Link href="/explore" className="hover:text-ink">
            {t("nav_explore")}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {t("terms")}
          </Link>
          <Link href="/leaderboard" className="hover:text-ink">
            {t("nav_leaderboard")}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {t("privacy")}
          </Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 text-[13px] text-soft sm:px-6">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
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
