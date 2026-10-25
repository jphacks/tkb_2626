// 「カレンダーに追加」: 書き込み権限を使わず、Google の予定作成画面と .ics で渡す
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl({ title, start, end, details }: { title: string; start: Date; end: Date; details?: string }) {
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${stamp(start)}/${stamp(end)}` });
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params}`;
}

const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function icsFile({ uid, title, start, end, details }: { uid: string; title: string; start: Date; end: Date; details?: string }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//pochiplease//JP",
    "BEGIN:VEVENT",
    `UID:${uid}@pochiplease`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    ...(details ? [`DESCRIPTION:${escapeIcs(details)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
