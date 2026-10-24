"""ポチッと日程 (pochitto) — JPHACKS 2026

起動:  pip install -r requirements.txt && python app.py --demo
       → http://localhost:5000/demo を開くとデモデータで全画面を触れる

画面とルートの対応
  共通  C1 ホーム              GET  /
        C2 カレンダー連携       GET  /connect            （ユーザーごとに初回だけ）
        はじめに（名前入力）    GET  /welcome
  送り手 S1 イベント作成        GET  /new
        S2 リンク発行完了       GET  /created/<admin_token>
        S3 回答状況一覧         GET  /admin/<admin_token>
        S4 催促（連打）         GET  /admin/<admin_token>/nudge/<rid|all>
  受け手 R0 名乗る              GET  /e/<event_id>        （調整リンクの入口）
        R2 回答                 GET  /e/<event_id>/answer
        R3 回答完了             GET  /e/<event_id>/done
        R4 プレゼント開封       GET  /p/<present_id>

本人識別はログインなしの Cookie（uid）。送り手の管理画面は推測できない admin_token の URL。
"""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for

import services as sv
from store import Store

BASE = Path(__file__).parent
app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-change-me")
store = Store(os.environ.get("POCHITTO_DB", BASE / "data.json"))

COOKIE = "pochitto_uid"
COOKIE_AGE = 60 * 60 * 24 * 365

app.jinja_env.globals.update(
    fmt_date=sv.fmt_date, fmt_dt=sv.fmt_dt, fmt_slot=sv.fmt_slot, MARK=sv.MARK_LABEL,
    PRIORITY=sv.PRIORITY, PROVIDERS=sv.PROVIDERS, PROMISE_OPTIONS=sv.PROMISE_OPTIONS,
)


# ------------------------------------------------------------------ helpers
def current_user() -> dict | None:
    return store.get_user(request.cookies.get(COOKIE))


def with_cookie(resp, user: dict):
    resp.set_cookie(COOKIE, user["id"], max_age=COOKIE_AGE, samesite="Lax", httponly=True)
    return resp


def safe_next(default: str = "/") -> str:
    nxt = request.values.get("next", default)
    return nxt if nxt.startswith("/") and not nxt.startswith("//") else default


def require_user():
    """ユーザーがいなければ名前入力へ、カレンダー未決定なら C2 へ飛ばすリダイレクトを返す。"""
    user = current_user()
    if user is None:
        return None, redirect(url_for("welcome", next=request.full_path.rstrip("?")))
    if user["calendar"] is None:
        return user, redirect(url_for("connect", next=request.full_path.rstrip("?")))
    return user, None


def event_or_404(eid: str) -> dict:
    return store.get_event(eid) or abort(404)


def admin_or_404(token: str) -> dict:
    return store.get_event_by_admin(token) or abort(404)


def my_receiver(event: dict, user: dict | None) -> dict | None:
    if not user:
        return None
    return next((r for r in event["receivers"] if r["uid"] == user["id"]), None)


def receiver_view(event: dict, r: dict) -> dict:
    """S3/S4 で使う受け手 1 人分の表示用データ。"""
    user = store.get_user(r["uid"])
    return {**r, "initial": r["name"][:1], "status": sv.current_status(user),
            "promise_text": sv.promise_text(r["promise"])}


def event_summary(event: dict) -> dict:
    total = len(event["receivers"])
    done = sum(1 for r in event["receivers"] if r["answered_at"])
    return {"total": total, "done": done, "pending": total - done,
            "pct": round(done / total * 100) if total else 0,
            "remaining": sv.remaining_text(event["deadline"])}


# ------------------------------------------------------------------ 共通
@app.get("/welcome")
def welcome():
    return render_template("welcome.html", next=safe_next())


@app.post("/welcome")
def welcome_post():
    name = request.form.get("name", "").strip()[:20]
    if not name:
        return render_template("welcome.html", next=safe_next(), error="名前を入れてね"), 400
    user = store.create_user(name)
    return with_cookie(redirect(url_for("connect", next=safe_next())), user)


@app.route("/connect", methods=["GET", "POST"])
def connect():
    """C2 カレンダー連携。TODO: provider ごとに OAuth に飛ばし、callback で set_calendar する。"""
    user = current_user()
    if user is None:
        return redirect(url_for("welcome", next=safe_next()))
    if request.method == "POST":
        provider = request.form.get("provider", "skip")
        if provider not in (*sv.PROVIDERS, "skip"):
            abort(400)
        store.set_calendar(user["id"], provider)
        return redirect(safe_next())
    return render_template("connect.html", next=safe_next(), user=user)


@app.get("/")
def home():
    user, redir = require_user()
    if redir:
        return redir
    created = []
    for e in sorted(store.events_created_by(user["id"]), key=lambda e: e["deadline"]):
        created.append({"event": e, **event_summary(e)})
    received = []
    for e, r in sorted(store.events_received_by(user["id"]), key=lambda x: x[0]["deadline"]):
        received.append({"event": e, "receiver": r})
    waiting_people = sum(c["pending"] for c in created)
    my_todo = sum(1 for x in received if not x["receiver"]["answered_at"])
    return render_template("home.html", user=user, created=created, received=received,
                           waiting_people=waiting_people, my_todo=my_todo)


# ------------------------------------------------------------------ 送り手
@app.get("/new")
def new_event():
    user, redir = require_user()
    if redir:
        return redir
    return render_template("s1_create.html", user=user, slots=sv.default_slots(),
                           default_deadline=(datetime.now() + timedelta(days=2))
                           .replace(hour=18, minute=0).isoformat(timespec="minutes"))


@app.post("/new")
def create_event():
    user, redir = require_user()
    if redir:
        return redir
    f = request.form
    slots = []
    for d, s, e in zip(f.getlist("slot_date"), f.getlist("slot_start"), f.getlist("slot_end")):
        if d and s and e and s < e:
            slots.append({"date": d, "start": s, "end": e})
    slots.sort(key=lambda x: (x["date"], x["start"]))
    members = [m.strip()[:20] for m in f.get("members", "").replace("、", ",").split(",") if m.strip()]
    title = f.get("title", "").strip()[:40]
    errors = []
    if not title:
        errors.append("イベント名を入れてね")
    if not slots:
        errors.append("候補日時を1つ以上入れてね（終了は開始より後に）")
    if not f.get("deadline"):
        errors.append("回答の締切を入れてね")
    if errors:
        return render_template("s1_create.html", user=user, slots=slots or sv.default_slots(),
                               default_deadline=f.get("deadline", ""), form=f, errors=errors), 400
    event = store.create_event(
        title=title, sender=user, priority=f.get("priority", "normal"),
        deadline=f["deadline"], memo=f.get("memo", "").strip()[:200], slots=slots,
        members=list(dict.fromkeys(members)))
    return redirect(url_for("created", token=event["admin_token"]))


@app.get("/created/<token>")
def created(token):
    event = admin_or_404(token)
    share_url = url_for("join", eid=event["id"], _external=True)
    return render_template("s2_created.html", event=event, share_url=share_url,
                           admin_url=url_for("status", token=token, _external=True))


@app.get("/admin/<token>")
def status(token):
    event = admin_or_404(token)
    rs = [receiver_view(event, r) for r in event["receivers"]]
    return render_template(
        "s3_status.html", event=event, s=event_summary(event), leading=sv.leading_slot(event),
        pending=[r for r in rs if not r["answered_at"]], answered=[r for r in rs if r["answered_at"]],
        share_url=url_for("join", eid=event["id"], _external=True))


@app.get("/admin/<token>/nudge/<target>")
def nudge(token, target):
    event = admin_or_404(token)
    if target == "all":
        targets = [r for r in event["receivers"] if not r["answered_at"]]
    else:
        r = store.find_receiver(event, target) or abort(404)
        targets = [r]
    if not targets:
        return redirect(url_for("status", token=token))
    return render_template("s4_nudge.html", event=event, target=target,
                           targets=[receiver_view(event, r) for r in targets])


@app.post("/admin/<token>/presents")
def create_presents(token):
    event = admin_or_404(token)
    body = request.get_json(force=True)
    message = (body.get("message") or "はよ〜〜！").strip()[:20]
    count = max(1, min(int(body.get("count", 1)), 9999))
    rids = body.get("receiver_ids") or []
    out = []
    for rid in rids:
        r = store.find_receiver(event, rid)
        if r and not r["answered_at"]:
            p = store.create_present(event, r, event["sender_name"], message, count)
            out.append({"name": r["name"], "url": url_for("present", pid=p["id"], _external=True)})
    return jsonify({"presents": out, "message": message, "count": count})


# ------------------------------------------------------------------ 受け手
@app.get("/e/<eid>")
def join(eid):
    """調整リンクの入口。名乗り済みなら回答画面へ直行。"""
    event = event_or_404(eid)
    user = current_user()
    if user and user["id"] == event["sender_uid"]:
        return redirect(url_for("status", token=event["admin_token"]))
    if my_receiver(event, user):
        return redirect(url_for("answer", eid=eid))
    open_slots = [r for r in event["receivers"] if not r["uid"]]
    return render_template("r0_join.html", event=event, user=user, open_slots=open_slots,
                           preselect=request.args.get("rid"))


@app.post("/e/<eid>/join")
def join_post(eid):
    event = event_or_404(eid)
    user = current_user()
    rid = request.form.get("rid") or None
    resp = redirect(url_for("answer", eid=eid))
    if user is None:
        r = store.find_receiver(event, rid) if rid else None
        name = (r["name"] if r else request.form.get("name", "")).strip()[:20]
        if not name:
            return redirect(url_for("join", eid=eid))
        user = store.create_user(name)
        with_cookie(resp, user)
    store.join(event, user, rid)
    return resp


@app.route("/e/<eid>/answer", methods=["GET", "POST"])
def answer(eid):
    event = event_or_404(eid)
    user, redir = require_user()
    if redir:
        return redir if user else redirect(url_for("join", eid=eid))
    r = my_receiver(event, user)
    if r is None:
        return redirect(url_for("join", eid=eid))
    if request.method == "POST":
        answers = {s["id"]: request.form.get(f"mark_{s['id']}") for s in event["slots"]}
        if any(v not in ("o", "t", "x") for v in answers.values()):
            abort(400)
        store.save_answer(r, answers, request.form.get("note", "").strip()[:200])
        return redirect(url_for("done", eid=eid))
    ai = {} if r["answered_at"] else sv.suggest_marks(user, event["slots"])
    return render_template("r2_answer.html", event=event, r=r, user=user, ai=ai,
                           summary=sv.summarize(event))


@app.post("/e/<eid>/promise")
def promise(eid):
    event = event_or_404(eid)
    r = my_receiver(event, current_user()) or abort(403)
    kind = (request.get_json(force=True) or {}).get("kind")
    try:
        label, due = sv.promise_due(kind)
    except ValueError:
        abort(400)
    store.set_promise(r, label, due)
    return jsonify({"label": label, "due": due, "text": sv.promise_text(r["promise"])})


@app.get("/e/<eid>/done")
def done(eid):
    event = event_or_404(eid)
    r = my_receiver(event, current_user())
    if not r or not r["answered_at"]:
        return redirect(url_for("join", eid=eid))
    closed = datetime.fromisoformat(event["deadline"]) < datetime.now()
    return render_template("r3_done.html", event=event, r=r, closed=closed)


@app.get("/p/<pid>")
def present(pid):
    p = store.get_present(pid) or abort(404)
    event = event_or_404(p["event_id"])
    user = current_user()
    nxt = url_for("answer", eid=event["id"]) if my_receiver(event, user) \
        else url_for("join", eid=event["id"], rid=p["receiver_id"])
    return render_template("r4_present.html", p=p, event=event, next_url=nxt)


@app.post("/p/<pid>/open")
def present_open(pid):
    store.open_present(pid)
    return ("", 204)


# ------------------------------------------------------------------ デモ
def seed_demo() -> dict:
    """モック画像と同じ「ゼミの打ち上げ」を作る。既にあれば作らない。"""
    demo = store.data.setdefault("demo", {})
    if demo:
        return demo
    ayaha = store.create_user("あやは")
    store.set_calendar(ayaha["id"], "google")
    slots = sv.default_slots()
    names = ["たなか", "すずき", "やまだ", "さとう", "こばやし"]
    ev = store.create_event(
        title="ゼミの打ち上げ", sender=ayaha, priority="high",
        deadline=(datetime.now() + timedelta(days=1, hours=3)).isoformat(timespec="minutes"),
        memo="場所は駅前。2〜3時間くらい", slots=slots, members=names)
    users = {}
    for r in ev["receivers"]:
        u = store.create_user(r["name"])
        store.set_calendar(u["id"], "google")
        store.join(ev, u, r["id"])
        users[r["name"]] = u
    rs = {r["name"]: r for r in ev["receivers"]}
    store.set_promise(rs["たなか"], *sv.promise_due("tonight"))
    store.set_promise(rs["すずき"], *sv.promise_due("morning"))
    sid = [s["id"] for s in ev["slots"]]
    store.save_answer(rs["さとう"], dict(zip(sid, ["t", "o", "x"])), "")
    store.save_answer(rs["こばやし"], dict(zip(sid, ["x", "o", "o"])), "2日目は15分遅れるかも！")
    # あやは宛ての調整（ホームの「届いた調整」用）
    store.create_event(
        title="サークル合宿の下見", sender=users["すずき"], priority="normal",
        deadline=(datetime.now() + timedelta(days=4)).isoformat(timespec="minutes"),
        memo="", slots=sv.default_slots(datetime.now().date() + timedelta(days=7)), members=[])
    ev2 = store.events_created_by(users["すずき"]["id"])[0]
    store.join(ev2, ayaha, None)
    demo.update({"sender": ayaha["id"], "receiver": users["たなか"]["id"], "event": ev["id"]})
    store.save()
    return demo


@app.get("/demo")
@app.get("/demo/<who>")
def demo_login(who="sender"):
    if not app.config.get("DEMO"):
        abort(404)
    demo = seed_demo()
    user = store.get_user(demo.get(who)) or abort(404)
    target = "/" if who == "sender" else url_for("join", eid=demo["event"])
    return with_cookie(redirect(target), user)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true", help="/demo でデモデータにログインできるようにする")
    ap.add_argument("--port", type=int, default=5000)
    args = ap.parse_args()
    app.config["DEMO"] = args.demo
    if args.demo:
        print(f" * 送り手(あやは)として開く: http://localhost:{args.port}/demo")
        print(f" * 受け手(たなか)として開く: http://localhost:{args.port}/demo/receiver")
    app.run(host="0.0.0.0", port=args.port, debug=True)
