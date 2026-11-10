import type { GlossaryTerm } from "./types";
import { SRC } from "./sources";

/**
 * ZecLearn glossary. Facts are limited to what is verified in research/FACTS.md
 * (checked 2026-11-10). Keep `related` pointing at slugs that exist here.
 */
export const GLOSSARY: GlossaryTerm[] = [
  {
    slug: "zec",
    term: "ZEC",
    short: {
      en: "The native currency of the Zcash network. The total supply is capped at 21 million ZEC.",
      tr: "Zcash ağının kendi para birimi. Toplam arz 21 milyon ZEC ile sınırlıdır.",
    },
    body: [
      {
        en: "ZEC is what you hold, send and receive on Zcash. Like bitcoin, it has a fixed maximum supply of 21 million coins, and new ZEC enters circulation through block rewards that halve roughly every four years.",
        tr: "ZEC, Zcash üzerinde tuttuğunuz, gönderdiğiniz ve aldığınız paradır. Bitcoin gibi en fazla 21 milyon adetlik sabit bir arzı vardır; yeni ZEC, yaklaşık dört yılda bir yarıya inen blok ödülleriyle dolaşıma girer.",
      },
      {
        en: "What makes ZEC different is that it can be held and moved in shielded pools, where amounts, senders and receivers are encrypted on the public chain.",
        tr: "ZEC'i farklı kılan şey, korumalı havuzlarda tutulup gönderilebilmesidir: Bu havuzlarda tutarlar, gönderenler ve alıcılar herkese açık zincirde şifreli durur.",
      },
    ],
    related: ["zatoshi", "halving", "block-reward", "shielded"],
    sources: [SRC.zip218, SRC.zebra7],
  },
  {
    slug: "zatoshi",
    term: "Zatoshi",
    short: {
      en: "The smallest unit of ZEC: 1 ZEC = 100,000,000 zatoshi.",
      tr: "ZEC'in en küçük birimi: 1 ZEC = 100.000.000 zatoshi.",
    },
    body: [
      {
        en: "Software counts ZEC in whole zatoshi so that amounts are always exact integers. For example, the post-NU7 block subsidy of 0.52083333 ZEC is written in the protocol as 52,083,333 zatoshi.",
        tr: "Yazılımlar tutarların her zaman tam sayı olması için ZEC'i zatoshi cinsinden sayar. Örneğin NU7 sonrası 0,52083333 ZEC'lik blok sübvansiyonu protokolde 52.083.333 zatoshi olarak yazılır.",
      },
    ],
    related: ["zec", "block-reward"],
    sources: [SRC.zip218],
  },
  {
    slug: "shielded",
    term: "Shielded",
    short: {
      en: "Encrypted on-chain. Shielded transactions hide sender, receiver and amount while still being verified by the network.",
      tr: "Zincir üzerinde şifreli. Korumalı işlemler gönderen, alıcı ve tutarı gizler; ağ yine de işlemin geçerli olduğunu doğrular.",
    },
    body: [
      {
        en: "When ZEC is in a shielded pool, the blockchain only records encrypted notes and a zero-knowledge proof that the rules were followed. Nodes can check that no money was created out of thin air without learning who paid whom or how much.",
        tr: "ZEC korumalı bir havuzdayken blokzincire yalnızca şifreli notlar ve kuralların çiğnenmediğini gösteren bir sıfır bilgi ispatı yazılır. Düğümler, kimin kime ne kadar ödediğini öğrenmeden yoktan para yaratılmadığını kontrol edebilir.",
      },
      {
        en: "Today the shielded pools you can actively use are Sapling and the newest one, Ironwood.",
        tr: "Bugün aktif olarak kullanabileceğiniz korumalı havuzlar Sapling ve en yenisi olan Ironwood'dur.",
      },
    ],
    related: ["transparent", "value-pool", "zk-snark", "ironwood", "sapling"],
    sources: [SRC.zip258, SRC.zip316],
  },
  {
    slug: "transparent",
    term: "Transparent",
    short: {
      en: "Public on-chain, like Bitcoin. Transparent addresses and amounts are visible to everyone.",
      tr: "Zincirde herkese açık, Bitcoin'deki gibi. Şeffaf adresler ve tutarlar herkes tarafından görülebilir.",
    },
    body: [
      {
        en: "Zcash also has a transparent pool that works much like Bitcoin: every address, amount and link between transactions is public. It is useful for compatibility (for example with some exchanges), but it offers no privacy.",
        tr: "Zcash'te Bitcoin'e çok benzeyen şeffaf bir havuz da vardır: Her adres, tutar ve işlemler arasındaki bağlantı herkese açıktır. Bazı borsalarla uyumluluk için işe yarar ama hiçbir gizlilik sunmaz.",
      },
    ],
    related: ["t-address", "shielded", "value-pool"],
    sources: [SRC.zip316],
  },
  {
    slug: "value-pool",
    term: "Value pool",
    short: {
      en: "A separate bucket of ZEC tracked by the protocol: transparent, Sprout, Sapling, Orchard and Ironwood.",
      tr: "Protokolün ayrı ayrı izlediği ZEC kümesi: şeffaf, Sprout, Sapling, Orchard ve Ironwood.",
    },
    body: [
      {
        en: "Each pool has its own rules and cryptography. The protocol publicly tracks how much ZEC is in each pool, even though shielded transactions inside a pool are private. Moving ZEC between pools reveals the amount that crosses.",
        tr: "Her havuzun kendi kuralları ve kriptografisi vardır. Havuzun içindeki korumalı işlemler gizli olsa da protokol her havuzda ne kadar ZEC olduğunu herkese açık biçimde izler. ZEC'i havuzlar arasında taşımak, geçen tutarı görünür kılar.",
      },
      {
        en: "Status on 10 November 2026: transparent, Sapling and Ironwood are active; Orchard is sealed (funds can only leave, mainly into Ironwood); Sprout funds became unspendable with NU7.",
        tr: "10 Kasım 2026 itibarıyla durum: Şeffaf, Sapling ve Ironwood aktif; Orchard mühürlü (fonlar yalnızca çıkabilir, çoğunlukla Ironwood'a); Sprout'taki fonlar NU7 ile harcanamaz hale geldi.",
      },
    ],
    related: ["transparent", "sprout", "sapling", "orchard", "ironwood", "turnstile"],
    sources: [SRC.zip258, SRC.zip259, SRC.slIronwood],
  },
  {
    slug: "sprout",
    term: "Sprout",
    short: {
      en: "Zcash's original shielded pool from the 2016 launch. Its remaining funds became unspendable when NU7 activated in November 2026.",
      tr: "Zcash'in 2016'daki ilk korumalı havuzu. Kalan fonlar Kasım 2026'da NU7 devreye girince harcanamaz hale geldi.",
    },
    body: [
      {
        en: "Sprout proved that private payments on a public blockchain were possible, but it was slow and relied on a trusted setup. The Canopy upgrade (2020) stopped new value from entering Sprout.",
        tr: "Sprout, herkese açık bir blokzincirde gizli ödemenin mümkün olduğunu kanıtladı; ancak yavaştı ve güvenilir bir kuruluma dayanıyordu. Canopy yükseltmesi (2020) Sprout'a yeni değer girişini durdurdu.",
      },
      {
        en: "NU7 disallowed version 4 transactions, the only format that can spend Sprout. Coins still in Sprout are not burned, but they cannot be spent unless a future upgrade restores access.",
        tr: "NU7, Sprout'u harcayabilen tek biçim olan sürüm 4 işlemleri yasakladı. Sprout'ta kalan coinler yakılmadı, ancak ileride bir yükseltme erişimi geri getirmezse harcanamaz.",
      },
    ],
    related: ["value-pool", "nu7", "trusted-setup", "sapling"],
    sources: [SRC.zip211, SRC.zip259, SRC.zebra7],
  },
  {
    slug: "sapling",
    term: "Sapling",
    short: {
      en: "The shielded pool introduced by the Sapling upgrade in 2018. Still active today.",
      tr: "2018'deki Sapling yükseltmesiyle gelen korumalı havuz. Bugün hâlâ aktif.",
    },
    body: [
      {
        en: "Sapling (activated at block 419,200) made shielded transactions fast and light enough for mobile wallets. Sapling addresses traditionally start with \"zs\", and a unified address can include a Sapling receiver.",
        tr: "Sapling (419.200. blokta devreye girdi), korumalı işlemleri mobil cüzdanlarda kullanılabilecek kadar hızlı ve hafif hale getirdi. Sapling adresleri geleneksel olarak \"zs\" ile başlar; birleşik adresler de bir Sapling alıcısı içerebilir.",
      },
    ],
    related: ["value-pool", "sprout", "orchard", "unified-address"],
    sources: [SRC.zip205, SRC.zip316],
  },
  {
    slug: "orchard",
    term: "Orchard",
    short: {
      en: "The shielded pool added by NU5 in 2022. Since NU6.3 (July 2026) it is sealed: no new deposits, funds can only move out, mainly into Ironwood.",
      tr: "NU5 ile 2022'de eklenen korumalı havuz. NU6.3'ten (Temmuz 2026) beri mühürlü: Yeni giriş yok, fonlar yalnızca dışarı, çoğunlukla Ironwood'a taşınabilir.",
    },
    body: [
      {
        en: "Orchard brought Halo 2 proofs with no trusted setup and became the main shielded pool. In May 2026 a researcher found a soundness bug in Orchard's circuit; it was fixed in NU6.2 in early June 2026, and no evidence of exploitation was found.",
        tr: "Orchard, güvenilir kurulum gerektirmeyen Halo 2 ispatlarını getirdi ve ana korumalı havuz oldu. Mayıs 2026'da bir araştırmacı Orchard devresinde bir sağlamlık (soundness) hatası buldu; hata Haziran 2026 başında NU6.2 ile düzeltildi ve istismar edildiğine dair bir kanıt bulunmadı.",
      },
      {
        en: "Because shielded amounts are hidden, nobody could publicly prove the bug was never used. So NU6.3 sealed Orchard: it can only be spent from, not added to. Funds are not frozen; wallets move them through the turnstile into Ironwood.",
        tr: "Korumalı tutarlar gizli olduğu için hatanın hiç kullanılmadığını kimse herkese açık biçimde kanıtlayamazdı. Bu yüzden NU6.3 Orchard'ı mühürledi: Havuzdan yalnızca harcama yapılabilir, içine para eklenemez. Fonlar dondurulmadı; cüzdanlar onları turnike üzerinden Ironwood'a taşır.",
      },
    ],
    related: ["ironwood", "turnstile", "halo-2", "nu5", "value-pool"],
    sources: [SRC.zip257, SRC.zip258, SRC.zodlIronwood, SRC.slIronwood],
  },
  {
    slug: "ironwood",
    term: "Ironwood",
    short: {
      en: "Zcash's newest shielded pool, created by the NU6.3 upgrade on 28 July 2026 to replace Orchard.",
      tr: "Zcash'in en yeni korumalı havuzu; Orchard'ın yerini almak için 28 Temmuz 2026'da NU6.3 yükseltmesiyle oluşturuldu.",
    },
    body: [
      {
        en: "Ironwood uses the corrected Orchard circuit with Halo 2 proofs, and its circuit was formally verified. Its notes use a quantum-recoverable format (ZIP 2005), a recovery path for the future.",
        tr: "Ironwood, düzeltilmiş Orchard devresini Halo 2 ispatlarıyla kullanır ve devresi biçimsel olarak doğrulanmıştır. Notları, gelecekte bir kurtarma yolu sağlayan kuantuma karşı kurtarılabilir bir biçim (ZIP 2005) kullanır.",
      },
      {
        en: "Ironwood reuses Orchard receivers, so existing unified addresses keep working. ZEC that moved from Orchard into Ironwood is counted by the turnstile, which lets anyone audit the circulating supply.",
        tr: "Ironwood, Orchard alıcılarını yeniden kullanır; bu sayede mevcut birleşik adresler çalışmaya devam eder. Orchard'dan Ironwood'a geçen ZEC turnike tarafından sayılır ve böylece herkes dolaşımdaki arzı denetleyebilir.",
      },
    ],
    related: ["orchard", "turnstile", "value-pool", "unified-address", "halo-2"],
    sources: [SRC.zip258, SRC.slIronwood, SRC.zodlIronwood],
  },
  {
    slug: "turnstile",
    term: "Turnstile",
    short: {
      en: "The public accounting of how much ZEC enters and leaves each pool. It rejects any attempt to take out more than went in.",
      tr: "Her havuza ne kadar ZEC girip çıktığının herkese açık hesabı. Girenden fazlasını çıkarma girişimini reddeder.",
    },
    body: [
      {
        en: "Inside a shielded pool amounts are hidden, but the total balance of each pool is public. Because a pool's balance can never go negative, a counterfeiter could never withdraw more than was legitimately deposited. During the Orchard-to-Ironwood migration, the turnstile makes the total supply verifiable by anyone running a node.",
        tr: "Korumalı bir havuzun içinde tutarlar gizlidir, ancak her havuzun toplam bakiyesi herkese açıktır. Bir havuzun bakiyesi asla eksiye düşemeyeceği için sahte para üreten biri, meşru olarak yatırılandan fazlasını çekemez. Orchard'dan Ironwood'a geçiş sırasında turnike, düğüm çalıştıran herkesin toplam arzı doğrulamasını sağlar.",
      },
    ],
    related: ["value-pool", "orchard", "ironwood"],
    sources: [SRC.zodlIronwood, SRC.slIronwood, SRC.zip258],
  },
  {
    slug: "unified-address",
    term: "Unified address (UA)",
    short: {
      en: "One address that bundles several receivers (shielded and optionally transparent). On mainnet it starts with \"u1\".",
      tr: "Birden çok alıcıyı (korumalı ve isteğe bağlı olarak şeffaf) tek adreste toplayan adres. Ana ağda \"u1\" ile başlar.",
    },
    body: [
      {
        en: "Introduced with NU5 (ZIP 316), a unified address lets you share a single address while the sender's wallet automatically picks the best receiver it supports: Orchard-type first, then Sapling, then transparent.",
        tr: "NU5 ile gelen (ZIP 316) birleşik adres, tek bir adres paylaşmanızı sağlar; gönderenin cüzdanı desteklediği en iyi alıcıyı otomatik seçer: Önce Orchard türü, sonra Sapling, en son şeffaf.",
      },
      {
        en: "Ironwood reuses the Orchard receiver, so addresses you already gave out keep working after the 2026 upgrades.",
        tr: "Ironwood, Orchard alıcısını yeniden kullandığı için daha önce paylaştığınız adresler 2026 yükseltmelerinden sonra da çalışmaya devam eder.",
      },
    ],
    related: ["t-address", "viewing-key", "ironwood", "orchard", "sapling"],
    sources: [SRC.zip316, SRC.zodlIronwood],
  },
  {
    slug: "t-address",
    term: "Transparent address (t-address)",
    short: {
      en: "A public Zcash address starting with \"t\". Balances and history are visible to anyone.",
      tr: "\"t\" ile başlayan herkese açık Zcash adresi. Bakiye ve geçmiş herkes tarafından görülebilir.",
    },
    body: [
      {
        en: "Transparent addresses work like Bitcoin addresses. Some services only support them. If you receive ZEC to a t-address, a good habit is to shield it: move it into a shielded pool from your wallet.",
        tr: "Şeffaf adresler Bitcoin adresleri gibi çalışır. Bazı hizmetler yalnızca bunları destekler. Bir t-adresine ZEC aldıysanız, cüzdanınızdan korumalı bir havuza taşıyarak \"korumaya almak\" iyi bir alışkanlıktır.",
      },
    ],
    related: ["transparent", "unified-address", "shielded"],
    sources: [SRC.zip316],
  },
  {
    slug: "viewing-key",
    term: "Viewing key",
    short: {
      en: "A key that lets someone see shielded transactions without being able to spend. Full viewing keys show incoming and outgoing; incoming viewing keys show only incoming.",
      tr: "Birinin harcama yapamadan korumalı işlemleri görmesini sağlayan anahtar. Tam görüntüleme anahtarı gelen ve gideni, gelen görüntüleme anahtarı yalnızca geleni gösterir.",
    },
    body: [
      {
        en: "Viewing keys are Zcash's tool for selective disclosure: you can show an accountant, auditor or donor exactly what they need to see, while everyone else still sees nothing. ZIP 316 defines unified full viewing keys (UFVK) and unified incoming viewing keys (UIVK).",
        tr: "Görüntüleme anahtarları Zcash'in seçici ifşa aracıdır: Bir muhasebeciye, denetçiye ya da bağışçıya tam olarak görmesi gerekeni gösterebilirsiniz; diğer herkes yine hiçbir şey görmez. ZIP 316, birleşik tam görüntüleme anahtarını (UFVK) ve birleşik gelen görüntüleme anahtarını (UIVK) tanımlar.",
      },
      {
        en: "A viewing key cannot spend funds, but it does reveal private information, so share it only with people you trust.",
        tr: "Görüntüleme anahtarı fon harcayamaz, ama özel bilgileri açığa çıkarır; bu yüzden yalnızca güvendiğiniz kişilerle paylaşın.",
      },
    ],
    related: ["spending-key", "unified-address", "shielded"],
    sources: [SRC.zip316],
  },
  {
    slug: "spending-key",
    term: "Spending key",
    short: {
      en: "The secret key that authorizes spending your ZEC. Whoever has it controls the funds.",
      tr: "ZEC'inizi harcamaya yetki veren gizli anahtar. Ona sahip olan, fonları kontrol eder.",
    },
    body: [
      {
        en: "Wallets derive spending keys from your seed phrase, and viewing keys can be derived from spending keys, never the other way around. Never type a spending key or seed phrase into a website or share it with \"support\".",
        tr: "Cüzdanlar harcama anahtarlarını kurtarma ifadenizden türetir; görüntüleme anahtarları harcama anahtarlarından türetilebilir, tersi asla mümkün değildir. Harcama anahtarınızı ya da kurtarma ifadenizi hiçbir web sitesine yazmayın, \"destek\" diyen kimseyle paylaşmayın.",
      },
    ],
    related: ["seed-phrase", "viewing-key"],
    sources: [SRC.zip316],
  },
  {
    slug: "seed-phrase",
    term: "Seed phrase",
    short: {
      en: "The list of words your wallet shows once at setup. It can recreate all your keys, so it is the master key to your funds.",
      tr: "Cüzdanınızın kurulumda bir kez gösterdiği kelime listesi. Tüm anahtarlarınızı yeniden oluşturabilir; yani fonlarınızın ana anahtarıdır.",
    },
    body: [
      {
        en: "Write it down on paper and keep it offline and private. Anyone who sees it can take your ZEC; no organization can reverse that. Real wallet teams and community members will never ask for it.",
        tr: "Kâğıda yazın, çevrimdışı ve gizli saklayın. Onu gören herkes ZEC'inizi alabilir ve hiçbir kurum bunu geri alamaz. Gerçek cüzdan ekipleri ve topluluk üyeleri onu asla istemez.",
      },
      {
        en: "Wallets also store a birthday height, the block when the wallet was created, so a restore only has to scan the chain from that point.",
        tr: "Cüzdanlar ayrıca \"doğum yüksekliği\" denen, cüzdanın oluşturulduğu bloğu da saklar; böylece geri yükleme zinciri yalnızca o noktadan itibaren tarar.",
      },
    ],
    related: ["spending-key", "light-client"],
    sources: [SRC.zodlRename],
  },
  {
    slug: "memo",
    term: "Memo",
    short: {
      en: "An encrypted message field attached to a shielded payment. Only the recipient (or a viewing-key holder) can read it.",
      tr: "Korumalı bir ödemeye eklenen şifreli mesaj alanı. Yalnızca alıcı (ya da görüntüleme anahtarına sahip olan) okuyabilir.",
    },
    body: [
      {
        en: "Memos are handy for invoice numbers, a thank-you note or a reply address. Transparent outputs have no encrypted memo.",
        tr: "Memolar fatura numarası, bir teşekkür notu ya da yanıt adresi için kullanışlıdır. Şeffaf çıktılarda şifreli memo yoktur.",
      },
    ],
    related: ["shielded", "note", "viewing-key"],
    sources: [SRC.zip316],
  },
  {
    slug: "zk-snark",
    term: "zk-SNARK",
    short: {
      en: "A short zero-knowledge proof: it convinces anyone that a statement is true without revealing why. Zcash uses them to validate shielded transactions.",
      tr: "Kısa bir sıfır bilgi ispatı: Bir ifadenin doğru olduğunu, nedenini açıklamadan herkese kanıtlar. Zcash bunları korumalı işlemleri doğrulamak için kullanır.",
    },
    body: [
      {
        en: "zk-SNARK stands for zero-knowledge Succinct Non-interactive ARgument of Knowledge. In Zcash a proof says, in effect: \"the spent notes exist, I am allowed to spend them, they were not spent before, and inputs equal outputs\" — without showing which notes, whose keys or what amounts.",
        tr: "zk-SNARK, \"sıfır bilgili, kısa, etkileşimsiz bilgi argümanı\" anlamına gelir. Zcash'te bir ispat özetle şunu söyler: \"Harcanan notlar var, onları harcamaya yetkim var, daha önce harcanmadılar ve girdiler çıktılara eşit\" — hangi notlar olduğunu, kimin anahtarı olduğunu ya da tutarları göstermeden.",
      },
    ],
    related: ["halo-2", "trusted-setup", "nullifier", "shielded"],
    sources: [SRC.zfWork, SRC.nuGuide],
  },
  {
    slug: "halo-2",
    term: "Halo 2",
    short: {
      en: "The proving system used by Orchard and Ironwood. It needs no trusted setup.",
      tr: "Orchard ve Ironwood'un kullandığı ispat sistemi. Güvenilir kurulum gerektirmez.",
    },
    body: [
      {
        en: "Halo was discovered by Sean Bowe at Electric Coin Co. Halo 2 arrived on mainnet with NU5 in 2022, removing the need for the trusted-setup ceremonies that Sprout and Sapling relied on.",
        tr: "Halo, Electric Coin Co.'da Sean Bowe tarafından keşfedildi. Halo 2, 2022'de NU5 ile ana ağa geldi ve Sprout ile Sapling'in dayandığı güvenilir kurulum törenlerine olan ihtiyacı ortadan kaldırdı.",
      },
    ],
    related: ["zk-snark", "trusted-setup", "orchard", "ironwood", "nu5"],
    sources: [SRC.nuGuide, SRC.whoCreated],
  },
  {
    slug: "trusted-setup",
    term: "Trusted setup",
    short: {
      en: "A one-time ceremony that generated public parameters for older zk-SNARKs. Halo 2 removed the need for it.",
      tr: "Eski zk-SNARK'lar için açık parametreler üreten tek seferlik tören. Halo 2 bu ihtiyacı ortadan kaldırdı.",
    },
    body: [
      {
        en: "Sprout and Sapling proofs depend on parameters created in multi-party ceremonies; the setup is secure as long as at least one participant destroyed their secret. Orchard and Ironwood use Halo 2, which has no such ceremony.",
        tr: "Sprout ve Sapling ispatları çok taraflı törenlerle üretilen parametrelere dayanır; katılımcılardan en az biri kendi sırrını yok ettiği sürece kurulum güvenlidir. Orchard ve Ironwood, böyle bir tören gerektirmeyen Halo 2'yi kullanır.",
      },
    ],
    related: ["halo-2", "zk-snark", "sprout", "sapling"],
    sources: [SRC.nuGuide],
  },
  {
    slug: "note",
    term: "Note",
    short: {
      en: "A shielded \"coin\": an encrypted record of an amount owned by an address. Shielded balances are made of notes.",
      tr: "Korumalı bir \"bozuk para\": Bir adrese ait bir tutarın şifreli kaydı. Korumalı bakiyeler notlardan oluşur.",
    },
    body: [
      {
        en: "When you receive a shielded payment, a new note is created and only a commitment to it is published. When you spend, the note is consumed by revealing its nullifier and new notes are created for the recipient and your change.",
        tr: "Korumalı bir ödeme aldığınızda yeni bir not oluşturulur ve zincire yalnızca ona ait bir taahhüt yazılır. Harcarken notun nullifier'ı açıklanarak not tüketilir; alıcı ve para üstünüz için yeni notlar oluşur.",
      },
    ],
    related: ["nullifier", "note-commitment-tree", "memo"],
    sources: [SRC.zip258],
  },
  {
    slug: "nullifier",
    term: "Nullifier",
    short: {
      en: "A unique tag revealed when a note is spent. If the same nullifier appears twice, the second spend is rejected — this prevents double spending.",
      tr: "Bir not harcandığında açıklanan benzersiz etiket. Aynı nullifier ikinci kez görünürse ikinci harcama reddedilir; böylece çifte harcama önlenir.",
    },
    body: [
      {
        en: "Only the owner can compute a note's nullifier, and outsiders cannot link it back to the note's commitment. So the network learns \"some note was spent\" but not which one.",
        tr: "Bir notun nullifier'ını yalnızca sahibi hesaplayabilir ve dışarıdakiler onu notun taahhüdüne bağlayamaz. Böylece ağ \"bir not harcandı\" bilgisini öğrenir ama hangisi olduğunu öğrenmez.",
      },
    ],
    related: ["note", "note-commitment-tree", "zk-snark"],
    sources: [SRC.zip258],
  },
  {
    slug: "note-commitment-tree",
    term: "Note commitment tree",
    short: {
      en: "An append-only Merkle tree of all note commitments in a pool. A proof shows your note is in the tree without saying where.",
      tr: "Bir havuzdaki tüm not taahhütlerinden oluşan, yalnızca eklenebilen bir Merkle ağacı. İspat, notunuzun ağaçta olduğunu yerini söylemeden gösterir.",
    },
    body: [
      {
        en: "Each shielded pool has its own tree; Ironwood started a fresh one at NU6.3. Transactions reference a recent tree root (an anchor) so nodes can check membership proofs.",
        tr: "Her korumalı havuzun kendi ağacı vardır; Ironwood, NU6.3'te sıfırdan yeni bir ağaçla başladı. İşlemler yakın tarihli bir ağaç köküne (çapa) atıfta bulunur, böylece düğümler üyelik ispatlarını kontrol edebilir.",
      },
    ],
    related: ["note", "nullifier", "ironwood"],
    sources: [SRC.zip258],
  },
  {
    slug: "zip",
    term: "ZIP (Zcash Improvement Proposal)",
    short: {
      en: "A design document proposing a change or standard for Zcash. Protocol changes are specified as ZIPs.",
      tr: "Zcash için bir değişiklik ya da standart öneren tasarım belgesi. Protokol değişiklikleri ZIP olarak tanımlanır.",
    },
    body: [
      {
        en: "The ZIP process is described in ZIP 0. ZIPs move through statuses such as Draft, Proposed, Final and Withdrawn, and are published at zips.z.cash. Each network upgrade has a deployment ZIP listing the ZIPs it activates.",
        tr: "ZIP süreci ZIP 0'da anlatılır. ZIP'ler Taslak (Draft), Önerilmiş (Proposed), Nihai (Final) ve Geri Çekilmiş (Withdrawn) gibi aşamalardan geçer ve zips.z.cash'te yayımlanır. Her ağ yükseltmesinin, etkinleştirdiği ZIP'leri listeleyen bir dağıtım ZIP'i vardır.",
      },
    ],
    related: ["network-upgrade", "nu7"],
    sources: [SRC.zip0],
  },
  {
    slug: "network-upgrade",
    term: "Network upgrade (NU)",
    short: {
      en: "A coordinated change to Zcash's consensus rules that activates at a fixed block height. Nodes must upgrade beforehand.",
      tr: "Zcash'in mutabakat kurallarında belirli bir blok yüksekliğinde devreye giren koordineli değişiklik. Düğümler önceden güncellenmelidir.",
    },
    body: [
      {
        en: "Zcash upgrades have names (Overwinter, Sapling, Blossom, Heartwood, Canopy) and, since 2022, numbers (NU5, NU6, NU6.1, NU6.2, NU6.3, NU7). Node operators who do not upgrade in time end up on a different chain.",
        tr: "Zcash yükseltmelerinin adları (Overwinter, Sapling, Blossom, Heartwood, Canopy) ve 2022'den beri numaraları (NU5, NU6, NU6.1, NU6.2, NU6.3, NU7) vardır. Zamanında güncellemeyen düğüm operatörleri farklı bir zincirde kalır.",
      },
    ],
    related: ["zip", "nu5", "nu6", "nu7", "zebra"],
    sources: [SRC.nuGuide, SRC.zebra7],
  },
  {
    slug: "nu5",
    term: "NU5",
    short: {
      en: "The 2022 upgrade (block 1,687,104) that introduced Halo 2, the Orchard pool and unified addresses.",
      tr: "Halo 2'yi, Orchard havuzunu ve birleşik adresleri getiren 2022 yükseltmesi (1.687.104. blok).",
    },
    body: [
      {
        en: "NU5 also added the version 5 transaction format. It ended Zcash's reliance on trusted setups for new shielded transactions.",
        tr: "NU5 ayrıca sürüm 5 işlem biçimini ekledi ve yeni korumalı işlemlerde Zcash'in güvenilir kuruluma bağımlılığını sona erdirdi.",
      },
    ],
    related: ["network-upgrade", "halo-2", "orchard", "unified-address"],
    sources: [SRC.zip252, SRC.nuGuide],
  },
  {
    slug: "nu6",
    term: "NU6 and NU6.x",
    short: {
      en: "NU6 (Nov 2024) extended the dev fund; NU6.1 (Nov 2025) set the community and coinholder funding model; NU6.2 (Jun 2026) fixed Orchard; NU6.3 (Jul 2026) created Ironwood.",
      tr: "NU6 (Kas 2024) geliştirme fonunu uzattı; NU6.1 (Kas 2025) topluluk ve coin sahibi fonlama modelini kurdu; NU6.2 (Haz 2026) Orchard'ı düzeltti; NU6.3 (Tem 2026) Ironwood'u oluşturdu.",
    },
    body: [
      {
        en: "NU6 activated at block 2,726,400 on 23 November 2024, together with the second halving: 8% of block subsidy to Zcash Community Grants and 12% to a lockbox. NU6.1 (block 3,146,400, 24 November 2025) turned the 12% into a coinholder-controlled fund.",
        tr: "NU6, 23 Kasım 2024'te 2.726.400. blokta ikinci yarılanmayla birlikte devreye girdi: Blok sübvansiyonunun %8'i Zcash Community Grants'e, %12'si bir kilitli kasaya (lockbox) gitti. NU6.1 (3.146.400. blok, 24 Kasım 2025) bu %12'yi coin sahiplerinin yönettiği bir fona dönüştürdü.",
      },
      {
        en: "NU6.2 (block 3,364,600) shipped the corrected Orchard circuit. NU6.3 (block 3,428,143, 28 July 2026) created the Ironwood pool and sealed Orchard.",
        tr: "NU6.2 (3.364.600. blok) düzeltilmiş Orchard devresini getirdi. NU6.3 (3.428.143. blok, 28 Temmuz 2026) Ironwood havuzunu oluşturdu ve Orchard'ı mühürledi.",
      },
    ],
    related: ["network-upgrade", "dev-fund", "lockbox", "ironwood", "orchard"],
    sources: [SRC.nu6, SRC.nu61, SRC.zip257, SRC.zip258],
  },
  {
    slug: "nu7",
    term: "NU7",
    short: {
      en: "The upgrade that activated at block 3,543,405 on 6 November 2026 (UTC): 25-second blocks, 60% of fees to the NSM, and the end of Sprout spending.",
      tr: "6 Kasım 2026'da (UTC) 3.543.405. blokta devreye giren yükseltme: 25 saniyelik bloklar, ücretlerin %60'ı NSM'ye ve Sprout harcamasının sonu.",
    },
    body: [
      {
        en: "NU7 cut the target block time from 75 to 25 seconds while dividing the block subsidy by three, so daily issuance and the halving calendar stay the same. It added per-block limits on shielded activity.",
        tr: "NU7, hedef blok süresini 75 saniyeden 25 saniyeye indirirken blok sübvansiyonunu üçe böldü; böylece günlük ihraç ve yarılanma takvimi aynı kaldı. Ayrıca korumalı işlemler için blok başına sınırlar ekledi.",
      },
      {
        en: "It removes 60% of each block's transaction fees from circulation (miners keep 40%), to be reissued by the Network Sustainability Mechanism from around 2031. It disallowed version 4 transactions, leaving remaining Sprout funds unspendable. Zebra 7.0.0 is required; zcashd does not support it.",
        tr: "Her bloktaki işlem ücretlerinin %60'ını dolaşımdan çıkarır (madenciler %40'ı alır); bu tutar Ağ Sürdürülebilirlik Mekanizması tarafından 2031 civarından itibaren yeniden ihraç edilecek. Sürüm 4 işlemleri yasakladı ve Sprout'ta kalan fonlar harcanamaz hale geldi. Zebra 7.0.0 gerekir; zcashd desteklemez.",
      },
    ],
    related: ["network-upgrade", "nsm", "sprout", "zebra", "halving"],
    sources: [SRC.zip259, SRC.zip218, SRC.zip235, SRC.zebra7],
  },
  {
    slug: "zebra",
    term: "Zebra",
    short: {
      en: "The Zcash Foundation's full node, written in Rust. Version 7.0.0 is required for NU7.",
      tr: "Zcash Foundation'ın Rust ile yazılmış tam düğümü. NU7 için 7.0.0 sürümü gerekir.",
    },
    body: [
      {
        en: "A full node downloads and checks every block against the consensus rules. Zebra was built from scratch for memory safety and implementation diversity. With zcashd retired in 2026, Zebra is the reference node, alongside newer alternatives such as Zakura.",
        tr: "Tam düğüm her bloğu indirir ve mutabakat kurallarına göre kontrol eder. Zebra, bellek güvenliği ve uygulama çeşitliliği için sıfırdan yazıldı. zcashd 2026'da emekliye ayrıldığından Zebra referans düğümdür; yanında Zakura gibi yeni alternatifler de vardır.",
      },
    ],
    related: ["zcashd", "zakura", "zcash-foundation", "nu7", "zallet"],
    sources: [SRC.zebra7, SRC.zfWork, SRC.forumZakura],
  },
  {
    slug: "zcashd",
    term: "zcashd",
    short: {
      en: "The original Zcash node and wallet software. It reached end of life in July 2026 and does not support NU6.3 or NU7.",
      tr: "Orijinal Zcash düğüm ve cüzdan yazılımı. Temmuz 2026'da kullanım ömrünü tamamladı; NU6.3 ve NU7'yi desteklemez.",
    },
    body: [
      {
        en: "zcashd nodes halted automatically at block 3,417,100 (18 July 2026). Its roles are now covered by the \"Z3\" stack: Zebra (node), Zaino (indexer) and Zallet (wallet).",
        tr: "zcashd düğümleri 3.417.100. blokta (18 Temmuz 2026) otomatik olarak durdu. Görevlerini artık \"Z3\" yığını üstleniyor: Zebra (düğüm), Zaino (indeksleyici) ve Zallet (cüzdan).",
      },
    ],
    related: ["zebra", "zallet", "network-upgrade"],
    sources: [SRC.zcashdEol, SRC.zf2026],
  },
  {
    slug: "zakura",
    term: "Zakura",
    short: {
      en: "A Zcash full node from Valar Group and Project Tachyon, built from Zebra's code and announced in July 2026.",
      tr: "Valar Group ve Project Tachyon'un Zebra kodundan geliştirdiği, Temmuz 2026'da duyurulan Zcash tam düğümü.",
    },
    body: [
      {
        en: "Zakura focuses on performance such as faster sync. The Zcash Foundation keeps maintaining Zebra and suggests operators who run Zakura also run Zebra as an independent consensus check.",
        tr: "Zakura daha hızlı eşitleme gibi performans konularına odaklanır. Zcash Foundation, Zebra'yı geliştirmeye devam ediyor ve Zakura çalıştıranlara bağımsız bir mutabakat kontrolü için yanında Zebra da çalıştırmalarını öneriyor.",
      },
    ],
    related: ["zebra", "zcashd"],
    sources: [SRC.forumZakura],
  },
  {
    slug: "zallet",
    term: "Zallet",
    short: {
      en: "A command-line wallet that replaces the wallet built into zcashd, part of the Z3 stack.",
      tr: "zcashd'nin içindeki cüzdanın yerini alan komut satırı cüzdanı; Z3 yığınının parçası.",
    },
    body: [
      {
        en: "Zallet is aimed at exchanges, services and power users who previously relied on zcashd's wallet. It works together with Zebra and Zaino.",
        tr: "Zallet, daha önce zcashd cüzdanına dayanan borsalar, hizmetler ve ileri düzey kullanıcılar için tasarlandı. Zebra ve Zaino ile birlikte çalışır.",
      },
    ],
    related: ["zcashd", "zebra"],
    sources: [SRC.zodlIronwood, SRC.zf2026],
  },
  {
    slug: "lightwalletd",
    term: "lightwalletd",
    short: {
      en: "A server that gives light wallets compact block data from a full node, so phones don't need the whole blockchain.",
      tr: "Hafif cüzdanlara tam düğümden sıkıştırılmış blok verisi sunan sunucu; telefonların tüm blokzinciri indirmesi gerekmez.",
    },
    body: [
      {
        en: "Your wallet downloads compact blocks and decrypts them on your device to find your notes. The server never receives your keys.",
        tr: "Cüzdanınız sıkıştırılmış blokları indirir ve notlarınızı bulmak için bunları kendi cihazınızda çözer. Sunucu anahtarlarınızı asla almaz.",
      },
    ],
    related: ["light-client", "zebra"],
    sources: [SRC.forumNu7Timeline],
  },
  {
    slug: "light-client",
    term: "Light client (light wallet)",
    short: {
      en: "A wallet that does not run a full node. It scans compact blocks from a server and keeps keys on your device.",
      tr: "Tam düğüm çalıştırmayan cüzdan. Bir sunucudan sıkıştırılmış blokları tarar ve anahtarları cihazınızda tutar.",
    },
    body: [
      {
        en: "Most mobile Zcash wallets, such as Zodl and Zingo!, are light clients. Keep your wallet app updated: after NU6.3 and NU7, older versions may show errors or be unable to send.",
        tr: "Zodl ve Zingo! gibi mobil Zcash cüzdanlarının çoğu hafif istemcidir. Cüzdan uygulamanızı güncel tutun: NU6.3 ve NU7 sonrasında eski sürümler hata verebilir ya da gönderim yapamayabilir.",
      },
    ],
    related: ["lightwalletd", "seed-phrase", "zodl"],
    sources: [SRC.forumIronwood],
  },
  {
    slug: "block-reward",
    term: "Block reward",
    short: {
      en: "New ZEC created with each block (the subsidy) plus fees. Since NU7 the subsidy is 0.52083333 ZEC per 25-second block.",
      tr: "Her blokla oluşturulan yeni ZEC (sübvansiyon) ve ücretler. NU7'den beri sübvansiyon 25 saniyelik blok başına 0,52083333 ZEC'tir.",
    },
    body: [
      {
        en: "Before NU7 the subsidy was 1.5625 ZEC per 75-second block; NU7 divided it by three along with the block time. 20% of the subsidy goes to the dev fund (8% ZCG, 12% coinholder-controlled fund) and the rest to miners. Miners now keep 40% of fees; 60% goes to the NSM.",
        tr: "NU7'den önce sübvansiyon 75 saniyelik blok başına 1,5625 ZEC idi; NU7 bunu blok süresiyle birlikte üçe böldü. Sübvansiyonun %20'si geliştirme fonuna (%8 ZCG, %12 coin sahiplerinin yönettiği fon), kalanı madencilere gider. Madenciler artık ücretlerin %40'ını alır; %60'ı NSM'ye gider.",
      },
    ],
    related: ["halving", "dev-fund", "nsm", "zec"],
    sources: [SRC.zip218, SRC.zip1016, SRC.zip235],
  },
  {
    slug: "halving",
    term: "Halving",
    short: {
      en: "The scheduled cut of the block subsidy by half, about every four years. The last was on 23 November 2024; the next is expected around late 2028.",
      tr: "Blok sübvansiyonunun yaklaşık dört yılda bir planlı olarak yarıya inmesi. Sonuncusu 23 Kasım 2024'teydi; bir sonrakinin 2028 sonu civarında olması bekleniyor.",
    },
    body: [
      {
        en: "Zcash halvings happened in November 2020 (Canopy) and November 2024 (NU6). NU7 changed the block height of future halvings to match 25-second blocks, but kept their timing. In a September 2026 poll, coinholders voted overwhelmingly to keep halvings rather than smooth issuance.",
        tr: "Zcash yarılanmaları Kasım 2020'de (Canopy) ve Kasım 2024'te (NU6) gerçekleşti. NU7, gelecekteki yarılanmaların blok yüksekliğini 25 saniyelik bloklara uyacak şekilde değiştirdi ama zamanlamalarını korudu. Eylül 2026'daki bir oylamada coin sahipleri, ihracı yumuşatmak yerine yarılanmaları korumaya ezici çoğunlukla oy verdi.",
      },
    ],
    related: ["block-reward", "nu7", "zec", "coinholder-voting"],
    sources: [SRC.nu6, SRC.zip218, SRC.forumNu7Polls],
  },
  {
    slug: "nsm",
    term: "Network Sustainability Mechanism (NSM)",
    short: {
      en: "Since NU7, 60% of transaction fees are removed from circulation and later reissued through block rewards, to support network security long-term.",
      tr: "NU7'den beri işlem ücretlerinin %60'ı dolaşımdan çıkarılıp daha sonra blok ödülleriyle yeniden ihraç ediliyor; amaç ağ güvenliğini uzun vadede desteklemek.",
    },
    body: [
      {
        en: "Proposed by Shielded Labs, the NSM addresses a long-term question: how to pay for security as block subsidies fall. ZIP 235 removes 60% of fees; ZIP 237 reissues them in future subsidies starting at block 8,939,664 (expected around February 2031), a date chosen after a coinholder poll.",
        tr: "Shielded Labs tarafından önerilen NSM uzun vadeli bir soruya yanıt arar: Blok sübvansiyonları azaldıkça güvenliğin bedeli nasıl ödenecek? ZIP 235 ücretlerin %60'ını çıkarır; ZIP 237 bunları 8.939.664. bloktan (Şubat 2031 civarı) itibaren gelecekteki sübvansiyonlarla yeniden ihraç eder. Bu tarih bir coin sahibi oylamasının ardından seçildi.",
      },
    ],
    related: ["nu7", "block-reward", "shielded-labs", "halving"],
    sources: [SRC.zip235, SRC.zebra7, SRC.forumNu7Polls],
  },
  {
    slug: "dev-fund",
    term: "Development fund (dev fund)",
    short: {
      en: "The 20% share of the block subsidy that funds Zcash development: 8% to ZCG and 12% to a coinholder-controlled fund.",
      tr: "Zcash geliştirmesini finanse eden, blok sübvansiyonunun %20'lik payı: %8 ZCG'ye, %12 coin sahiplerinin yönettiği fona.",
    },
    body: [
      {
        en: "A development fund paid from block rewards was introduced with Canopy (2020). Under ZIP 1016, activated with NU6.1 in November 2025, the current split runs until the third halving.",
        tr: "Blok ödüllerinden ödenen geliştirme fonu Canopy (2020) ile başladı. Kasım 2025'te NU6.1 ile devreye giren ZIP 1016'ya göre mevcut paylaşım üçüncü yarılanmaya kadar sürer.",
      },
    ],
    related: ["zcg", "lockbox", "coinholder-voting", "block-reward"],
    sources: [SRC.zip1016, SRC.zip255, SRC.nu6],
  },
  {
    slug: "lockbox",
    term: "Lockbox",
    short: {
      en: "An in-protocol balance where 12% of the block subsidy accumulated from NU6. Since NU6.1 it seeds the coinholder-controlled fund.",
      tr: "NU6'dan itibaren blok sübvansiyonunun %12'sinin biriktiği protokol içi bakiye. NU6.1'den beri coin sahiplerinin yönettiği fonun kaynağıdır.",
    },
    body: [
      {
        en: "NU6 sent 12% of the subsidy into a lockbox that nobody could spend until a future decision. NU6.1 (ZIP 271 and ZIP 1016) used it to seed the coinholder-controlled fund, which also receives the ongoing 12% stream.",
        tr: "NU6, sübvansiyonun %12'sini ileride bir karar verilene kadar kimsenin harcayamadığı bir kilitli kasaya gönderdi. NU6.1 (ZIP 271 ve ZIP 1016) bu kasayı, devam eden %12'lik akışı da alan coin sahibi fonunun başlangıç sermayesi olarak kullandı.",
      },
    ],
    related: ["dev-fund", "coinholder-voting", "nu6"],
    sources: [SRC.nu6, SRC.zip255, SRC.zip1016],
  },
  {
    slug: "zcg",
    term: "Zcash Community Grants (ZCG)",
    short: {
      en: "A community grants program funded by 8% of the block subsidy. It began in 2020 as ZOMG and was renamed in 2022.",
      tr: "Blok sübvansiyonunun %8'iyle finanse edilen topluluk hibe programı. 2020'de ZOMG adıyla başladı, 2022'de adı değişti.",
    },
    body: [
      {
        en: "ZCG funds independent teams and individuals building for Zcash: wallets, tools, education, research and more. Applications and decisions are public.",
        tr: "ZCG, Zcash için çalışan bağımsız ekip ve kişileri finanse eder: Cüzdanlar, araçlar, eğitim, araştırma ve daha fazlası. Başvurular ve kararlar herkese açıktır.",
      },
    ],
    related: ["dev-fund", "coinholder-voting"],
    sources: [SRC.whoCreated, SRC.zip1016],
  },
  {
    slug: "coinholder-voting",
    term: "Coinholder voting",
    short: {
      en: "ZEC-weighted polls in which holders signal decisions, including quarterly votes on grants from the coinholder-controlled fund.",
      tr: "Sahiplerin elindeki ZEC miktarına göre ağırlıklandırılan oylamalar; coin sahibi fonundan verilecek hibeler için üç ayda bir yapılan oylamalar da buna dahil.",
    },
    body: [
      {
        en: "Under ZIP 1016, grant proposals are posted for 30 days of review, then voted on each quarter. A grant passes only if at least 420,000 ZEC take part and a simple majority approves. Key-holder organizations carry out results and can veto only on legal grounds or a principled objection by two or more of them.",
        tr: "ZIP 1016'ya göre hibe önerileri 30 gün incelemeye açılır, ardından her çeyrek oylanır. Bir hibe ancak en az 420.000 ZEC katılır ve basit çoğunluk onaylarsa kabul edilir. Anahtar sahibi kuruluşlar sonuçları uygular; yalnızca hukuki gerekçeyle ya da en az ikisinin ilkesel itirazıyla veto edebilirler.",
      },
      {
        en: "Coinholder polls have also guided protocol choices: in September 2026, about 2.4 million ZEC took part in the NU7 polls.",
        tr: "Coin sahibi oylamaları protokol kararlarına da yön verdi: Eylül 2026'daki NU7 oylamalarına yaklaşık 2,4 milyon ZEC katıldı.",
      },
    ],
    related: ["dev-fund", "lockbox", "zcg", "nu7"],
    sources: [SRC.zip1016, SRC.forumCoinholderQ1, SRC.forumNu7Polls],
  },
  {
    slug: "frost",
    term: "FROST",
    short: {
      en: "Flexible Round-Optimised Schnorr Threshold signatures: lets a group (e.g. 2 of 3) jointly authorize a shielded spend.",
      tr: "Esnek, tur sayısı optimize edilmiş Schnorr eşik imzaları: Bir grubun (örneğin 3 kişiden 2'si) korumalı bir harcamayı birlikte onaylamasını sağlar.",
    },
    body: [
      {
        en: "The Zcash Foundation maintains a Rust implementation of FROST (standardized as RFC 9591). It is the only current way to do multisig-style signing for shielded Zcash, and the result looks like an ordinary signature. ZIP 312, which specifies its use in Zcash, is still a Draft.",
        tr: "Zcash Foundation, FROST'un (RFC 9591 olarak standartlaştı) Rust uygulamasını geliştiriyor. Korumalı Zcash için çoklu imza tarzı imzalamanın şu anki tek yolu budur ve sonuç sıradan bir imza gibi görünür. Kullanımını Zcash'e özgü olarak tanımlayan ZIP 312 hâlâ Taslak aşamasındadır.",
      },
    ],
    related: ["zcash-foundation", "spending-key"],
    sources: [SRC.zfWork, SRC.zf2026, SRC.frost],
  },
  {
    slug: "zsa",
    term: "Zcash Shielded Assets (ZSA)",
    short: {
      en: "A proposal to let users issue and transfer other assets inside Zcash's shielded pool. Not deployed: the ZIPs are still Drafts.",
      tr: "Kullanıcıların Zcash'in korumalı havuzunda başka varlıklar çıkarıp transfer etmesini sağlayacak bir öneri. Devreye alınmadı: ZIP'leri hâlâ Taslak.",
    },
    body: [
      {
        en: "ZSAs are specified in ZIP 226 (transfer and burn) and ZIP 227 (issuance). They were not part of NU7.",
        tr: "ZSA'lar ZIP 226 (transfer ve yakma) ve ZIP 227 (ihraç) ile tanımlanır. NU7'nin parçası değildi.",
      },
    ],
    related: ["zip", "nu7"],
    sources: [SRC.zip0, SRC.zip259],
  },
  {
    slug: "zcash-foundation",
    term: "Zcash Foundation (ZF)",
    short: {
      en: "An organization formed in 2017 to support Zcash. It builds the Zebra node and FROST, and runs the Community Advisory Panel and Zcon.",
      tr: "Zcash'i desteklemek için 2017'de kurulan kuruluş. Zebra düğümünü ve FROST'u geliştirir; Topluluk Danışma Paneli'ni (ZCAP) ve Zcon'u düzenler.",
    },
    body: [
      {
        en: "ZF implemented Ironwood and NU7 in Zebra. Its Zcash Community Advisory Panel (ZCAP) is polled on major decisions, and Zcon7 took place in Cancún in October 2026.",
        tr: "ZF, Ironwood'u ve NU7'yi Zebra'da uyguladı. Zcash Topluluk Danışma Paneli (ZCAP) önemli kararlarda oylamaya katılır; Zcon7 Ekim 2026'da Cancún'da yapıldı.",
      },
    ],
    related: ["zebra", "frost", "zodl", "shielded-labs"],
    sources: [SRC.zfWork, SRC.zf2026, SRC.whoCreated, SRC.slIronwood],
  },
  {
    slug: "zodl",
    term: "ZODL (Zcash Open Development Lab)",
    short: {
      en: "The company formed in January 2026 by the team that left Electric Coin Co. It leads core protocol work and makes the Zodl wallet (formerly Zashi).",
      tr: "Electric Coin Co.'dan ayrılan ekibin Ocak 2026'da kurduğu şirket. Çekirdek protokol çalışmalarına öncülük eder ve Zodl cüzdanını (eski adıyla Zashi) geliştirir.",
    },
    body: [
      {
        en: "Electric Coin Co. (ECC), formed in 2015, created Zcash. In January 2026 its whole team left and founded ZODL; the Zashi wallet was renamed Zodl without users needing to do anything. ZODL led the Orchard fix and worked on Ironwood with others.",
        tr: "2015'te kurulan Electric Coin Co. (ECC), Zcash'i yarattı. Ocak 2026'da ekibin tamamı ayrılıp ZODL'yi kurdu; Zashi cüzdanının adı, kullanıcıların hiçbir şey yapmasına gerek kalmadan Zodl oldu. ZODL, Orchard düzeltmesine öncülük etti ve Ironwood üzerinde diğer kuruluşlarla birlikte çalıştı.",
      },
    ],
    related: ["zcash-foundation", "shielded-labs", "light-client"],
    sources: [SRC.zodlRename, SRC.zodlAbout, SRC.forumOrchardFix],
  },
  {
    slug: "shielded-labs",
    term: "Shielded Labs",
    short: {
      en: "A Swiss, donation-funded Zcash organization working on the NSM, Crosslink and protocol security. It has never taken dev fund money.",
      tr: "NSM, Crosslink ve protokol güvenliği üzerinde çalışan, bağışlarla finanse edilen İsviçreli Zcash kuruluşu. Geliştirme fonundan hiç para almadı.",
    },
    body: [
      {
        en: "Shielded Labs proposed the Network Sustainability Mechanism, which went live with NU7. The Orchard bug was found in May 2026 by Taylor Hornby while doing research for Shielded Labs, and Shielded Labs was one of the organizations behind Ironwood, which makes the supply verifiable again.",
        tr: "Shielded Labs, NU7 ile devreye giren Ağ Sürdürülebilirlik Mekanizması'nı önerdi. Orchard hatası Mayıs 2026'da Shielded Labs için araştırma yapan Taylor Hornby tarafından bulundu; Shielded Labs, arzı yeniden doğrulanabilir kılan Ironwood'un arkasındaki kuruluşlardan biridir.",
      },
    ],
    related: ["nsm", "ironwood", "zodl", "zcash-foundation"],
    sources: [SRC.slHome, SRC.slIronwood, SRC.zip257],
  },
];
