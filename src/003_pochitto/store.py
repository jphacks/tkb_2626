"""データ層。ハッカソン用に JSON ファイル 1 つへ保存するシンプルな実装。

スキーマ（すべて dict）:
  users[uid]      = {id, name, calendar: None|"skip"|"google"|"outlook"|"icloud", created_at}
  events[eid]     = {id, admin_token, title, sender_uid, sender_name, priority, deadline, memo,
                     slots: [{id, date, start, end}], receivers: [Receiver], created_at}
  Receiver        = {id, name, uid|None, answers: {slot_id: "o"|"t"|"x"}, note,
                     answered_at|None, promise: {label, due}|None}
  presents[pid]   = {id, event_id, receiver_id, from_name, message, count, opened, created_at}

本番では SQLite / Firestore などに差し替える想定。関数の外形だけ守れば中身は自由。
"""
from __future__ import annotations

import json
import secrets
import threading
from datetime import datetime
from pathlib import Path


def new_id(n: int = 6) -> str:
    return secrets.token_urlsafe(n)[:n]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="minutes")


class Store:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.lock = threading.RLock()
        self.data = {"users": {}, "events": {}, "presents": {}}
        if self.path.exists():
            self.data.update(json.loads(self.path.read_text(encoding="utf-8")))

    def save(self) -> None:
        with self.lock:
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1), encoding="utf-8")
            tmp.replace(self.path)

    # ---------- users ----------
    def create_user(self, name: str) -> dict:
        with self.lock:
            user = {"id": new_id(10), "name": name, "calendar": None, "created_at": now_iso()}
            self.data["users"][user["id"]] = user
            self.save()
            return user

    def get_user(self, uid: str | None) -> dict | None:
        return self.data["users"].get(uid) if uid else None

    def set_calendar(self, uid: str, provider: str) -> None:
        with self.lock:
            self.data["users"][uid]["calendar"] = provider
            self.save()

    # ---------- events ----------
    def create_event(self, *, title, sender, priority, deadline, memo, slots, members) -> dict:
        with self.lock:
            event = {
                "id": new_id(6),
                "admin_token": new_id(16),
                "title": title,
                "sender_uid": sender["id"],
                "sender_name": sender["name"],
                "priority": priority,
                "deadline": deadline,
                "memo": memo,
                "slots": [{"id": new_id(4), **s} for s in slots],
                "receivers": [self._new_receiver(name) for name in members],
                "created_at": now_iso(),
            }
            self.data["events"][event["id"]] = event
            self.save()
            return event

    @staticmethod
    def _new_receiver(name: str, uid: str | None = None) -> dict:
        return {"id": new_id(6), "name": name, "uid": uid, "answers": {}, "note": "",
                "answered_at": None, "promise": None}

    def get_event(self, eid: str) -> dict | None:
        return self.data["events"].get(eid)

    def get_event_by_admin(self, token: str) -> dict | None:
        return next((e for e in self.data["events"].values() if e["admin_token"] == token), None)

    def events_created_by(self, uid: str) -> list[dict]:
        return [e for e in self.data["events"].values() if e["sender_uid"] == uid]

    def events_received_by(self, uid: str) -> list[tuple[dict, dict]]:
        out = []
        for e in self.data["events"].values():
            for r in e["receivers"]:
                if r["uid"] == uid:
                    out.append((e, r))
        return out

    @staticmethod
    def find_receiver(event: dict, rid: str) -> dict | None:
        return next((r for r in event["receivers"] if r["id"] == rid), None)

    def join(self, event: dict, user: dict, rid: str | None) -> dict:
        """受け手が「自分はこの人」と名乗る。既存メンバー枠があれば紐づけ、なければ追加。"""
        with self.lock:
            for r in event["receivers"]:
                if r["uid"] == user["id"]:
                    return r
            r = self.find_receiver(event, rid) if rid else None
            if r is None or (r["uid"] and r["uid"] != user["id"]):
                r = self._new_receiver(user["name"], user["id"])
                event["receivers"].append(r)
            r["uid"] = user["id"]
            self.save()
            return r

    def save_answer(self, receiver: dict, answers: dict, note: str) -> None:
        with self.lock:
            receiver["answers"] = answers
            receiver["note"] = note
            receiver["answered_at"] = now_iso()
            receiver["promise"] = None  # 回答したら宣言は役目を終える
            self.save()

    def set_promise(self, receiver: dict, label: str, due: str) -> None:
        with self.lock:
            receiver["promise"] = {"label": label, "due": due}
            self.save()

    # ---------- presents ----------
    def create_present(self, event, receiver, from_name, message, count) -> dict:
        with self.lock:
            p = {"id": new_id(8), "event_id": event["id"], "receiver_id": receiver["id"],
                 "from_name": from_name, "message": message, "count": count,
                 "opened": False, "created_at": now_iso()}
            self.data["presents"][p["id"]] = p
            self.save()
            return p

    def get_present(self, pid: str) -> dict | None:
        return self.data["presents"].get(pid)

    def open_present(self, pid: str) -> None:
        with self.lock:
            if pid in self.data["presents"]:
                self.data["presents"][pid]["opened"] = True
                self.save()
