"use client";

import { useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Spinner } from "./ui";

export const COVER_BUCKET = "quiz-covers";
const OUT_W = 1280;
const OUT_H = 720;

/** Görseli 16:9 olarak ortadan kırpar, 1280×720'ye küçültür ve WEBP'ye çevirir */
async function toCoverBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const target = OUT_W / OUT_H;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    let sx = 0;
    let sy = 0;
    if (sw / sh > target) {
      const w = sh * target;
      sx = (sw - w) / 2;
      sw = w;
    } else {
      const h = sw / target;
      sy = (sh - h) / 2;
      sh = h;
    }
    const scale = Math.min(1, OUT_W / sw);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
    if (blob && blob.type === "image/webp") return blob;
    // WEBP desteklemeyen tarayıcılar için JPEG
    const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!jpg) throw new Error("encode");
    return jpg;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Stüdyo: quiz kapak fotoğrafı seçme / yükleme / kaldırma */
export function CoverUpload({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/i.test(file.type)) {
      setError(t("err_cover_type"));
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("auth");
      const blob = await toCoverBlob(file);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${u.user.id}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(COVER_BUCKET).upload(path, blob, {
        contentType: blob.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) throw upErr;
      onChange(supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch {
      setError(t("err_cover_upload"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {value ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-input">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Spinner />
            </div>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-ghost bg-card/95 px-3 py-1.5 text-[13px] backdrop-blur">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("cover_change")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(null)}
              className="btn-ghost bg-card/95 px-3 py-1.5 text-[13px] text-[#D93036] backdrop-blur"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("cover_remove")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition ${
            drag ? "border-zec bg-tint" : "border-line bg-input/50 hover:border-zec/60 hover:bg-tint"
          }`}
        >
          {busy ? (
            <Spinner />
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tint text-accent">
                <ImagePlus className="h-6 w-6" />
              </span>
              <span className="text-[14px] font-semibold">{t("cover_upload")}</span>
              <span className="text-[13px] text-muted">{t("cover_drop")}</span>
            </>
          )}
        </button>
      )}
      <p className={`mt-2 text-[12.5px] ${error ? "font-medium text-[#D93036]" : "text-soft"}`}>{error ?? t("cover_hint")}</p>
    </div>
  );
}
