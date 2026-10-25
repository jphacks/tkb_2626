import { addDays, fromJst, toJstParts } from "@/lib/time";

export type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  location?: string;
};

// ユーザーの予定を取得する。Google / Microsoft からの取得は実装の順番5で足す
export async function getCalendarEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  if (process.env.DEV_FAKE_CALENDAR === "1") return fakeEvents(userId, from, to);
  return [];
}

// 開発用の仮の予定。ユーザーごとに少しずらして、毎回同じ結果になるようにする
function fakeEvents(userId: string, from: Date, to: Date): CalendarEvent[] {
  const seed = [...userId].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3;
  const events: CalendarEvent[] = [];
  for (let d = addDays(from, -1); d < addDays(to, 1); d = addDays(d, 1)) {
    const { year, month, day, weekday } = toJstParts(d);
    const at = (h: number, m = 0) => fromJst(year, month, day, h, m);
    const isWeekend = weekday === 0 || weekday === 6;
    if (!isWeekend) {
      events.push({ title: "授業", start: at(9), end: at(16, 30), location: "大学" });
      if ((day + seed) % 3 === 0) events.push({ title: "バイト", start: at(18), end: at(22), location: "駅前のカフェ" });
    } else if ((day + seed) % 2 === 0) {
      events.push({ title: "バイト", start: at(10), end: at(12, 30), location: "駅前のカフェ" });
      events.push({ title: "バイト", start: at(16), end: at(20), location: "駅前のカフェ" });
    } else if ((day + seed) % 5 === 1) {
      events.push({ title: "家族ごはん", start: at(18), end: at(21), location: "実家" });
    }
  }
  return events.filter((e) => e.end > from && e.start < to);
}
