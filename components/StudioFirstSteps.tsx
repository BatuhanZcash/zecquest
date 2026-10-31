"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Copy, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { parseQuizJson } from "@/lib/quizImport";
import { Spinner } from "./ui";
import template from "@/samples/zcash-temelleri.json";

/** Stüdyo'daki ilk adımlar paneli: boş quiz, hazır şablondan kopya, rehber */
export function StudioFirstSteps({ onError }: { onError: (e: unknown) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const copyTemplate = async () => {
    setBusy(true);
    try {
      const [q] = parseQuizJson(JSON.stringify(template));
      const suffix = Math.random().toString(36).slice(2, 6);
      const r = await api.saveQuiz({
        ...q,
        id: undefined,
        slug: `${q.slug}-${suffix}`,
        title: { tr: `${t("template_copy_prefix_tr")} Zcash Temelleri`, en: `Zcash Fundamentals (${t("template_copy_suffix_en")})` },
        description: null,
      });
      router.push(`/studio/${r.id}`);
    } catch (e) {
      onError(e);
      setBusy(false);
    }
  };

  const Item = ({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode }) => (
    <div className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-accent">{icon}</span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 flex-1 text-[14px] leading-snug text-muted">{body}</p>
      <div className="mt-4">{action}</div>
    </div>
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="section-title">{t("first_steps_title")}</h2>
        <p className="text-sm text-muted">{t("first_steps_sub")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Item
          icon={<Copy className="h-5 w-5" />}
          title={t("fs_template_t")}
          body={t("fs_template_b")}
          action={
            <button onClick={copyTemplate} disabled={busy} className="btn-zec w-full py-2 text-sm">
              {busy ? <Spinner className="h-4 w-4 text-[#1A1506]" /> : <Copy className="h-4 w-4" />}
              {t("fs_template_cta")}
            </button>
          }
        />
        <Item
          icon={<Plus className="h-5 w-5" />}
          title={t("fs_blank_t")}
          body={t("fs_blank_b")}
          action={
            <Link href="/studio/new" className="btn-ghost w-full py-2 text-sm">
              <Plus className="h-4 w-4" /> {t("new_quiz")}
            </Link>
          }
        />
        <Item
          icon={<BookOpen className="h-5 w-5" />}
          title={t("fs_guide_t")}
          body={t("fs_guide_b")}
          action={
            <Link href="/organizers" className="btn-ghost w-full py-2 text-sm">
              {t("org_read_guide")}
            </Link>
          }
        />
      </div>
    </section>
  );
}
