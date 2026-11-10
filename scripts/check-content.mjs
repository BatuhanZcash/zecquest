// Validates lib/content: glossary links, quiz answers, sources, translations.
// Usage: node scripts/check-content.mjs
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "lib/content");
const out = mkdtempSync(join(tmpdir(), "zl-content-"));
for (const f of readdirSync(srcDir).filter((f) => f.endsWith(".ts"))) {
  const js = ts.transpileModule(readFileSync(join(srcDir, f), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  writeFileSync(join(out, f.replace(/\.ts$/, ".js")), js);
}
const { GLOSSARY } = require(join(out, "glossary.js"));
const { TRACKS } = require(join(out, "lessons.js"));

const errors = [];
const slugs = new Set();
const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const loc = (x, where) => {
  if (!x || typeof x.en !== "string" || !x.en.trim() || typeof x.tr !== "string" || !x.tr.trim())
    errors.push(`${where}: missing en/tr text`);
};
const srcs = (list, where) => {
  if (!Array.isArray(list) || list.length < 1) errors.push(`${where}: needs >=1 source`);
  for (const s of list || [])
    if (!/^https:\/\//.test(s.url) || !/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) errors.push(`${where}: bad source ${s.url}`);
};

for (const g of GLOSSARY) {
  if (!kebab.test(g.slug)) errors.push(`glossary ${g.slug}: slug not kebab-case`);
  if (slugs.has(g.slug)) errors.push(`glossary ${g.slug}: duplicate`);
  slugs.add(g.slug);
}
for (const g of GLOSSARY) {
  loc(g.short, `glossary ${g.slug}.short`);
  g.body.forEach((b, i) => loc(b, `glossary ${g.slug}.body[${i}]`));
  for (const r of g.related) if (!slugs.has(r)) errors.push(`glossary ${g.slug}: related '${r}' missing`);
  if (g.related.includes(g.slug)) errors.push(`glossary ${g.slug}: relates to itself`);
  srcs(g.sources, `glossary ${g.slug}`);
}

const FIGS = new Set([
  "shielded-vs-transparent", "value-pools-timeline", "note-nullifier", "unified-address",
  "upgrade-timeline", "funding-flow", "wallet-safety", "zkp-intuition",
]);
let lessons = 0, questions = 0;
const trackSlugs = new Set();
for (const t of TRACKS) {
  if (!kebab.test(t.slug) || trackSlugs.has(t.slug)) errors.push(`track ${t.slug}: bad/duplicate slug`);
  trackSlugs.add(t.slug);
  loc(t.title, `track ${t.slug}.title`);
  loc(t.summary, `track ${t.slug}.summary`);
  const ls = new Set();
  for (const l of t.lessons) {
    const w = `${t.slug}/${l.slug}`;
    lessons++;
    if (!kebab.test(l.slug) || ls.has(l.slug)) errors.push(`${w}: bad/duplicate slug`);
    ls.add(l.slug);
    loc(l.title, `${w}.title`);
    loc(l.summary, `${w}.summary`);
    if (l.minutes < 5 || l.minutes > 10) errors.push(`${w}: minutes ${l.minutes} outside 5–10`);
    l.blocks.forEach((b, i) => {
      const bw = `${w}.blocks[${i}]`;
      if (b.type === "term" && !slugs.has(b.slug)) errors.push(`${bw}: term '${b.slug}' missing`);
      if (b.type === "figure") {
        if (!FIGS.has(b.key)) errors.push(`${bw}: unknown figure key ${b.key}`);
        loc(b.caption, bw);
      }
      if (b.type === "p" || b.type === "h" || b.type === "callout") loc(b.text, bw);
      if (b.type === "list") b.items.forEach((it, j) => loc(it, `${bw}.items[${j}]`));
    });
    if (l.quiz.length < 3 || l.quiz.length > 5) errors.push(`${w}: quiz should have 3–5 questions`);
    l.quiz.forEach((q, i) => {
      questions++;
      const qw = `${w}.quiz[${i}]`;
      loc(q.q, qw);
      loc(q.explain, `${qw}.explain`);
      q.options.forEach((o, j) => loc(o, `${qw}.options[${j}]`));
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
        errors.push(`${qw}: answer index ${q.answer} invalid`);
    });
    srcs(l.sources, w);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
const dist = [0, 0, 0, 0, 0];
for (const t of TRACKS) for (const l of t.lessons) for (const q of l.quiz) dist[q.answer]++;
console.log(`OK: ${GLOSSARY.length} terms, ${TRACKS.length} tracks, ${lessons} lessons, ${questions} questions`);
console.log(`answer positions: ${dist.slice(0, 4).join(" / ")}`);
if (process.argv.includes("--show")) {
  for (const t of TRACKS)
    for (const l of t.lessons)
      for (const q of l.quiz) console.log(`- ${q.q.en}\n    ✓ ${q.options[q.answer].en}`);
}
