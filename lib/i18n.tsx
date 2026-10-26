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
  hero_kicker: { tr: "Global canlı yarışmalar", en: "Global live competitions" },
  hero_title: { tr: "Zcash bilgini kanıtla.\nDünyayla yarış.", en: "Prove your Zcash knowledge.\nCompete with the world." },
  hero_sub: {
    tr: "Planlanmış canlı yarışmalara her yerden katıl. Sorular herkese aynı anda gelir; hızlı ve doğru cevap veren kazanır.",
    en: "Join scheduled live competitions from anywhere. Everyone gets the questions at the same time; fast, correct answers win.",
  },
  hero_cta_events: { tr: "Yarışmaları gör", en: "See competitions" },
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
  draft_preview: { tr: "Önizleme: bu quiz henüz yayında değil.", en: "Preview: this quiz isn't published yet." },

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
  become_creator: { tr: "İçerik üreticisi ol", en: "Become a creator" },
  become_creator_hint: { tr: "Onaylanınca quiz hazırlayıp canlı oda açabilirsin.", en: "Once approved you can create quizzes and host live rooms." },
  creator_note: { tr: "Kendini kısaca tanıt (topluluk, kulüp, deneyim)", en: "Introduce yourself briefly (community, club, experience)" },
  send_request: { tr: "Başvuru gönder", en: "Send request" },
  request_pending: { tr: "Başvurun inceleniyor.", en: "Your request is under review." },
  role_creator: { tr: "İçerik üreticisi", en: "Creator" },
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
  creator_requests: { tr: "Üretici başvuruları", en: "Creator requests" },
  make_creator: { tr: "Üretici yap", en: "Make creator" },
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
  err_creator_required: { tr: "Bu işlem için içerik üreticisi olmalısın.", en: "You need to be a creator for this." },
  err_admin_required: { tr: "Bu işlem yöneticiye özel.", en: "Admins only." },
  err_invalid_username: { tr: "Kullanıcı adı geçersiz.", en: "Invalid username." },
  err_username_taken: { tr: "Bu kullanıcı adı alınmış.", en: "This username is taken." },
  err_invalid_zcash_address: { tr: "Geçerli bir Zcash adresi gir (u1…, zs…, t1…).", en: "Enter a valid Zcash address (u1…, zs…, t1…)." },
  err_slug_taken: { tr: "Bu adres (slug) kullanımda.", en: "This slug is already in use." },
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
  footer_rights: { tr: "Zcash topluluğu için geliştirildi.", en: "Built for the Zcash community." },
  footer_disclaimer: {
    tr: "Bağımsız bir topluluk projesidir; Electric Coin Co. veya Zcash Foundation ile resmi bağı yoktur.",
    en: "An independent community project, not officially affiliated with Electric Coin Co. or the Zcash Foundation.",
  },
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
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("zq-lang") as Lang | null;
      if (saved === "tr" || saved === "en") setLangState(saved);
      else if (!navigator.language.toLowerCase().startsWith("tr")) setLangState("en");
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
