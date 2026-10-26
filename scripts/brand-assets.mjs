// Uygulama ikonlarını (PWA) ve paylaşım görselini (og.png) üretir.
// public/brand/zcash-mark.svg varsa resmi logo kullanılır; yoksa sade "ZEC" rozeti.
// Kullanım: npm run brand
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = new URL("..", import.meta.url).pathname;
const pub = join(root, "public");
const configSrc = readFileSync(join(root, "lib/config.ts"), "utf8");
const NAME = configSrc.match(/name:\s*"([^"]+)"/)?.[1] ?? "App";
const markPath = join(pub, "brand/zcash-mark.svg");
const hasMark = existsSync(markPath);

const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

async function markPng(size) {
  if (hasMark) return sharp(readFileSync(markPath), { density: 600 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#F4B728"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${size * 0.3}" fill="#1A1506">ZEC</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function icon(file, size, padRatio, bg, radius) {
  const inner = Math.round(size * (1 - 2 * padRatio));
  const base = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius * size}" fill="${bg}"/></svg>`
  );
  await sharp(base)
    .composite([{ input: await markPng(inner), gravity: "center" }])
    .png()
    .toFile(join(pub, file));
}

async function og() {
  const W = 1200, H = 630;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#F6F6F4"/>
    <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#F4B728"/>
    <text x="80" y="250" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="84" fill="#161513">${esc(NAME)}</text>
    <text x="80" y="330" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="#161513">Live Zcash quiz competitions</text>
    <text x="80" y="390" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#6B6A66">Join from anywhere. Answer in real time. Win ZEC.</text>
  </svg>`);
  await sharp(bg)
    .composite([{ input: await markPng(260), left: W - 80 - 260, top: Math.round((H - 260) / 2) - 7 }])
    .png()
    .toFile(join(pub, "og.png"));
}

mkdirSync(join(pub, "icons"), { recursive: true });
await icon("icons/icon-192.png", 192, 0.16, "#1A1A1A", 0.22);
await icon("icons/icon-512.png", 512, 0.16, "#1A1A1A", 0.22);
await icon("icons/maskable-512.png", 512, 0.26, "#1A1A1A", 0);
await icon("icons/apple-touch-icon.png", 180, 0.16, "#1A1A1A", 0);
await icon("favicon.png", 64, 0.06, "#00000000", 0);
await og();
console.log(hasMark ? "✓ Resmi logo ile üretildi" : "• Logo bulunamadı (public/brand/zcash-mark.svg) — geçici rozet kullanıldı");
