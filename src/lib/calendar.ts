import { MICROSOFT_ISSUER } from "@/auth";
import { prisma } from "@/lib/db";
import { addDays, fromJst, toJstParts } from "@/lib/time";

export type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  allDay?: boolean;
};

// ユーザーの予定を取得する（連携しているのが Google か Outlook かで分ける）
export async function getCalendarEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  if (process.env.DEV_FAKE_CALENDAR === "1") return fakeEvents(userId, from, to);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { calendarProvider: true } });

  try {
    if (user?.calendarProvider === "GOOGLE") {
      const token = await googleAccessToken(userId);
      return token ? await fetchGoogleEvents(token, from, to) : [];
    }
    if (user?.calendarProvider === "MICROSOFT") {
      const token = await microsoftAccessToken(userId);
      return token ? await fetchMicrosoftEvents(token, from, to) : [];
    }
    return [];
  } catch (e) {
    console.error("calendar fetch failed", e);
    return [];
  }
}

// 読む前に expires_at を見て、切れていればリフレッシュトークンで更新して保存する
async function googleAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({ where: { userId, provider: "google" } });
  if (!account?.access_token) return null;

  const expiresSoon = !account.expires_at || account.expires_at * 1000 < Date.now() + 60_000;
  if (!expiresSoon) return account.access_token;
  if (!account.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`google token refresh failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };

  await prisma.account.update({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
    data: {
      access_token: json.access_token,
      expires_at: Math.floor(Date.now() / 1000) + json.expires_in,
      ...(json.refresh_token ? { refresh_token: json.refresh_token } : {}),
    },
  });
  return json.access_token;
}

type GoogleEvent = {
  summary?: string;
  location?: string;
  transparency?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

async function fetchGoogleEvents(token: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`google events failed: ${res.status}`);
  const json = (await res.json()) as { items?: GoogleEvent[] };

  return (json.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent")
    .flatMap((e) => {
      if (e.start?.dateTime && e.end?.dateTime) {
        return [{ title: e.summary ?? "予定", start: new Date(e.start.dateTime), end: new Date(e.end.dateTime), location: e.location }];
      }
      if (e.start?.date && e.end?.date) {
        // 終日の予定（日付のみ）は JST の0時区切りで持つ
        const [sy, sm, sd] = e.start.date.split("-").map(Number);
        const [ey, em, ed] = e.end.date.split("-").map(Number);
        return [{ title: e.summary ?? "予定", start: fromJst(sy, sm, sd), end: fromJst(ey, em, ed), location: e.location, allDay: true }];
      }
      return [];
    });
}

// Google と同じく、切れていればリフレッシュトークンで更新して保存する
async function microsoftAccessToken(userId: string): Promise<string | null> {
  const provider = "microsoft-entra-id";
  const account = await prisma.account.findFirst({ where: { userId, provider } });
  if (!account?.access_token) return null;

  const expiresSoon = !account.expires_at || account.expires_at * 1000 < Date.now() + 60_000;
  if (!expiresSoon) return account.access_token;
  if (!account.refresh_token) return null;

  const res = await fetch(`${MICROSOFT_ISSUER.replace(/\/v2\.0$/, "")}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
      client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
      scope: "offline_access User.Read Calendars.Read",
    }),
  });
  if (!res.ok) throw new Error(`microsoft token refresh failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };

  await prisma.account.update({
    where: { provider_providerAccountId: { provider, providerAccountId: account.providerAccountId } },
    data: {
      access_token: json.access_token,
      expires_at: Math.floor(Date.now() / 1000) + json.expires_in,
      ...(json.refresh_token ? { refresh_token: json.refresh_token } : {}),
    },
  });
  return json.access_token;
}

type GraphEvent = {
  subject?: string;
  isAllDay?: boolean;
  isCancelled?: boolean;
  showAs?: string;
  start?: { dateTime: string };
  end?: { dateTime: string };
  location?: { displayName?: string };
};

// 時刻は JST で返してもらい、+09:00 を付けて読む（終日の予定も JST の0時区切りになる）
async function fetchMicrosoftEvents(token: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: from.toISOString(),
    endDateTime: to.toISOString(),
    $select: "subject,isAllDay,isCancelled,showAs,start,end,location",
    $orderby: "start/dateTime",
    $top: "250",
  });
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="Tokyo Standard Time"' },
  });
  if (!res.ok) throw new Error(`microsoft events failed: ${res.status}`);
  const json = (await res.json()) as { value?: GraphEvent[] };
  const jst = (dateTime: string) => new Date(`${dateTime.slice(0, 19)}+09:00`);

  return (json.value ?? [])
    .filter((e) => !e.isCancelled && e.showAs !== "free" && e.start && e.end)
    .map((e) => ({
      title: e.subject || "予定",
      start: jst(e.start!.dateTime),
      end: jst(e.end!.dateTime),
      location: e.location?.displayName || undefined,
      allDay: e.isAllDay || undefined,
    }));
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
