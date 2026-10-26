"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { CodeInput } from "@/components/JoinBox";
import { LogoMark } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

export default function JoinPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");
  const go = () => code.length === 6 && router.push(`/play/${code}`);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-4 sm:pt-12">
      <div className="card relative w-full overflow-hidden p-6 text-center sm:p-8">
        <LogoMark size={44} className="relative mx-auto" />
        <h1 className="relative mt-4 text-[20px] font-bold">{t("join_a_game")}</h1>
        <p className="relative mb-6 mt-1 text-sm text-muted">{t("join_sub")}</p>
        <CodeInput value={code} onChange={setCode} onEnter={go} autoFocus />
        <button onClick={go} disabled={code.length !== 6} className="btn-zec relative mt-6 w-full text-lg">
          <Gamepad2 className="h-5 w-5" />
          {t("join_btn")}
        </button>
      </div>
    </div>
  );
}
