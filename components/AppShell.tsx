"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookA,
  BookOpen,
  CalendarDays,
  Compass,
  Download,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hash,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Newspaper,
  PenSquare,
  Settings,
  ShieldCheck,
  ShieldQuestion,
  Sun,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { Avatar } from "./ui";
import { LevelRing } from "./LevelBadge";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth, hasRole } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase";
import { SITE } from "@/lib/config";
import { useInstallPrompt } from "@/lib/pwa";
import { ProgressProvider, levelTitleKey, useMyProgress } from "@/lib/progress";
import type { Role } from "@/lib/types";

type Icon = typeof Home;
type SubItem = { href: string; key: DictKey; desc?: DictKey; icon: Icon; role?: Role };
type Section = { key: DictKey; href: string; icon: Icon; match: RegExp; items: SubItem[] };

/**
 * Bilgi mimarisi: Gündem · Öğren · Oyna · Topluluk.
 * Her bölümün bir merkez sayfası (href) ve alt bağlantıları var; eski sayfaların hepsi bir bölümün altında.
 */
const SECTIONS: Section[] = [
  {
    key: "home_nav_news",
    href: "/news",
    icon: Newspaper,
    match: /^\/news/,
    items: [],
  },
  {
    key: "home_nav_learn",
    href: "/learn",
    icon: GraduationCap,
    match: /^\/(learn|glossary|about)/,
    items: [
      { href: "/learn", key: "home_nav_lessons", desc: "home_nav_lessons_d", icon: BookOpen },
      { href: "/glossary", key: "home_nav_glossary", desc: "home_nav_glossary_d", icon: BookA },
      { href: "/about", key: "nav_about", desc: "home_nav_about_d", icon: ShieldQuestion },
    ],
  },
  {
    key: "home_nav_play",
    href: "/games",
    icon: Gamepad2,
    match: /^\/(games|arena|explore|quiz|solo|join|leaderboard|results)/,
    items: [
      { href: "/explore", key: "home_nav_quizzes", desc: "home_nav_quizzes_d", icon: Compass },
      { href: "/arena", key: "home_nav_arena", desc: "home_nav_arena_d", icon: Swords },
      { href: "/join", key: "home_nav_join", desc: "home_nav_join_d", icon: Hash },
      { href: "/leaderboard", key: "nav_leaderboard", desc: "home_nav_leaderboard_d", icon: Trophy },
    ],
  },
  {
    key: "home_nav_community",
    href: "/community",
    icon: Users,
    match: /^\/(community|organizers)/,
    items: [
      { href: "/community", key: "home_nav_meetups", desc: "home_nav_meetups_d", icon: CalendarDays },
      { href: "/organizers", key: "nav_organizers", desc: "home_nav_organizers_d", icon: Megaphone },
      { href: "/community/manage", key: "community_manage", desc: "home_nav_manage_d", icon: PenSquare, role: "creator" },
    ],
  },
];

/** Projeksiyon (host) ve telefon (play) ekranları kabuksuz, tam ekran çalışır */
const BARE = [/^\/host\//, /^\/play\//];

const sectionActive = (s: Section, path: string) => s.match.test(path);

function useCanSee() {
  const { profile } = useAuth();
  return (role?: Role) => !role || (hasRole(profile, role) && !profile?.is_guest);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [pathname]);

  if (BARE.some((r) => r.test(pathname))) return <>{children}</>;

  return (
    <ProgressProvider>
      <div className="flex min-h-screen flex-col bg-app">
        <SkipLink />
        <TopNav pathname={pathname} onMenu={() => setMenu(true)} />
        {!isConfigured && <ConfigBanner />}
        <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-16 lg:pt-8">
          {children}
        </main>
        <Footer />
        <MobileTabBar pathname={pathname} />
        {menu && <MobileMenu pathname={pathname} onClose={() => setMenu(false)} />}
      </div>
    </ProgressProvider>
  );
}

function SkipLink() {
  const { t } = useI18n();
  return (
    <a href="#main" className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-card focus:not-sr-only focus:fixed focus:left-4 focus:top-3">
      {t("home_skip")}
    </a>
  );
}

function ConfigBanner() {
  const { t } = useI18n();
  return <div className="border-b border-line bg-tint px-4 py-2 text-center text-[13px] font-medium text-accent">{t("err_not_configured")}</div>;
}

/* ---------------------------------------------------------------------
   Üst menü: logo, dört bölüm (açılır panelli), oda kodu kutusu, tema/dil, seviye, hesap
   --------------------------------------------------------------------- */
function TopNav({ pathname, onMenu }: { pathname: string; onMenu: () => void }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
        <Link href="/" aria-label={SITE.name} className="shrink-0 rounded-lg">
          <Logo size={30} />
        </Link>

        <nav className="ml-5 hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {SECTIONS.map((s) => (
            <NavSection key={s.href} s={s} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <HeaderJoin className="hidden md:flex lg:hidden xl:flex" />
          <Link
            href="/join"
            className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-semibold text-ink md:hidden"
            aria-label={t("home_nav_join")}
          >
            <Hash className="h-4 w-4 text-accent" />
            {t("home_code_short")}
          </Link>
          <ThemeLangButtons className="hidden lg:flex" />
          <LevelChip />
          <UserMenu />
          <button
            onClick={onMenu}
            aria-label={t("menu")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-input hover:text-ink lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

/** Masaüstü bölüm bağlantısı + üzerine gelince / odaklanınca açılan alt panel */
function NavSection({ s, pathname }: { s: Section; pathname: string }) {
  const { t } = useI18n();
  const canSee = useCanSee();
  const active = sectionActive(s, pathname);
  const items = s.items.filter((i) => canSee(i.role));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => items.length && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => items.length && setOpen(true)}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget as Node) && setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <Link
        href={s.href}
        aria-current={active ? "page" : undefined}
        aria-expanded={items.length ? open : undefined}
        className={`relative flex h-10 items-center whitespace-nowrap rounded-full px-3.5 text-[14.5px] font-semibold transition-colors ${
          active ? "text-ink" : "text-muted hover:text-ink"
        }`}
      >
        {t(s.key)}
        {active && <span aria-hidden className="absolute inset-x-3.5 -bottom-[13px] h-[3px] rounded-t-full bg-zec" />}
      </Link>
      {open && items.length > 0 && (
        <div className="absolute left-0 top-full z-40 pt-2">
          <div className="w-[300px] animate-pop rounded-2xl border border-line bg-elevated p-1.5 shadow-card">
            {items.map(({ href, key, desc, icon: I }) => {
              const here = pathname === href || (href !== "/community" && pathname.startsWith(href + "/"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={here ? "page" : undefined}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-input focus-visible:bg-input"
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${here ? "bg-zec text-[#14161B]" : "bg-tint text-accent"}`}>
                    <I className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{t(key)}</span>
                    {desc && <span className="block text-[12.5px] leading-snug text-muted">{t(desc)}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
        className="w-[118px] bg-transparent text-[14px] font-semibold tabular-nums tracking-[0.06em] text-ink outline-none placeholder:font-medium placeholder:tracking-normal placeholder:text-soft"
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

/** Kabukta küçük seviye göstergesi: halka = seviye içi ilerleme */
function LevelChip() {
  const { t, fmt } = useI18n();
  const { progress } = useMyProgress();
  if (!progress) return null;
  const title = t(levelTitleKey(progress.level));
  return (
    <Link
      href="/me#progress"
      title={`${title} · ${fmt(progress.xp)} XP`}
      aria-label={`${t("home_level_n", { n: progress.level })}, ${title}, ${fmt(progress.xp)} XP`}
      className="flex h-9 items-center gap-1.5 rounded-full pl-0.5 pr-2.5 text-[13px] font-bold text-ink transition hover:bg-input"
    >
      <LevelRing progress={progress} size={32} />
      <span className="hidden tabular-nums sm:inline">{fmt(progress.xp)} XP</span>
    </Link>
  );
}

/* ---------------------------------------------------------------------
   Telefon: alt sekme çubuğu ve menü paneli
   --------------------------------------------------------------------- */
function MobileTabBar({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  const tabs: { href: string; label: string; Icon: Icon; active: boolean }[] = [
    { href: "/", label: t("nav_home"), Icon: Home, active: pathname === "/" },
    ...SECTIONS.map((s) => ({ href: s.href, label: t(s.key), Icon: s.icon, active: sectionActive(s, pathname) })),
  ];
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch px-1">
        {tabs.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold ${active ? "text-ink" : "text-soft"}`}
          >
            {active && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-zec" />}
            <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function MobileMenu({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const { t } = useI18n();
  const canSee = useCanSee();
  const install = useInstallPrompt();
  const { profile } = useAuth();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const extra: SubItem[] = [
    { href: "/studio", key: "nav_studio", icon: PenSquare, role: "creator" },
    { href: "/admin", key: "nav_admin", icon: ShieldCheck, role: "admin" },
    { href: "/admin/news", key: "home_nav_news_editor", icon: Newspaper, role: "admin" },
  ];

  const Item = ({ href, label, Icon }: { href: string; label: string; Icon: Icon }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold ${active ? "bg-ink text-card" : "text-ink hover:bg-input"}`}
      >
        <Icon className={`h-[18px] w-[18px] ${active ? "" : "text-muted"}`} />
        {label}
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("menu")}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] animate-rise overflow-y-auto rounded-t-3xl bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 outline-none"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-2 flex items-center justify-between">
          <Logo size={26} />
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-input">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.filter((s) => s.items.length).map((s) => (
            <div key={s.href}>
              <p className="px-3 pb-1 pt-2 text-[12.5px] font-semibold text-soft">{t(s.key)}</p>
              {s.items
                .filter((i) => canSee(i.role))
                .map((i) => (
                  <Item key={i.href} href={i.href} label={t(i.key)} Icon={i.icon} />
                ))}
            </div>
          ))}
          {profile && !profile.is_guest && extra.some((i) => canSee(i.role)) && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[12.5px] font-semibold text-soft">{t("home_nav_tools")}</p>
              {extra
                .filter((i) => canSee(i.role))
                .map((i) => (
                  <Item key={i.href} href={i.href} label={t(i.key)} Icon={i.icon} />
                ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-line px-2 py-1">
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
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-input xl:pr-3"
        aria-label={t("nav_profile")}
      >
        <Avatar name={name} size={34} />
        <span className="hidden max-w-[120px] truncate text-sm font-semibold xl:inline">{name}</span>
        {guest && <span className="hidden rounded-full bg-input px-2 py-0.5 text-[11px] font-semibold text-muted sm:inline">{t("guest_badge")}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-56 animate-pop overflow-hidden rounded-2xl border border-line bg-elevated p-1.5 shadow-card">
          {guest && <MenuLink href="/login" icon={User} label={t("guest_create_account")} />}
          {!guest && profile?.username && (
            <>
              <MenuLink href={`/u/${profile.username}`} icon={User} label={t("nav_profile")} />
              <MenuLink href="/me" icon={Settings} label={t("nav_settings")} />
              {hasRole(profile, "creator") && <MenuLink href="/studio" icon={PenSquare} label={t("nav_studio")} />}
              {hasRole(profile, "creator") && <MenuLink href="/community/manage" icon={CalendarDays} label={t("community_manage")} />}
              {hasRole(profile, "admin") && <MenuLink href="/admin" icon={ShieldCheck} label={t("nav_admin")} />}
              {hasRole(profile, "admin") && <MenuLink href="/admin/news" icon={Newspaper} label={t("home_nav_news_editor")} />}
              {SITE.competitions && <MenuLink href="/me/prizes" icon={Gift} label={t("nav_prizes")} />}
            </>
          )}
          <button
            role="menuitem"
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

function MenuLink({ href, icon: Icon, label }: { href: string; icon: Icon; label: string }) {
  return (
    <Link role="menuitem" href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-input">
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
  const cols: { title: DictKey; links: [string, DictKey][] }[] = [
    { title: "home_nav_learn", links: [["/learn", "home_nav_lessons"], ["/glossary", "home_nav_glossary"], ["/about", "nav_about"], ["/news", "home_nav_news"]] },
    { title: "home_nav_play", links: [["/explore", "home_nav_quizzes"], ["/arena", "home_nav_arena"], ["/leaderboard", "nav_leaderboard"]] },
    { title: "home_nav_community", links: [["/community", "home_nav_meetups"], ["/organizers", "nav_organizers"], ["/terms", "terms"], ["/privacy", "privacy"]] },
  ];
  return (
    <footer className="border-t border-line bg-card pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,3fr)]">
        <div className="max-w-sm">
          <Logo size={26} />
          <p className="mt-3 text-[14px] leading-relaxed text-muted">{t("home_footer_about")}</p>
          <a href={SITE.promo.href} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[14px] font-semibold text-accent hover:underline">
            {t("footer_zcash_link")}
          </a>
        </div>
        <div className="grid grid-cols-3 gap-4">
        {cols.map((c) => (
          <nav key={c.title} aria-label={t(c.title)} className="text-[14px]">
            <p className="mb-3 font-semibold text-ink">{t(c.title)}</p>
            <ul className="space-y-2 text-muted">
              {c.links.map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-ink">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        </div>
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
