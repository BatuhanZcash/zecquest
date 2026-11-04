"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { LocalText } from "./types";

export type Lang = "tr" | "en";

const dict = {
  /* ---------- Navigasyon ---------- */
  nav_home: { tr: "Ana Sayfa", en: "Home" },
  nav_events: { tr: "Yarışmalar", en: "Competitions" },
  nav_explore: { tr: "Keşfet", en: "Explore" },
  nav_join: { tr: "Oyuna Katıl", en: "Join Game" },
  nav_leaderboard: { tr: "Liderlik", en: "Leaderboard" },
  nav_studio: { tr: "Stüdyo", en: "Studio" },
  nav_admin: { tr: "Yönetim", en: "Admin" },
  nav_organizers: { tr: "Organizatörler", en: "Organizers" },
  nav_about: { tr: "Zcash Nedir?", en: "What is Zcash?" },
  nav_profile: { tr: "Profilim", en: "My Profile" },
  nav_settings: { tr: "Ayarlar", en: "Settings" },
  nav_prizes: { tr: "Ödüllerim", en: "My Prizes" },
  sign_in: { tr: "Giriş yap", en: "Sign in" },
  sign_out: { tr: "Çıkış yap", en: "Sign out" },
  search_placeholder: { tr: "Quiz ara…", en: "Search quizzes…" },
  theme: { tr: "Tema", en: "Theme" },
  menu: { tr: "Menü", en: "Menu" },
  install_app: { tr: "Uygulamayı yükle", en: "Install app" },
  install_hint: { tr: "Telefonunda uygulama gibi aç, yarışmaları kaçırma.", en: "Open it like an app on your phone and never miss an event." },

  /* ---------- Ana sayfa ---------- */
  hero_kicker: { tr: "Zcash topluluğunun quiz platformu", en: "The Zcash community quiz platform" },
  hero_title: { tr: "Zcash bilgini kanıtla.\nDünyayla yarış.", en: "Prove your Zcash knowledge.\nCompete with the world." },
  hero_sub: {
    tr: "Topluluk buluşmalarında, derslerde ve etkinliklerde canlı Zcash quizleri. Oda kodunu gir ya da QR'ı okut; sorular herkese aynı anda gelir.",
    en: "Live Zcash quizzes for meetups, classes and events. Enter the room code or scan the QR; everyone gets the questions at the same time.",
  },
  hero_cta_events: { tr: "Yarışmaları gör", en: "See competitions" },
  hero_title_a: { tr: "Zcash bilgini kanıtla,", en: "Prove your Zcash knowledge," },
  hero_title_b: { tr: "dünyayla canlı yarış.", en: "compete live with the world." },
  hero_cta_join: { tr: "Oyuna katıl", en: "Join a game" },
  hero_cta_host: { tr: "Kendi quizini düzenle", en: "Host your own quiz" },
  hero_f_community: { tr: "Topluluklar için ücretsiz", en: "Free for communities" },
  org_kicker: { tr: "Topluluk organizatörleri", en: "Community organizers" },
  org_card_title: { tr: "Topluluğun için Zcash quizi düzenle", en: "Run a Zcash quiz for your community" },
  org_card_sub: { tr: "Buluşmalar, üniversite kulüpleri ve etkinlikler için. Kurulum gerekmez; katılımcılar telefonlarıyla girer.", en: "For meetups, university clubs and events. Nothing to install; people join from their phones." },
  org_step1_t: { tr: "Organizatör ol", en: "Become an organizer" },
  org_step1_b: { tr: "E-postanla hesap aç ve profilinden başvur. Ekibimiz onaylayınca Stüdyo açılır.", en: "Sign up with your email and apply from your profile. Studio opens once our team approves you." },
  org_step2_t: { tr: "Quizini hazırla", en: "Prepare your quiz" },
  org_step2_b: { tr: "Stüdyo'da soruları yaz ya da hazır şablonla başla. Kapak fotoğrafı ekle.", en: "Write questions in Studio or start from a ready-made template. Add a cover photo." },
  org_step3_t: { tr: "Odayı aç", en: "Open a room" },
  org_step3_b: { tr: "Quiz sayfasında Canlı Oda Aç'a bas; kodu ve QR'ı ekrana yansıt.", en: "Press Host Live Room on the quiz page and put the code and QR on the big screen." },
  org_step4_t: { tr: "Herkes katılsın", en: "Everyone joins" },
  org_step4_b: { tr: "Katılımcılar QR'ı okutup takma adla girer. Her soruya 10 saniye; sıralama canlı akar.", en: "People scan the QR and join with a nickname. 10 seconds per question; the ranking updates live." },
  org_cta_apply: { tr: "Organizatör olarak başvur", en: "Apply as an organizer" },
  org_cta_pending: { tr: "Başvurun inceleniyor", en: "Your application is under review" },
  org_cta_studio: { tr: "Stüdyo'ya git", en: "Go to Studio" },
  per_question: { tr: "Soru başına", en: "Per question" },
  org_see_quizzes: { tr: "Örnek quizlere bak", en: "Browse sample quizzes" },
  org_tips_title: { tr: "Etkinlik günü için ipuçları", en: "Tips for the day of your event" },
  org_faq_title: { tr: "Sık sorulanlar", en: "Questions" },
  org_final_title: { tr: "İlk quizini bu hafta düzenle", en: "Run your first quiz this week" },
  org_final_sub: { tr: "Başvurun onaylanınca hazır şablonla birkaç dakikada başlayabilirsin.", en: "Once approved, you can start in minutes from a ready-made template." },
  org_read_guide: { tr: "Organizatör rehberi", en: "Organizer guide" },
  hero_cta_signup: { tr: "Ücretsiz katıl", en: "Join for free" },
  hero_f_time: { tr: "Her soruya {n} saniye", en: "{n} seconds per question" },
  hero_f_global: { tr: "Dünya çapında", en: "Worldwide" },
  hero_f_prize: { tr: "ZEC ödülleri", en: "ZEC prizes" },
  hero_join_lobby: { tr: "Bekleme odasına gir", en: "Enter the lobby" },
  next_competition: { tr: "Sıradaki yarışma", en: "Next competition" },
  cd_days: { tr: "gün", en: "days" },
  cd_hours: { tr: "saat", en: "hrs" },
  cd_minutes: { tr: "dk", en: "min" },
  cd_seconds: { tr: "sn", en: "sec" },
  demo_label: { tr: "Örnek soru · 1 / 10", en: "Sample question · 1 / 10" },
  demo_hint: { tr: "Hızlı cevap = daha çok puan", en: "Faster answer = more points" },
  demo_reveal: { tr: "Doğru! 21 milyon ZEC, tıpkı Bitcoin gibi.", en: "Correct! 21 million ZEC, just like Bitcoin." },
  hero_cta_explore: { tr: "Quizlerle pratik yap", en: "Practice with quizzes" },
  stat_players: { tr: "oyuncu", en: "players" },
  stat_countries: { tr: "ülke", en: "countries" },
  live_now: { tr: "Şu an canlı", en: "Live now" },
  upcoming: { tr: "Yaklaşan yarışmalar", en: "Upcoming competitions" },
  recent_events: { tr: "Son yarışmalar", en: "Recent competitions" },
  competitions: { tr: "Yarışmalar", en: "Competitions" },
  no_events_title: { tr: "Planlanmış yarışma yok", en: "No competitions scheduled" },
  no_events: { tr: "Yeni yarışmalar planlandığında burada listelenir. Bu arada quizlerle pratik yapabilirsin.", en: "New competitions will be listed here once scheduled. Meanwhile, practice with quizzes." },
  starts_in: { tr: "Başlamasına", en: "Starts in" },
  started: { tr: "Başladı", en: "Started" },
  join_now: { tr: "Hemen katıl", en: "Join now" },
  enter_lobby: { tr: "Lobiye gir", en: "Enter lobby" },
  view_results: { tr: "Sonuçlar", en: "Results" },
  add_calendar: { tr: "Takvime ekle", en: "Add to calendar" },
  prize: { tr: "Ödül", en: "Prize" },
  featured: { tr: "Öne Çıkan Quizler", en: "Featured Quizzes" },
  view_all: { tr: "Tümünü gör", en: "View all" },
  general_leaderboard: { tr: "Genel Liderlik", en: "General Leaderboard" },
  view_full_leaderboard: { tr: "Tüm liderlik tablosu", en: "Full leaderboard" },
  join_a_game: { tr: "Oyuna Katıl", en: "Join a Game" },
  join_sub: { tr: "Canlı oyuna katılmak için oda kodunu gir.", en: "Enter a room code to join a live game." },
  join_btn: { tr: "Katıl", en: "Join" },
  days_short: { tr: "g", en: "d" },
  hours_short: { tr: "sa", en: "h" },
  min_short: { tr: "dk", en: "m" },
  sec_short: { tr: "sn", en: "s" },

  /* ---------- Giriş / onboarding ---------- */
  login_title: { tr: "Yarışmaya katılmak için giriş yap", en: "Sign in to compete" },
  login_sub: { tr: "Skorların, ödüllerin ve sıralaman hesabına kaydedilir.", en: "Your scores, prizes and rank are saved to your account." },
  continue_google: { tr: "Google ile devam et", en: "Continue with Google" },
  or: { tr: "veya", en: "or" },
  email: { tr: "E-posta", en: "Email" },
  send_code: { tr: "Giriş kodu gönder", en: "Send sign-in code" },
  code_sent: { tr: "{email} adresine bir giriş e-postası gönderdik. E-postadaki bağlantıya tıkla ya da içindeki kodu aşağıya gir.", en: "We sent a sign-in email to {email}. Click the link in it, or enter the code below." },
  enter_code_label: { tr: "Doğrulama kodu", en: "Verification code" },
  verify: { tr: "Doğrula ve giriş yap", en: "Verify and sign in" },
  change_email: { tr: "E-postayı değiştir", en: "Change email" },
  resend: { tr: "Kodu tekrar gönder", en: "Resend code" },
  login_terms: { tr: "Devam ederek Kullanım Koşulları ve Gizlilik Politikası'nı kabul edersin.", en: "By continuing you accept the Terms of Use and Privacy Policy." },
  signing_in: { tr: "Giriş yapılıyor…", en: "Signing in…" },
  onboarding_title: { tr: "Profilini oluştur", en: "Create your profile" },
  onboarding_sub: { tr: "Liderlik tablosunda böyle görüneceksin.", en: "This is how you'll appear on the leaderboard." },
  username: { tr: "Kullanıcı adı", en: "Username" },
  username_hint: { tr: "3–20 karakter: küçük harf, rakam, alt çizgi", en: "3–20 chars: lowercase letters, digits, underscore" },
  username_ok: { tr: "Kullanılabilir", en: "Available" },
  username_taken: { tr: "Bu kullanıcı adı alınmış", en: "This username is taken" },
  display_name: { tr: "Görünen ad", en: "Display name" },
  country: { tr: "Ülke", en: "Country" },
  select_country: { tr: "Ülke seç", en: "Select country" },
  team: { tr: "Üniversite / takım / topluluk (isteğe bağlı)", en: "University / team / community (optional)" },
  team_placeholder: { tr: "ör. Boğaziçi Üniversitesi", en: "e.g. ETH Zürich" },
  save_continue: { tr: "Kaydet ve devam et", en: "Save and continue" },
  save: { tr: "Kaydet", en: "Save" },
  saved_ok: { tr: "Kaydedildi", en: "Saved" },

  /* ---------- Liderlik ---------- */
  all_time: { tr: "Tüm Zamanlar", en: "All Time" },
  this_month: { tr: "Son 30 Gün", en: "Last 30 Days" },
  this_week: { tr: "Bu Hafta", en: "This Week" },
  today: { tr: "Bugün", en: "Today" },
  players: { tr: "Oyuncular", en: "Players" },
  countries: { tr: "Ülkeler", en: "Countries" },
  teams: { tr: "Takımlar", en: "Teams" },
  players_n: { tr: "{n} oyuncu", en: "{n} players" },
  no_scores: { tr: "Henüz skor yok. İlk sen ol!", en: "No scores yet. Be the first!" },
  games: { tr: "oyun", en: "games" },
  leaderboard_title: { tr: "Liderlik Tablosu", en: "Leaderboard" },
  leaderboard_sub: { tr: "Canlı yarışmalar + her quizdeki en iyi solo skorun", en: "Live competitions + your best solo score per quiz" },
  your_rank: { tr: "Senin sıran", en: "Your rank" },
  all: { tr: "Tümü", en: "All" },

  /* ---------- Keşfet / quiz ---------- */
  explore_title: { tr: "Quizler", en: "Quizzes" },
  explore_sub: { tr: "Pratik yap, yarışmalara hazırlan", en: "Practice and get ready for competitions" },
  explore_search: { tr: "Quiz ya da etiket ara…", en: "Search quizzes or tags…" },
  sort_featured: { tr: "Önerilen", en: "Recommended" },
  sort_new: { tr: "En yeni", en: "Newest" },
  sort_az: { tr: "A → Z", en: "A → Z" },
  sort_questions: { tr: "Soru sayısı", en: "Most questions" },
  questions: { tr: "soru", en: "questions" },
  questions_n: { tr: "{n} soru", en: "{n} questions" },
  plays_n: { tr: "{n} oynanma", en: "{n} plays" },
  no_results: { tr: "Sonuç bulunamadı.", en: "No results found." },
  back: { tr: "Geri", en: "Back" },
  play_quiz: { tr: "Quizi Oyna", en: "Play Quiz" },
  play_solo: { tr: "Solo Oyna", en: "Play Solo" },
  host_live: { tr: "Canlı Oda Aç", en: "Host Live Room" },
  host_hint: { tr: "Sınıf ya da etkinlik için oda aç; katılımcılar kodla girer.", en: "Open a room for a class or event; players join with a code." },
  quiz_stats: { tr: "Quiz Bilgisi", en: "Quiz Stats" },
  questions_cap: { tr: "Soru", en: "Questions" },
  avg_time: { tr: "Soru süresi", en: "Time per question" },
  plays: { tr: "Oynanma", en: "Plays" },
  created_by: { tr: "Hazırlayan", en: "Created by" },
  description: { tr: "Açıklama", en: "Description" },
  quiz_leaderboard: { tr: "Quiz Liderliği", en: "Quiz Leaderboard" },
  not_found: { tr: "Bulunamadı.", en: "Not found." },
  draft_preview: { tr: "Bu quiz henüz Keşfet'te listelenmiyor. Yine de onunla hemen canlı oda açabilirsin.", en: "This quiz isn't listed in Explore yet. You can still host a live room with it right away." },

  /* ---------- Oyun (ortak) ---------- */
  answer_rule: { tr: "Her soruya cevap süresi {n} saniye. Hızlı doğru cevap daha çok puan getirir.", en: "You have {n} seconds per question. Faster correct answers earn more points." },
  answer_rule_editor: { tr: "Tüm sorularda cevap süresi {n} saniyedir (sabit kural).", en: "Every question has a {n}-second answer time (fixed rule)." },
  start: { tr: "Başla", en: "Start" },
  question_of: { tr: "Soru {n} / {t}", en: "Question {n} of {t}" },
  solo: { tr: "SOLO", en: "SOLO" },
  live: { tr: "CANLI", en: "LIVE" },
  next: { tr: "Sonraki", en: "Next" },
  finish: { tr: "Bitir", en: "Finish" },
  correct_answer: { tr: "Doğru!", en: "Correct!" },
  wrong_answer: { tr: "Yanlış", en: "Wrong" },
  times_up: { tr: "Süre doldu", en: "Time's up" },
  your_score: { tr: "Skorun", en: "Your score" },
  correct_count: { tr: "{c} / {t} doğru", en: "{c} / {t} correct" },
  play_again: { tr: "Tekrar oyna", en: "Play again" },
  best_score: { tr: "En iyi skorun", en: "Your best" },
  quiz_rank: { tr: "Bu quizde {n}. sıradasın", en: "You're #{n} on this quiz" },
  streak: { tr: "{n} seri", en: "{n} streak" },
  sec: { tr: "sn", en: "s" },
  plus_points: { tr: "+{n} puan", en: "+{n} pts" },
  points: { tr: "puan", en: "pts" },
  resume_note: { tr: "Kaldığın yerden devam ediyorsun.", en: "Resuming where you left off." },
  reconnecting: { tr: "Yeniden bağlanılıyor…", en: "Reconnecting…" },
  offline: { tr: "Bağlantı yok — tekrar bağlanınca otomatik devam edecek.", en: "Offline — will resume automatically when reconnected." },

  /* ---------- Canlı: oyuncu ---------- */
  room_code: { tr: "Oda kodu", en: "Room code" },
  connecting: { tr: "Bağlanılıyor…", en: "Connecting…" },
  room_not_found: { tr: "Oda bulunamadı. Kodu kontrol et.", en: "Room not found. Check the code." },
  sign_in_to_join: { tr: "Katılmak için giriş yap", en: "Sign in to join" },
  you_are_in: { tr: "İçeridesin!", en: "You're in!" },
  guest_name_label: { tr: "Takma adın", en: "Your nickname" },
  guest_name_placeholder: { tr: "Ör. Ayşe", en: "e.g. Alex" },
  guest_join_cta: { tr: "Oyuna katıl", en: "Join the game" },
  guest_note: { tr: "Hesap gerekmez. Puanını kaydetmek istersen oyundan sonra hesap açabilirsin.", en: "No account needed. You can create one after the game to keep your score." },
  guest_or_sign_in: { tr: "Hesabım var, giriş yap", en: "I have an account, sign in" },
  guest_event_needs_account: { tr: "Ödüllü yarışmalara katılmak için hesap gerekir.", en: "An account is required to join prize competitions." },
  send_verify_code: { tr: "Doğrulama kodu gönder", en: "Send verification code" },
  guest_badge: { tr: "Misafir", en: "Guest" },
  guest_create_account: { tr: "Hesap aç", en: "Create account" },
  guest_save_title: { tr: "Puanını kaydet", en: "Keep your score" },
  guest_save_body: { tr: "Hesap açarsan bu oyunun puanı genel liderlik tablosuna eklenir.", en: "Create an account and this game's score is added to the global leaderboard." },
  guest_save_cta: { tr: "Hesap aç", en: "Create account" },
  guest_upgrade_title: { tr: "Hesabını oluştur", en: "Create your account" },
  guest_upgrade_sub: { tr: "E-postanı doğrula; misafir olarak kazandığın puanlar hesabına aktarılır.", en: "Verify your email; the points you earned as a guest move to your account." },
  guest_email_exists: { tr: "Bu e-postayla zaten bir hesap var; o hesaba giriş kodu gönderiyoruz. Misafir puanların bu hesaba aktarılmaz.", en: "An account with this email already exists; we're sending a sign-in code to it. Your guest points won't be transferred." },
  wait_host: { tr: "Sunucunun oyunu başlatması bekleniyor…", en: "Waiting for the host to start…" },
  wait_start: { tr: "Yarışma başlangıcı bekleniyor", en: "Waiting for the competition to start" },
  get_ready: { tr: "Hazır ol!", en: "Get ready!" },
  answer_sent: { tr: "Cevabın kilitlendi", en: "Answer locked in" },
  answered_n: { tr: "{a} / {t} cevapladı", en: "{a} / {t} answered" },
  rank_n: { tr: "{n}. sıradasın", en: "You're #{n}" },
  rank_of: { tr: "{n} / {t}", en: "{n} of {t}" },
  game_over: { tr: "Yarışma bitti", en: "Competition over" },
  kicked: { tr: "Sunucu seni odadan çıkardı.", en: "The host removed you from the room." },
  cancelled: { tr: "Bu oyun iptal edildi.", en: "This game was cancelled." },
  late_join: { tr: "Yarışma sürüyor — bir sonraki sorudan itibaren katılıyorsun.", en: "Competition in progress — you'll join from the next question." },
  you_won_prize: { tr: "Tebrikler! {n}. oldun ve ödül kazandın.", en: "Congrats! You placed #{n} and won a prize." },
  claim_prize: { tr: "Ödülünü al", en: "Claim your prize" },
  scoreboard: { tr: "Skor tablosu", en: "Scoreboard" },
  podium: { tr: "Kürsü", en: "Podium" },
  final_results: { tr: "Final sonuçları", en: "Final results" },
  share_result: { tr: "Sonucu paylaş", en: "Share result" },
  copied: { tr: "Kopyalandı", en: "Copied" },

  /* ---------- Canlı: host ---------- */
  host_lobby_title: { tr: "Oyuncular katılıyor…", en: "Players are joining…" },
  join_at: { tr: "Katılmak için", en: "Join at" },
  start_game: { tr: "Oyunu başlat", en: "Start game" },
  waiting_players: { tr: "Oyuncu bekleniyor", en: "Waiting for players" },
  show_answer: { tr: "Cevabı göster", en: "Show answer" },
  show_leaderboard: { tr: "Skor tablosu", en: "Scoreboard" },
  next_question: { tr: "Sonraki soru", en: "Next question" },
  end_game: { tr: "Oyunu bitir", en: "End game" },
  confirm_end: { tr: "Oyunu şimdi bitirmek istiyor musun?", en: "End the game now?" },
  new_game: { tr: "Yeni oda", en: "New room" },
  kick: { tr: "Çıkar", en: "Kick" },
  fullscreen: { tr: "Tam ekran", en: "Fullscreen" },
  auto_mode: { tr: "Otomatik akış", en: "Automatic flow" },
  auto_mode_hint: { tr: "Planlı yarışma: sorular kendiliğinden ilerler. Ekranı yansıtabilirsin.", en: "Scheduled competition: questions advance automatically. You can project this screen." },
  start_now: { tr: "Şimdi başlat", en: "Start now" },
  host_safe: { tr: "Sayfayı yenilesen de oyun devam eder.", en: "The game keeps running even if you refresh." },

  /* ---------- Profil / ayarlar / ödüller ---------- */
  member_since: { tr: "Üyelik: {d}", en: "Member since {d}" },
  total_score: { tr: "Toplam puan", en: "Total score" },
  global_rank: { tr: "Dünya sırası", en: "World rank" },
  wins: { tr: "Birincilik", en: "Wins" },
  recent_games: { tr: "Son oyunlar", en: "Recent games" },
  zcash_address: { tr: "Zcash adresi (ödüller için)", en: "Zcash address (for prizes)" },
  zcash_address_hint: {
    tr: "Unified (u1…), Sapling (zs…) ya da şeffaf (t1…) adres. Sadece sen ve yöneticiler görebilir. Gizlilik için shielded adres öneririz.",
    en: "Unified (u1…), Sapling (zs…) or transparent (t1…) address. Only you and admins can see it. We recommend a shielded address for privacy.",
  },
  become_creator: { tr: "Organizatör ol", en: "Become an organizer" },
  become_creator_hint: { tr: "Onaylanınca Stüdyo'da quiz hazırlayıp topluluğun için canlı oda açabilirsin.", en: "Once approved you can create quizzes in Studio and host live rooms for your community." },
  creator_note: { tr: "Hangi topluluğu yönetiyorsun? (ör. Zcash İstanbul buluşmaları, X Üniversitesi blokzincir kulübü, link)", en: "Which community do you run? (e.g. Zcash Berlin meetup, X University blockchain club, link)" },
  send_request: { tr: "Başvuru gönder", en: "Send request" },
  request_pending: { tr: "Başvurun inceleniyor.", en: "Your request is under review." },
  role_creator: { tr: "Organizatör", en: "Organizer" },
  role_admin: { tr: "Yönetici", en: "Admin" },
  role_player: { tr: "Oyuncu", en: "Player" },
  prizes_title: { tr: "Ödüllerim", en: "My Prizes" },
  no_prizes: { tr: "Henüz ödül kazanmadın. Bir sonraki yarışmada bol şans!", en: "No prizes yet. Good luck in the next competition!" },
  place_n: { tr: "{n}. sıra", en: "#{n} place" },
  prize_awaiting: { tr: "Adres bekleniyor", en: "Awaiting address" },
  prize_pending: { tr: "Ödeme bekleniyor", en: "Payment pending" },
  prize_paid: { tr: "Ödendi", en: "Paid" },
  prize_void: { tr: "Geçersiz", en: "Void" },
  submit_address: { tr: "Adresi gönder", en: "Submit address" },
  view_tx: { tr: "İşlemi gör", en: "View transaction" },

  /* ---------- Stüdyo ---------- */
  studio_title: { tr: "Stüdyo", en: "Studio" },
  studio_sub: { tr: "Quizlerini hazırla, incelemeye gönder, canlı oda aç.", en: "Build quizzes, submit them for review, host live rooms." },
  new_quiz: { tr: "Yeni quiz", en: "New quiz" },
  import_json: { tr: "JSON içe aktar", en: "Import JSON" },
  import_hint: { tr: "Örnek biçim için samples/ klasörüne bak. Tek quiz ya da quiz dizisi yapıştırabilirsin.", en: "See the samples/ folder for the format. Paste a single quiz or an array of quizzes." },
  import_btn: { tr: "İçe aktar", en: "Import" },
  imported_n: { tr: "{n} quiz içe aktarıldı (taslak).", en: "{n} quizzes imported (draft)." },
  first_steps_title: { tr: "İlk adımlar", en: "First steps" },
  first_steps_sub: { tr: "Kendi quizinle hemen canlı oda açabilirsin. Keşfet'te herkese listelenmesi için incelemeye gönder.", en: "You can host a live room with your own quiz right away. Submit it for review to have it listed in Explore." },
  fs_template_t: { tr: "Hazır şablonla başla", en: "Start from a template" },
  fs_template_b: { tr: "Zcash Temelleri quizinin bir kopyasını oluştur; soruları topluluğuna göre düzenle.", en: "Make a copy of the Zcash Fundamentals quiz and adapt the questions to your community." },
  fs_template_cta: { tr: "Şablonu kopyala", en: "Copy template" },
  template_copy_prefix_tr: { tr: "Kopya:", en: "Copy:" },
  template_copy_suffix_en: { tr: "kopya", en: "copy" },
  fs_blank_t: { tr: "Boş quiz oluştur", en: "Create a blank quiz" },
  fs_blank_b: { tr: "Soruları sıfırdan yaz: 2–4 seçenek, doğru cevap ve kısa bir açıklama.", en: "Write questions from scratch: 2–4 options, the right answer and a short explanation." },
  fs_guide_t: { tr: "Oda nasıl açılır?", en: "How do I host a room?" },
  fs_guide_b: { tr: "Ekranı yansıtma, QR ile katılım ve oyunu yönetme adım adım.", en: "Projecting the screen, joining by QR and running the game, step by step." },
  no_quizzes_yet: { tr: "Henüz quizin yok.", en: "You don't have any quizzes yet." },
  status_draft: { tr: "Taslak", en: "Draft" },
  status_pending: { tr: "İncelemede", en: "In review" },
  status_published: { tr: "Yayında", en: "Published" },
  status_rejected: { tr: "Reddedildi", en: "Rejected" },
  edit: { tr: "Düzenle", en: "Edit" },
  delete: { tr: "Sil", en: "Delete" },
  confirm_delete: { tr: "Silmek istediğine emin misin?", en: "Are you sure you want to delete this?" },
  submit_review: { tr: "İncelemeye gönder", en: "Submit for review" },
  publish: { tr: "Yayınla", en: "Publish" },
  edit_unpublishes: { tr: "Yayındaki bir quizi düzenlersen tekrar incelemeye girer.", en: "Editing a published quiz sends it back to review." },
  title_tr: { tr: "Başlık (Türkçe)", en: "Title (Turkish)" },
  title_en: { tr: "Başlık (İngilizce)", en: "Title (English)" },
  desc_tr: { tr: "Açıklama (Türkçe)", en: "Description (Turkish)" },
  desc_en: { tr: "Açıklama (İngilizce)", en: "Description (English)" },
  slug: { tr: "Adres (slug)", en: "URL slug" },
  icon: { tr: "İkon", en: "Icon" },
  cover_photo: { tr: "Kapak fotoğrafı", en: "Cover photo" },
  cover_upload: { tr: "Fotoğraf yükle", en: "Upload photo" },
  cover_change: { tr: "Değiştir", en: "Change" },
  cover_remove: { tr: "Kaldır", en: "Remove" },
  cover_hint: { tr: "JPG, PNG veya WEBP. Yatay (16:9) fotoğraflar en iyi sonucu verir; otomatik kırpılıp küçültülür.", en: "JPG, PNG or WEBP. Landscape (16:9) photos work best; it is cropped and resized automatically." },
  cover_drop: { tr: "Fotoğrafı buraya sürükle ya da seç", en: "Drag a photo here or choose one" },
  err_cover_upload: { tr: "Fotoğraf yüklenemedi. Tekrar dene.", en: "Could not upload the photo. Please try again." },
  err_cover_type: { tr: "Lütfen bir görsel dosyası seç (JPG, PNG, WEBP).", en: "Please choose an image file (JPG, PNG, WEBP)." },
  err_invalid_cover: { tr: "Kapak fotoğrafı geçersiz.", en: "Invalid cover photo." },
  err_invalid_language: { tr: "Quiz dili geçersiz.", en: "Invalid quiz language." },
  quiz_language: { tr: "Quiz dili", en: "Quiz language" },
  quiz_language_hint: { tr: "Quizi tek bir dilde hazırla; katılımcılar soruları bu dilde görür.", en: "Write the quiz in one language; players see the questions in this language." },
  lang_bilingual: { tr: "Türkçe + İngilizce (iki dilli)", en: "Turkish + English (bilingual)" },
  lang_other_group: { tr: "Diğer seçenek", en: "Other option" },
  lang_all: { tr: "Tüm diller", en: "All languages" },
  lang_switch_confirm: { tr: "İki dilli moddan çıkınca diğer dildeki metinler silinir. Devam edilsin mi?", en: "Leaving bilingual mode removes the text in the other language. Continue?" },
  f_title: { tr: "Başlık", en: "Title" },
  f_desc: { tr: "Açıklama", en: "Description" },
  f_question: { tr: "Soru", en: "Question" },
  f_explanation: { tr: "Açıklama (isteğe bağlı)", en: "Explanation (optional)" },
  tags: { tr: "Etiketler (virgülle)", en: "Tags (comma separated)" },
  default_time: { tr: "Varsayılan süre (sn)", en: "Default time (s)" },
  question_n: { tr: "Soru {n}", en: "Question {n}" },
  add_question: { tr: "Soru ekle", en: "Add question" },
  add_option: { tr: "Seçenek ekle", en: "Add option" },
  question_tr: { tr: "Soru (Türkçe)", en: "Question (Turkish)" },
  question_en: { tr: "Soru (İngilizce)", en: "Question (English)" },
  option_n: { tr: "Seçenek {n}", en: "Option {n}" },
  mark_correct: { tr: "Doğru cevap", en: "Correct answer" },
  time_override: { tr: "Süre (boş = varsayılan)", en: "Time (empty = default)" },
  explanation_tr: { tr: "Açıklama (Türkçe, isteğe bağlı)", en: "Explanation (Turkish, optional)" },
  explanation_en: { tr: "Açıklama (İngilizce, isteğe bağlı)", en: "Explanation (English, optional)" },
  move_up: { tr: "Yukarı taşı", en: "Move up" },
  move_down: { tr: "Aşağı taşı", en: "Move down" },
  review_note: { tr: "Yönetici notu", en: "Admin note" },
  unsaved: { tr: "Kaydedilmemiş değişiklikler var", en: "You have unsaved changes" },

  /* ---------- Yönetim ---------- */
  admin_title: { tr: "Yönetim Paneli", en: "Admin Panel" },
  tab_overview: { tr: "Genel bakış", en: "Overview" },
  tab_review: { tr: "İnceleme", en: "Review" },
  tab_events: { tr: "Yarışmalar", en: "Competitions" },
  tab_rooms: { tr: "Odalar", en: "Rooms" },
  tab_users: { tr: "Kullanıcılar", en: "Users" },
  tab_prizes: { tr: "Ödüller", en: "Prizes" },
  tab_quizzes: { tr: "Tüm quizler", en: "All quizzes" },
  approve: { tr: "Onayla", en: "Approve" },
  reject: { tr: "Reddet", en: "Reject" },
  reject_reason: { tr: "Ret sebebi (yazara gösterilir)", en: "Reason (shown to the author)" },
  preview: { tr: "Önizle", en: "Preview" },
  feature: { tr: "Öne çıkar", en: "Feature" },
  unfeature: { tr: "Öne çıkarmayı kaldır", en: "Unfeature" },
  unpublish: { tr: "Yayından kaldır", en: "Unpublish" },
  nothing_to_review: { tr: "İncelenecek quiz yok", en: "Nothing to review" },
  create_event: { tr: "Yarışma planla", en: "Schedule competition" },
  event_quiz: { tr: "Quiz", en: "Quiz" },
  event_title: { tr: "Yarışma adı", en: "Competition name" },
  event_start: { tr: "Başlangıç (yerel saatin)", en: "Start (your local time)" },
  reveal_secs: { tr: "Cevap ekranı (sn)", en: "Answer screen (s)" },
  board_secs: { tr: "Skor ekranı (sn)", en: "Scoreboard screen (s)" },
  prize_text: { tr: "Ödül açıklaması", en: "Prize description" },
  prize_places: { tr: "Ödüllü sıra sayısı", en: "Prize places" },
  visibility: { tr: "Görünürlük", en: "Visibility" },
  vis_public: { tr: "Herkese açık (listelenir)", en: "Public (listed)" },
  vis_unlisted: { tr: "Sadece kodla", en: "Code only" },
  open_console: { tr: "Konsolu aç", en: "Open console" },
  cancel_event: { tr: "İptal et", en: "Cancel" },
  confirm_cancel: { tr: "Bu yarışmayı iptal etmek istiyor musun?", en: "Cancel this competition?" },
  creator_requests: { tr: "Organizatör başvuruları", en: "Organizer applications" },
  make_creator: { tr: "Organizatör yap", en: "Make organizer" },
  make_admin: { tr: "Yönetici yap", en: "Make admin" },
  make_player: { tr: "Oyuncu yap", en: "Make player" },
  ban: { tr: "Engelle", en: "Ban" },
  unban: { tr: "Engeli kaldır", en: "Unban" },
  mark_paid: { tr: "Ödendi işaretle", en: "Mark as paid" },
  txid: { tr: "İşlem kimliği (txid)", en: "Transaction ID (txid)" },
  void_prize: { tr: "Geçersiz say", en: "Void" },
  copy: { tr: "Kopyala", en: "Copy" },
  filter_all: { tr: "Tümü", en: "All" },

  /* ---------- Hatalar ---------- */
  err_generic: { tr: "Bir şeyler ters gitti. Tekrar dene.", en: "Something went wrong. Please try again." },
  err_network: { tr: "Bağlantı hatası. İnternetini kontrol et.", en: "Network error. Check your connection." },
  err_auth_required: { tr: "Önce giriş yapmalısın.", en: "Please sign in first." },
  err_profile_incomplete: { tr: "Önce profilini tamamla.", en: "Please complete your profile first." },
  err_banned: { tr: "Hesabın engellendi.", en: "Your account is banned." },
  err_game_not_found: { tr: "Oyun bulunamadı ya da bitti.", en: "Game not found or already over." },
  err_kicked: { tr: "Bu odadan çıkarıldın.", en: "You were removed from this room." },
  err_no_players: { tr: "Başlatmak için en az bir oyuncu gerekli.", en: "At least one player is needed to start." },
  err_forbidden: { tr: "Bu işlem için yetkin yok.", en: "You don't have permission for this." },
  err_creator_required: { tr: "Bu işlem için organizatör olmalısın.", en: "You need to be an organizer for this." },
  err_admin_required: { tr: "Bu işlem yöneticiye özel.", en: "Admins only." },
  err_invalid_username: { tr: "Kullanıcı adı geçersiz.", en: "Invalid username." },
  err_username_taken: { tr: "Bu kullanıcı adı alınmış.", en: "This username is taken." },
  err_invalid_zcash_address: { tr: "Geçerli bir Zcash adresi gir (u1…, zs…, t1…).", en: "Enter a valid Zcash address (u1…, zs…, t1…)." },
  err_slug_taken: { tr: "Bu adres (slug) kullanımda.", en: "This slug is already in use." },
  err_account_required: { tr: "Bunun için hesap açman gerekiyor.", en: "You need an account for this." },
  err_guest_not_allowed: { tr: "Bu yarışmaya katılmak için hesap gerekir.", en: "An account is required to join this competition." },
  err_guest_name_required: { tr: "Önce bir takma ad gir.", en: "Please enter a nickname first." },
  err_invalid_guest_name: { tr: "Takma ad 2–24 karakter olmalı.", en: "Nickname must be 2–24 characters." },
  err_invalid_slug: { tr: "Slug sadece küçük harf, rakam ve tire içerebilir.", en: "Slug may contain only lowercase letters, digits and hyphens." },
  err_title_required: { tr: "Başlık gerekli.", en: "Title is required." },
  err_questions_required: { tr: "En az bir soru gerekli.", en: "At least one question is required." },
  err_invalid_start: { tr: "Başlangıç zamanı geçmişte olamaz.", en: "Start time can't be in the past." },
  err_already_started: { tr: "Yarışma zaten başladı.", en: "The competition already started." },
  err_invalid_json: { tr: "JSON okunamadı.", en: "Couldn't parse JSON." },
  err_otp: { tr: "Kod hatalı ya da süresi dolmuş.", en: "Invalid or expired code." },
  err_rate_limit: { tr: "Çok fazla deneme. Biraz bekle.", en: "Too many attempts. Please wait." },
  err_not_configured: {
    tr: "Sunucu bağlantısı ayarlanmamış (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). README'ye bak.",
    en: "Backend not configured (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). See README.",
  },

  /* ---------- Footer ---------- */
  footer_about: { tr: "Zcash toplulukları için canlı quiz platformu. Buluşmalarda, derslerde ve etkinliklerde herkes telefonundan katılır.", en: "A live quiz platform for Zcash communities. At meetups, classes and events everyone joins from their phone." },
  footer_zcash_link: { tr: "Zcash hakkında daha fazlası: z.cash", en: "More about Zcash: z.cash" },
  header_code_placeholder: { tr: "Oda kodu", en: "Room code" },
  join: { tr: "Katıl", en: "Join" },
  footer_rights: { tr: "Zcash topluluğu için geliştirildi.", en: "Built for the Zcash community." },
  terms: { tr: "Kullanım Koşulları", en: "Terms of Use" },
  privacy: { tr: "Gizlilik", en: "Privacy" },
} satisfies Record<string, { tr: string; en: string }>;

export type DictKey = keyof typeof dict;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  lt: (text: LocalText | null | undefined) => string;
  /** Sunucu hata kodunu okunur mesaja çevirir */
  te: (e: unknown) => string;
  fmt: (n: number) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function resolveText(text: LocalText | null | undefined, lang: Lang): string {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[lang] || text.tr || text.en || "";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zq-lang") as Lang | null;
      // Site ilk açılışta İngilizce; Türkçe yalnızca kullanıcı seçerse
      if (saved === "tr" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("zq-lang", l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      let s: string = dict[key]?.[lang] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
    [lang]
  );

  const lt = useCallback((text: LocalText | null | undefined) => resolveText(text, lang), [lang]);

  const te = useCallback(
    (e: unknown) => {
      const raw = (e as { code?: string; message?: string })?.code ?? (e as Error)?.message ?? "";
      const key = `err_${raw}` as DictKey;
      if (key in dict) return t(key);
      if (/fetch|network|Failed to/i.test(raw)) return t("err_network");
      if (/otp|token.*(expired|invalid)/i.test(raw)) return t("err_otp");
      if (/rate limit|too many/i.test(raw)) return t("err_rate_limit");
      if (/^question_\d+/.test(raw)) return raw.replace("question_", lang === "tr" ? "Soru " : "Question ");
      return t("err_generic");
    },
    [t, lang]
  );

  const fmt = useCallback((n: number) => n.toLocaleString(lang === "tr" ? "tr-TR" : "en-US"), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t, lt, te, fmt }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used within I18nProvider");
  return c;
}
