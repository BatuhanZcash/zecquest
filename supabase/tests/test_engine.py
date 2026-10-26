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

print(f"\n{len(PASS)} geçti, {len(FAIL)} başarısız")
if FAIL:
    print("BAŞARISIZ:", FAIL)
