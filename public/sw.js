/* ZecQuest service worker
 * - Uygulamayı kurulabilir yapar ve statik dosyaları önbelleğe alır (hızlı açılış)
 * - API / Supabase isteklerine ASLA dokunmaz: oyun verisi her zaman canlıdır
 * - Çevrimdışıyken sayfa açılmaya çalışılırsa basit bir çevrimdışı ekranı gösterir
 */
const VERSION = "zq-v2";
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png", "/manifest.webmanifest"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // Supabase vb. dış istekler: dokunma

  // Next.js derleme çıktıları değişmez (dosya adında hash var) → önce önbellek
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Sayfalar: her zaman ağdan; ağ yoksa çevrimdışı ekranı
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
});
