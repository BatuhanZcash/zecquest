"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "./ui";

/** Kapalı bir özelliğin sayfasına gelenleri başka bir sayfaya gönderir */
export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <PageLoader />;
}
