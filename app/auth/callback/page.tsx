"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Spinner, ErrorBox } from "@/components/ui";
import Link from "next/link";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}

/** Google / e-posta bağlantısından dönüş: oturumu tamamla ve yönlendir */
function Callback() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const raw = params.get("next") || "/";
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    if (params.get("error")) {
      setFailed(true);
      return;
    }
    let done = false;
    const finish = async () => {
      if (done) return;
      done = true;
      const p = await api.myProfile().catch(() => null);
      router.replace(p?.username ? next : `/onboarding?next=${encodeURIComponent(next)}`);
    };
    // supabase-js URL'deki kodu otomatik olarak oturuma çevirir
    supabase.auth.getSession().then(({ data }) => data.session && finish());
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => s && finish());
    const timeout = setTimeout(() => !done && setFailed(true), 15000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [params, router]);

  if (failed)
    return (
      <ErrorBox
        message={t("err_generic")}
        action={
          <Link href="/login" className="btn-zec">
            {t("sign_in")}
          </Link>
        }
      />
    );
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-8 w-8" />
      {t("signing_in")}
    </div>
  );
}
