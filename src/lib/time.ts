// 時刻は DB に UTC、表示は Asia/Tokyo 固定（CLAUDE.md）
const TZ = "Asia/Tokyo";
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export type JstParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

export function toJstParts(date: Date): JstParts {
  const d = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(),
  };
}

// JST の年月日時分から Date を作る（月は 1 始まり）
export function fromJst(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatTime(date: Date): string {
  const p = toJstParts(date);
  return `${p.hour}:${pad(p.minute)}`;
}

// 例: 11/1（土）
export function formatDay(date: Date): string {
  const p = toJstParts(date);
  return `${p.month}/${p.day}（${WEEKDAYS[p.weekday]}）`;
}

// 例: 11/1（土）18:00–20:00
export function formatRange(start: Date, end: Date): string {
  return `${formatDay(start)}${formatTime(start)}–${formatTime(end)}`;
}

// 例: 10/28（水）18:00
export function formatDateTime(date: Date): string {
  return `${formatDay(date)}${formatTime(date)}`;
}

export { TZ, WEEKDAYS };
