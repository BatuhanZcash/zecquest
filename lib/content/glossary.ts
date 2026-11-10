// STUB — replaced by CONTENT agent
/** Minimal development stub for the glossary. Replaced at merge by the CONTENT agent's real file. */
import type { GlossaryTerm } from "./types";

const SPEC = { title: "Zcash Protocol Specification", url: "https://zips.z.cash/protocol/protocol.pdf", checked: "2026-11-10" };
const ZIP316 = { title: "ZIP 316: Unified Addresses and Unified Viewing Keys", url: "https://zips.z.cash/zip-0316", checked: "2026-11-10" };
const ZIP32 = { title: "ZIP 32: Shielded Hierarchical Deterministic Wallets", url: "https://zips.z.cash/zip-0032", checked: "2026-11-10" };

export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "zk-snark",
    term: "zk-SNARK",
    short: {
      en: "A short zero-knowledge proof that a statement is true, which anyone can check without learning the secret data behind it.",
      tr: "Bir ifadenin doğru olduğunu gösteren kısa bir sıfır bilgi ispatı; herkes arkasındaki gizli veriyi öğrenmeden denetleyebilir.",
    },
    body: [
      {
        en: "Zcash uses zk-SNARKs to prove that a shielded transaction follows the rules without revealing its sender, receiver or amount.",
        tr: "Zcash, shielded bir işlemin kurallara uyduğunu gönderen, alıcı ya da tutarı açığa çıkarmadan kanıtlamak için zk-SNARK kullanır.",
      },
    ],
    related: ["nullifier", "shielded-address"],
    sources: [SPEC],
  },
  {
    slug: "nullifier",
    term: "Nullifier",
    short: {
      en: "A value published when a shielded note is spent, so the same note cannot be spent twice.",
      tr: "Shielded bir not harcandığında yayınlanan ve aynı notun iki kez harcanmasını engelleyen değer.",
    },
    body: [
      {
        en: "Only the owner of a note can compute its nullifier, and an observer cannot link a nullifier to the note commitment it came from.",
        tr: "Bir notun nullifier'ını yalnızca sahibi hesaplayabilir ve bir gözlemci nullifier'ı geldiği not taahhüdüyle ilişkilendiremez.",
      },
    ],
    related: ["note", "zk-snark"],
    sources: [SPEC],
  },
  {
    slug: "note",
    term: "Note",
    short: { en: "The unit that holds shielded value, a bit like a coin in a wallet.", tr: "Shielded değeri tutan birim; cüzdandaki bir bozuk paraya benzer." },
    body: [
      {
        en: "A note records a value and who can spend it. The blockchain stores only a commitment to the note, not the note itself.",
        tr: "Bir not bir değeri ve onu kimin harcayabileceğini kaydeder. Blok zinciri notun kendisini değil, yalnızca ona ait bir taahhüdü saklar.",
      },
    ],
    related: ["nullifier"],
    sources: [SPEC],
  },
  {
    slug: "shielded-address",
    term: "Shielded address",
    short: { en: "An address whose transactions keep sender, receiver and amount encrypted.", tr: "İşlemlerinde gönderen, alıcı ve tutarı şifreli tutan adres." },
    body: [{ en: "Shielded addresses belong to the Sapling or Orchard protocols; since July 2026 new Orchard-type payments land in the Ironwood pool.", tr: "Shielded adresler Sapling ya da Orchard protokollerine aittir; Temmuz 2026'dan beri yeni Orchard tipi ödemeler Ironwood havuzuna gider." }],
    related: ["transparent-address", "unified-address"],
    sources: [SPEC],
  },
  {
    slug: "transparent-address",
    term: "Transparent address",
    short: {
      en: "An address starting with t whose transactions are fully public, like Bitcoin.",
      tr: "t ile başlayan ve işlemleri Bitcoin'deki gibi tamamen herkese açık olan adres.",
    },
    body: [
      {
        en: "Balances and transfers of transparent addresses can be read by anyone on a block explorer.",
        tr: "Transparent adreslerin bakiyeleri ve transferleri bir blok gezgininde herkes tarafından okunabilir.",
      },
    ],
    related: ["shielded-address"],
    sources: [SPEC],
  },
  {
    slug: "unified-address",
    term: "Unified address",
    short: { en: "One address starting with u1 that bundles several receiver types.", tr: "u1 ile başlayan ve birkaç alıcı türünü bir araya getiren tek adres." },
    body: [
      {
        en: "The sender's wallet picks the most private receiver that it supports.",
        tr: "Gönderenin cüzdanı, desteklediği en gizli alıcıyı seçer.",
      },
    ],
    related: ["shielded-address", "transparent-address"],
    sources: [ZIP316],
  },
  {
    slug: "viewing-key",
    term: "Viewing key",
    short: {
      en: "A key that lets someone see a wallet's shielded transactions without being able to spend.",
      tr: "Birinin, harcama yapamadan bir cüzdanın shielded işlemlerini görmesini sağlayan anahtar.",
    },
    body: [
      {
        en: "You might share a viewing key with an auditor. It never gives the power to move funds.",
        tr: "Bir görüntüleme anahtarını bir denetçiyle paylaşabilirsin. Asla fon taşıma yetkisi vermez.",
      },
    ],
    related: ["shielded-address"],
    sources: [ZIP32],
  },
];
