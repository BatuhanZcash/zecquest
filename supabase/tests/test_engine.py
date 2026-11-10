"""ZecQuest oyun motoru testleri — gerçek Postgres, Supabase rolleriyle (anon/authenticated)."""
import json, threading, time, uuid
import psycopg
from psycopg.types.json import Jsonb

import os
DSN = os.environ.get("ZQ_TEST_DSN", "host=/tmp port=5433 dbname=zq user=postgres")
admin_conn = psycopg.connect(DSN, autocommit=True)
PASS, FAIL = [], []


def check(name, cond, info=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✓ " if cond else "  ✗ ") + name + ("" if cond else f"   → {info}"))


def sql(q, *a):
    with admin_conn.cursor() as c:
        c.execute(q, a)
        try:
            return c.fetchall()
        except psycopg.ProgrammingError:
            return None


class RpcError(Exception):
    pass


def rpc(uid, fn, **kw):
    """PostgREST'in yaptığı gibi: rol + JWT 'sub' ayarla, fonksiyonu çağır."""
    with psycopg.connect(DSN) as conn:
        with conn.cursor() as c:
            c.execute("set local role " + ("authenticated" if uid else "anon"))
            c.execute("select set_config('request.jwt.claim.sub', %s, true)", (uid or "",))
            args = ", ".join(f"{k} => %s" for k in kw)
            vals = [Jsonb(v) if isinstance(v, (dict, list)) else v for v in kw.values()]
            try:
                c.execute(f"select to_jsonb(public.{fn}({args}))", vals)
            except psycopg.Error as e:
                raise RpcError(e.diag.message_primary) from None
            r = c.fetchone()[0]
        conn.commit()
    return r


def err(uid, fn, **kw):
    try:
        rpc(uid, fn, **kw)
        return None
    except RpcError as e:
        return str(e)


def new_user(name, email=None, profile=True, country="TR", team=None):
    uid = str(uuid.uuid4())
    sql("insert into auth.users (id, email, raw_user_meta_data) values (%s, %s, %s)",
        uid, email or f"{name}@test.dev", Jsonb({"full_name": name.title()}))
    if profile:
        rpc(uid, "update_my_profile", p={"username": name.lower(), "display_name": name.title(),
                                          "country": country, "team": team})
    return uid


def expire(gid):
    sql("update games set phase_ends_at = now() - interval '2 seconds' where id = %s", gid)


QUESTIONS = [
    {"text": {"tr": "S1", "en": "Q1"}, "options": ["a", "b", "c", "d"], "correct": 1, "time_limit": 20,
     "explanation": {"tr": "aç", "en": "ex"}},
    {"text": "S2", "options": ["x", "y"], "correct": 0},
    {"text": "S3", "options": ["p", "q", "r"], "correct": 2, "time_limit": 10},
]

print("\n▶ Profiller ve roller")
admin = new_user("admin")
sql("update profiles set role='admin' where id=%s", admin)
creator = new_user("creator")
noprof = new_user("halfdone", profile=False)
check("profil tetikleyiciyle oluşur", sql("select display_name from profiles where id=%s", noprof)[0][0] == "Halfdone")
check("profilsiz kullanıcı oynayamaz", err(noprof, "join_game", p_code="000000") == "profile_incomplete")
check("anonim kullanıcı oynayamaz", err(None, "join_game", p_code="000000") is not None)
check("geçersiz kullanıcı adı reddedilir", err(noprof, "update_my_profile", p={"username": "A!"}) == "invalid_username")
check("alınmış kullanıcı adı reddedilir", err(noprof, "update_my_profile", p={"username": "admin"}) == "username_taken")
check("oyuncu quiz oluşturamaz", err(noprof, "save_quiz", p={}) is not None)
rpc(creator, "request_creator", p_note="Kulüp başkanıyım")
reqs = rpc(admin, "admin_list_users", p_filter="requests")
check("üretici başvurusu yönetici listesinde", any(u["username"] == "creator" for u in reqs))
check("oyuncu yönetici listesini göremez", err(creator, "admin_list_users") == "admin_required")
rpc(admin, "admin_set_role", p_user=creator, p_role="creator")
check("yönetici üretici yetkisi verir", rpc(creator, "get_my_profile")["role"] == "creator")

print("\n▶ Quiz yaşam döngüsü")
res = rpc(creator, "save_quiz", p={"slug": "zcash-test", "title": {"tr": "Zcash Test", "en": "Zcash Test"},
                                   "tags": ["Temeller"], "default_time": 15, "questions": QUESTIONS})
qid = res["id"]
check("taslak herkese görünmez", rpc(None, "get_quiz", p_slug="zcash-test") is None)
check("yazar taslağını görür", rpc(creator, "get_quiz", p_slug="zcash-test")["question_count"] == 3)
check("organizatör onay beklemeden kendi taslağıyla oda açabilir", rpc(creator, "get_quiz", p_slug="zcash-test")["can_host"] is True
      and "code" in rpc(creator, "create_hosted_game", p_quiz_id=qid))
check("geçersiz doğru cevap reddedilir",
      "invalid_correct" in (err(creator, "save_quiz", p={"slug": "bad-one", "title": "x",
                            "questions": [{"text": "t", "options": ["a", "b"], "correct": 5}]}) or ""))
check("aynı slug reddedilir", err(admin, "save_quiz", p={"slug": "zcash-test", "title": "x", "questions": QUESTIONS}) == "slug_taken")
other = new_user("meddler")
check("başkası düzenleme verisini göremez", err(other, "get_quiz_for_edit", p_id=qid) == "forbidden")
check("yazar düzenleme verisini görür (doğrularla)", rpc(creator, "get_quiz_for_edit", p_id=qid)["questions"][0]["correct"] == 1)
check("gönderince inceleme bekler", rpc(creator, "submit_quiz", p_id=qid)["status"] == "pending")
check("bekleyen quiz yönetici listesinde", any(q["id"] == qid for q in rpc(admin, "admin_list_quizzes", p_status="pending")))
rpc(admin, "review_quiz", p_id=qid, p_approve=True, p_note=None)
pub = rpc(None, "list_quizzes")
check("onaylanan quiz herkese listelenir", any(q["slug"] == "zcash-test" for q in pub))
check("liste doğru cevap içermez", "correct" not in json.dumps(pub))
q_anon = rpc(None, "get_quiz", p_slug="zcash-test")
check("anonim quiz detayını görür", q_anon and q_anon["can_host"] is False)
check("10 sn kuralı: quiz süresi 10 sn (quizde 15/20 yazsa bile)", q_anon["avg_time"] == 10, q_anon["avg_time"])

print("\n▶ Tablo erişim güvenliği")
for role in ("anon", "authenticated"):
    for t in ("questions", "game_questions", "user_private", "game_answers", "profiles"):
        try:
            with psycopg.connect(DSN) as conn, conn.cursor() as c:
                c.execute(f"set local role {role}")
                c.execute(f"select * from public.{t} limit 1")
                rows = c.fetchall()
            check(f"{role} → {t} doğrudan okunamaz", False, f"{len(rows)} satır döndü")
        except psycopg.Error:
            check(f"{role} → {t} doğrudan okunamaz", True)
check("anonim kullanıcı sunucu saatini alabilir", isinstance(rpc(None, "server_time"), int))
check("iç fonksiyonlar API'ye kapalı", err(other, "_end_game", p_game=str(uuid.uuid4())) is not None)
check("tick_due_games API'ye kapalı", err(other, "tick_due_games") is not None)

print("\n▶ Sunucu yönetimli canlı oyun")
check("oyuncu oda açamaz", err(other, "create_hosted_game", p_quiz_id=qid) == "creator_required")
g = rpc(creator, "create_hosted_game", p_quiz_id=qid)
gid, code = g["id"], g["code"]
check("6 haneli kod üretilir", len(code) == 6 and code.isdigit())
p1, p2, p3 = new_user("ayse", team="ODTÜ"), new_user("mehmet", country="DE"), new_user("zeynep", country="US", team="MIT")
for p in (p1, p2, p3):
    rpc(p, "join_game", p_code=code)
check("host kodla katılınca host olarak tanınır", rpc(creator, "join_game", p_code=code)["is_host"] is True)
hv = rpc(creator, "host_view", p_game_id=gid)
check("host 3 oyuncuyu görür", len(hv["players"]) == 3 and hv["player_count"] == 3)
check("oyuncu host ekranını göremez", err(p1, "host_view", p_game_id=gid) == "forbidden")
check("oyuncu oyunu ilerletemez", err(p1, "advance_game", p_game_id=gid) == "forbidden")
st = rpc(creator, "advance_game", p_game_id=gid)
check("soru fazına geçer", st["status"] == "question" and st["current_q"] == 0)
check("10 sn kuralı: canlı soru süresi 10 sn", st["question"]["time_limit"] == 10 and st["phase_ends_at"] - st["phase_started_at"] == 10000, (st["question"]["time_limit"], st["phase_ends_at"] - st["phase_started_at"]))
check("soru durumunda doğru cevap YOK", "correct" not in json.dumps(st["question"]) and st["reveal"] is None)
st_anon = rpc(None, "get_game_state", p_game_id=gid)
check("anonim izleyici de doğru cevabı göremez", "correct" not in json.dumps(st_anon))

r1 = rpc(p1, "submit_answer", p_game_id=gid, p_q=0, p_choice=1)
check("cevap kabul edilir", r1["accepted"] is True and r1["all_answered"] is False)
check("aynı soruya ikinci cevap reddedilir", rpc(p1, "submit_answer", p_game_id=gid, p_q=0, p_choice=2)["reason"] == "already")
check("cevap sonrası durum sonucu sızdırmaz", rpc(p1, "my_game_status", p_game_id=gid)["result"] is None)
check("geçersiz seçenek reddedilir", err(p2, "submit_answer", p_game_id=gid, p_q=0, p_choice=9) == "invalid_choice")
check("yanlış soru indeksi reddedilir", rpc(p2, "submit_answer", p_game_id=gid, p_q=1, p_choice=0)["accepted"] is False)
rpc(p2, "submit_answer", p_game_id=gid, p_q=0, p_choice=0)
sql("update games set phase_started_at = phase_started_at - interval '10 seconds' where id=%s", gid)  # zeynep yavaş
r3 = rpc(p3, "submit_answer", p_game_id=gid, p_q=0, p_choice=1)
check("son oyuncu cevaplayınca all_answered", r3["all_answered"] is True)
st = rpc(p3, "tick_game", p_game_id=gid)
check("herkes cevaplayınca tick → reveal", st["status"] == "reveal")
check("reveal'da doğru cevap + dağılım gelir", st["reveal"]["correct"] == 1 and st["reveal"]["counts"] == [1, 2, 0, 0])
s1, s2, s3 = (rpc(p, "my_game_status", p_game_id=gid) for p in (p1, p2, p3))
check("hızlı doğru > yavaş doğru > yanlış", s1["score"] > s3["score"] > s2["score"] == 0, (s1["score"], s3["score"], s2["score"]))
check("hızlı cevap ≈ 1000 puan (gecikme payı dahil)", s1["score"] >= 990, s1["score"])
check("sonuç ve sıra doğru", s1["result"]["is_correct"] and s1["rank"] == 1 and s2["rank"] == 3)
check("reveal sonrası cevap reddedilir", rpc(p2, "submit_answer", p_game_id=gid, p_q=0, p_choice=1)["accepted"] is False)

print("\n▶ Yenileme / yeniden bağlanma")
again = rpc(p1, "join_game", p_code=code)
s1b = rpc(p1, "my_game_status", p_game_id=gid)
check("yeniden katılım aynı oyunu ve skoru döndürür", again["game_id"] == gid and s1b["score"] == s1["score"])
check("host yenileyince oyun durumu korunur", rpc(creator, "host_view", p_game_id=gid)["status"] == "reveal")

print("\n▶ Oyuncu çıkarma")
rpc(creator, "kick_player", p_game_id=gid, p_user_id=p2)
check("çıkarılan oyuncu tekrar katılamaz", err(p2, "join_game", p_code=code) == "kicked")
check("çıkarılan oyuncu durumunda kicked", rpc(p2, "my_game_status", p_game_id=gid)["kicked"] is True)

st = rpc(creator, "advance_game", p_game_id=gid)
check("reveal → skor tablosu", st["status"] == "leaderboard" and len(st["leaderboard"]) == 2)
st = rpc(creator, "advance_game", p_game_id=gid)
check("sonraki soru", st["status"] == "question" and st["current_q"] == 1)
check("çıkarılan oyuncu cevap veremez", err(p2, "submit_answer", p_game_id=gid, p_q=1, p_choice=0) == "not_joined")
rpc(p1, "submit_answer", p_game_id=gid, p_q=1, p_choice=0)
st = rpc(p1, "tick_game", p_game_id=gid)
check("süre dolmadan tick bir şey yapmaz", st["status"] == "question")
expire(gid)
check("süre + pay sonrası geç cevap reddedilir", rpc(p3, "submit_answer", p_game_id=gid, p_q=1, p_choice=0)["reason"] == "late")
st = rpc(p3, "tick_game", p_game_id=gid)
check("süre dolunca tick → reveal", st["status"] == "reveal")
s3 = rpc(p3, "my_game_status", p_game_id=gid)
check("cevapsız oyuncu 'missed' ve seri sıfır", s3["result"].get("missed") is True and s3["streak"] == 0)
s1 = rpc(p1, "my_game_status", p_game_id=gid)
check("ayşe 2 seri", s1["streak"] == 2)
rpc(creator, "advance_game", p_game_id=gid)
rpc(creator, "advance_game", p_game_id=gid)
rpc(p1, "submit_answer", p_game_id=gid, p_q=2, p_choice=2)
rpc(p3, "submit_answer", p_game_id=gid, p_q=2, p_choice=2)
rpc(p3, "tick_game", p_game_id=gid)
s1_before = rpc(p1, "my_game_status", p_game_id=gid)
pts_q3 = sql("select points from game_answers where game_id=%s and user_id=%s and q_index=2", gid, p1)[0][0]
check("seri bonusu uygulanır (2 seri → +200)", pts_q3 >= 1100, pts_q3)
st = rpc(creator, "advance_game", p_game_id=gid)
check("son reveal'dan sonra oyun biter", st["status"] == "ended")
check("final liderlik tablosu", st["leaderboard"][0]["name"] == "Ayse")
ev = sql("select count(*) from score_events where ref_id=%s", gid)[0][0]
check("cevap verenlerin skorları kaydedilir (çıkarılan hariç)", ev == 2, ev)
check("bitmiş oyuna katılım yok", err(p3, "join_game", p_code=code) == "game_not_found")
check("bitmiş oyun kodla bulunur (sonuçlar)", rpc(None, "find_game", p_code=code)["status"] == "ended")
check("sonuç sayfası", rpc(p1, "get_game_results", p_game_id=gid)["me"]["rank"] == 1)

print("\n▶ Planlı global yarışma + ödüller")
check("üretici etkinlik planlayamaz", err(creator, "create_event", p={"quiz_id": qid, "starts_at": "2030-01-01T00:00:00Z"}) == "admin_required")
ev = rpc(admin, "create_event", p={"quiz_id": qid, "title": {"tr": "Dünya Kupası", "en": "World Cup"},
                                   "starts_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 120)),
                                   "prize": {"tr": "1.: 1 ZEC, 2.: 0.5 ZEC", "en": "1st: 1 ZEC"}, "prize_places": 2,
                                   "reveal_secs": 5, "board_secs": 5})
eid, ecode = ev["id"], ev["code"]
lst = rpc(None, "list_events")
check("yaklaşan yarışma herkese listelenir", any(e["id"] == eid for e in lst["upcoming"]))
players = [new_user(f"global{i}", country=["TR", "DE", "BR", "JP"][i % 4]) for i in range(6)]
rpc(players[0], "update_my_profile", p={"zcash_address": "t1" + "Z" * 33})
check("geçersiz Zcash adresi reddedilir", err(players[1], "update_my_profile", p={"zcash_address": "bitcoin123"}) == "invalid_zcash_address")
for p in players:
    rpc(p, "join_game", p_code=ecode)
st = rpc(players[0], "tick_game", p_game_id=eid)
check("başlama saati gelmeden başlamaz", st["status"] == "lobby" and st["player_count"] == 6)
sql("update games set starts_at = now() - interval '1 second', phase_ends_at = now() - interval '1 second' where id=%s", eid)
st = rpc(players[3], "tick_game", p_game_id=eid)
check("saati gelince otomatik başlar", st["status"] == "question")
for qi, ans in enumerate([1, 0, 2]):
    for k, p in enumerate(players):
        if k < 4:
            rpc(p, "submit_answer", p_game_id=eid, p_q=qi, p_choice=ans if k % 2 == 0 or qi == 0 else 1 - min(ans, 1))
    st = rpc(players[5], "tick_game", p_game_id=eid)
    check(f"S{qi+1}: planlıda herkes cevaplasa da süre beklenir", st["status"] == "question")
    expire(eid)
    st = rpc(players[5], "tick_game", p_game_id=eid)
    check(f"S{qi+1}: süre dolunca otomatik reveal", st["status"] == "reveal")
    expire(eid)
    n = sql("select public.tick_due_games()")[0][0]
    st = rpc(None, "get_game_state", p_game_id=eid)
    check(f"S{qi+1}: pg_cron tick'i ilerletir ({st['status']})", n >= 1 and st["status"] in ("leaderboard", "ended"))
    if st["status"] == "leaderboard":
        expire(eid)
        rpc(players[1], "tick_game", p_game_id=eid)
st = rpc(None, "get_game_state", p_game_id=eid)
check("planlı yarışma kendiliğinden biter", st["status"] == "ended")
claims = sql("select place, status, address is not null from prize_claims where game_id=%s order by place", eid)
check("ilk 2'ye ödül talebi açılır", len(claims) == 2, claims)
check("kayıtlı adresi olan kazanan 'pending'", claims[0][1] == "pending" and claims[0][2], claims)
winner2 = sql("select user_id from prize_claims where game_id=%s and place=2", eid)[0][0]
mp = rpc(str(winner2), "my_prizes")
check("kazanan ödülünü görür", mp[0]["status"] == "awaiting_address")
check("başkası ödül adresi giremez", err(players[5], "submit_prize_address", p_claim=mp[0]["id"], p_address="t1" + "Y" * 33) == "not_found")
mp = rpc(str(winner2), "submit_prize_address", p_claim=mp[0]["id"], p_address="zs1" + "q" * 75)
check("Sapling adresiyle talep 'pending' olur", mp[0]["status"] == "pending")
pr = rpc(admin, "admin_list_prizes", p_status="pending")
rpc(admin, "admin_update_prize", p_id=pr[0]["id"], p_status="paid", p_txid="abc123", p_note=None)
check("yönetici ödemeyi işaretler", rpc(admin, "admin_list_prizes", p_status="paid")[0]["txid"] == "abc123")
bc = sql("select count(*), count(*) filter (where payload->'question' ? 'correct') from realtime.sent where topic=%s", f"game:{eid}")[0]
check("her durum değişikliği realtime'a yayınlanır", bc[0] >= 10, bc)
check("yayınlarda soru içinde doğru cevap hiç yok", bc[1] == 0, bc)
leak = sql("select count(*) from realtime.sent where topic=%s and payload->>'status'='question' and payload->'reveal' <> 'null'::jsonb", f"game:{eid}")[0][0]
check("soru fazı yayınında reveal yok", leak == 0)

print("\n▶ Solo")
s = rpc(p1, "solo_start", p_quiz_id=qid)
check("10 sn kuralı: solo soru süresi 10 sn", s["question"]["time_limit"] == 10)
check("solo soru doğru cevap içermez", "correct" not in json.dumps(s["question"]))
check("cevap vermeden ilerlenemez", err(p1, "solo_next", p_session=s["session_id"]) == "answer_first")
a = rpc(p1, "solo_answer", p_session=s["session_id"], p_choice=1)
check("solo cevap sonrası doğru + puan", a["is_correct"] and a["correct"] == 1 and a["points"] >= 990)
check("solo çift cevap reddedilir", err(p1, "solo_answer", p_session=s["session_id"], p_choice=1) == "already_answered")
check("başkası oturumu kullanamaz", err(p3, "solo_answer", p_session=s["session_id"], p_choice=1) == "not_found")
n = rpc(p1, "solo_next", p_session=s["session_id"])
sql("update solo_sessions set q_started_at = now() - interval '60 seconds' where id=%s", s["session_id"])
a = rpc(p1, "solo_answer", p_session=s["session_id"], p_choice=0)
check("süresi geçmiş solo cevap boş sayılır", a["is_correct"] is False and a["choice"] is None)
r = rpc(p1, "solo_resume", p_session=s["session_id"])
check("solo oturumu yenilemeden sonra devam eder", r["answered"] is True and r["question"]["index"] == 1)
rpc(p1, "solo_next", p_session=s["session_id"])
rpc(p1, "solo_answer", p_session=s["session_id"], p_choice=2)
fin = rpc(p1, "solo_next", p_session=s["session_id"])
check("solo biter ve kaydedilir", fin["finished"] and fin["quiz_rank"] >= 1)
before = rpc(None, "get_leaderboard")["rows"]
ayse_before = next(r["score"] for r in before if r["username"] == "ayse")
for _ in range(2):  # aynı quizi tekrar oynayarak puan kasma denemesi
    s = rpc(p1, "solo_start", p_quiz_id=qid)
    for i in range(3):
        rpc(p1, "solo_answer", p_session=s["session_id"], p_choice=None)
        rpc(p1, "solo_next", p_session=s["session_id"])
after = rpc(None, "get_leaderboard")["rows"]
ayse_after = next(r["score"] for r in after if r["username"] == "ayse")
check("tekrarlı solo puan kasmaz (en iyi skor sayılır)", ayse_after == ayse_before, (ayse_before, ayse_after))

print("\n▶ Liderlik")
lb = rpc(p1, "get_leaderboard", p_group="player", p_range="all")
check("oyuncu liderliği sıralı", lb["rows"] == sorted(lb["rows"], key=lambda r: -r["score"]))
check("kendi sıram döner", lb["me"] and lb["me"]["rank"] >= 1)
lc = rpc(None, "get_leaderboard", p_group="country", p_range="week")
check("ülke liderliği", {r["key"] for r in lc["rows"]} >= {"TR", "DE"})
lt = rpc(None, "get_leaderboard", p_group="team", p_range="today")
check("takım liderliği", any(r["key"] == "ODTÜ" for r in lt["rows"]))
prof = rpc(None, "get_public_profile", p_username="ayse")
check("herkese açık profil istatistikleri", prof["total_score"] == ayse_after and prof["wins"] >= 1)

print("\n▶ Eşzamanlılık: 60 oyuncu aynı anda cevaplıyor, süre dolarken")
g = rpc(admin, "create_hosted_game", p_quiz_id=qid)
cg = g["id"]
crowd = [new_user(f"crowd{i}") for i in range(60)]
for p in crowd:
    rpc(p, "join_game", p_code=g["code"])
rpc(admin, "advance_game", p_game_id=cg)
results, errors = {}, []

def answer(p):
    try:
        results[p] = rpc(p, "submit_answer", p_game_id=cg, p_q=0, p_choice=1)
    except Exception as e:
        errors.append(str(e))

def ticker():
    for _ in range(40):
        try:
            rpc(crowd[0], "tick_game", p_game_id=cg)
        except Exception as e:
            errors.append("tick " + str(e))

threads = [threading.Thread(target=answer, args=(p,)) for p in crowd[:59]] + [threading.Thread(target=ticker)]
for t in threads: t.start()
for t in threads: t.join()
st = rpc(admin, "get_game_state", p_game_id=cg)
check("eşzamanlı çağrılarda hata yok", not errors, errors[:3])
accepted = sum(1 for r in results.values() if r.get("accepted"))
check("59 cevabın hepsi kabul edildi", accepted == 59, accepted)
expire(cg)
st = rpc(crowd[5], "tick_game", p_game_id=cg)
scored = sql("select count(*) from game_players where game_id=%s and score > 0", cg)[0][0]
check("kabul edilen her cevap puanlandı (kayıp yok)", st["status"] == "reveal" and scored == 59, scored)
check("reveal sayımı doğru", st["reveal"]["counts"][1] == 59)

# ---------------------------------------------------------------------
print("\nMisafir (anonim) giriş")
gu = str(uuid.uuid4())
sql("insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values (%s, null, '{}', true)", gu)
check("anonim kullanıcı misafir olarak işaretlenir", sql("select is_guest, display_name from profiles where id=%s", gu)[0] == (True, None))
gh = rpc(admin, "create_hosted_game", p_quiz_id=qid)
gh_id, gcode = gh["id"], gh["code"]
check("adsız misafir katılamaz", err(gu, "join_game", p_code=gcode) == "guest_name_required")
check("çok kısa ad reddedilir", err(gu, "guest_start", p_name=" a ") == "invalid_guest_name")
me_g = rpc(gu, "guest_start", p_name="  Misafir   Ali ")
check("misafir adı ayarlanır", me_g["display_name"] == "Misafir Ali" and me_g["is_guest"] is True, me_g)
check("hesaplı kullanıcı guest_start çağıramaz", err(other, "guest_start", p_name="Ali") == "not_guest")
j = rpc(gu, "join_game", p_code=gcode)
check("misafir anlık odaya katılır", j["is_host"] is False and j["game_id"] == gh_id)
ev2 = rpc(admin, "create_event", p={"quiz_id": qid, "starts_at": "2030-01-01T00:00:00Z", "prize_places": 3})
check("misafir planlı yarışmaya katılamaz", err(gu, "join_game", p_code=ev2["code"]) == "guest_not_allowed")
check("misafir solo oynayamaz", err(gu, "solo_start", p_quiz_id=qid) == "account_required")
check("misafir üreticilik isteyemez", err(gu, "request_creator", p_note="x") == "account_required")
check("misafir kullanıcı adı alamaz", err(gu, "update_my_profile", p={"username": "sahte_ad"}) == "account_required")
check("misafir ödül listesine erişemez", err(gu, "my_prizes") == "account_required")
rpc(admin, "advance_game", p_game_id=gh_id)
ra = rpc(gu, "submit_answer", p_game_id=gh_id, p_q=0, p_choice=1)
check("misafir cevap verebilir", ra.get("accepted") is True, ra)
rpc(admin, "end_game_now", p_game_id=gh_id)
st = rpc(gu, "get_game_state", p_game_id=gh_id)
check("misafir oda sonuç tablosunda görünür", any(r["name"] == "Misafir Ali" for r in st["leaderboard"]), st["leaderboard"])
check("misafir puanı kaydedilir (hesap açınca sayılsın diye)", sql("select count(*) from score_events where user_id=%s", gu)[0][0] == 1)
lb = rpc(None, "get_leaderboard", p_group="player", p_range="all", p_quiz=None, p_limit=200)
check("misafir genel liderlikte görünmez", all(r["display_name"] != "Misafir Ali" for r in lb["rows"]))
check("misafire ödül kaydı açılmaz", sql("select count(*) from prize_claims where user_id=%s", gu)[0][0] == 0)
sql("update auth.users set email='ali@test.dev', is_anonymous=false where id=%s", gu)
check("e-posta doğrulanınca misafirlik kalkar", sql("select is_guest from profiles where id=%s", gu)[0][0] is False)
check("hesaba dönen kullanıcı önce kullanıcı adı seçer", err(gu, "solo_start", p_quiz_id=qid) == "profile_incomplete")
rpc(gu, "update_my_profile", p={"username": "ali_eski_misafir", "country": "TR"})
lb = rpc(None, "get_leaderboard", p_group="player", p_range="all", p_quiz=None, p_limit=200)
check("eski misafir puanı genel liderliğe aktarılır", any(r["username"] == "ali_eski_misafir" for r in lb["rows"]))

print("\n— Tek dilli quizler —")
SQ = [{"text": "¿En qué año se lanzó Zcash?", "options": ["2014", "2016"], "correct": 1, "explanation": "Octubre de 2016."}]
es = rpc(creator, "save_quiz", p={"slug": "zcash-espanol", "title": "Zcash en español", "language": "es", "questions": SQ})
row = sql("select language, title #>> '{}' from quizzes where id=%s", es["id"])[0]
check("organizatör tek dilli (İspanyolca) quiz kaydeder", row == ("es", "Zcash en español"), row)
hi = rpc(creator, "save_quiz", p={"slug": "zcash-hindi", "title": "ज़ीकैश प्रश्नोत्तरी", "language": "hi",
     "questions": [{"text": "ज़ीकैश कब शुरू हुआ?", "options": ["2014", "2016"], "correct": 1}]})
check("Hintçe (Latin dışı) metin kaydedilir", sql("select title #>> '{}' from quizzes where id=%s", hi["id"])[0][0] == "ज़ीकैश प्रश्नोत्तरी")
check("geçersiz dil kodu reddedilir", err(creator, "save_quiz", p={"slug": "bad-lang", "title": "x", "language": "Spanish!", "questions": SQ}) == "invalid_language")
check("bölgesel dil kodu kabul edilir (pt-BR)", rpc(creator, "save_quiz", p={"slug": "zcash-pt", "title": "Zcash", "language": "pt-BR", "questions": SQ})["slug"] == "zcash-pt")
ed = rpc(creator, "get_quiz_for_edit", p_id=es["id"])
check("düzenleme ekranına dil gelir", ed["language"] == "es" and ed["questions"][0]["text"] == SQ[0]["text"], ed.get("language"))
rpc(admin, "review_quiz", p_id=es["id"], p_approve=True, p_note=None)
rpc(admin, "review_quiz", p_id=hi["id"], p_approve=True, p_note=None)
es_list = rpc(None, "list_quizzes", p_language="es")
check("Keşfet dil filtresi: sadece İspanyolca", [q["slug"] for q in es_list] == ["zcash-espanol"], [q["slug"] for q in es_list])
check("quiz kartında dil var", es_list[0]["language"] == "es")
en_list = [q["slug"] for q in rpc(None, "list_quizzes", p_language="en")]
check("iki dilli quiz İngilizce filtresinde görünür, İspanyolca görünmez", "zcash-test" in en_list and "zcash-espanol" not in en_list, en_list)
check("filtresiz listede hepsi var", {"zcash-espanol", "zcash-hindi"} <= {q["slug"] for q in rpc(None, "list_quizzes")})
langs = {x["code"]: x["count"] for x in rpc(None, "list_quiz_languages")}
check("dil listesi sayıları", langs.get("es") == 1 and langs.get("hi") == 1 and langs.get("en", 0) >= 1, langs)
check("A–Z sıralama tek dilli başlıklarla çalışır", len(rpc(None, "list_quizzes", p_sort="az")) >= 3)
hg = rpc(creator, "create_hosted_game", p_quiz_id=es["id"])
check("tek dilli quizle canlı oda açılır", bool(hg.get("code")), hg)
rpc(creator, "end_game_now", p_game_id=hg["id"])

ZEKI_COINS_1 = sql("select (public._game_level_limits('zeki', 1) ->> 'coins')::int")[0][0]

# =====================================================================
print("\n▶ Oyna: Zeki skorları (0010)")
z1, z2 = new_user("zekiplayer"), new_user("zekirival")
check("bilinmeyen bölüm reddedilir", err(z1, "submit_game_score", p_game="zeki", p_level=9, p_score=10, p_time_ms=60000, p_coins=0) == "unknown_level")
check("anonim skor gönderemez", err(None, "submit_game_score", p_game="zeki", p_level=1, p_score=10, p_time_ms=60000, p_coins=0) is not None)
check("imkânsız hızlı süre reddedilir", err(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=3000, p_time_ms=3000, p_coins=5) == "implausible_score")
check("azami puan üstü reddedilir", err(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=999999, p_time_ms=60000, p_coins=5) == "implausible_score")
check("bölümdeki paradan fazlası reddedilir", err(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=3000, p_time_ms=60000, p_coins=500) == "implausible_score")
check("negatif değerler reddedilir", err(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=-5, p_time_ms=60000, p_coins=0) == "implausible_score")
xp0 = sql("select xp from profiles where id=%s", z1)[0][0]
r1 = rpc(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=4000, p_time_ms=60000, p_coins=10, p_no_hit=False)
check("geçerli koşu kaydedilir (bitirme yıldızı)", r1["best_score"] == 4000 and r1["stars"] == 1 and r1["new_best"] is True, r1)
check("ilk bitirişte game_level XP'si verilir", r1["xp_awarded"] == 50 and sql("select xp from profiles where id=%s", z1)[0][0] == xp0 + 50, r1)
check("art arda gönderim sınırlanır", err(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=4100, p_time_ms=59000, p_coins=10) == "too_many_requests")
sql("update game_runs set created_at = created_at - interval '10 seconds'")
r2 = rpc(z1, "submit_game_score", p_game="zeki", p_level=1, p_score=3500, p_time_ms=40000, p_coins=ZEKI_COINS_1, p_no_hit=True)
check("en iyi puan korunur, en iyi süre güncellenir", r2["best_score"] == 4000 and r2["best_time_ms"] == 40000 and r2["new_best"] is False, r2)
check("yıldızlar birikir (tüm paralar + hasarsız)", r2["stars"] == 7 and r2["coins"] == ZEKI_COINS_1, r2)
check("tüm paralar için game_stars XP'si, bitirme XP'si tekrar verilmez", r2["xp_awarded"] == 25, r2)
check("XP olayları tekil", sql("select count(*) from xp_events where user_id=%s and ref='zeki:1'", z1)[0][0] == 2)
sql("update game_runs set created_at = created_at - interval '10 seconds'")
rpc(z2, "submit_game_score", p_game="zeki", p_level=1, p_score=5000, p_time_ms=50000, p_coins=20)
zg = str(uuid.uuid4())
sql("insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values (%s, null, '{}', true)", zg)
rpc(zg, "guest_start", p_name="Zeki Guest")
gr = rpc(zg, "submit_game_score", p_game="zeki", p_level=1, p_score=6000, p_time_ms=30000, p_coins=ZEKI_COINS_1)
check("misafir skoru kaydedilir ama sırası yok", gr["best_score"] == 6000 and gr["rank"] is None, gr)
lb = rpc(None, "game_leaderboard", p_game="zeki", p_level=1, p_period="all")
names = [r["username"] for r in lb["rows"]]
check("bölüm liderliği sıralı (en iyi puan)", names[:2] == ["zekirival", "zekiplayer"], names)
check("misafir herkese açık tabloda yok", all(r["display_name"] != "Zeki Guest" for r in lb["rows"]))
check("kendi sıram döner", rpc(z1, "game_leaderboard", p_game="zeki", p_level=1, p_period="all")["me"]["rank"] == 2)
sql("update game_runs set created_at = now() - interval '8 days' where user_id=%s", z2)
wk = [r["username"] for r in rpc(None, "game_leaderboard", p_game="zeki", p_level=1, p_period="week")["rows"]]
check("haftalık tablo yalnızca son 7 gün", wk == ["zekiplayer"], wk)
prog = rpc(z1, "my_game_progress", p_game="zeki")
check("kendi ilerlemem (seviye, yıldız, en iyi süre)",
      prog == [{"level": 1, "best_score": 4000, "best_time_ms": 40000, "coins": ZEKI_COINS_1, "stars": 7, "runs": 2}], prog)
check("tuhaf oyun adı güvenle reddedilir", err(z1, "submit_game_score", p_game="zeki'; --", p_level=1, p_score=1, p_time_ms=60000, p_coins=0) == "unknown_level")
for role in ("anon", "authenticated"):
    with psycopg.connect(DSN) as conn:
        with conn.cursor() as c:
            c.execute("set local role " + role)
            try:
                c.execute("select * from game_scores")
                ok = False
            except psycopg.Error:
                ok = True
    check(f"{role} oyun tablolarını doğrudan okuyamaz", ok)

# =====================================================================
print("\n▶ Arena: eşleştirme, sızıntı yok, puanlama, reyting")
AQ = [{"text": {"tr": f"A{i}", "en": f"Arena {i}"}, "options": ["r", "w1", "w2", "w3"], "correct": 0,
       "explanation": {"tr": f"Açıklama {i}", "en": f"Because {i}"}} for i in range(8)]
aq = rpc(creator, "save_quiz", p={"slug": "arena-pool", "title": {"tr": "Arena", "en": "Arena"}, "questions": AQ})
rpc(admin, "review_quiz", p_id=aq["id"], p_approve=True, p_note=None)
# Test havuzu: yalnızca bu quiz yayında (doğru cevap hep 0)
hidden = [r[0] for r in sql("select id from quizzes where id <> %s and status='published'", aq["id"])]
sql("update quizzes set status='draft' where id = any(%s::uuid[])", hidden)
a1, a2, a3 = new_user("arena_one"), new_user("arena_two"), new_user("arena_three")
w1 = rpc(a1, "arena_find", p_lang="en")
check("ilk oyuncu kuyrukta bekler", w1["status"] == "waiting" and w1["bot_after_ms"] == 8000, w1)
m2 = rpc(a2, "arena_find", p_lang="en")
check("ikinci oyuncu bekleyenle eşleşir", m2["status"] == "matched" and m2["bot"] is False, m2)
m1 = rpc(a1, "arena_find", p_lang="en")
check("bekleyen oyuncu aynı maça yönlendirilir", m1["status"] == "matched" and m1["match_id"] == m2["match_id"], m1)
mid = m1["match_id"]
check("üçüncü oyuncu dolu maça eklenmez", rpc(a3, "arena_find", p_lang="en")["status"] == "waiting")
rpc(a3, "arena_cancel")
check("kuyruktan çıkış", sql("select count(*) from arena_queue where user_id=%s", a3)[0][0] == 0)
check("maça dışarıdan bakılamaz", err(a3, "arena_state", p_match=mid) == "forbidden")
st = rpc(a1, "arena_state", p_match=mid)
check("maç tanıtımla başlar", st["status"] == "intro" and st["question"] is None and st["opp"]["bot"] is False)
check("soru az olan dil İngilizceye düşer", rpc(a3, "arena_find", p_lang="es")["lang"] == "en")
rpc(a3, "arena_cancel")


def expire_arena(m):
    sql("update arena_matches set phase_ends_at = now() - interval '2 seconds' where id=%s", m)


expire_arena(mid)
s1 = rpc(a1, "arena_state", p_match=mid)
s2 = rpc(a2, "arena_state", p_match=mid)
check("iki oyuncu aynı soruyu görür", s1["status"] == "question" and s1["question"]["text"] == s2["question"]["text"], (s1["status"], s2["status"]))
check("soru sırasında doğru cevap gönderilmez", '"correct"' not in json.dumps(s1) and s1["reveal"] is None, json.dumps(s1)[:300])
check("10 sn kuralı", s1["question"]["time_limit"] == 10)
check("geçersiz seçenek reddedilir", err(a1, "arena_answer", p_match=mid, p_q=0, p_choice=7) == "invalid_choice")
check("yanlış soru indeksi kapalı", rpc(a1, "arena_answer", p_match=mid, p_q=3, p_choice=0)["accepted"] is False)
ans = rpc(a1, "arena_answer", p_match=mid, p_q=0, p_choice=0)
check("cevap yanıtı doğruluğu sızdırmaz", ans == {"accepted": True}, ans)
check("ikinci cevap kabul edilmez", rpc(a1, "arena_answer", p_match=mid, p_q=0, p_choice=1)["reason"] == "already")
s2 = rpc(a2, "arena_state", p_match=mid)
check("rakibin cevap verdiği görünür, seçimi ve doğruluğu görünmez", s2["opp_answered"] is True and s2["my_choice"] is None
      and '"correct"' not in json.dumps(s2) and "opp_choice" not in json.dumps(s2))
rpc(a2, "arena_answer", p_match=mid, p_q=0, p_choice=2)
s1 = rpc(a1, "arena_state", p_match=mid)
check("iki cevap gelince açıklanır", s1["status"] == "reveal" and s1["reveal"]["correct"] == 0, s1["status"])
check("doğru + hız bonusu puanı (100–150)", 100 <= s1["reveal"]["my_points"] <= 150 and s1["reveal"]["opp_points"] == 0, s1["reveal"])
check("işaretler: ben doğru, rakip yanlış", s1["pips"] == [{"me": True, "opp": False}], s1["pips"])
check("skor sunucuda hesaplanır", s1["me"]["score"] == s1["reveal"]["my_points"] and s1["opp"]["score"] == 0)
sent = sql("select payload from realtime.sent where topic=%s order by id desc", "arena:" + mid)
check("her değişiklik realtime ile duyurulur (yalnızca sürüm)", len(sent) >= 3 and set(sent[0][0].keys()) == {"version", "status"}, sent[:1])
for qi in range(1, 5):
    expire_arena(mid)
    st = rpc(a2, "arena_state", p_match=mid)
    if qi == 4:
        check("5. soru başlar", st["status"] == "question" and st["current_q"] == 4, st["status"])
    rpc(a1, "arena_answer", p_match=mid, p_q=qi, p_choice=0)
    if qi != 2:
        rpc(a2, "arena_answer", p_match=mid, p_q=qi, p_choice=0 if qi % 2 else 3)
    else:
        expire_arena(mid)  # a2 cevap vermez, süre dolar
    rpc(a1, "arena_state", p_match=mid)
expire_arena(mid)
end1 = rpc(a1, "arena_state", p_match=mid)
end2 = rpc(a2, "arena_state", p_match=mid)
check("5 sorudan sonra maç biter, kazanan doğru", end1["status"] == "ended" and end1["winner"] == end1["me"]["slot"], (end1["status"], end1.get("winner")))
r_a1 = sql("select rating, wins, streak from arena_ratings where user_id=%s", a1)[0]
r_a2 = sql("select rating, losses, streak from arena_ratings where user_id=%s", a2)[0]
check("Elo: eşit reytingde ±16", r_a1 == (1016, 1, 1) and r_a2 == (984, 1, 0), (r_a1, r_a2))
check("sonuç: reyting farkı, lig, seri", end1["result"]["delta"] == 16 and end1["result"]["league"] == "bronze" and end1["result"]["streak"] == 1, end1["result"])
check("sonuç: kaybeden -16", end2["result"]["delta"] == -16 and end2["result"]["outcome"] == -1, end2["result"])
check("rozetler: kusursuz + ilk galibiyet", {"perfect", "first_win"} <= set(end1["result"]["badges"]), end1["result"]["badges"])
check("kaçırılan soru açıklamasıyla gelir", any(not q["my_correct"] and q["explanation"] for q in end2["result"]["questions"]))
check("galibiyet XP'si (günde ilk 3)", end1["result"]["xp"] == 10 and sql("select count(*) from xp_events where user_id=%s and source='arena_win'", a1)[0][0] == 1)
check("bitmiş maçta cevap kabul edilmez", rpc(a1, "arena_answer", p_match=mid, p_q=4, p_choice=0)["accepted"] is False)
lbw = rpc(None, "arena_leaderboard", p_period="week")
check("haftalık arena sıralaması (puan)", [r["username"] for r in lbw["rows"]][:2] == ["arena_one", "arena_two"], lbw["rows"])
lba = rpc(a2, "arena_leaderboard", p_period="all")
check("tüm zamanlar: reyting ve lig", lba["rows"][0]["value"] == 1016 and lba["rows"][0]["league"] == "bronze" and lba["me"]["rank"] == 2, lba)
me1 = rpc(a1, "my_arena")
check("lobi verisi", me1["rating"] == 1016 and me1["wins"] == 1 and me1["rank"] == 1 and me1["weekly_rank"] == 1 and me1["active_match"] is None, me1)

print("\n▶ Arena: pratik botu")
b = rpc(a3, "arena_find", p_lang="en")
check("rakip yoksa bekler", b["status"] == "waiting")
sql("update arena_queue set joined_at = now() - interval '9 seconds' where user_id=%s", a3)
b = rpc(a3, "arena_find", p_lang="en")
check("~8 sn sonra pratik botuyla eşleşir", b["status"] == "matched" and b["bot"] is True, b)
bid = b["match_id"]
bm = sql("select bot, p2, p2_rating from arena_matches where id=%s", bid)[0]
check("bot etiketli ve beceri eşleşmeli (1000 → %55)", bm[1] is None and bm[0]["name"] and float(bm[0]["acc"]) == 0.55 and bm[2] == 1000, bm)
bs = rpc(a3, "arena_state", p_match=bid)
check("istemci rakibin bot olduğunu bilir", bs["opp"]["bot"] is True and bs["opp"]["name"] == bm[0]["name"])
expire_arena(bid)
bs = rpc(a3, "arena_state", p_match=bid)
check("bot cevabı düşünme süresi dolmadan görünmez", bs["status"] == "question" and bs["opp_answered"] is False, bs["opp_answered"])
check("bot cevabı doğruyu sızdırmaz", '"correct"' not in json.dumps(bs))
for qi in range(5):
    # bot bazen (%5) cevap vermez: soru açılana kadar ilerlet
    for _ in range(4):
        cur = rpc(a3, "arena_state", p_match=bid)
        if cur["status"] == "question" and cur["current_q"] == qi:
            break
        expire_arena(bid)
    sql("update arena_answers set elapsed_ms = 0 where match_id=%s and slot=2", bid)
    rpc(a3, "arena_answer", p_match=bid, p_q=qi, p_choice=0)
    st = rpc(a3, "arena_state", p_match=bid)
    if qi == 0:
        nb = sql("select count(*) from arena_answers where match_id=%s and slot=2 and q_index=0", bid)[0][0]
        check("bot ve oyuncu cevaplayınca açıklanır", st["status"] == "reveal" or nb == 0, st["status"])
expire_arena(bid)
be = rpc(a3, "arena_state", p_match=bid)
check("bot maçı biter", be["status"] == "ended")
check("bota karşı K=16 (eşit reytingde en fazla ±8)", abs(be["result"]["delta"]) <= 8, be["result"])
check("bot maçı haftalık puana sayılır", rpc(a3, "my_arena")["weekly_points"] == be["me"]["score"])
pro = new_user("arena_pro")
sql("insert into arena_ratings (user_id, rating, matches) values (%s, 1500, 10)", pro)
rpc(pro, "arena_find", p_lang="en")
sql("update arena_queue set joined_at = now() - interval '9 seconds' where user_id=%s", pro)
hb = rpc(pro, "arena_find", p_lang="en")
hbot = sql("select bot from arena_matches where id=%s", hb["match_id"])[0][0]
check("güçlü oyuncuya güçlü bot (isabet ve hız)", float(hbot["acc"]) == 0.85 and hbot["speed_ms"] == 4500, hbot)

print("\n▶ Arena: terk edilen maç, bayat kuyruk, eşzamanlılık, misafir")
sql("update arena_matches set phase_started_at = now() - interval '3 minutes' where id=%s", hb["match_id"])
back = rpc(pro, "arena_find", p_lang="en")
check("terk edilmiş maç kapanır, oyuncu yeniden kuyruğa girer", back["status"] == "waiting"
      and sql("select status from arena_matches where id=%s", hb["match_id"])[0][0] == "ended", back)
rpc(pro, "arena_cancel")
ghost = new_user("arena_ghost")
rpc(ghost, "arena_find", p_lang="en")
sql("update arena_queue set seen_at = now() - interval '20 seconds' where user_id=%s", ghost)
lone = new_user("arena_lone")
check("sekmeyi kapatmış (bayat) oyuncuyla eşleşilmez", rpc(lone, "arena_find", p_lang="en")["status"] == "waiting")
rpc(lone, "arena_cancel")
crowd_a = [new_user(f"arena_c{i}") for i in range(10)]
errs = []


def finder(u):
    for _ in range(3):
        try:
            rpc(u, "arena_find", p_lang="en")
        except Exception as e:
            errs.append(str(e))


ths = [threading.Thread(target=finder, args=(u,)) for u in crowd_a]
for t in ths: t.start()
for t in ths: t.join()
dup = sql("""select u, count(*) from (select p1 u from arena_matches where status <> 'ended' union all
             select p2 from arena_matches where status <> 'ended' and p2 is not null) x group by u having count(*) > 1""")
paired = sql("select count(*) from arena_matches where status <> 'ended' and p2 = any(%s::uuid[])", crowd_a)[0][0]
check("eşzamanlı aramada hata yok", not errs, errs[:2])
check("hiçbir oyuncu iki maça düşmez", dup == [] and paired == 5, (dup, paired))
ag = str(uuid.uuid4())
sql("insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values (%s, null, '{}', true)", ag)
check("adsız misafir arena oynayamaz", err(ag, "arena_find", p_lang="en") == "guest_name_required")
rpc(ag, "guest_start", p_name="Arena Guest")
rpc(ag, "arena_find", p_lang="en")
sql("update arena_queue set joined_at = now() - interval '9 seconds' where user_id=%s", ag)
gm = rpc(ag, "arena_find", p_lang="en")
check("misafir arena oynayabilir", gm["status"] == "matched")
sql("update arena_matches set phase_started_at = now() - interval '3 minutes' where id=%s", gm["match_id"])
rpc(ag, "arena_state", p_match=gm["match_id"])
check("misafir arena tablolarında görünmez", all(r["display_name"] != "Arena Guest" for p in ("week", "all")
      for r in rpc(None, "arena_leaderboard", p_period=p, p_limit=100)["rows"]))
check("anonim arena oynayamaz", err(None, "arena_find", p_lang="en") is not None)
check("anonim çevrimiçi sayısını görebilir", isinstance(rpc(None, "arena_online"), int))
sql("update quizzes set status='published' where id = any(%s::uuid[])", hidden)

print(f"\n{len(PASS)} geçti, {len(FAIL)} başarısız")
if FAIL:
    print("BAŞARISIZ:", FAIL)
