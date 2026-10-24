"""ドメインロジック：カレンダー読み取り・AI回答案・状況テキストなど。

カレンダーは今のところ MockCalendar（受け手ごとに決まった疑似予定を返す）。
本物の Google / Outlook / iCloud をつなぐときは `CalendarProvider.busy()` を実装した
クラスを作って `get_provider()` で返すだけで、画面側は変更不要。
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

WEEKDAYS = "月火水木金土日"
MARK_LABEL = {"o": "○", "t": "△", "x": "×"}
PRIORITY = {
    "low": {"label": "ゆるめ", "cls": "chip-soft"},
    "normal": {"label": "ふつう", "cls": "chip-white"},
    "high": {"label": "急ぎ！", "cls": "chip-coral"},
}
PROVIDERS = {"google": "Googleカレンダー", "outlook": "Outlook", "icloud": "iCloudカレンダー"}


# ---------------------------------------------------------------- 表示ヘルパ
def parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s)


def fmt_date(d: str | date) -> str:
    d = date.fromisoformat(d) if isinstance(d, str) else d
    return f"{d.month}/{d.day}（{WEEKDAYS[d.weekday()]}）"


def fmt_dt(s: str) -> str:
    dt = parse_dt(s)
    return f"{dt.month}/{dt.day}（{WEEKDAYS[dt.weekday()]}）{dt:%H:%M}"


def fmt_slot(slot: dict) -> str:
    return f"{fmt_date(slot['date'])} {slot['start']}–{slot['end']}"


def remaining_text(deadline: str, now: datetime | None = None) -> str:
    now = now or datetime.now()
    delta = parse_dt(deadline) - now
    if delta.total_seconds() <= 0:
        return "締切すぎてる！"
    days, hours = delta.days, delta.seconds // 3600
    if days:
        return f"あと{days}日{hours}時間"
    if hours:
        return f"あと{hours}時間"
    return f"あと{max(1, delta.seconds // 60)}分"


def default_slots(today: date | None = None) -> list[dict]:
    """S1 の初期値：次の土日＋その次の土曜の夜。"""
    today = today or date.today()
    sat = today + timedelta(days=(5 - today.weekday()) % 7 or 7)
    days = [sat, sat + timedelta(days=1), sat + timedelta(days=7)]
    return [{"date": d.isoformat(), "start": "18:00", "end": "21:00"} for d in days]


# ---------------------------------------------------------------- カレンダー
@dataclass
class Busy:
    start: datetime
    end: datetime
    title: str


class CalendarProvider:
    def busy(self, day: date) -> list[Busy]:
        raise NotImplementedError


class MockCalendar(CalendarProvider):
    """uid をシードにした疑似予定。同じ人・同じ日なら毎回同じ予定が出る。"""
    TITLES = ["授業", "バイト", "ゼミ", "サークル", "打ち合わせ", "歯医者"]

    def __init__(self, uid: str):
        self.uid = uid

    def busy(self, day: date) -> list[Busy]:
        rng = random.Random(f"{self.uid}:{day.isoformat()}")
        out = []
        for _ in range(rng.choice([0, 1, 1, 2, 3])):
            start = datetime.combine(day, time(rng.randint(9, 20), rng.choice([0, 30])))
            out.append(Busy(start, start + timedelta(minutes=rng.choice([60, 90, 120, 180])),
                            rng.choice(self.TITLES)))
        return sorted(out, key=lambda b: b.start)


def get_provider(user: dict | None) -> CalendarProvider | None:
    if not user or user.get("calendar") in (None, "skip"):
        return None
    # TODO: user["calendar"] == "google" なら GoogleCalendar(user の OAuth トークン) を返す
    return MockCalendar(user["id"])


def current_status(user: dict | None, now: datetime | None = None) -> str:
    """S3 に出す「いまどんな感じか」。予定の中身ではなく空き具合だけを伝える。"""
    cal = get_provider(user)
    if cal is None:
        return "カレンダー未連携"
    now = now or datetime.now()
    today = [b for b in cal.busy(now.date()) if b.end > now]
    for b in today:
        if b.start <= now:
            return f"いま{b.title}中（〜{b.end:%H:%M}）"
    if len(today) >= 2:
        return "今日は予定ぎっしり"
    if today:
        return f"{today[0].start:%H:%M}から予定あり"
    return "今日はわりとヒマそう"


# ---------------------------------------------------------------- AI 回答案
def suggest_marks(user: dict | None, slots: list[dict]) -> dict[str, dict]:
    """候補ごとに ○△× と理由を返す。カレンダー未連携なら空 dict。

    ルール：予定と重なる→×、前後 60 分以内に予定→△、それ以外→○。
    LLM を使う場合もこの戻り値の形に合わせれば R2 はそのまま動く。
    """
    cal = get_provider(user)
    if cal is None:
        return {}
    result = {}
    margin = timedelta(minutes=60)
    for s in slots:
        day = date.fromisoformat(s["date"])
        start = datetime.combine(day, time.fromisoformat(s["start"]))
        end = datetime.combine(day, time.fromisoformat(s["end"]))
        busy = cal.busy(day)
        hit = next((b for b in busy if b.start < end and b.end > start), None)
        near = next((b for b in busy if b.start < end + margin and b.end > start - margin), None)
        if hit:
            result[s["id"]] = {"mark": "x", "reason": f"{hit.title}と重なってる"}
        elif near:
            result[s["id"]] = {"mark": "t", "reason": f"前後に{near.title}あり"}
        else:
            result[s["id"]] = {"mark": "o", "reason": "予定なし"}
    return result


def summarize(event: dict) -> str:
    """R2 上部の要約。TODO: ANTHROPIC_API_KEY があれば LLM 要約に置き換える。"""
    slots = event["slots"]
    first, last = date.fromisoformat(slots[0]["date"]), date.fromisoformat(slots[-1]["date"])
    span = fmt_date(first) if first == last else f"{first.month}/{first.day}〜{last.month}/{last.day}"
    parts = [f"候補は{span}の{len(slots)}つ。"]
    if event.get("memo"):
        parts.append(event["memo"].strip().rstrip("。") + "。")
    parts.append(f"{fmt_dt(event['deadline'])}までに返してほしいって。")
    return "".join(parts)


# ---------------------------------------------------------------- 集計
def leading_slot(event: dict) -> tuple[dict, int] | None:
    """いまのところ有力な候補と ○ の数。回答ゼロなら None。"""
    answered = [r for r in event["receivers"] if r["answered_at"]]
    if not answered:
        return None
    score = {"o": 2, "t": 1, "x": 0}

    def key(s):
        marks = [r["answers"].get(s["id"], "x") for r in answered]
        return (sum(score[m] for m in marks), marks.count("o"))

    best = max(event["slots"], key=key)
    return best, key(best)[1]


# ---------------------------------------------------------------- 返信宣言
PROMISE_OPTIONS = [("now", "いま返す"), ("tonight", "今夜21時"), ("morning", "明日の朝"), ("weekend", "週末")]


def promise_due(kind: str, now: datetime | None = None) -> tuple[str, str]:
    now = now or datetime.now()
    today = now.date()
    if kind == "now":
        due = now + timedelta(minutes=15)
    elif kind == "tonight":
        due = datetime.combine(today, time(21))
        if due <= now:
            due += timedelta(days=1)
    elif kind == "morning":
        due = datetime.combine(today + timedelta(days=1), time(9))
    elif kind == "weekend":
        sat = today + timedelta(days=(5 - today.weekday()) % 7 or 7)
        due = datetime.combine(sat, time(10))
    else:
        raise ValueError(kind)
    return dict(PROMISE_OPTIONS)[kind], due.isoformat(timespec="minutes")


def promise_text(promise: dict | None, now: datetime | None = None) -> str | None:
    if not promise:
        return None
    now = now or datetime.now()
    if parse_dt(promise["due"]) < now:
        return f"「{promise['label']}に返す」の時間すぎてる…！"
    if promise["label"] == "いま返す":
        return "「いま返す」宣言中"
    return f"「{promise['label']}までに返す」宣言中"
