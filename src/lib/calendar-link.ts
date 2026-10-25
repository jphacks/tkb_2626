// 「カレンダーに追加」: 書き込み権限を使わず、Google の予定作成画面で渡す
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl({ title, start, end, details }: { title: string; start: Date; end: Date; details?: string }) {
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}` });
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params}`;
}
