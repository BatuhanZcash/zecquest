"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  Eye,
  Gift,
  ListChecks,
  MonitorPlay,
  Search,
  Star,
  Users,
  X,
  Library,
} from "lucide-react";
import { useRequireAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { api, type AdminUser, type EventInput } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { countryName } from "@/lib/countries";
import { Alert, Avatar, ErrorBox, Flag, Field, PageLoader, Spinner, StatusChip } from "@/components/ui";
import { PrizeStatusChip } from "@/components/PrizeStatusChip";
import { formatCode } from "@/components/JoinBox";
import type { PrizeClaim, QuizCardData } from "@/lib/types";

type Tab = "overview" | "review" | "events" | "users" | "prizes" | "quizzes";

export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin />
    </Suspense>
  );
}

function Admin() {
  const { t } = useI18n();
  const auth = useRequireAuth("admin");
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "overview";

  if (auth.forbidden) return <ErrorBox message={t("err_admin_required")} />;
  if (!auth.ok) return <PageLoader />;

  const tabs: [Tab, string, typeof Users][] = [
    ["overview", t("tab_overview"), BarChart3],
    ["review", t("tab_review"), ListChecks],
    ["events", t("tab_events"), CalendarClock],
    ["users", t("tab_users"), Users],
    ["prizes", t("tab_prizes"), Gift],
    ["quizzes", t("tab_quizzes"), Library],
  ];

  return (
    <div className="space-y-5">
      <h1 className="page-title">{t("admin_title")}</h1>
      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => router.replace(`/admin?tab=${k}`)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === k ? "bg-zec text-[#1A1506]" : "bg-card text-muted ring-1 ring-line hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "review" && <Review />}
      {tab === "events" && <Events />}
      {tab === "users" && <UsersTab />}
      {tab === "prizes" && <Prizes />}
      {tab === "quizzes" && <AllQuizzes />}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Overview() {
  const { t, fmt } = useI18n();
  const { data } = useAsync(() => api.admin.stats(), []);
  if (!data) return <PageLoader />;
  const items: [string, number, string?][] = [
    [t("players"), data.users],
    ["+7d", data.users_7d],
    [t("status_published"), data.quizzes_published],
    [t("status_pending"), data.quizzes_pending, "review"],
    [t("creator_requests"), data.creator_requests, "users"],
    [t("live_now"), data.games_live, "events"],
    [t("upcoming"), data.events_upcoming, "events"],
    [t("prize_pending"), data.prizes_pending, "prizes"],
    [`${t("plays")} (7d)`, data.plays_7d],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([label, v, tab]) => {
        const inner = (
          <>
            <p className="tabular-nums text-3xl font-bold">{fmt(v ?? 0)}</p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </>
        );
        return tab ? (
          <Link key={label} href={`/admin?tab=${tab}`} className={`card p-4 transition hover:border-zec/60 ${v ? "ring-1 ring-zec/40" : ""}`}>
            {inner}
          </Link>
        ) : (
          <div key={label} className="card p-4">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Review() {
  const { t, lt, te } = useI18n();
  const { data, reload } = useAsync(() => api.admin.quizzes("pending"), []);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (q: QuizCardData, approve: boolean) => {
    if (!approve && !(notes[q.id] ?? "").trim()) return alert(t("reject_reason"));
    setBusy(q.id);
    try {
      await api.admin.review(q.id, approve, notes[q.id]);
      reload();
    } catch (e) {
      alert(te(e));
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <PageLoader />;
  if (!data.length) return <div className="card p-10 text-center text-muted">{t("nothing_to_review")}</div>;
  return (
    <div className="space-y-3">
      {data.map((q) => (
        <div key={q.id} className="card p-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{lt(q.title)}</h3>
              <p className="text-sm text-muted">
                {q.question_count} {t("questions")} · @{q.author?.username} ·{" "}
                {q.submitted_at && new Date(q.submitted_at).toLocaleString()}
              </p>
            </div>
            <Link href={`/quiz/${q.slug}`} target="_blank" className="btn-ghost px-3 py-1.5 text-sm">
              <Eye className="h-4 w-4" /> {t("preview")}
            </Link>
            <Link href={`/studio/${q.id}`} target="_blank" className="btn-ghost px-3 py-1.5 text-sm">
              {t("edit")}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={notes[q.id] ?? ""}
              onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
              placeholder={t("reject_reason")}
              className="input min-w-[200px] flex-1 py-2 text-sm"
            />
            <button onClick={() => act(q, false)} disabled={busy === q.id} className="btn-ghost py-2 text-sm text-[#E8742A]">
              <X className="h-4 w-4" /> {t("reject")}
            </button>
            <button onClick={() => act(q, true)} disabled={busy === q.id} className="btn-zec py-2 text-sm">
              {busy === q.id ? <Spinner className="h-4 w-4 text-[#1A1506]" /> : <Check className="h-4 w-4" />} {t("approve")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function AllQuizzes() {
  const { t, lt, te } = useI18n();
  const [status, setStatus] = useState<string>("published");
  const { data, reload } = useAsync(() => api.admin.quizzes(status || null), [status]);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      reload();
    } catch (e) {
      alert(te(e));
    }
  };
  return (
    <div className="space-y-3">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto cursor-pointer py-2 text-sm">
        <option value="">{t("filter_all")}</option>
        <option value="published">{t("status_published")}</option>
        <option value="pending">{t("status_pending")}</option>
        <option value="draft">{t("status_draft")}</option>
        <option value="rejected">{t("status_rejected")}</option>
      </select>
      {!data ? (
        <PageLoader />
      ) : (
        <div className="card divide-y divide-line">
          {data.map((q) => (
            <div key={q.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {q.featured && <Star className="h-4 w-4 fill-zec text-accent" />}
                  <Link href={`/quiz/${q.slug}`} className="truncate hover:text-accent">
                    {lt(q.title)}
                  </Link>
                </p>
                <p className="text-xs text-soft">
                  @{q.author?.username} · {q.question_count} {t("questions")} · {q.plays} {t("plays").toLowerCase()}
                </p>
              </div>
              <StatusChip status={q.status} />
              {q.status === "published" && (
                <>
                  <button onClick={() => run(() => api.admin.feature(q.id, !q.featured))} className="btn-ghost px-3 py-1.5 text-xs">
                    {q.featured ? t("unfeature") : t("feature")}
                  </button>
                  <button onClick={() => confirm(t("unpublish") + "?") && run(() => api.admin.unpublish(q.id))} className="btn-ghost px-3 py-1.5 text-xs text-[#E8742A]">
                    {t("unpublish")}
                  </button>
                </>
              )}
              <Link href={`/studio/${q.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                {t("edit")}
              </Link>
            </div>
          ))}
          {!data.length && <p className="p-6 text-center text-sm text-muted">{t("no_results")}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Events() {
  const { t, lt, te, fmt, lang } = useI18n();
  const quizzes = useAsync(() => api.admin.quizzes("published"), []);
  const games = useAsync(() => api.admin.games(), []);
  const [f, setF] = useState({
    quiz_id: "",
    title_tr: "",
    title_en: "",
    starts_at: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
    reveal_secs: 6,
    board_secs: 6,
    prize_tr: "",
    prize_en: "",
    prize_places: 3,
    visibility: "public" as "public" | "unlisted",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const p: EventInput = {
        quiz_id: f.quiz_id,
        title: { tr: f.title_tr, en: f.title_en || f.title_tr },
        starts_at: new Date(f.starts_at).toISOString(),
        reveal_secs: f.reveal_secs,
        board_secs: f.board_secs,
        prize: f.prize_tr || f.prize_en ? { tr: f.prize_tr, en: f.prize_en || f.prize_tr } : null,
        prize_places: f.prize_tr || f.prize_en ? f.prize_places : 0,
        visibility: f.visibility,
      };
      const r = await api.admin.createEvent(p);
      setMsg({ kind: "ok", text: `✓ ${formatCode(r.code)}` });
      games.reload();
    } catch (err) {
      setMsg({ kind: "error", text: te(err) });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm(t("confirm_cancel"))) return;
    try {
      await api.cancelGame(id);
      games.reload();
    } catch (e) {
      alert(te(e));
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
      <form onSubmit={create} className="card h-fit space-y-4 p-5">
        <h2 className="font-semibold">{t("create_event")}</h2>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <Field label={t("event_quiz")}>
          <select
            required
            value={f.quiz_id}
            onChange={(e) => {
              const q = quizzes.data?.find((x) => x.id === e.target.value);
              const tt = q?.title;
              setF({
                ...f,
                quiz_id: e.target.value,
                title_tr: f.title_tr || (typeof tt === "string" ? tt : tt?.tr ?? ""),
                title_en: f.title_en || (typeof tt === "string" ? tt : tt?.en ?? ""),
              });
            }}
            className="input cursor-pointer"
          >
            <option value="">—</option>
            {quizzes.data?.map((q) => (
              <option key={q.id} value={q.id}>
                {lt(q.title)} ({q.question_count})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t("event_title")} (TR)`}>
            <input required value={f.title_tr} onChange={(e) => setF({ ...f, title_tr: e.target.value })} className="input" />
          </Field>
          <Field label="(EN)">
            <input value={f.title_en} onChange={(e) => setF({ ...f, title_en: e.target.value })} className="input" />
          </Field>
        </div>
        <Field label={t("event_start")} hint={Intl.DateTimeFormat().resolvedOptions().timeZone}>
          <input required type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("reveal_secs")}>
            <input type="number" min={3} max={60} value={f.reveal_secs} onChange={(e) => setF({ ...f, reveal_secs: Number(e.target.value) })} className="input" />
          </Field>
          <Field label={t("board_secs")}>
            <input type="number" min={3} max={60} value={f.board_secs} onChange={(e) => setF({ ...f, board_secs: Number(e.target.value) })} className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t("prize_text")} (TR)`}>
            <input value={f.prize_tr} onChange={(e) => setF({ ...f, prize_tr: e.target.value })} placeholder="1.: 1 ZEC · 2.: 0.5 ZEC" className="input" />
          </Field>
          <Field label="(EN)">
            <input value={f.prize_en} onChange={(e) => setF({ ...f, prize_en: e.target.value })} placeholder="1st: 1 ZEC · 2nd: 0.5 ZEC" className="input" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("prize_places")}>
            <input type="number" min={0} max={10} value={f.prize_places} onChange={(e) => setF({ ...f, prize_places: Number(e.target.value) })} className="input" />
          </Field>
          <Field label={t("visibility")}>
            <select value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value as "public" | "unlisted" })} className="input cursor-pointer">
              <option value="public">{t("vis_public")}</option>
              <option value="unlisted">{t("vis_unlisted")}</option>
            </select>
          </Field>
        </div>
        <button disabled={busy} className="btn-zec w-full">
          {busy && <Spinner className="h-4 w-4 text-[#1A1506]" />}
          {t("create_event")}
        </button>
      </form>

      <div className="card divide-y divide-line">
        {!games.data ? (
          <PageLoader />
        ) : (
          games.data.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{lt(g.title) || lt(g.quiz?.title)}</p>
                <p className="text-xs text-soft">
                  {g.mode === "scheduled" ? t("nav_events") : t("host_live")} · {formatCode(g.code)} ·{" "}
                  {g.starts_at
                    ? new Date(g.starts_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")
                    : new Date(g.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}{" "}
                  · {t("players_n", { n: fmt(g.player_count) })} · @{g.host?.username}
                </p>
              </div>
              <span className="rounded-full bg-input px-2.5 py-0.5 text-xs font-bold uppercase text-muted">{g.status}</span>
              {g.status !== "ended" && g.status !== "cancelled" ? (
                <>
                  <Link href={`/host/${g.id}`} className="btn-ink px-3 py-1.5 text-xs">
                    <MonitorPlay className="h-3.5 w-3.5" /> {t("open_console")}
                  </Link>
                  <button onClick={() => cancel(g.id)} className="btn-ghost px-3 py-1.5 text-xs text-[#E8742A]">
                    {t("cancel_event")}
                  </button>
                </>
              ) : (
                g.status === "ended" && (
                  <Link href={`/results/${g.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                    {t("view_results")}
                  </Link>
                )
              )}
            </div>
          ))
        )}
        {games.data?.length === 0 && <p className="p-6 text-center text-sm text-muted">{t("no_events")}</p>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function UsersTab() {
  const { t, te, lang } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("requests");
  const { data, reload } = useAsync(() => api.admin.users(q, filter || null), [q, filter]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      reload();
    } catch (e) {
      alert(te(e));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="@username" className="input py-2 pl-10" />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-auto cursor-pointer py-2 text-sm">
          <option value="requests">{t("creator_requests")}</option>
          <option value="creators">{t("role_creator")}</option>
          <option value="admins">{t("role_admin")}</option>
          <option value="banned">{t("ban")}</option>
          <option value="">{t("filter_all")}</option>
        </select>
      </div>
      {!data ? (
        <PageLoader />
      ) : (
        <div className="card divide-y divide-line">
          {data.map((u: AdminUser) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar name={u.display_name || u.username || "?"} size={36} country={u.country} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {u.display_name} {u.username && <Link href={`/u/${u.username}`} className="tabular-nums text-sm text-muted hover:text-accent">@{u.username}</Link>}
                </p>
                <p className="text-xs text-soft">
                  {u.email} · {u.country ? <><Flag code={u.country} size={11} /> {countryName(u.country, lang)}</> : ""} {u.team ? `· ${u.team}` : ""}
                </p>
                {u.creator_request_at && u.role === "player" && <p className="mt-1 rounded-lg bg-tint p-2 text-sm">{u.creator_request_note}</p>}
              </div>
              <span className="rounded-full bg-input px-2.5 py-0.5 text-xs font-bold text-muted">
                {u.role === "admin" ? t("role_admin") : u.role === "creator" ? t("role_creator") : t("role_player")}
                {u.banned && ` · ${t("ban")}`}
              </span>
              {u.role === "player" && (
                <button onClick={() => run(() => api.admin.setRole(u.id, "creator"))} className="btn-zec px-3 py-1.5 text-xs">
                  {t("make_creator")}
                </button>
              )}
              {u.creator_request_at && u.role === "player" && (
                <button onClick={() => run(() => api.admin.rejectCreator(u.id))} className="btn-ghost px-3 py-1.5 text-xs">
                  {t("reject")}
                </button>
              )}
              {u.role === "creator" && (
                <>
                  <button onClick={() => run(() => api.admin.setRole(u.id, "player"))} className="btn-ghost px-3 py-1.5 text-xs">
                    {t("make_player")}
                  </button>
                  <button onClick={() => confirm(t("make_admin") + "?") && run(() => api.admin.setRole(u.id, "admin"))} className="btn-ghost px-3 py-1.5 text-xs">
                    {t("make_admin")}
                  </button>
                </>
              )}
              <button onClick={() => run(() => api.admin.setBanned(u.id, !u.banned))} className="btn-ghost px-3 py-1.5 text-xs text-[#E8742A]">
                {u.banned ? t("unban") : t("ban")}
              </button>
            </div>
          ))}
          {!data.length && <p className="p-6 text-center text-sm text-muted">{t("no_results")}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
function Prizes() {
  const { t, lt, te } = useI18n();
  const [status, setStatus] = useState<string>("pending");
  const { data, reload } = useAsync(() => api.admin.prizes(status || null), [status]);
  const [tx, setTx] = useState<Record<string, string>>({});

  const update = async (c: PrizeClaim, s: string) => {
    try {
      await api.admin.updatePrize(c.id, s, tx[c.id]);
      reload();
    } catch (e) {
      alert(te(e));
    }
  };

  return (
    <div className="space-y-3">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto cursor-pointer py-2 text-sm">
        <option value="pending">{t("prize_pending")}</option>
        <option value="awaiting_address">{t("prize_awaiting")}</option>
        <option value="paid">{t("prize_paid")}</option>
        <option value="void">{t("prize_void")}</option>
        <option value="">{t("filter_all")}</option>
      </select>
      {!data ? (
        <PageLoader />
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zec tabular-nums font-bold text-[#1A1506]">{c.place}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {c.user?.display_name} <span className="tabular-nums text-sm text-muted">@{c.user?.username}</span> <Flag code={c.user?.country} size={13} />
                  </p>
                  <p className="text-xs text-soft">
                    {lt(c.game.title)} · {lt(c.game.prize)}
                  </p>
                </div>
                <PrizeStatusChip status={c.status} />
              </div>
              {c.address && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-input px-3 py-2">
                  <code className="min-w-0 flex-1 break-all text-xs">{c.address}</code>
                  <button onClick={() => navigator.clipboard.writeText(c.address!)} className="rounded p-1.5 text-soft hover:text-accent" title={t("copy")}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              )}
              {c.txid && <p className="mt-2 break-all tabular-nums text-xs text-soft">txid: {c.txid}</p>}
              {c.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input value={tx[c.id] ?? ""} onChange={(e) => setTx({ ...tx, [c.id]: e.target.value })} placeholder={t("txid")} className="input min-w-[200px] flex-1 py-2 tabular-nums text-xs" />
                  <button onClick={() => update(c, "paid")} className="btn-zec py-2 text-sm">
                    <Check className="h-4 w-4" /> {t("mark_paid")}
                  </button>
                  <button onClick={() => confirm(t("void_prize") + "?") && update(c, "void")} className="btn-ghost py-2 text-sm text-[#E8742A]">
                    {t("void_prize")}
                  </button>
                </div>
              )}
            </div>
          ))}
          {!data.length && <div className="card p-6 text-center text-sm text-muted">{t("no_results")}</div>}
        </div>
      )}
    </div>
  );
}
