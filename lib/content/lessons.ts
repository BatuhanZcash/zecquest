import type { LessonBlock, LessonQuestion, Localized, Track } from "./types";
import { SRC } from "./sources";

/**
 * ZecLearn lesson tracks. Every factual claim is backed by research/FACTS.md
 * (checked 2026-11-10) and listed in each lesson's `sources`.
 */

const L = (en: string, tr: string): Localized => ({ en, tr });
const p = (en: string, tr: string): LessonBlock => ({ type: "p", text: L(en, tr) });
const h = (en: string, tr: string): LessonBlock => ({ type: "h", text: L(en, tr) });
const list = (...items: [string, string][]): LessonBlock => ({
  type: "list",
  items: items.map(([en, tr]) => L(en, tr)),
});
const callout = (tone: "info" | "warn" | "tip", en: string, tr: string): LessonBlock => ({
  type: "callout",
  tone,
  text: L(en, tr),
});
const term = (slug: string): LessonBlock => ({ type: "term", slug });
const fig = (key: string, en: string, tr: string): LessonBlock => ({ type: "figure", key, caption: L(en, tr) });
const q = (
  qq: [string, string],
  options: [string, string][],
  answer: number,
  explain: [string, string],
): LessonQuestion => {
  // Deterministically rotate options (keyed on the question text) so correct
  // answers are spread across positions; `answer` is adjusted to match.
  const n = options.length;
  let hsh = 0;
  for (const ch of qq[0]) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
  const k = hsh % n;
  const rotated = options.map((_, i) => options[(i + k) % n]);
  return {
    q: L(...qq),
    options: rotated.map(([en, tr]) => L(en, tr)),
    answer: (answer - k + n) % n,
    explain: L(...explain),
  };
};

export const TRACKS: Track[] = [
  // ───────────────────────────── Track 1 ─────────────────────────────
  {
    slug: "zcash-basics",
    level: "beginner",
    title: L("Zcash basics", "Zcash'in temelleri"),
    summary: L(
      "What Zcash is, why financial privacy matters, and how to hold and send ZEC safely.",
      "Zcash nedir, finansal gizlilik neden önemlidir ve ZEC nasıl güvenle saklanıp gönderilir.",
    ),
    lessons: [
      {
        slug: "what-is-zcash",
        minutes: 6,
        title: L("What is Zcash?", "Zcash nedir?"),
        summary: L(
          "Digital cash with a fixed supply and optional, strong privacy.",
          "Sabit arzlı, güçlü ve isteğe bağlı gizlilik sunan dijital nakit.",
        ),
        blocks: [
          p(
            "Zcash is a cryptocurrency that launched in October 2016. Its currency is ZEC. Like Bitcoin, it runs on a public blockchain kept by a decentralized network, and its supply is capped at 21 million coins.",
            "Zcash, Ekim 2016'da başlatılan bir kripto paradır. Para birimi ZEC'tir. Bitcoin gibi merkeziyetsiz bir ağın tuttuğu herkese açık bir blokzincirde çalışır ve arzı 21 milyon coin ile sınırlıdır.",
          ),
          p(
            "The big difference: Zcash lets you keep payments private. In its shielded pools, the sender, the receiver and the amount are encrypted, yet every node can still verify that the rules were followed. The tool that makes this possible is called a zero-knowledge proof.",
            "Büyük fark şu: Zcash ödemelerinizi gizli tutmanıza izin verir. Korumalı havuzlarında gönderen, alıcı ve tutar şifrelenir; buna rağmen her düğüm kuralların çiğnenmediğini doğrulayabilir. Bunu mümkün kılan araca sıfır bilgi ispatı denir.",
          ),
          term("zec"),
          h("Why privacy matters", "Gizlilik neden önemli?"),
          p(
            "On a fully public blockchain, anyone who learns one of your addresses can see your balance, your income and everyone you pay, forever. That is not how cash works, and it can put people at risk: a shop reveals its revenue to competitors, an employee reveals their salary, a donor becomes a target.",
            "Tamamen açık bir blokzincirde adreslerinizden birini öğrenen herkes bakiyenizi, gelirinizi ve ödeme yaptığınız herkesi sonsuza dek görebilir. Nakit böyle çalışmaz ve bu durum insanları riske atabilir: Bir dükkân cirosunu rakiplerine açık eder, bir çalışan maaşını ifşa eder, bir bağışçı hedef haline gelir.",
          ),
          list(
            ["Privacy protects ordinary people from profiling, theft and pressure.", "Gizlilik sıradan insanları fişlenmekten, hırsızlıktan ve baskıdan korur."],
            ["Privacy makes coins interchangeable (fungible): one ZEC is as good as any other.", "Gizlilik coinleri birbirinin yerine geçebilir (misli) kılar: Bir ZEC, diğer herhangi bir ZEC kadar değerlidir."],
            ["Privacy is not secrecy from everyone: with a viewing key you can choose to show your history to an auditor or accountant.", "Gizlilik herkesten saklanmak demek değildir: Görüntüleme anahtarıyla geçmişinizi bir denetçiye ya da muhasebeciye göstermeyi seçebilirsiniz."],
          ),
          fig(
            "shielded-vs-transparent",
            "Two payments side by side: a transparent one where sender, receiver and amount are readable on the chain, and a shielded one where the chain only shows encrypted data plus a \"valid\" check mark from the proof.",
            "Yan yana iki ödeme: Gönderen, alıcı ve tutarın zincirde okunabildiği şeffaf bir ödeme ve zincirin yalnızca şifreli veri ile ispattan gelen \"geçerli\" onay işaretini gösterdiği korumalı bir ödeme.",
          ),
          h("Who keeps Zcash running", "Zcash'i kim ayakta tutuyor?"),
          p(
            "Miners produce blocks using proof of work. Since the NU7 upgrade in November 2026, a new block arrives about every 25 seconds. Independent organizations such as ZODL, the Zcash Foundation and Shielded Labs write the software, and changes are proposed openly as ZIPs.",
            "Madenciler iş ispatı (proof of work) ile blok üretir. Kasım 2026'daki NU7 yükseltmesinden beri yaklaşık her 25 saniyede yeni bir blok gelir. ZODL, Zcash Foundation ve Shielded Labs gibi bağımsız kuruluşlar yazılımı geliştirir; değişiklikler ZIP olarak açıkça önerilir.",
          ),
          callout(
            "info",
            "ZecLearn never talks about prices or trading. Here you learn how the technology and the community work.",
            "ZecLearn fiyat ya da alım satım konuşmaz. Burada teknolojinin ve topluluğun nasıl işlediğini öğrenirsiniz.",
          ),
        ],
        quiz: [
          q(
            ["What is the maximum supply of ZEC?", "ZEC'in azami arzı nedir?"],
            [["21 million", "21 milyon"], ["100 million", "100 milyon"], ["There is no limit", "Sınır yok"], ["42 million", "42 milyon"]],
            0,
            ["Like Bitcoin, Zcash caps supply at 21 million ZEC. NU7 kept that cap.", "Bitcoin gibi Zcash da arzı 21 milyon ZEC ile sınırlar. NU7 bu sınırı korudu."],
          ),
          q(
            ["What can a shielded transaction hide?", "Korumalı bir işlem neyi gizleyebilir?"],
            [
              ["Only the amount", "Yalnızca tutarı"],
              ["Sender, receiver and amount", "Gönderen, alıcı ve tutarı"],
              ["Only the sender", "Yalnızca göndereni"],
              ["Nothing, it only compresses data", "Hiçbir şeyi; yalnızca veriyi sıkıştırır"],
            ],
            1,
            ["In shielded pools the sender, receiver and amount are encrypted, while a proof shows the transaction is valid.", "Korumalı havuzlarda gönderen, alıcı ve tutar şifrelenir; bir ispat ise işlemin geçerli olduğunu gösterir."],
          ),
          q(
            ["How can you show your shielded history to an accountant without giving them control of your funds?", "Korumalı geçmişinizi, fonlarınızın kontrolünü vermeden bir muhasebeciye nasıl gösterirsiniz?"],
            [
              ["Send them your seed phrase", "Kurtarma ifadenizi gönderirsiniz"],
              ["Move everything to a transparent address", "Her şeyi şeffaf bir adrese taşırsınız"],
              ["Share a viewing key", "Bir görüntüleme anahtarı paylaşırsınız"],
              ["It is impossible", "İmkânsızdır"],
            ],
            2,
            ["A viewing key reveals transactions but cannot spend. A seed phrase gives full control — never share it.", "Görüntüleme anahtarı işlemleri gösterir ama harcama yapamaz. Kurtarma ifadesi tam kontrol verir; asla paylaşmayın."],
          ),
          q(
            ["Since NU7, roughly how often is a new Zcash block produced?", "NU7'den beri yaklaşık ne sıklıkla yeni bir Zcash bloğu üretiliyor?"],
            [["Every 10 minutes", "Her 10 dakikada"], ["Every 75 seconds", "Her 75 saniyede"], ["Every 2.5 minutes", "Her 2,5 dakikada"], ["Every 25 seconds", "Her 25 saniyede"]],
            3,
            ["NU7 reduced the target block time from 75 to 25 seconds.", "NU7 hedef blok süresini 75 saniyeden 25 saniyeye indirdi."],
          ),
        ],
        sources: [SRC.whoCreated, SRC.zip218, SRC.zip316, SRC.zebra7],
      },
      {
        slug: "transparent-vs-shielded",
        minutes: 6,
        title: L("Transparent vs shielded", "Şeffaf ve korumalı"),
        summary: L(
          "Zcash has public and private pools. Learn what each reveals.",
          "Zcash'in herkese açık ve gizli havuzları var. Her birinin neyi açığa çıkardığını öğrenin.",
        ),
        blocks: [
          p(
            "Every ZEC lives in a value pool. The transparent pool is public, like Bitcoin. The shielded pools encrypt your payments. Which pool your coins are in decides how much the world can learn about you.",
            "Her ZEC bir değer havuzunda durur. Şeffaf havuz Bitcoin gibi herkese açıktır. Korumalı havuzlar ödemelerinizi şifreler. Coinlerinizin hangi havuzda olduğu, dünyanın sizin hakkınızda ne kadar şey öğrenebileceğini belirler.",
          ),
          term("transparent"),
          term("shielded"),
          h("What each one reveals", "Hangisi neyi gösterir?"),
          list(
            ["Transparent → shielded (shielding): the amount and the transparent address are visible; where the ZEC goes inside the pool is not.", "Şeffaftan korumalıya (korumaya alma): Tutar ve şeffaf adres görünür; ZEC'in havuz içinde nereye gittiği görünmez."],
            ["Shielded → shielded in the same pool: sender, receiver and amount are all encrypted. This is the most private kind of payment.", "Aynı havuzda korumalıdan korumalıya: Gönderen, alıcı ve tutar tamamen şifrelidir. En gizli ödeme türü budur."],
            ["Shielded → transparent (deshielding): the amount and the receiving address are visible.", "Korumalıdan şeffafa (korumadan çıkarma): Tutar ve alıcı adres görünür."],
            ["Transparent → transparent: everything is public.", "Şeffaftan şeffafa: Her şey herkese açıktır."],
          ),
          fig(
            "shielded-vs-transparent",
            "A 2×2 grid showing the four combinations (t→t, t→z, z→z, z→t) and, for each, which fields an observer can read: addresses, amount, or nothing.",
            "Dört kombinasyonu (t→t, t→z, z→z, z→t) gösteren 2×2'lik bir tablo; her biri için gözlemcinin okuyabildiği alanlar: adresler, tutar ya da hiçbir şey.",
          ),
          h("Today's shielded pools", "Bugünün korumalı havuzları"),
          p(
            "As of November 2026 the shielded pools you can use are Sapling and Ironwood. Ironwood is the newest; it replaced Orchard in July 2026. Modern wallets handle this for you, so you mostly just see a single shielded balance.",
            "Kasım 2026 itibarıyla kullanabileceğiniz korumalı havuzlar Sapling ve Ironwood'dur. En yenisi Ironwood'dur; Temmuz 2026'da Orchard'ın yerini aldı. Modern cüzdanlar bunu sizin yerinize yönetir; genellikle yalnızca tek bir korumalı bakiye görürsünüz.",
          ),
          callout(
            "tip",
            "Privacy works best as a habit: keep ZEC shielded and pay other shielded addresses. Every time value crosses between pools, the amount becomes public.",
            "Gizlilik bir alışkanlık olarak en iyi sonucu verir: ZEC'i korumalı tutun ve korumalı adreslere ödeme yapın. Değer havuzlar arasında her geçtiğinde tutar herkese açık hale gelir.",
          ),
        ],
        quiz: [
          q(
            ["Which payment type is the most private?", "Hangi ödeme türü en gizlisidir?"],
            [
              ["Transparent to transparent", "Şeffaftan şeffafa"],
              ["Transparent to shielded", "Şeffaftan korumalıya"],
              ["Shielded to shielded in the same pool", "Aynı havuzda korumalıdan korumalıya"],
              ["Shielded to transparent", "Korumalıdan şeffafa"],
            ],
            2,
            ["When value stays inside one shielded pool, sender, receiver and amount are all encrypted.", "Değer tek bir korumalı havuzun içinde kaldığında gönderen, alıcı ve tutarın hepsi şifrelidir."],
          ),
          q(
            ["When you shield ZEC from a transparent address, what can an observer still see?", "Şeffaf bir adresten ZEC'i korumaya aldığınızda gözlemci neyi hâlâ görebilir?"],
            [
              ["Nothing at all", "Hiçbir şeyi"],
              ["The transparent address and the amount", "Şeffaf adresi ve tutarı"],
              ["Your future shielded payments", "Gelecekteki korumalı ödemelerinizi"],
              ["Your seed phrase", "Kurtarma ifadenizi"],
            ],
            1,
            ["The transparent side is public, so the source address and the amount entering the pool are visible.", "Şeffaf taraf herkese açıktır; bu yüzden kaynak adres ve havuza giren tutar görünür."],
          ),
          q(
            ["Which shielded pools can you actively use in November 2026?", "Kasım 2026'da hangi korumalı havuzları aktif olarak kullanabilirsiniz?"],
            [
              ["Sprout and Orchard", "Sprout ve Orchard"],
              ["Only Orchard", "Yalnızca Orchard"],
              ["Sapling and Ironwood", "Sapling ve Ironwood"],
              ["Sprout and Sapling", "Sprout ve Sapling"],
            ],
            2,
            ["Sprout funds became unspendable with NU7 and Orchard is sealed (withdraw-only), so the active shielded pools are Sapling and Ironwood.", "Sprout'taki fonlar NU7 ile harcanamaz hale geldi ve Orchard mühürlü (yalnızca çıkış), bu yüzden aktif korumalı havuzlar Sapling ve Ironwood'dur."],
          ),
          q(
            ["Is Zcash's transparent pool private?", "Zcash'in şeffaf havuzu gizli midir?"],
            [
              ["Yes, all Zcash transactions are private", "Evet, tüm Zcash işlemleri gizlidir"],
              ["No, it is public like Bitcoin", "Hayır, Bitcoin gibi herkese açıktır"],
              ["Only the amounts are hidden", "Yalnızca tutarlar gizlidir"],
              ["Only on weekends", "Yalnızca hafta sonları"],
            ],
            1,
            ["Privacy comes from the shielded pools. Transparent addresses and amounts are fully visible.", "Gizlilik korumalı havuzlardan gelir. Şeffaf adresler ve tutarlar tamamen görünürdür."],
          ),
        ],
        sources: [SRC.zip316, SRC.zip258, SRC.zip259],
      },
      {
        slug: "addresses",
        minutes: 6,
        title: L("Zcash addresses and unified addresses", "Zcash adresleri ve birleşik adresler"),
        summary: L(
          "One address to share: how unified addresses pick the most private route.",
          "Paylaşmak için tek adres: Birleşik adresler en gizli yolu nasıl seçer?",
        ),
        blocks: [
          p(
            "Over the years Zcash added several address types: transparent addresses starting with \"t\", Sapling addresses starting with \"zs\", and since NU5 (2022) unified addresses starting with \"u1\".",
            "Zcash yıllar içinde birkaç adres türü ekledi: \"t\" ile başlayan şeffaf adresler, \"zs\" ile başlayan Sapling adresleri ve NU5'ten (2022) beri \"u1\" ile başlayan birleşik adresler.",
          ),
          term("unified-address"),
          h("How a unified address works", "Birleşik adres nasıl çalışır?"),
          p(
            "A unified address (UA) bundles several receivers into one string. When someone pays you, their wallet looks inside and picks the most private receiver it supports: the Orchard-type receiver first, then Sapling, and transparent only as a last resort.",
            "Birleşik adres (UA), birden çok alıcıyı tek bir dizide toplar. Biri size ödeme yaptığında cüzdanı adresin içine bakar ve desteklediği en gizli alıcıyı seçer: önce Orchard türü alıcı, sonra Sapling, en son çare olarak da şeffaf.",
          ),
          fig(
            "unified-address",
            "A single \"u1…\" address opened up like a folder, showing its receivers stacked by preference: Orchard-type (now delivering to Ironwood), Sapling, and an optional transparent receiver.",
            "Bir klasör gibi açılmış tek bir \"u1…\" adresi; içindeki alıcılar tercih sırasına göre dizili: Orchard türü (artık Ironwood'a teslim ediyor), Sapling ve isteğe bağlı şeffaf alıcı.",
          ),
          callout(
            "info",
            "After the 2026 upgrades, the Orchard-type receiver delivers into the new Ironwood pool. Ironwood reuses Orchard receivers, so addresses you shared before keep working.",
            "2026 yükseltmelerinden sonra Orchard türü alıcı yeni Ironwood havuzuna teslim eder. Ironwood Orchard alıcılarını yeniden kullandığı için daha önce paylaştığınız adresler çalışmaya devam eder.",
          ),
          h("Good habits", "İyi alışkanlıklar"),
          list(
            ["Share a unified address when you can. Your wallet shows it on the Receive screen.", "Mümkünse birleşik adres paylaşın. Cüzdanınız onu Al (Receive) ekranında gösterir."],
            ["Only use a transparent address when a service requires it, then shield the funds afterwards.", "Şeffaf adresi yalnızca bir hizmet şart koştuğunda kullanın ve ardından fonları korumaya alın."],
            ["Always double-check the first and last characters of an address before sending. Malware can swap addresses on your clipboard.", "Göndermeden önce adresin ilk ve son karakterlerini mutlaka kontrol edin. Kötü amaçlı yazılımlar panodaki adresi değiştirebilir."],
          ),
          term("t-address"),
        ],
        quiz: [
          q(
            ["On mainnet, a unified address starts with…", "Ana ağda birleşik adres şununla başlar:"],
            [["t1", "t1"], ["zs", "zs"], ["u1", "u1"], ["0x", "0x"]],
            2,
            ["Unified addresses (ZIP 316) start with \"u1\" on mainnet.", "Birleşik adresler (ZIP 316) ana ağda \"u1\" ile başlar."],
          ),
          q(
            ["When paying a unified address, which receiver does the sender's wallet use?", "Birleşik adrese ödeme yaparken gönderenin cüzdanı hangi alıcıyı kullanır?"],
            [
              ["Always the transparent one", "Her zaman şeffaf olanı"],
              ["The most preferred one it supports, shielded first", "Desteklediği en çok tercih edilen alıcıyı; önce korumalı olanı"],
              ["A random one", "Rastgele birini"],
              ["The one with the lowest fee", "En düşük ücretli olanı"],
            ],
            1,
            ["ZIP 316 sets a preference order: Orchard-type, then Sapling, then transparent.", "ZIP 316 bir tercih sırası belirler: Orchard türü, sonra Sapling, sonra şeffaf."],
          ),
          q(
            ["After Ironwood launched, what happened to existing unified addresses?", "Ironwood başladıktan sonra mevcut birleşik adreslere ne oldu?"],
            [
              ["They stopped working", "Çalışmayı bıraktılar"],
              ["They keep working, because Ironwood reuses Orchard receivers", "Çalışmaya devam ediyorlar, çünkü Ironwood Orchard alıcılarını yeniden kullanıyor"],
              ["They became transparent", "Şeffaf hale geldiler"],
              ["They must be re-registered on a website", "Bir web sitesinde yeniden kaydedilmeleri gerekiyor"],
            ],
            1,
            ["Ironwood reuses Orchard receivers, so the addresses you shared before still work.", "Ironwood Orchard alıcılarını yeniden kullandığı için daha önce paylaştığınız adresler hâlâ çalışır."],
          ),
          q(
            ["Why check the first and last characters of an address before sending?", "Göndermeden önce adresin ilk ve son karakterleri neden kontrol edilmeli?"],
            [
              ["To guess the fee", "Ücreti tahmin etmek için"],
              ["Clipboard malware can replace the address you copied", "Panodaki kötü amaçlı yazılım kopyaladığınız adresi değiştirebilir"],
              ["Addresses change every block", "Adresler her blokta değişir"],
              ["It makes the payment faster", "Ödemeyi hızlandırır"],
            ],
            1,
            ["Payments can't be reversed, and address-swapping malware is a common trick. A quick check protects you.", "Ödemeler geri alınamaz ve adres değiştiren kötü amaçlı yazılımlar yaygın bir hiledir. Hızlı bir kontrol sizi korur."],
          ),
        ],
        sources: [SRC.zip316, SRC.zodlIronwood, SRC.forumIronwood],
      },
      {
        slug: "wallets-and-safety",
        minutes: 8,
        title: L("Wallets and seed phrase safety", "Cüzdanlar ve kurtarma ifadesi güvenliği"),
        summary: L(
          "Pick a current wallet, back up your seed phrase, and recognize common scams.",
          "Güncel bir cüzdan seçin, kurtarma ifadenizi yedekleyin ve yaygın dolandırıcılıkları tanıyın.",
        ),
        blocks: [
          p(
            "A wallet is an app that holds your keys and talks to the network. Most people use a light wallet on their phone: it downloads compact data from a server and decrypts it on your device, so your keys never leave it.",
            "Cüzdan, anahtarlarınızı tutan ve ağla konuşan bir uygulamadır. Çoğu kişi telefonunda hafif bir cüzdan kullanır: Bir sunucudan sıkıştırılmış veri indirir ve bunu kendi cihazınızda çözer; anahtarlarınız cihazdan hiç çıkmaz.",
          ),
          h("Choosing a wallet", "Cüzdan seçmek"),
          p(
            "Pick a wallet that is actively maintained and supports Ironwood. In August 2026 the community's wallet-status thread listed, among others, Zodl (formerly Zashi), Zingo!, Zkool, Vizor, Cake Wallet and the Keystone hardware wallet. Zallet serves server and command-line users. Some older wallets were not updated, so check before you choose.",
            "Aktif olarak geliştirilen ve Ironwood'u destekleyen bir cüzdan seçin. Ağustos 2026'da topluluğun cüzdan durumu başlığında diğerlerinin yanı sıra Zodl (eski adıyla Zashi), Zingo!, Zkool, Vizor, Cake Wallet ve Keystone donanım cüzdanı listeleniyordu. Zallet sunucu ve komut satırı kullanıcılarına hizmet eder. Bazı eski cüzdanlar güncellenmedi; seçmeden önce kontrol edin.",
          ),
          callout(
            "info",
            "If you hold ZEC in an old wallet that still shows an Orchard balance, update it or restore your seed phrase in a current wallet. Orchard funds are not lost: current wallets move them into Ironwood.",
            "Hâlâ Orchard bakiyesi gösteren eski bir cüzdanda ZEC tutuyorsanız onu güncelleyin ya da kurtarma ifadenizi güncel bir cüzdana geri yükleyin. Orchard'daki fonlar kaybolmadı: Güncel cüzdanlar onları Ironwood'a taşır.",
          ),
          term("seed-phrase"),
          h("Protect your seed phrase", "Kurtarma ifadenizi koruyun"),
          list(
            ["Write it on paper (or metal). Don't photograph it, don't store it in notes, email or cloud.", "Kâğıda (ya da metale) yazın. Fotoğrafını çekmeyin; notlarda, e-postada ya da bulutta saklamayın."],
            ["Keep it somewhere private and safe from fire and water. Consider a second copy in another place.", "Gizli, yangın ve sudan korunan bir yerde tutun. Başka bir yerde ikinci bir kopya düşünebilirsiniz."],
            ["Also note your wallet's birthday height or creation date: restores are much faster.", "Cüzdanınızın doğum yüksekliğini ya da oluşturulma tarihini de not edin: Geri yükleme çok daha hızlı olur."],
            ["Never type it into a website or give it to anyone. Nobody legitimate will ever ask.", "Asla bir web sitesine yazmayın ya da kimseye vermeyin. Meşru hiç kimse onu istemez."],
          ),
          fig(
            "wallet-safety",
            "A checklist card: seed phrase on paper ✓, birthday height noted ✓, app downloaded from the official store or site ✓; and a red \"never\" column: share seed with support, type it into a site, install wallets from links in DMs.",
            "Bir kontrol listesi kartı: kurtarma ifadesi kâğıtta ✓, doğum yüksekliği not edildi ✓, uygulama resmî mağaza ya da siteden indirildi ✓; kırmızı \"asla\" sütunu: ifadeyi destek ekibiyle paylaşmak, bir siteye yazmak, özel mesajdaki bağlantılardan cüzdan kurmak.",
          ),
          h("Common scams", "Yaygın dolandırıcılıklar"),
          list(
            ["Fake \"support\" in DMs asking for your seed phrase or to \"validate\" your wallet.", "Özel mesajdan yazan, kurtarma ifadenizi isteyen ya da cüzdanınızı \"doğrulamanızı\" söyleyen sahte \"destek\"."],
            ["Fake wallet apps or look-alike websites. Get wallets only from the official site or app store listing.", "Sahte cüzdan uygulamaları ya da benzer görünümlü siteler. Cüzdanları yalnızca resmî siteden ya da uygulama mağazası sayfasından indirin."],
            ["\"Migration\" or \"upgrade\" sites that claim you must enter your seed to move funds after an upgrade. Real upgrades happen inside your wallet app.", "Bir yükseltmeden sonra fonları taşımak için kurtarma ifadenizi girmeniz gerektiğini iddia eden \"geçiş\" ya da \"yükseltme\" siteleri. Gerçek yükseltmeler cüzdan uygulamanızın içinde olur."],
            ["Giveaways that ask you to send ZEC first to receive more back.", "Daha fazlasını geri almak için önce ZEC göndermenizi isteyen çekilişler."],
          ),
          callout(
            "warn",
            "Transactions can't be reversed. If someone has your seed phrase, they control your ZEC, and no company or foundation can get it back.",
            "İşlemler geri alınamaz. Kurtarma ifadeniz birinin eline geçerse ZEC'inizi o kontrol eder ve hiçbir şirket ya da vakıf onu geri getiremez.",
          ),
        ],
        quiz: [
          q(
            ["Someone from \"wallet support\" messages you asking for your seed phrase to fix a sync problem. What do you do?", "\"Cüzdan desteği\"nden biri senkronizasyon sorununu çözmek için kurtarma ifadenizi istiyor. Ne yaparsınız?"],
            [
              ["Send it, they are support", "Gönderirim, destek ekibi sonuçta"],
              ["Send only half the words", "Kelimelerin yalnızca yarısını gönderirim"],
              ["Refuse: it's a scam, real support never asks for it", "Reddederim: Bu bir dolandırıcılık, gerçek destek asla istemez"],
              ["Send a photo of it instead", "Onun yerine fotoğrafını gönderirim"],
            ],
            2,
            ["No legitimate person ever needs your seed phrase. Anyone who has it controls your funds.", "Hiçbir meşru kişinin kurtarma ifadenize ihtiyacı yoktur. Ona sahip olan, fonlarınızı kontrol eder."],
          ),
          q(
            ["Where is the safest place to store your seed phrase?", "Kurtarma ifadenizi saklamak için en güvenli yer neresidir?"],
            [
              ["A screenshot in your photo gallery", "Fotoğraf galerinizdeki bir ekran görüntüsü"],
              ["On paper or metal, kept offline in a private place", "Kâğıt ya da metal üzerinde, çevrimdışı ve gizli bir yerde"],
              ["In an email to yourself", "Kendinize gönderdiğiniz bir e-postada"],
              ["In a group chat with friends", "Arkadaşlarla bir grup sohbetinde"],
            ],
            1,
            ["Anything online or on a connected device can leak. Offline paper or metal is the standard advice.", "Çevrimiçi ya da bağlı bir cihazdaki her şey sızabilir. Standart öneri, çevrimdışı kâğıt ya da metaldir."],
          ),
          q(
            ["Your old wallet still shows an Orchard balance. What is true?", "Eski cüzdanınız hâlâ Orchard bakiyesi gösteriyor. Hangisi doğru?"],
            [
              ["The funds are lost forever", "Fonlar sonsuza dek kayboldu"],
              ["You must enter your seed on a migration website", "Kurtarma ifadenizi bir geçiş sitesine girmelisiniz"],
              ["Update the wallet (or restore in a current one); it can move the funds into Ironwood", "Cüzdanı güncelleyin (ya da güncel bir cüzdana geri yükleyin); fonları Ironwood'a taşıyabilir"],
              ["Orchard funds turned into Sprout funds", "Orchard fonları Sprout fonlarına dönüştü"],
            ],
            2,
            ["Orchard is sealed but withdrawable. Current wallets migrate funds through the turnstile into Ironwood. Websites asking for your seed are scams.", "Orchard mühürlü ama çekilebilir durumda. Güncel cüzdanlar fonları turnike üzerinden Ironwood'a taşır. Kurtarma ifadenizi isteyen siteler dolandırıcıdır."],
          ),
          q(
            ["What is a wallet's \"birthday height\" useful for?", "Bir cüzdanın \"doğum yüksekliği\" ne işe yarar?"],
            [
              ["It sets your address", "Adresinizi belirler"],
              ["It speeds up restoring, because scanning can start from that block", "Geri yüklemeyi hızlandırır, çünkü tarama o bloktan başlayabilir"],
              ["It is your password", "Şifrenizdir"],
              ["It decides your fee", "Ücretinizi belirler"],
            ],
            1,
            ["The birthday height is the block when the wallet was created. A restore only needs to scan from there.", "Doğum yüksekliği, cüzdanın oluşturulduğu bloktur. Geri yükleme yalnızca oradan itibaren tarama yapar."],
          ),
        ],
        sources: [SRC.forumIronwood, SRC.zodlRename, SRC.zodlIronwood, SRC.zip318],
      },
      {
        slug: "sending-shielded",
        minutes: 6,
        title: L("How to send ZEC privately", "ZEC nasıl gizlice gönderilir?"),
        summary: L(
          "A practical walkthrough: shield, send to a unified address, add a memo.",
          "Uygulamalı bir rehber: korumaya alın, birleşik adrese gönderin, memo ekleyin.",
        ),
        blocks: [
          p(
            "Sending privately is mostly about where your ZEC starts and where it ends. If both ends are shielded and in the same pool, the payment reveals nothing about who, to whom or how much.",
            "Gizli göndermenin büyük kısmı, ZEC'inizin nereden başlayıp nerede bittiğiyle ilgilidir. İki uç da korumalıysa ve aynı havuzdaysa ödeme kim, kime ve ne kadar konusunda hiçbir şey göstermez.",
          ),
          h("Step by step", "Adım adım"),
          list(
            ["1. Shield first. If you received ZEC on a transparent address (for example from an exchange), use your wallet's shield option to move it into your shielded balance.", "1. Önce korumaya alın. ZEC'i şeffaf bir adrese aldıysanız (örneğin bir borsadan), cüzdanınızın korumaya alma seçeneğiyle onu korumalı bakiyenize taşıyın."],
            ["2. Ask the recipient for a unified address (u1…) or a shielded address.", "2. Alıcıdan birleşik adres (u1…) ya da korumalı bir adres isteyin."],
            ["3. Paste or scan it, then check the beginning and end characters.", "3. Yapıştırın ya da tarayın, ardından baştaki ve sondaki karakterleri kontrol edin."],
            ["4. Add a memo if useful: an invoice number or a short note. Only the recipient can read it.", "4. İşe yararsa bir memo ekleyin: fatura numarası ya da kısa bir not. Yalnızca alıcı okuyabilir."],
            ["5. Review the amount and fee, then send. With 25-second blocks, the first confirmation usually arrives quickly.", "5. Tutarı ve ücreti gözden geçirip gönderin. 25 saniyelik bloklarla ilk onay genellikle hızlı gelir."],
          ),
          term("memo"),
          callout(
            "tip",
            "For extra privacy, avoid shielding and then immediately sending the exact same amount somewhere transparent. Pool crossings reveal amounts, and matching amounts and timing can link them.",
            "Daha fazla gizlilik için ZEC'i korumaya alıp hemen ardından tam aynı tutarı şeffaf bir yere göndermekten kaçının. Havuz geçişleri tutarları gösterir; eşleşen tutar ve zamanlama bunları birbirine bağlayabilir.",
          ),
          h("Paying a service that only takes transparent ZEC", "Yalnızca şeffaf ZEC kabul eden bir hizmete ödeme"),
          p(
            "Some services still only accept transparent addresses. You can pay them from your shielded balance; the amount and their address will be public, but your shielded history stays private.",
            "Bazı hizmetler hâlâ yalnızca şeffaf adres kabul ediyor. Onlara korumalı bakiyenizden ödeme yapabilirsiniz; tutar ve onların adresi herkese açık olur, ama korumalı geçmişiniz gizli kalır.",
          ),
          fig(
            "shielded-vs-transparent",
            "A simple path diagram: exchange (transparent) → shield → your shielded balance → friend's unified address, with lock icons on the shielded hops and an eye icon on the transparent hop.",
            "Basit bir yol diyagramı: borsa (şeffaf) → korumaya alma → korumalı bakiyeniz → arkadaşınızın birleşik adresi; korumalı adımlarda kilit simgesi, şeffaf adımda göz simgesi.",
          ),
        ],
        quiz: [
          q(
            ["You just received ZEC from an exchange to a transparent address. What's the privacy-friendly next step?", "Bir borsadan şeffaf adresinize ZEC aldınız. Gizlilik dostu bir sonraki adım nedir?"],
            [
              ["Leave it there", "Orada bırakmak"],
              ["Shield it into your shielded balance", "Korumalı bakiyenize alarak korumaya almak"],
              ["Post the address publicly", "Adresi herkese açık paylaşmak"],
              ["Send it back and forth between t-addresses", "t-adresleri arasında gidip gelmek"],
            ],
            1,
            ["Shielding moves funds into a shielded pool, where future payments are encrypted.", "Korumaya alma, fonları gelecekteki ödemelerin şifreli olduğu korumalı bir havuza taşır."],
          ),
          q(
            ["Who can read the memo on a shielded payment?", "Korumalı bir ödemedeki memoyu kim okuyabilir?"],
            [
              ["Everyone", "Herkes"],
              ["Only miners", "Yalnızca madenciler"],
              ["The recipient (and anyone with their viewing key)", "Alıcı (ve onun görüntüleme anahtarına sahip olan herkes)"],
              ["Nobody, not even the recipient", "Hiç kimse, alıcı bile"],
            ],
            2,
            ["Memos are encrypted to the recipient. A viewing key holder can also read them.", "Memolar alıcıya göre şifrelenir. Görüntüleme anahtarına sahip olan da okuyabilir."],
          ),
          q(
            ["Which habit can weaken your privacy?", "Hangi alışkanlık gizliliğinizi zayıflatabilir?"],
            [
              ["Paying shielded addresses", "Korumalı adreslere ödeme yapmak"],
              ["Keeping ZEC shielded for a while", "ZEC'i bir süre korumalı tutmak"],
              ["Shielding an amount and immediately unshielding the exact same amount", "Bir tutarı korumaya alıp hemen tam aynı tutarı korumadan çıkarmak"],
              ["Using a memo", "Memo kullanmak"],
            ],
            2,
            ["Amounts are visible when crossing pools; matching amounts and timing can link the two transactions.", "Havuz geçişlerinde tutarlar görünür; eşleşen tutar ve zamanlama iki işlemi birbirine bağlayabilir."],
          ),
          q(
            ["If you pay a transparent-only service from your shielded balance, what becomes public?", "Yalnızca şeffaf kabul eden bir hizmete korumalı bakiyenizden ödeme yaparsanız ne herkese açık olur?"],
            [
              ["Your entire shielded history", "Tüm korumalı geçmişiniz"],
              ["The amount and the service's transparent address", "Tutar ve hizmetin şeffaf adresi"],
              ["Your seed phrase", "Kurtarma ifadeniz"],
              ["Nothing", "Hiçbir şey"],
            ],
            1,
            ["Deshielding reveals the amount and destination, but not your other shielded activity.", "Korumadan çıkarma tutarı ve hedefi gösterir, ama diğer korumalı işlemlerinizi göstermez."],
          ),
        ],
        sources: [SRC.zip316, SRC.zip218, SRC.zip258],
      },
    ],
  },

  // ───────────────────────────── Track 2 ─────────────────────────────
  {
    slug: "how-zcash-works",
    level: "intermediate",
    title: L("How Zcash works", "Zcash nasıl çalışır?"),
    summary: L(
      "Zero-knowledge proofs, notes and nullifiers, value pools, network upgrades and the software that runs the network.",
      "Sıfır bilgi ispatları, notlar ve nullifier'lar, değer havuzları, ağ yükseltmeleri ve ağı çalıştıran yazılımlar.",
    ),
    lessons: [
      {
        slug: "zero-knowledge-proofs",
        minutes: 8,
        title: L("Zero-knowledge proofs, intuitively", "Sezgisel olarak sıfır bilgi ispatları"),
        summary: L(
          "How you can prove something is true without revealing anything else.",
          "Bir şeyin doğru olduğunu başka hiçbir şey açıklamadan nasıl kanıtlarsınız?",
        ),
        blocks: [
          p(
            "A zero-knowledge proof lets you convince someone that a statement is true without telling them anything beyond the fact that it's true. It sounds like magic, but it is mathematics.",
            "Sıfır bilgi ispatı, bir ifadenin doğru olduğuna birini ikna etmenizi; doğru olduğu bilgisinin ötesinde ona hiçbir şey söylemeden yapmanızı sağlar. Sihir gibi gelir ama matematiktir.",
          ),
          h("An everyday analogy", "Gündelik bir benzetme"),
          p(
            "Imagine a friend who is colour-blind holds a red ball and a green ball behind their back, then shows you one, hides them again, and maybe swaps them. Each time you say whether they swapped. If you could not tell the colours apart, you would be right only half the time. After 20 correct answers in a row, your friend is convinced you can see the difference — but they still don't know which ball is red.",
            "Renk körü bir arkadaşınızın arkasında bir kırmızı bir de yeşil top tuttuğunu, birini gösterip tekrar sakladığını ve belki de yerlerini değiştirdiğini düşünün. Her seferinde değiştirip değiştirmediğini söylüyorsunuz. Renkleri ayırt edemeseydiniz yalnızca yarı yarıya haklı çıkardınız. Arka arkaya 20 doğru cevaptan sonra arkadaşınız farkı görebildiğinize ikna olur — ama hangi topun kırmızı olduğunu hâlâ bilmez.",
          ),
          fig(
            "zkp-intuition",
            "The two-ball game in three panels: hidden swap, your answer, and a counter showing the chance of guessing falling (1/2, 1/4, … 1/1,000,000) as rounds succeed.",
            "Üç panelde iki top oyunu: gizli değiştirme, sizin cevabınız ve turlar başarılı oldukça tahminle bilme olasılığının düştüğünü gösteren bir sayaç (1/2, 1/4, … 1/1.000.000).",
          ),
          h("What Zcash proves", "Zcash neyi ispatlar?"),
          p(
            "In a shielded transaction, the proof says: the notes I'm spending exist in the pool; I hold the keys to spend them; they haven't been spent before; and the value going in equals the value coming out plus the fee. Nodes check the proof in milliseconds and learn none of the private details.",
            "Korumalı bir işlemde ispat şunu söyler: Harcadığım notlar havuzda mevcut; onları harcayacak anahtarlara sahibim; daha önce harcanmadılar; ve giren değer, çıkan değer artı ücrete eşit. Düğümler ispatı milisaniyeler içinde kontrol eder ve özel ayrıntıların hiçbirini öğrenmez.",
          ),
          term("zk-snark"),
          h("From trusted setups to Halo 2", "Güvenilir kurulumdan Halo 2'ye"),
          p(
            "Zcash's first proof systems (Sprout, Sapling) needed a trusted setup ceremony to create public parameters. Halo 2, which arrived with NU5 in 2022 and is used by Orchard and Ironwood, needs no trusted setup.",
            "Zcash'in ilk ispat sistemleri (Sprout, Sapling) açık parametreleri üretmek için güvenilir bir kurulum törenine ihtiyaç duyuyordu. 2022'de NU5 ile gelen ve Orchard ile Ironwood'un kullandığı Halo 2 güvenilir kurulum gerektirmez.",
          ),
          term("halo-2"),
          callout(
            "warn",
            "Proofs are only as good as their implementation. In May 2026 a researcher found a bug in Orchard's circuit that could in theory have allowed counterfeiting. It was fixed within days, and the response (Ironwood, turnstile, formal verification) is covered in the value pools lesson.",
            "İspatlar ancak uygulandıkları kod kadar iyidir. Mayıs 2026'da bir araştırmacı Orchard devresinde teoride sahte para üretimine izin verebilecek bir hata buldu. Hata birkaç gün içinde düzeltildi; verilen yanıt (Ironwood, turnike, biçimsel doğrulama) değer havuzları dersinde anlatılıyor.",
          ),
        ],
        quiz: [
          q(
            ["What does a zero-knowledge proof reveal?", "Sıfır bilgi ispatı neyi açığa çıkarır?"],
            [
              ["The secret behind the statement", "İfadenin arkasındaki sırrı"],
              ["Only that the statement is true", "Yalnızca ifadenin doğru olduğunu"],
              ["The sender's name", "Gönderenin adını"],
              ["Nothing, it can't be checked", "Hiçbir şeyi; kontrol edilemez"],
            ],
            1,
            ["That is the \"zero knowledge\" part: the verifier learns only that the claim holds.", "\"Sıfır bilgi\" kısmı budur: Doğrulayıcı yalnızca iddianın doğru olduğunu öğrenir."],
          ),
          q(
            ["Which of these is NOT something a Zcash shielded proof shows?", "Aşağıdakilerden hangisi Zcash korumalı ispatının gösterdiği bir şey DEĞİLDİR?"],
            [
              ["The spent notes exist", "Harcanan notlar mevcuttur"],
              ["They weren't spent before", "Daha önce harcanmadılar"],
              ["Inputs equal outputs plus fee", "Girdiler, çıktılar artı ücrete eşittir"],
              ["The recipient's real-world identity", "Alıcının gerçek kimliği"],
            ],
            3,
            ["Zcash proofs say nothing about identities; they only prove the transaction follows the rules.", "Zcash ispatları kimlikler hakkında hiçbir şey söylemez; yalnızca işlemin kurallara uyduğunu kanıtlar."],
          ),
          q(
            ["Which proving system removed the need for a trusted setup?", "Hangi ispat sistemi güvenilir kurulum ihtiyacını ortadan kaldırdı?"],
            [["Sprout", "Sprout"], ["Sapling", "Sapling"], ["Halo 2", "Halo 2"], ["Proof of work", "İş ispatı"]],
            2,
            ["Halo 2 (NU5, 2022) needs no trusted setup. Sprout and Sapling relied on setup ceremonies.", "Halo 2 (NU5, 2022) güvenilir kurulum gerektirmez. Sprout ve Sapling kurulum törenlerine dayanıyordu."],
          ),
          q(
            ["In the two-ball game, why does your friend become convinced?", "İki top oyununda arkadaşınız neden ikna olur?"],
            [
              ["You tell them which ball is red", "Hangi topun kırmızı olduğunu söylersiniz"],
              ["Guessing right many times in a row by luck becomes extremely unlikely", "Şans eseri arka arkaya birçok kez doğru tahmin etmek son derece olasılık dışı hale gelir"],
              ["They trust you", "Size güvenir"],
              ["A third person confirms it", "Üçüncü bir kişi doğrular"],
            ],
            1,
            ["Each round halves the chance of a lucky guess; after many rounds, cheating is practically impossible.", "Her tur şans eseri bilme olasılığını yarıya indirir; birçok turdan sonra hile pratikte imkânsızdır."],
          ),
        ],
        sources: [SRC.nuGuide, SRC.zfWork, SRC.zip257],
      },
      {
        slug: "notes-and-nullifiers",
        minutes: 8,
        title: L("Notes, commitments and nullifiers", "Notlar, taahhütler ve nullifier'lar"),
        summary: L(
          "How Zcash tracks private money without a public list of balances.",
          "Zcash, herkese açık bakiye listesi olmadan gizli parayı nasıl izler?",
        ),
        blocks: [
          p(
            "Bitcoin keeps a public list of unspent coins. Zcash's shielded pools can't do that without leaking privacy, so they use three ideas together: notes, note commitments and nullifiers.",
            "Bitcoin harcanmamış coinlerin herkese açık bir listesini tutar. Zcash'in korumalı havuzları bunu gizliliği sızdırmadan yapamaz; bu yüzden üç fikri birlikte kullanır: notlar, not taahhütleri ve nullifier'lar.",
          ),
          term("note"),
          h("1. Creating a note", "1. Not oluşturmak"),
          p(
            "When you receive shielded ZEC, a note is created: an encrypted record of the amount and the owner. The chain only stores a commitment — a fingerprint that hides the contents — which is appended to the pool's note commitment tree.",
            "Korumalı ZEC aldığınızda bir not oluşturulur: tutarın ve sahibinin şifreli kaydı. Zincir yalnızca bir taahhüt saklar — içeriği gizleyen bir parmak izi — ve bu, havuzun not taahhüt ağacına eklenir.",
          ),
          term("note-commitment-tree"),
          h("2. Spending a note", "2. Not harcamak"),
          p(
            "To spend, your wallet proves in zero knowledge that your note's commitment is somewhere in the tree, without saying where. It also publishes the note's nullifier, a unique tag only you can compute.",
            "Harcamak için cüzdanınız, notunuzun taahhüdünün ağaçta bir yerde olduğunu, yerini söylemeden sıfır bilgiyle kanıtlar. Ayrıca notun, yalnızca sizin hesaplayabildiğiniz benzersiz etiketi olan nullifier'ını yayımlar.",
          ),
          term("nullifier"),
          h("3. Stopping double spends", "3. Çifte harcamayı durdurmak"),
          p(
            "Nodes keep the set of all nullifiers ever revealed. If a transaction shows a nullifier that's already in the set, it's rejected. Outsiders can't link a nullifier to its commitment, so they can't tell which note was spent.",
            "Düğümler şimdiye kadar açıklanmış tüm nullifier'ların kümesini tutar. Bir işlem kümede zaten bulunan bir nullifier gösterirse reddedilir. Dışarıdakiler bir nullifier'ı taahhüdüne bağlayamaz; bu yüzden hangi notun harcandığını anlayamazlar.",
          ),
          fig(
            "note-nullifier",
            "Left: a note being sealed into a commitment and added as a leaf of a Merkle tree. Right: spending — a proof pointing \"somewhere in the tree\" and a nullifier dropped into a public \"spent\" set; a second identical nullifier bounces off.",
            "Solda: bir notun taahhüt olarak mühürlenip Merkle ağacına yaprak olarak eklenmesi. Sağda: harcama — \"ağaçta bir yeri\" gösteren bir ispat ve herkese açık \"harcandı\" kümesine düşen bir nullifier; aynı ikinci nullifier geri sekiyor.",
          ),
          callout(
            "info",
            "Each shielded pool has its own commitment tree and nullifier set. When Ironwood launched in July 2026, it started a brand-new tree.",
            "Her korumalı havuzun kendi taahhüt ağacı ve nullifier kümesi vardır. Ironwood Temmuz 2026'da başladığında yepyeni bir ağaçla başladı.",
          ),
        ],
        quiz: [
          q(
            ["What does the blockchain store when a shielded note is created?", "Korumalı bir not oluşturulduğunda blokzincir neyi saklar?"],
            [
              ["The amount in plain text", "Açık metin halinde tutarı"],
              ["A commitment that hides the note's contents", "Notun içeriğini gizleyen bir taahhüdü"],
              ["The owner's name", "Sahibinin adını"],
              ["The sender's seed phrase", "Gönderenin kurtarma ifadesini"],
            ],
            1,
            ["Only the commitment goes into the pool's note commitment tree; the note itself is encrypted.", "Havuzun not taahhüt ağacına yalnızca taahhüt girer; notun kendisi şifrelidir."],
          ),
          q(
            ["What prevents the same note from being spent twice?", "Aynı notun iki kez harcanmasını ne engeller?"],
            [
              ["A bank checks it", "Bir banka kontrol eder"],
              ["The nullifier: a repeated nullifier is rejected", "Nullifier: Tekrar eden bir nullifier reddedilir"],
              ["The memo field", "Memo alanı"],
              ["Miners remember your address", "Madenciler adresinizi hatırlar"],
            ],
            1,
            ["Nodes keep a set of revealed nullifiers; duplicates are invalid.", "Düğümler açıklanmış nullifier'ların kümesini tutar; tekrarlar geçersizdir."],
          ),
          q(
            ["Why can't observers tell which note was spent?", "Gözlemciler hangi notun harcandığını neden anlayamaz?"],
            [
              ["Nullifiers can't be linked to their commitments by outsiders", "Dışarıdakiler nullifier'ları taahhütlerine bağlayamaz"],
              ["Notes are deleted from the tree", "Notlar ağaçtan silinir"],
              ["Transactions are sent by email", "İşlemler e-postayla gönderilir"],
              ["They can, it's public", "Anlayabilirler, herkese açıktır"],
            ],
            0,
            ["The tree is append-only and the proof hides which leaf is yours; the nullifier is unlinkable to it.", "Ağaç yalnızca eklemeli çalışır ve ispat hangi yaprağın sizin olduğunu gizler; nullifier o yaprağa bağlanamaz."],
          ),
          q(
            ["What happened to the note commitment tree when Ironwood launched?", "Ironwood başladığında not taahhüt ağacına ne oldu?"],
            [
              ["Ironwood reused Sprout's tree", "Ironwood, Sprout'un ağacını kullandı"],
              ["All trees were deleted", "Tüm ağaçlar silindi"],
              ["Ironwood started its own new tree", "Ironwood kendi yeni ağacıyla başladı"],
              ["Trees were made public", "Ağaçlar herkese açık hale getirildi"],
            ],
            2,
            ["Each pool has its own tree; Ironwood began with a fresh one at NU6.3.", "Her havuzun kendi ağacı vardır; Ironwood NU6.3'te sıfırdan bir ağaçla başladı."],
          ),
        ],
        sources: [SRC.zip258, SRC.zip316],
      },
      {
        slug: "value-pools-history",
        minutes: 9,
        title: L("Value pools: from Sprout to Ironwood", "Değer havuzları: Sprout'tan Ironwood'a"),
        summary: L(
          "The five pools, why new ones were added, and exactly where each stands today.",
          "Beş havuz, yenilerinin neden eklendiği ve her birinin bugün tam olarak nerede durduğu.",
        ),
        blocks: [
          p(
            "Zcash's privacy technology has improved several times. Rather than changing an existing pool in place, Zcash usually adds a new pool and lets people move over. The protocol tracks the total balance of each pool publicly.",
            "Zcash'in gizlilik teknolojisi birçok kez gelişti. Zcash genellikle mevcut bir havuzu yerinde değiştirmek yerine yeni bir havuz ekler ve insanların oraya geçmesine izin verir. Protokol her havuzun toplam bakiyesini herkese açık olarak izler.",
          ),
          term("value-pool"),
          fig(
            "value-pools-timeline",
            "A horizontal timeline 2016–2026 with one lane per pool: Transparent (2016→active), Sprout (2016; no new deposits from Canopy 2020; unspendable at NU7, Nov 2026), Sapling (Oct 2018→active), Orchard (NU5, May 2022; sealed at NU6.3, Jul 2026; withdraw-only), Ironwood (NU6.3, Jul 2026→active).",
            "2016–2026 arası yatay bir zaman çizelgesi, her havuz için bir şerit: Şeffaf (2016→aktif), Sprout (2016; Canopy 2020'den beri yeni giriş yok; NU7'de, Kasım 2026, harcanamaz), Sapling (Ekim 2018→aktif), Orchard (NU5, Mayıs 2022; NU6.3'te mühürlendi, Temmuz 2026; yalnızca çıkış), Ironwood (NU6.3, Temmuz 2026→aktif).",
          ),
          h("The pools, one by one", "Havuzlar tek tek"),
          list(
            ["Transparent (2016): public, Bitcoin-style. Active.", "Şeffaf (2016): herkese açık, Bitcoin tarzı. Aktif."],
            ["Sprout (2016): the original shielded pool. Canopy (2020) stopped new deposits. NU7 (November 2026) disallowed the transaction format Sprout needs, so the remaining funds are now unspendable — not burned, and a future upgrade could restore access.", "Sprout (2016): ilk korumalı havuz. Canopy (2020) yeni girişleri durdurdu. NU7 (Kasım 2026) Sprout'un ihtiyaç duyduğu işlem biçimini yasakladı; bu yüzden kalan fonlar artık harcanamaz — yakılmadı ve ileride bir yükseltme erişimi geri getirebilir."],
            ["Sapling (2018): faster, mobile-friendly shielded pool. Active.", "Sapling (2018): daha hızlı, mobil dostu korumalı havuz. Aktif."],
            ["Orchard (2022): Halo 2, no trusted setup. Sealed since July 2026: no new value can enter, but existing funds can leave, normally into Ironwood.", "Orchard (2022): Halo 2, güvenilir kurulum yok. Temmuz 2026'dan beri mühürlü: İçeri yeni değer giremez ama mevcut fonlar çıkabilir, normalde Ironwood'a."],
            ["Ironwood (2026): the newest shielded pool, created by NU6.3 on 28 July 2026. Active.", "Ironwood (2026): NU6.3 ile 28 Temmuz 2026'da oluşturulan en yeni korumalı havuz. Aktif."],
          ),
          h("Why Ironwood exists", "Ironwood neden var?"),
          p(
            "On 29 May 2026, security researcher Taylor Hornby, doing research for Shielded Labs, reported a soundness bug in Orchard's proof circuit that could in theory have allowed counterfeit ZEC. An emergency soft fork paused Orchard, and NU6.2 shipped a corrected circuit in early June. No evidence of exploitation was found.",
            "29 Mayıs 2026'da Shielded Labs için araştırma yapan güvenlik araştırmacısı Taylor Hornby, Orchard ispat devresinde teoride sahte ZEC üretimine izin verebilecek bir sağlamlık hatası bildirdi. Acil bir soft fork Orchard'ı durdurdu ve NU6.2 Haziran başında düzeltilmiş devreyi getirdi. İstismar edildiğine dair kanıt bulunmadı.",
          ),
          p(
            "But because Orchard hides amounts, nobody could prove publicly that the bug had never been used. So ZODL, the Zcash Foundation, Shielded Labs, Project Tachyon and Valar Group built Ironwood: a new pool using the corrected, formally verified circuit. Orchard was sealed, and every ZEC leaving it passes a turnstile that refuses to release more than went in.",
            "Ancak Orchard tutarları gizlediği için hatanın hiç kullanılmadığını kimse herkese açık biçimde kanıtlayamıyordu. Bu yüzden ZODL, Zcash Foundation, Shielded Labs, Project Tachyon ve Valar Group, Ironwood'u inşa etti: düzeltilmiş ve biçimsel olarak doğrulanmış devreyi kullanan yeni bir havuz. Orchard mühürlendi ve oradan çıkan her ZEC, girenden fazlasını bırakmayan bir turnikeden geçiyor.",
          ),
          term("turnstile"),
          term("ironwood"),
          callout(
            "warn",
            "You may read that \"the Orchard pool is closed\". Precisely: Orchard is closed to new deposits and internal payments, but it is not frozen. Funds in Orchard can still be moved out into Ironwood with an up-to-date wallet.",
            "\"Orchard havuzu kapandı\" diye okuyabilirsiniz. Tam olarak doğrusu şu: Orchard yeni girişlere ve havuz içi ödemelere kapalıdır ama dondurulmamıştır. Orchard'daki fonlar güncel bir cüzdanla hâlâ Ironwood'a taşınabilir.",
          ),
        ],
        quiz: [
          q(
            ["What is the status of the Orchard pool in November 2026?", "Kasım 2026'da Orchard havuzunun durumu nedir?"],
            [
              ["Fully active, like before", "Eskisi gibi tamamen aktif"],
              ["Sealed: no new deposits, but funds can still move out into Ironwood", "Mühürlü: Yeni giriş yok, ama fonlar hâlâ Ironwood'a taşınabilir"],
              ["Frozen: all funds are lost", "Dondurulmuş: tüm fonlar kayıp"],
              ["Merged into Sapling", "Sapling ile birleştirildi"],
            ],
            1,
            ["Since NU6.3 (28 July 2026) Orchard can only be spent from, not added to. Wallets migrate funds into Ironwood through the turnstile.", "NU6.3'ten (28 Temmuz 2026) beri Orchard'dan yalnızca harcama yapılabilir, içine ekleme yapılamaz. Cüzdanlar fonları turnike üzerinden Ironwood'a taşır."],
          ),
          q(
            ["What happened to Sprout funds when NU7 activated?", "NU7 devreye girdiğinde Sprout fonlarına ne oldu?"],
            [
              ["They were moved to Ironwood automatically", "Otomatik olarak Ironwood'a taşındılar"],
              ["They were burned", "Yakıldılar"],
              ["They became unspendable, since version 4 transactions are no longer allowed", "Sürüm 4 işlemlere artık izin verilmediği için harcanamaz hale geldiler"],
              ["Nothing changed", "Hiçbir şey değişmedi"],
            ],
            2,
            ["NU7 (ZIP 2003) disallowed v4 transactions, which Sprout spends require. The coins weren't burned; a future upgrade could restore access.", "NU7 (ZIP 2003), Sprout harcamalarının gerektirdiği v4 işlemleri yasakladı. Coinler yakılmadı; ileride bir yükseltme erişimi geri getirebilir."],
          ),
          q(
            ["Why was Ironwood created instead of simply keeping the fixed Orchard pool?", "Neden düzeltilmiş Orchard havuzunu korumak yerine Ironwood oluşturuldu?"],
            [
              ["To change the supply cap", "Arz sınırını değiştirmek için"],
              ["To make the circulating supply publicly verifiable after the bug, via the turnstile", "Hatadan sonra dolaşımdaki arzı turnike aracılığıyla herkese açık biçimde doğrulanabilir kılmak için"],
              ["To remove privacy", "Gizliliği kaldırmak için"],
              ["Because Orchard was too fast", "Orchard çok hızlı olduğu için"],
            ],
            1,
            ["Hidden amounts meant no one could prove the bug was unused. Moving value through a turnstile into a fresh pool makes supply auditable.", "Gizli tutarlar, hatanın kullanılmadığını kimsenin kanıtlayamaması demekti. Değeri bir turnike üzerinden yeni bir havuza taşımak arzı denetlenebilir kılar."],
          ),
          q(
            ["Which shielded pool launched in 2018 and is still active today?", "Hangi korumalı havuz 2018'de başladı ve bugün hâlâ aktif?"],
            [["Orchard", "Orchard"], ["Sapling", "Sapling"], ["Ironwood", "Ironwood"], ["Sprout", "Sprout"]],
            1,
            ["Sapling activated at block 419,200 in October 2018 and is still active.", "Sapling Ekim 2018'de 419.200. blokta devreye girdi ve hâlâ aktif."],
          ),
        ],
        sources: [SRC.zip211, SRC.zip205, SRC.zip252, SRC.zip257, SRC.zip258, SRC.zip259, SRC.slIronwood, SRC.zodlIronwood, SRC.forumOrchardFix],
      },
      {
        slug: "network-upgrades",
        minutes: 8,
        title: L("Network upgrades, up to NU7", "NU7'ye kadar ağ yükseltmeleri"),
        summary: L(
          "How Zcash changes its rules, and what the November 2026 NU7 upgrade did.",
          "Zcash kurallarını nasıl değiştirir ve Kasım 2026'daki NU7 yükseltmesi neler yaptı?",
        ),
        blocks: [
          p(
            "Zcash's consensus rules change through network upgrades. Each one is specified in ZIPs, implemented in node software, and activates at a fixed block height. Operators who don't upgrade in time are left on a different chain.",
            "Zcash'in mutabakat kuralları ağ yükseltmeleriyle değişir. Her biri ZIP'lerde tanımlanır, düğüm yazılımında uygulanır ve belirli bir blok yüksekliğinde devreye girer. Zamanında güncellemeyen operatörler farklı bir zincirde kalır.",
          ),
          term("network-upgrade"),
          fig(
            "upgrade-timeline",
            "A timeline of upgrades with one-line labels: Overwinter (2018), Sapling (2018), Blossom (75 s blocks), Heartwood, Canopy (2020, 1st halving, dev fund), NU5 (2022, Halo 2 + Orchard + UAs), NU6 (Nov 2024, 2nd halving), NU6.1 (Nov 2025, coinholder funding), NU6.2 (Jun 2026, Orchard fix), NU6.3 (Jul 2026, Ironwood), NU7 (Nov 2026, 25 s blocks + NSM + Sprout off).",
            "Tek satırlık etiketlerle yükseltme zaman çizelgesi: Overwinter (2018), Sapling (2018), Blossom (75 sn bloklar), Heartwood, Canopy (2020, 1. yarılanma, geliştirme fonu), NU5 (2022, Halo 2 + Orchard + UA'lar), NU6 (Kas 2024, 2. yarılanma), NU6.1 (Kas 2025, coin sahibi fonlaması), NU6.2 (Haz 2026, Orchard düzeltmesi), NU6.3 (Tem 2026, Ironwood), NU7 (Kas 2026, 25 sn bloklar + NSM + Sprout kapandı).",
          ),
          h("NU7 at a glance", "Bir bakışta NU7"),
          p(
            "NU7 activated at block 3,543,405 on 6 November 2026 (UTC). Its main changes:",
            "NU7, 6 Kasım 2026'da (UTC) 3.543.405. blokta devreye girdi. Başlıca değişiklikleri:",
          ),
          list(
            ["25-second blocks (ZIP 218): down from 75 seconds. The subsidy per block was divided by three and the halving interval in blocks tripled, so daily issuance, the halving calendar and the 21 million cap are unchanged.", "25 saniyelik bloklar (ZIP 218): 75 saniyeden indi. Blok başına sübvansiyon üçe bölündü ve blok cinsinden yarılanma aralığı üç katına çıktı; böylece günlük ihraç, yarılanma takvimi ve 21 milyon sınırı değişmedi."],
            ["Network Sustainability Mechanism (ZIP 235, ZIP 237): 60% of each block's fees are removed from circulation (miners keep 40%), to be reissued through block rewards starting around February 2031.", "Ağ Sürdürülebilirlik Mekanizması (ZIP 235, ZIP 237): Her bloktaki ücretlerin %60'ı dolaşımdan çıkarılır (madenciler %40'ı alır) ve Şubat 2031 civarından itibaren blok ödülleriyle yeniden ihraç edilir."],
            ["Version 4 transactions disallowed (ZIP 2003): this ends Sprout spending.", "Sürüm 4 işlemler yasaklandı (ZIP 2003): Bu, Sprout harcamalarını sona erdirdi."],
            ["Per-block limits on shielded activity, sized so that wallets' worst-case data downloads stay manageable.", "Korumalı işlemler için blok başına sınırlar; cüzdanların en kötü durumdaki veri indirmesinin yönetilebilir kalması için ayarlandı."],
          ),
          term("nu7"),
          term("nsm"),
          callout(
            "info",
            "NU7 did not include Zcash Shielded Assets (ZSAs) or issuance smoothing. Its scope was shaped by community and coinholder polls in September 2026, where about 2.4 million ZEC voted and a large majority chose to keep halvings.",
            "NU7, Zcash Korumalı Varlıklarını (ZSA) ya da ihraç yumuşatmayı içermedi. Kapsamı Eylül 2026'daki topluluk ve coin sahibi oylamalarıyla şekillendi; bu oylamalara yaklaşık 2,4 milyon ZEC katıldı ve büyük çoğunluk yarılanmaları korumayı seçti.",
          ),
          h("Who had to do what", "Kim ne yapmak zorundaydı?"),
          p(
            "Node operators had to run Zebra 7.0.0 (or another NU7-ready node) before the activation height. zcashd had already been retired in July 2026 and does not support NU7. Most light-wallet users only needed to keep their app updated.",
            "Düğüm operatörlerinin aktivasyon yüksekliğinden önce Zebra 7.0.0'ı (ya da NU7'ye hazır başka bir düğümü) çalıştırması gerekiyordu. zcashd zaten Temmuz 2026'da emekliye ayrılmıştı ve NU7'yi desteklemiyor. Hafif cüzdan kullanıcılarının çoğunun yalnızca uygulamasını güncel tutması yeterliydi.",
          ),
        ],
        quiz: [
          q(
            ["What did NU7 change about block time?", "NU7 blok süresinde neyi değiştirdi?"],
            [
              ["150 s → 75 s", "150 sn → 75 sn"],
              ["75 s → 25 s", "75 sn → 25 sn"],
              ["75 s → 10 min", "75 sn → 10 dk"],
              ["Nothing", "Hiçbir şeyi"],
            ],
            1,
            ["ZIP 218 set a 25-second target. (Blossom had earlier gone from 150 s to 75 s.)", "ZIP 218, 25 saniyelik bir hedef belirledi. (Daha önce Blossom 150 sn'den 75 sn'ye geçmişti.)"],
          ),
          q(
            ["After NU7, what happens to 60% of each block's transaction fees?", "NU7'den sonra her bloktaki işlem ücretlerinin %60'ına ne olur?"],
            [
              ["Paid to the Zcash Foundation", "Zcash Foundation'a ödenir"],
              ["Burned forever", "Sonsuza dek yakılır"],
              ["Removed from circulation and later reissued through block rewards (NSM)", "Dolaşımdan çıkarılır ve daha sonra blok ödülleriyle yeniden ihraç edilir (NSM)"],
              ["Returned to the sender", "Gönderene iade edilir"],
            ],
            2,
            ["ZIP 235 removes 60% of fees; ZIP 237 reissues them in future subsidies from around February 2031.", "ZIP 235 ücretlerin %60'ını çıkarır; ZIP 237 bunları Şubat 2031 civarından itibaren gelecekteki sübvansiyonlarla yeniden ihraç eder."],
          ),
          q(
            ["Did NU7 change the 21 million supply cap or the halving calendar?", "NU7, 21 milyonluk arz sınırını ya da yarılanma takvimini değiştirdi mi?"],
            [
              ["Yes, both", "Evet, ikisini de"],
              ["Only the cap", "Yalnızca sınırı"],
              ["Only the halving calendar", "Yalnızca yarılanma takvimini"],
              ["No: subsidy and halving interval were rescaled to keep both", "Hayır: İkisini korumak için sübvansiyon ve yarılanma aralığı yeniden ölçeklendi"],
            ],
            3,
            ["The subsidy per block was divided by 3 and the halving interval multiplied by 3, preserving issuance timing and the cap.", "Blok başına sübvansiyon 3'e bölündü ve yarılanma aralığı 3 ile çarpıldı; ihraç zamanlaması ve sınır korundu."],
          ),
          q(
            ["Which of these was NOT part of NU7?", "Aşağıdakilerden hangisi NU7'nin parçası DEĞİLDİ?"],
            [
              ["25-second blocks", "25 saniyelik bloklar"],
              ["Zcash Shielded Assets (ZSAs)", "Zcash Korumalı Varlıkları (ZSA'lar)"],
              ["Disallowing v4 transactions", "v4 işlemlerin yasaklanması"],
              ["The 60% fee mechanism", "%60 ücret mekanizması"],
            ],
            1,
            ["ZSAs (ZIP 226/227) are still Drafts and were not deployed in NU7.", "ZSA'lar (ZIP 226/227) hâlâ taslak aşamasında ve NU7'de devreye alınmadı."],
          ),
        ],
        sources: [SRC.zip259, SRC.zip218, SRC.zip235, SRC.zebra7, SRC.forumNu7Polls, SRC.nuGuide, SRC.zip0],
      },
      {
        slug: "nodes-and-light-wallets",
        minutes: 7,
        title: L("Nodes and light wallets", "Düğümler ve hafif cüzdanlar"),
        summary: L(
          "Zebra, Zakura, the end of zcashd, and how your phone wallet stays private.",
          "Zebra, Zakura, zcashd'nin sonu ve telefon cüzdanınızın nasıl gizli kaldığı.",
        ),
        blocks: [
          p(
            "A full node downloads every block and checks it against the consensus rules. Full nodes are what make Zcash trustless: nobody has to take anyone else's word that the rules were followed.",
            "Tam düğüm her bloğu indirir ve mutabakat kurallarına göre kontrol eder. Zcash'i güven gerektirmeyen bir sistem yapan tam düğümlerdir: Kimse kuralların uygulandığı konusunda başkasının sözüne güvenmek zorunda değildir.",
          ),
          h("The node software today", "Bugünün düğüm yazılımları"),
          list(
            ["Zebra — the Zcash Foundation's node, written in Rust. Version 7.0.0 (October 2026) is the first stable release supporting NU7.", "Zebra — Zcash Foundation'ın Rust ile yazılmış düğümü. 7.0.0 sürümü (Ekim 2026) NU7'yi destekleyen ilk kararlı sürümdür."],
            ["Zakura — a newer node from Valar Group and Project Tachyon, built from Zebra's code, focused on performance.", "Zakura — Valar Group ve Project Tachyon'un Zebra kodundan geliştirdiği, performansa odaklanan daha yeni bir düğüm."],
            ["zcashd — the original node. It reached end of life and halted at block 3,417,100 on 18 July 2026.", "zcashd — orijinal düğüm. Kullanım ömrünü tamamladı ve 18 Temmuz 2026'da 3.417.100. blokta durdu."],
          ),
          term("zebra"),
          term("zcashd"),
          p(
            "zcashd's jobs are now split across the \"Z3\" stack: Zebra validates the chain, Zaino indexes it for apps, and Zallet replaces zcashd's built-in wallet.",
            "zcashd'nin görevleri artık \"Z3\" yığınına dağıldı: Zebra zinciri doğrular, Zaino uygulamalar için indeksler, Zallet de zcashd'nin yerleşik cüzdanının yerini alır.",
          ),
          h("How light wallets work", "Hafif cüzdanlar nasıl çalışır?"),
          p(
            "Phones can't store the whole chain. A light wallet connects to a lightwalletd-style server that serves compact blocks. The wallet tries to decrypt each shielded output with your keys, on your device. The server never sees your keys, and doesn't learn which outputs are yours.",
            "Telefonlar tüm zinciri saklayamaz. Hafif cüzdan, sıkıştırılmış bloklar sunan lightwalletd tarzı bir sunucuya bağlanır. Cüzdan her korumalı çıktıyı sizin anahtarlarınızla, kendi cihazınızda çözmeye çalışır. Sunucu anahtarlarınızı asla görmez ve hangi çıktıların size ait olduğunu öğrenmez.",
          ),
          term("light-client"),
          callout(
            "tip",
            "Running a node isn't required to use Zcash, but it's one of the most direct ways to support the network. If you run one, follow Zcash Foundation release notes: Zebra releases have limited support windows, and network upgrades require updating before the activation height.",
            "Zcash kullanmak için düğüm çalıştırmak gerekmez, ama ağı desteklemenin en doğrudan yollarından biridir. Düğüm çalıştırıyorsanız Zcash Foundation sürüm notlarını takip edin: Zebra sürümlerinin destek süreleri sınırlıdır ve ağ yükseltmeleri aktivasyon yüksekliğinden önce güncelleme gerektirir.",
          ),
        ],
        quiz: [
          q(
            ["Which Zebra version was the first stable release supporting NU7 on mainnet?", "Ana ağda NU7'yi destekleyen ilk kararlı Zebra sürümü hangisiydi?"],
            [["5.0.0", "5.0.0"], ["6.0.0", "6.0.0"], ["7.0.0", "7.0.0"], ["1.0.0", "1.0.0"]],
            2,
            ["Zebra 7.0.0 was released on 22 October 2026 for NU7.", "Zebra 7.0.0, NU7 için 22 Ekim 2026'da yayımlandı."],
          ),
          q(
            ["What is the status of zcashd?", "zcashd'nin durumu nedir?"],
            [
              ["It's the only supported node", "Desteklenen tek düğümdür"],
              ["End of life: it halted in July 2026 and doesn't support NU6.3 or NU7", "Ömrünü tamamladı: Temmuz 2026'da durdu; NU6.3 ve NU7'yi desteklemez"],
              ["It was renamed Zebra", "Adı Zebra olarak değişti"],
              ["It only runs on phones", "Yalnızca telefonlarda çalışır"],
            ],
            1,
            ["zcashd halted at block 3,417,100 on 18 July 2026; the Z3 stack replaces it.", "zcashd, 18 Temmuz 2026'da 3.417.100. blokta durdu; yerini Z3 yığını aldı."],
          ),
          q(
            ["In a light wallet, where are your shielded transactions decrypted?", "Hafif bir cüzdanda korumalı işlemleriniz nerede çözülür?"],
            [
              ["On the lightwalletd server", "lightwalletd sunucusunda"],
              ["By miners", "Madenciler tarafından"],
              ["On your own device", "Kendi cihazınızda"],
              ["By the Zcash Foundation", "Zcash Foundation tarafından"],
            ],
            2,
            ["The server serves compact blocks; your wallet uses your keys locally to find your notes.", "Sunucu sıkıştırılmış blokları sunar; cüzdanınız notlarınızı bulmak için anahtarlarınızı yerel olarak kullanır."],
          ),
          q(
            ["What is Zakura?", "Zakura nedir?"],
            [
              ["A wallet for hardware devices", "Donanım cihazları için bir cüzdan"],
              ["A full node from Valar Group and Project Tachyon, built from Zebra's code", "Valar Group ve Project Tachyon'un Zebra kodundan geliştirdiği bir tam düğüm"],
              ["A new shielded pool", "Yeni bir korumalı havuz"],
              ["The name of NU8", "NU8'in adı"],
            ],
            1,
            ["Zakura was announced in July 2026. The Zcash Foundation continues to maintain Zebra.", "Zakura Temmuz 2026'da duyuruldu. Zcash Foundation, Zebra'yı geliştirmeye devam ediyor."],
          ),
        ],
        sources: [SRC.zebra7, SRC.zcashdEol, SRC.forumZakura, SRC.zf2026, SRC.forumNu7Timeline],
      },
    ],
  },

  // ───────────────────────────── Track 3 ─────────────────────────────
  {
    slug: "governance-ecosystem",
    level: "intermediate",
    title: L("Zcash governance & ecosystem", "Zcash yönetişimi ve ekosistemi"),
    summary: L(
      "Who builds Zcash, how development is funded, how protocol changes are proposed, and how you can take part.",
      "Zcash'i kim geliştiriyor, geliştirme nasıl finanse ediliyor, protokol değişiklikleri nasıl öneriliyor ve siz nasıl katılabilirsiniz.",
    ),
    lessons: [
      {
        slug: "who-builds-zcash",
        minutes: 7,
        title: L("Who builds Zcash", "Zcash'i kim geliştiriyor?"),
        summary: L(
          "The main organizations behind Zcash in 2026 and what each one does.",
          "2026'da Zcash'in arkasındaki başlıca kuruluşlar ve her birinin yaptığı iş.",
        ),
        blocks: [
          p(
            "No single company owns Zcash. Several independent organizations write the software, do research and fund others. That diversity is deliberate: if one team makes a mistake or disappears, others can carry on.",
            "Zcash'in tek bir sahibi yoktur. Birkaç bağımsız kuruluş yazılımı geliştirir, araştırma yapar ve başkalarını finanse eder. Bu çeşitlilik bilinçlidir: Bir ekip hata yaparsa ya da ortadan kalkarsa diğerleri işi sürdürebilir.",
          ),
          h("The main organizations", "Başlıca kuruluşlar"),
          list(
            ["ZODL (Zcash Open Development Lab): formed in January 2026 when the whole Electric Coin Co. team left ECC. Home of core protocol development and maker of the Zodl wallet (formerly Zashi).", "ZODL (Zcash Open Development Lab): Ocak 2026'da Electric Coin Co. ekibinin tamamı ECC'den ayrılınca kuruldu. Çekirdek protokol geliştirmenin merkezi ve Zodl cüzdanının (eski adıyla Zashi) yapımcısı."],
            ["Zcash Foundation (ZF): formed in 2017. Builds the Zebra node and FROST, and runs the Community Advisory Panel (ZCAP) and Zcon.", "Zcash Foundation (ZF): 2017'de kuruldu. Zebra düğümünü ve FROST'u geliştirir; Topluluk Danışma Paneli'ni (ZCAP) ve Zcon'u düzenler."],
            ["Shielded Labs: Swiss and donation-funded, never paid from the dev fund. Works on the Network Sustainability Mechanism, Crosslink and security research.", "Shielded Labs: İsviçreli ve bağışlarla finanse ediliyor; geliştirme fonundan hiç ödeme almadı. Ağ Sürdürülebilirlik Mekanizması, Crosslink ve güvenlik araştırmaları üzerinde çalışır."],
            ["Valar Group and Project Tachyon: built the Zakura node and helped design and verify Ironwood.", "Valar Group ve Project Tachyon: Zakura düğümünü geliştirdiler ve Ironwood'un tasarımına ve doğrulanmasına katkı verdiler."],
            ["Zcash Community Grants (ZCG): a grants program that funds independent builders.", "Zcash Community Grants (ZCG): bağımsız geliştiricileri finanse eden bir hibe programı."],
          ),
          term("zodl"),
          term("zcash-foundation"),
          term("shielded-labs"),
          h("Teamwork in a crisis", "Kriz anında ekip çalışması"),
          p(
            "The 2026 Orchard bug showed how this works in practice. A Shielded Labs researcher found it, ZODL led the fix, the Zcash Foundation implemented Ironwood in Zebra, and Project Tachyon, Valar Group and ZODL defined the architecture and formal verification.",
            "2026'daki Orchard hatası bunun pratikte nasıl işlediğini gösterdi. Hatayı bir Shielded Labs araştırmacısı buldu, düzeltmeye ZODL öncülük etti, Zcash Foundation Ironwood'u Zebra'da uyguladı; Project Tachyon, Valar Group ve ZODL de mimariyi ve biçimsel doğrulamayı tanımladı.",
          ),
          callout(
            "info",
            "Electric Coin Co. created Zcash in 2016. Its engineering team now works at ZODL, and Zcash's core work continues there.",
            "Zcash'i 2016'da Electric Coin Co. yarattı. Mühendislik ekibi artık ZODL'de çalışıyor ve Zcash'in çekirdek çalışmaları orada sürüyor.",
          ),
        ],
        quiz: [
          q(
            ["What is ZODL?", "ZODL nedir?"],
            [
              ["A new shielded pool", "Yeni bir korumalı havuz"],
              ["The company formed in 2026 by the former Electric Coin Co. team; it makes the Zodl wallet", "Eski Electric Coin Co. ekibinin 2026'da kurduğu şirket; Zodl cüzdanını geliştirir"],
              ["A mining pool", "Bir madencilik havuzu"],
              ["A government regulator", "Bir devlet düzenleyicisi"],
            ],
            1,
            ["In January 2026 the ECC team left and founded ZODL; Zashi was renamed Zodl.", "Ocak 2026'da ECC ekibi ayrılıp ZODL'yi kurdu; Zashi'nin adı Zodl oldu."],
          ),
          q(
            ["Which organization builds the Zebra node?", "Zebra düğümünü hangi kuruluş geliştiriyor?"],
            [["Zcash Foundation", "Zcash Foundation"], ["Shielded Labs", "Shielded Labs"], ["ZCG", "ZCG"], ["A crypto exchange", "Bir kripto borsası"]],
            0,
            ["Zebra is the Zcash Foundation's Rust full node.", "Zebra, Zcash Foundation'ın Rust ile yazılmış tam düğümüdür."],
          ),
          q(
            ["What is special about how Shielded Labs is funded?", "Shielded Labs'in finansmanında özel olan nedir?"],
            [
              ["It receives 50% of block rewards", "Blok ödüllerinin %50'sini alır"],
              ["It is donation-funded and has never taken dev fund money", "Bağışlarla finanse edilir ve geliştirme fonundan hiç para almadı"],
              ["It sells ZEC", "ZEC satar"],
              ["It charges transaction fees", "İşlem ücreti alır"],
            ],
            1,
            ["Shielded Labs describes itself as the first Zcash organization never funded by the dev fund or block rewards.", "Shielded Labs kendini, geliştirme fonundan ya da blok ödüllerinden hiç finanse edilmemiş ilk Zcash kuruluşu olarak tanımlar."],
          ),
          q(
            ["Who found the 2026 Orchard bug?", "2026 Orchard hatasını kim buldu?"],
            [
              ["An anonymous attacker", "Anonim bir saldırgan"],
              ["A miner", "Bir madenci"],
              ["Taylor Hornby, a researcher working for Shielded Labs", "Shielded Labs için çalışan araştırmacı Taylor Hornby"],
              ["An exchange", "Bir borsa"],
            ],
            2,
            ["Taylor Hornby reported it on 29 May 2026, found during an AI-assisted audit.", "Taylor Hornby, yapay zekâ destekli bir denetim sırasında bulduğu hatayı 29 Mayıs 2026'da bildirdi."],
          ),
        ],
        sources: [SRC.zodlRename, SRC.zodlAbout, SRC.zfWork, SRC.slHome, SRC.slIronwood, SRC.forumZakura, SRC.zip257, SRC.whoCreated],
      },
      {
        slug: "funding",
        minutes: 9,
        title: L("How Zcash development is funded", "Zcash geliştirmesi nasıl finanse ediliyor?"),
        summary: L(
          "The dev fund, Zcash Community Grants, coinholder-directed grants, the lockbox and the NSM.",
          "Geliştirme fonu, Zcash Community Grants, coin sahiplerinin yönlendirdiği hibeler, kilitli kasa ve NSM.",
        ),
        blocks: [
          p(
            "Every block creates new ZEC (the subsidy). Most of it pays miners for securing the network. Since the Canopy upgrade in 2020, a share has also funded development. Today that share is 20%.",
            "Her blok yeni ZEC (sübvansiyon) üretir. Bunun çoğu ağı güvence altına aldıkları için madencilere ödenir. 2020'deki Canopy yükseltmesinden beri bir pay da geliştirmeyi finanse ediyor. Bugün bu pay %20'dir.",
          ),
          fig(
            "funding-flow",
            "A flow diagram of one block: subsidy splits into 80% miners, 8% Zcash Community Grants, 12% coinholder-controlled fund (seeded by the lockbox). Fees split into 40% miners and 60% NSM reserve, which flows back into future block rewards from ~2031.",
            "Tek bir bloğun akış diyagramı: Sübvansiyon %80 madencilere, %8 Zcash Community Grants'e, %12 coin sahiplerinin yönettiği fona (kilitli kasadan beslenen) ayrılır. Ücretler %40 madencilere ve %60 NSM rezervine ayrılır; bu rezerv ~2031'den itibaren gelecekteki blok ödüllerine geri akar.",
          ),
          h("The current split (ZIP 1016)", "Mevcut paylaşım (ZIP 1016)"),
          list(
            ["8% → Zcash Community Grants (ZCG), a committee-run program for independent builders.", "%8 → Zcash Community Grants (ZCG): bağımsız geliştiriciler için bir komitenin yönettiği program."],
            ["12% → a coinholder-controlled fund. ZEC holders vote on which grants, if any, it pays.", "%12 → coin sahiplerinin yönettiği fon. Hangi hibelerin ödeneceğine (ya da hiç ödenmeyeceğine) ZEC sahipleri oy verir."],
            ["The rest of the subsidy → miners.", "Sübvansiyonun geri kalanı → madenciler."],
          ),
          p(
            "This model came with NU6.1 in November 2025 and runs until the third halving, expected around late 2028.",
            "Bu model Kasım 2025'te NU6.1 ile geldi ve 2028 sonu civarında beklenen üçüncü yarılanmaya kadar sürecek.",
          ),
          term("dev-fund"),
          h("The lockbox", "Kilitli kasa"),
          p(
            "From NU6 (November 2024), 12% of the subsidy went into an in-protocol lockbox that no one could spend. NU6.1 used it to seed the coinholder-controlled fund.",
            "NU6'dan (Kasım 2024) itibaren sübvansiyonun %12'si kimsenin harcayamadığı protokol içi bir kilitli kasaya gitti. NU6.1 bu kasayı coin sahibi fonunun başlangıç sermayesi olarak kullandı.",
          ),
          term("lockbox"),
          h("How coinholder-directed grants work", "Coin sahiplerinin yönlendirdiği hibeler nasıl işler?"),
          list(
            ["Grant requests are posted publicly for 30 days of review.", "Hibe talepleri 30 günlük inceleme için herkese açık olarak yayımlanır."],
            ["Votes happen every quarter, weighted by ZEC.", "Oylamalar her çeyrek yapılır ve ZEC miktarına göre ağırlıklandırılır."],
            ["A grant passes only if at least 420,000 ZEC take part and a simple majority approves.", "Bir hibe ancak en az 420.000 ZEC katılır ve basit çoğunluk onaylarsa kabul edilir."],
            ["Key-holder organizations carry out the result; they can veto only for legal reasons or if two or more object on principle.", "Anahtar sahibi kuruluşlar sonucu uygular; yalnızca hukuki nedenlerle ya da en az ikisi ilkesel olarak itiraz ederse veto edebilirler."],
          ),
          term("coinholder-voting"),
          h("The NSM: fees for the long term", "NSM: Uzun vade için ücretler"),
          p(
            "Since NU7, 60% of transaction fees are taken out of circulation and will be paid back out through block rewards from around February 2031. The aim is to help pay for network security as subsidies keep halving.",
            "NU7'den beri işlem ücretlerinin %60'ı dolaşımdan çıkarılıyor ve Şubat 2031 civarından itibaren blok ödülleriyle geri ödenecek. Amaç, sübvansiyonlar yarılanmaya devam ederken ağ güvenliğinin bedelini karşılamaya yardımcı olmak.",
          ),
          callout(
            "info",
            "How Zcash should fund development is an active debate. Proposals to change or wind down the dev fund are discussed openly on the forum.",
            "Zcash geliştirmesinin nasıl finanse edilmesi gerektiği canlı bir tartışma konusu. Geliştirme fonunu değiştirme ya da sonlandırma önerileri forumda açıkça tartışılıyor.",
          ),
        ],
        quiz: [
          q(
            ["What share of the block subsidy goes to Zcash Community Grants?", "Blok sübvansiyonunun ne kadarı Zcash Community Grants'e gider?"],
            [["8%", "%8"], ["12%", "%12"], ["20%", "%20"], ["50%", "%50"]],
            0,
            ["Under ZIP 1016: 8% to ZCG and 12% to the coinholder-controlled fund (20% in total).", "ZIP 1016'ya göre: %8 ZCG'ye, %12 coin sahiplerinin yönettiği fona (toplam %20)."],
          ),
          q(
            ["What is the minimum participation for a coinholder-directed grant to pass?", "Coin sahiplerinin yönlendirdiği bir hibenin kabul edilmesi için asgari katılım nedir?"],
            [["1,000 ZEC", "1.000 ZEC"], ["21,000 ZEC", "21.000 ZEC"], ["420,000 ZEC", "420.000 ZEC"], ["21 million ZEC", "21 milyon ZEC"]],
            2,
            ["ZIP 1016 requires at least 420,000 ZEC to vote, plus a simple majority in favour.", "ZIP 1016, en az 420.000 ZEC'in oy kullanmasını ve basit çoğunluğun onayını şart koşar."],
          ),
          q(
            ["What was the lockbox used for in NU6.1?", "NU6.1'de kilitli kasa ne için kullanıldı?"],
            [
              ["It was burned", "Yakıldı"],
              ["It was paid to miners", "Madencilere ödendi"],
              ["It seeded the coinholder-controlled fund", "Coin sahiplerinin yönettiği fonun başlangıç sermayesi oldu"],
              ["It was sent to Sprout", "Sprout'a gönderildi"],
            ],
            2,
            ["ZIP 271 and ZIP 1016 used the lockbox balance to seed the coinholder-controlled fund.", "ZIP 271 ve ZIP 1016, kilitli kasadaki bakiyeyi coin sahibi fonunun başlangıç sermayesi olarak kullandı."],
          ),
          q(
            ["When is NSM reissuance of removed fees scheduled to begin?", "Çıkarılan ücretlerin NSM ile yeniden ihracının ne zaman başlaması planlanıyor?"],
            [["Immediately at NU7", "NU7 ile hemen"], ["Around February 2031", "Şubat 2031 civarı"], ["In 2050", "2050'de"], ["Never", "Hiçbir zaman"]],
            1,
            ["Reissuance starts at block 8,939,664, expected around February 2031 — the date coinholders preferred.", "Yeniden ihraç, Şubat 2031 civarında beklenen 8.939.664. blokta başlar; coin sahiplerinin tercih ettiği tarih budur."],
          ),
        ],
        sources: [SRC.zip1016, SRC.zip255, SRC.nu6, SRC.nu61, SRC.zip235, SRC.zebra7, SRC.forumCoinholderQ1, SRC.forumNu7Polls],
      },
      {
        slug: "zip-process",
        minutes: 6,
        title: L("The ZIP process", "ZIP süreci"),
        summary: L(
          "How an idea becomes part of the Zcash protocol.",
          "Bir fikir nasıl Zcash protokolünün parçası olur?",
        ),
        blocks: [
          p(
            "Zcash protocol changes are written down as ZIPs — Zcash Improvement Proposals. A ZIP explains a problem, a precise specification, and its trade-offs, so that anyone can review it and multiple teams can implement it the same way.",
            "Zcash protokol değişiklikleri ZIP — Zcash İyileştirme Önerisi — olarak yazılır. Bir ZIP bir sorunu, kesin bir tanımı ve ödünleşimleri açıklar; böylece herkes inceleyebilir ve birden fazla ekip onu aynı şekilde uygulayabilir.",
          ),
          term("zip"),
          h("A ZIP's life", "Bir ZIP'in yaşamı"),
          list(
            ["Idea and discussion, often on the community forum or in a GitHub issue.", "Fikir ve tartışma; çoğu zaman topluluk forumunda ya da bir GitHub konusunda."],
            ["Draft: the ZIP Editors assign a number and the text is refined in public.", "Taslak (Draft): ZIP Editörleri bir numara verir ve metin herkese açık olarak geliştirilir."],
            ["Proposed: the specification is complete and ready to be considered for deployment.", "Önerilmiş (Proposed): Tanım tamamlanmıştır ve devreye alınmak üzere değerlendirilmeye hazırdır."],
            ["Final: the change is deployed (or the standard is settled). Some ZIPs are Withdrawn instead.", "Nihai (Final): Değişiklik devreye alınmıştır (ya da standart oturmuştur). Bazı ZIP'ler bunun yerine geri çekilir (Withdrawn)."],
          ),
          p(
            "Consensus changes ship in a network upgrade, which has its own deployment ZIP listing everything it activates. For example, ZIP 258 deployed NU6.3 (Ironwood) and ZIP 259 lists the ZIPs in NU7.",
            "Mutabakat değişiklikleri bir ağ yükseltmesiyle gelir; her yükseltmenin etkinleştirdiği her şeyi listeleyen kendi dağıtım ZIP'i vardır. Örneğin ZIP 258 NU6.3'ü (Ironwood) devreye aldı, ZIP 259 da NU7'deki ZIP'leri listeler.",
          ),
          h("Who decides?", "Kim karar veriyor?"),
          p(
            "There's no single vote that switches a ZIP on. Engineers from several organizations must agree to implement it, node operators and miners must run the software, and for big choices the community is polled — for example, the Community Advisory Panel and ZEC-weighted coinholder polls that shaped NU7.",
            "Bir ZIP'i tek başına devreye sokan tek bir oylama yoktur. Birkaç kuruluştan mühendislerin onu uygulamaya karar vermesi, düğüm operatörlerinin ve madencilerin yazılımı çalıştırması gerekir; büyük kararlarda da topluluğa danışılır — örneğin NU7'yi şekillendiren Topluluk Danışma Paneli ve ZEC ağırlıklı coin sahibi oylamaları.",
          ),
          callout(
            "tip",
            "You can read every ZIP at zips.z.cash. Even if the maths is heavy, the Motivation section is usually readable and explains why a change was proposed.",
            "Tüm ZIP'leri zips.z.cash adresinde okuyabilirsiniz. Matematik ağır olsa bile Motivasyon (Motivation) bölümü genellikle okunabilirdir ve bir değişikliğin neden önerildiğini açıklar.",
          ),
        ],
        quiz: [
          q(
            ["What does ZIP stand for?", "ZIP neyin kısaltmasıdır?"],
            [
              ["Zero-knowledge Interactive Proof", "Zero-knowledge Interactive Proof"],
              ["Zcash Improvement Proposal", "Zcash Improvement Proposal (Zcash İyileştirme Önerisi)"],
              ["Zcash Internal Protocol", "Zcash Internal Protocol"],
              ["Zip file", "Sıkıştırılmış dosya"],
            ],
            1,
            ["ZIPs are Zcash Improvement Proposals, published at zips.z.cash.", "ZIP'ler, zips.z.cash'te yayımlanan Zcash İyileştirme Önerileridir."],
          ),
          q(
            ["Which document defines the ZIP process itself?", "ZIP sürecinin kendisini hangi belge tanımlar?"],
            [["ZIP 0", "ZIP 0"], ["ZIP 316", "ZIP 316"], ["ZIP 1016", "ZIP 1016"], ["The Bitcoin whitepaper", "Bitcoin teknik makalesi"]],
            0,
            ["ZIP 0 (Active) documents the ZIP process.", "ZIP 0 (Aktif) ZIP sürecini belgeler."],
          ),
          q(
            ["How do consensus-changing ZIPs reach mainnet?", "Mutabakatı değiştiren ZIP'ler ana ağa nasıl ulaşır?"],
            [
              ["Automatically when written", "Yazıldıkları anda otomatik olarak"],
              ["Through a network upgrade, listed in a deployment ZIP and activated at a block height", "Bir dağıtım ZIP'inde listelenip belirli bir blok yüksekliğinde devreye giren bir ağ yükseltmesiyle"],
              ["By a single foundation vote", "Tek bir vakıf oylamasıyla"],
              ["When an exchange lists them", "Bir borsa listelediğinde"],
            ],
            1,
            ["E.g. ZIP 259 lists the ZIPs deployed in NU7 at block 3,543,405.", "Örneğin ZIP 259, 3.543.405. blokta NU7 ile devreye alınan ZIP'leri listeler."],
          ),
          q(
            ["What status does a ZIP have when its change is deployed or settled?", "Değişikliği devreye alınmış ya da oturmuş bir ZIP hangi durumdadır?"],
            [["Draft", "Taslak"], ["Withdrawn", "Geri çekilmiş"], ["Final", "Nihai"], ["Archived", "Arşivlenmiş"]],
            2,
            ["Final means deployed/settled. For instance, ZIP 258 (NU6.3) is Final.", "Nihai, devreye alınmış ya da oturmuş demektir. Örneğin ZIP 258 (NU6.3) Nihai durumdadır."],
          ),
        ],
        sources: [SRC.zip0, SRC.zip258, SRC.zip259, SRC.forumNu7Polls],
      },
      {
        slug: "get-involved",
        minutes: 5,
        title: L("How to get involved", "Nasıl dahil olursunuz?"),
        summary: L(
          "Ways to learn, contribute and meet other Zcash people.",
          "Öğrenmenin, katkı vermenin ve diğer Zcash'çilerle tanışmanın yolları.",
        ),
        blocks: [
          p(
            "Zcash is built in the open, and there's room for every skill: writing, translating, design, teaching, running infrastructure, research and code.",
            "Zcash açık bir şekilde geliştiriliyor ve her beceriye yer var: yazmak, çevirmek, tasarım, öğretmek, altyapı işletmek, araştırma ve kod.",
          ),
          h("Ways to take part", "Katılım yolları"),
          list(
            ["Join the Zcash Community Forum. Most proposals, grant requests and upgrade announcements are discussed there first.", "Zcash Topluluk Forumu'na katılın. Önerilerin, hibe taleplerinin ve yükseltme duyurularının çoğu ilk önce orada tartışılır."],
            ["Use ZEC shielded. Every private payment strengthens everyone's privacy by growing the shielded pool.", "ZEC'i korumalı kullanın. Her gizli ödeme, korumalı havuzu büyüterek herkesin gizliliğini güçlendirir."],
            ["Run a node such as Zebra and keep it updated for each network upgrade.", "Zebra gibi bir düğüm çalıştırın ve her ağ yükseltmesi için güncel tutun."],
            ["Apply for a grant from Zcash Community Grants or the coinholder-directed program if you have a project.", "Bir projeniz varsa Zcash Community Grants'ten ya da coin sahiplerinin yönlendirdiği programdan hibe başvurusunda bulunun."],
            ["As a ZEC holder, take part in coinholder votes and read the proposals.", "ZEC sahibi olarak coin sahibi oylamalarına katılın ve önerileri okuyun."],
            ["Read and comment on ZIPs at zips.z.cash.", "zips.z.cash'teki ZIP'leri okuyup yorum yapın."],
            ["Find or start a local community, and attend events such as Zcon.", "Yerel bir topluluk bulun ya da kurun; Zcon gibi etkinliklere katılın."],
          ),
          callout(
            "warn",
            "Stay safe in community spaces: admins and developers will never DM you first asking for your seed phrase or to \"verify\" your wallet.",
            "Topluluk alanlarında dikkatli olun: Yöneticiler ve geliştiriciler size asla önce özelden yazıp kurtarma ifadenizi istemez ya da cüzdanınızı \"doğrulamanızı\" söylemez.",
          ),
          term("zcg"),
          term("coinholder-voting"),
          callout(
            "tip",
            "Start small: answer a newcomer's question, translate a guide, or finish this track's quiz and share what you learned.",
            "Küçük başlayın: Yeni gelen birinin sorusunu yanıtlayın, bir rehberi çevirin ya da bu yolun quizini bitirip öğrendiklerinizi paylaşın.",
          ),
        ],
        quiz: [
          q(
            ["Where are most Zcash proposals and grant requests discussed first?", "Zcash önerilerinin ve hibe taleplerinin çoğu ilk olarak nerede tartışılır?"],
            [
              ["On the Zcash Community Forum", "Zcash Topluluk Forumu'nda"],
              ["In private bank meetings", "Özel banka toplantılarında"],
              ["Only at exchanges", "Yalnızca borsalarda"],
              ["Nowhere, they are secret", "Hiçbir yerde, gizlidirler"],
            ],
            0,
            ["The forum is the main public venue for Zcash discussion, announcements and grant applications.", "Forum, Zcash tartışmaları, duyuruları ve hibe başvuruları için başlıca herkese açık mecradır."],
          ),
          q(
            ["How does using ZEC shielded help others?", "ZEC'i korumalı kullanmak başkalarına nasıl yardımcı olur?"],
            [
              ["It doesn't", "Olmaz"],
              ["It makes fees zero", "Ücretleri sıfırlar"],
              ["A larger shielded pool gives everyone a bigger crowd to blend into", "Daha büyük bir korumalı havuz, herkese karışabileceği daha büyük bir kalabalık sağlar"],
              ["It mines new blocks", "Yeni blok kazar"],
            ],
            2,
            ["Privacy improves with more shielded users and activity.", "Gizlilik, daha fazla korumalı kullanıcı ve işlemle güçlenir."],
          ),
          q(
            ["Someone claiming to be a Zcash developer DMs you to \"verify\" your wallet. What's the right move?", "Zcash geliştiricisi olduğunu söyleyen biri cüzdanınızı \"doğrulamanız\" için özelden yazıyor. Doğru hamle nedir?"],
            [
              ["Follow their link", "Bağlantılarını takip etmek"],
              ["Ignore and report it; it's a scam", "Görmezden gelip bildirmek; bu bir dolandırıcılık"],
              ["Send them a small test amount", "Küçük bir test tutarı göndermek"],
              ["Share your viewing key and seed", "Görüntüleme anahtarınızı ve kurtarma ifadenizi paylaşmak"],
            ],
            1,
            ["Real team members don't DM people asking to verify wallets or for seed phrases.", "Gerçek ekip üyeleri insanlara özelden yazıp cüzdan doğrulamalarını ya da kurtarma ifadelerini istemez."],
          ),
          q(
            ["If you have a project that helps Zcash, where can you seek funding?", "Zcash'e yardımcı olan bir projeniz varsa nereden finansman arayabilirsiniz?"],
            [
              ["Zcash Community Grants or the coinholder-directed grants program", "Zcash Community Grants ya da coin sahiplerinin yönlendirdiği hibe programı"],
              ["The Sprout pool", "Sprout havuzu"],
              ["Miners' wallets", "Madencilerin cüzdanları"],
              ["Nowhere", "Hiçbir yerden"],
            ],
            0,
            ["Both programs are funded by the dev fund and accept public applications.", "Her iki program da geliştirme fonuyla finanse edilir ve herkese açık başvuru kabul eder."],
          ),
        ],
        sources: [SRC.forum, SRC.zip1016, SRC.forumCoinholderQ1, SRC.zip0, SRC.zf2026],
      },
    ],
  },
];
