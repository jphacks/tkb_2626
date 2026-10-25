import { prisma } from "@/lib/db";
import { getCalendarEvents } from "@/lib/calendar";
import { requireUser } from "@/lib/session";
import { suggestSlots } from "@/lib/suggest";
import { addDays, toJstParts } from "@/lib/time";
import { CreateEventWizard } from "./CreateEventWizard";

export default async function NewEventPage() {
  const user = await requireUser("/events/new");
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { calendarProvider: true } });

  // 送り手の予定から候補日を提案する。未連携なら予定なしとして提案
  const now = new Date();
  const until = addDays(now, 62);
  const events = me?.calendarProvider ? await getCalendarEvents(user.id, now, until) : [];
  const suggestions = suggestSlots(events, now);

  // 候補日追加シートの「予定あり」の点
  const busyDays = [...new Set(events.map((e) => {
    const p = toJstParts(e.start);
    return `${p.year}-${p.month}-${p.day}`;
  }))];

  return <CreateEventWizard suggestions={suggestions} busyDays={busyDays} now={now.toISOString()} />;
}
