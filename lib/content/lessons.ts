// STUB — replaced by CONTENT agent
/**
 * Minimal development stub so the Learn pages can be built and tested.
 * Replaced at merge by the CONTENT agent's real lessons file.
 */
import type { Track } from "./types";

const ZCASH_LEARN = { title: "Zcash — Learn", url: "https://z.cash/learn/", checked: "2026-11-10" };
const PROTOCOL_SPEC = { title: "Zcash Protocol Specification", url: "https://zips.z.cash/protocol/protocol.pdf", checked: "2026-11-10" };

export const TRACKS: Track[] = [
  {
    slug: "zcash-basics",
    title: { en: "Zcash basics", tr: "Zcash temelleri" },
    summary: {
      en: "What Zcash is and how shielded transactions keep payment details private.",
      tr: "Zcash nedir ve shielded işlemler ödeme ayrıntılarını nasıl gizli tutar.",
    },
    level: "beginner",
    lessons: [
      {
        slug: "what-is-zcash",
        title: { en: "What is Zcash?", tr: "Zcash nedir?", es: "¿Qué es Zcash?" },
        summary: {
          en: "A digital currency that uses zero-knowledge proofs to protect payment privacy.",
          tr: "Ödeme gizliliğini korumak için sıfır bilgi ispatları kullanan bir dijital para.",
        },
        minutes: 4,
        blocks: [
          {
            type: "p",
            text: {
              en: "Zcash is a digital currency that launched in 2016. Like Bitcoin, it has a public blockchain and a supply capped at 21 million coins.",
              tr: "Zcash, 2016'da başlatılan bir dijital paradır. Bitcoin gibi herkese açık bir blok zinciri ve 21 milyon coin ile sınırlı bir arzı vardır.",
              es: "Zcash es una moneda digital que se lanzó en 2016. Como Bitcoin, tiene una cadena de bloques pública y un suministro limitado a 21 millones de monedas.",
            },
          },
          { type: "h", text: { en: "Privacy through cryptography", tr: "Kriptografiyle gizlilik" } },
          {
            type: "p",
            text: {
              en: "Zcash can keep the sender, the receiver and the amount of a payment encrypted on the blockchain, while the network still checks that the payment is valid.",
              tr: "Zcash bir ödemenin göndericisini, alıcısını ve tutarını blok zincirinde şifreli tutabilir; ağ yine de ödemenin geçerli olduğunu denetler.",
            },
          },
          { type: "term", slug: "zk-snark" },
          {
            type: "figure",
            key: "zkp-intuition",
            caption: { en: "Proving you know something without revealing it.", tr: "Bir şeyi bildiğini, onu açığa çıkarmadan kanıtlamak." },
          },
          { type: "h", text: { en: "Two kinds of addresses", tr: "İki tür adres" } },
          {
            type: "list",
            items: [
              {
                en: "Transparent addresses start with t and work like Bitcoin addresses: everything is public.",
                tr: "Transparent adresler t ile başlar ve Bitcoin adresleri gibi çalışır: her şey herkese açıktır.",
              },
              { en: "Shielded addresses keep transaction details encrypted.", tr: "Shielded adresler işlem ayrıntılarını şifreli tutar." },
            ],
          },
          {
            type: "callout",
            tone: "tip",
            text: { en: "Modern wallets give you a unified address that starts with u1.", tr: "Güncel cüzdanlar u1 ile başlayan birleşik bir adres verir." },
          },
        ],
        quiz: [
          {
            q: { en: "In which year did Zcash launch?", tr: "Zcash hangi yıl başlatıldı?" },
            options: [
              { en: "2009", tr: "2009" },
              { en: "2014", tr: "2014" },
              { en: "2016", tr: "2016" },
              { en: "2020", tr: "2020" },
            ],
            answer: 2,
            explain: { en: "Zcash launched in 2016.", tr: "Zcash 2016'da başlatıldı." },
          },
          {
            q: { en: "What is the maximum supply of ZEC?", tr: "ZEC'in azami arzı nedir?" },
            options: [
              { en: "21 million", tr: "21 milyon" },
              { en: "42 million", tr: "42 milyon" },
              { en: "100 million", tr: "100 milyon" },
              { en: "Unlimited", tr: "Sınırsız" },
            ],
            answer: 0,
            explain: { en: "Like Bitcoin, Zcash supply is capped at 21 million.", tr: "Bitcoin gibi Zcash'in arzı 21 milyonla sınırlıdır." },
          },
          {
            q: {
              en: "What lets the network check a shielded payment without seeing its details?",
              tr: "Ağın shielded bir ödemeyi ayrıntılarını görmeden denetlemesini ne sağlar?",
            },
            options: [
              { en: "A trusted bank", tr: "Güvenilir bir banka" },
              { en: "Zero-knowledge proofs", tr: "Sıfır bilgi ispatları" },
              { en: "Mixing services", tr: "Karıştırma servisleri" },
              { en: "Longer block times", tr: "Daha uzun blok süreleri" },
            ],
            answer: 1,
            explain: {
              en: "Zero-knowledge proofs show a statement is true without revealing the data behind it.",
              tr: "Sıfır bilgi ispatları, bir ifadenin doğru olduğunu arkasındaki veriyi açığa çıkarmadan gösterir.",
            },
          },
          {
            q: { en: "A transparent address starts with…", tr: "Transparent bir adres şununla başlar…" },
            options: [
              { en: "u1", tr: "u1" },
              { en: "zs", tr: "zs" },
              { en: "t", tr: "t" },
              { en: "0x", tr: "0x" },
            ],
            answer: 2,
            explain: { en: "Transparent addresses start with t.", tr: "Transparent adresler t ile başlar." },
          },
        ],
        sources: [ZCASH_LEARN],
      },
      {
        slug: "shielded-transactions",
        title: { en: "Shielded transactions", tr: "Shielded işlemler" },
        summary: {
          en: "What an observer can and cannot see when you pay from a shielded address.",
          tr: "Shielded bir adresten ödeme yaptığında bir gözlemci neyi görür, neyi göremez.",
        },
        minutes: 5,
        blocks: [
          {
            type: "p",
            text: {
              en: "On a transparent transaction, anyone can read the addresses and the amount. On a shielded transaction, those details are encrypted.",
              tr: "Transparent bir işlemde herkes adresleri ve tutarı okuyabilir. Shielded bir işlemde bu ayrıntılar şifrelidir.",
            },
          },
          {
            type: "figure",
            key: "shielded-vs-transparent",
            caption: { en: "The same kind of payment, seen on a block explorer.", tr: "Aynı türden bir ödeme, bir blok gezgininde." },
          },
          { type: "h", text: { en: "Notes and nullifiers", tr: "Notlar ve nullifier'lar" } },
          {
            type: "p",
            text: {
              en: "Shielded funds are held as notes. Spending a note publishes a nullifier, which stops the same note from being spent twice without revealing which note it was.",
              tr: "Shielded fonlar not olarak tutulur. Bir notu harcamak bir nullifier yayınlar; bu, aynı notun iki kez harcanmasını hangi not olduğunu açığa çıkarmadan engeller.",
            },
          },
          {
            type: "figure",
            key: "note-nullifier",
            caption: {
              en: "Commitments go in, nullifiers come out, and the two can't be linked.",
              tr: "Taahhütler girer, nullifier'lar çıkar ve ikisi birbirine bağlanamaz.",
            },
          },
          { type: "term", slug: "nullifier" },
          { type: "h", text: { en: "Value pools", tr: "Değer havuzları" } },
          { type: "figure", key: "value-pools-timeline", caption: { en: "Zcash value pools over time.", tr: "Zaman içinde Zcash değer havuzları." } },
          {
            type: "callout",
            tone: "warn",
            text: {
              en: "Never share your seed phrase. Anyone who has it controls your funds.",
              tr: "Kurtarma ifadeni asla paylaşma. Ona sahip olan herkes fonlarını kontrol eder.",
            },
          },
          {
            type: "figure",
            key: "wallet-safety",
            caption: { en: "What you can share, and what you never should.", tr: "Neyi paylaşabilirsin, neyi asla paylaşmamalısın." },
          },
          { type: "figure", key: "unified-address", caption: { en: "One unified address, several receivers.", tr: "Tek birleşik adres, birden çok alıcı." } },
          { type: "figure", key: "upgrade-timeline", caption: { en: "Network upgrades.", tr: "Ağ yükseltmeleri." } },
          { type: "figure", key: "funding-flow", caption: { en: "Where each block's new coins go.", tr: "Her bloğun yeni coinleri nereye gider." } },
        ],
        quiz: [
          {
            q: { en: "On a shielded transaction, what stays encrypted?", tr: "Shielded bir işlemde ne şifreli kalır?" },
            options: [
              { en: "Only the amount", tr: "Yalnızca tutar" },
              { en: "Sender, receiver and amount", tr: "Gönderen, alıcı ve tutar" },
              { en: "Nothing", tr: "Hiçbir şey" },
              { en: "Only the fee", tr: "Yalnızca ücret" },
            ],
            answer: 1,
            explain: {
              en: "Shielded transactions encrypt the sender, the receiver and the amount.",
              tr: "Shielded işlemler gönderen, alıcı ve tutarı şifreler.",
            },
          },
          {
            q: { en: "What does spending a note publish?", tr: "Bir notu harcamak neyi yayınlar?" },
            options: [
              { en: "The note's value", tr: "Notun değerini" },
              { en: "The owner's address", tr: "Sahibinin adresini" },
              { en: "A nullifier", tr: "Bir nullifier" },
              { en: "The seed phrase", tr: "Kurtarma ifadesini" },
            ],
            answer: 2,
            explain: {
              en: "A nullifier marks the note as spent without saying which note it was.",
              tr: "Nullifier, hangi not olduğunu söylemeden notu harcanmış olarak işaretler.",
            },
          },
          {
            q: { en: "Why can't a note be spent twice?", tr: "Bir not neden iki kez harcanamaz?" },
            options: [
              { en: "Its nullifier would appear twice", tr: "Nullifier'ı iki kez görünürdü" },
              { en: "Wallets forbid it", tr: "Cüzdanlar yasaklar" },
              { en: "Miners remember it", tr: "Madenciler hatırlar" },
              { en: "It expires", tr: "Süresi dolar" },
            ],
            answer: 0,
            explain: { en: "The network rejects a nullifier it has already seen.", tr: "Ağ daha önce gördüğü bir nullifier'ı reddeder." },
          },
          {
            q: { en: "Who should you share your seed phrase with?", tr: "Kurtarma ifadeni kiminle paylaşmalısın?" },
            options: [
              { en: "Wallet support", tr: "Cüzdan desteği" },
              { en: "No one", tr: "Hiç kimse" },
              { en: "An exchange", tr: "Bir borsa" },
              { en: "Friends", tr: "Arkadaşlar" },
            ],
            answer: 1,
            explain: { en: "Anyone with your seed phrase controls your funds.", tr: "Kurtarma ifadene sahip olan herkes fonlarını kontrol eder." },
          },
        ],
        sources: [ZCASH_LEARN, PROTOCOL_SPEC],
      },
    ],
  },
];
