import type { CalendarEvent } from "@/lib/calendar";
import { addDays, fromJst, toJstParts } from "@/lib/time";

export type SlotSuggestion = { startAt: string; endAt: string };

const SLOT_HOURS = 2;
const DAYS = 14;
const MAX = 5;

// 明日から14日間で、予定と重ならない2時間の枠を最大5件（CLAUDE.md「候補日の提案」）
export function suggestSlots(events: CalendarEvent[], now = new Date()): SlotSuggestion[] {
  const result: SlotSuggestion[] = [];
  for (let i = 1; i <= DAYS && result.length < MAX; i++) {
    const { year, month, day, weekday } = toJstParts(addDays(now, i));
    const isWeekend = weekday === 0 || weekday === 6;
    const startHours = isWeekend ? [13, 18] : [19];
    for (const h of startHours) {
      const start = fromJst(year, month, day, h);
      const end = new Date(start.getTime() + SLOT_HOURS * 60 * 60 * 1000);
      const busy = events.some((e) => e.start < end && e.end > start);
      if (!busy) {
        result.push({ startAt: start.toISOString(), endAt: end.toISOString() });
        break; // 1日1枠まで
      }
    }
  }
  return result;
}

export { SLOT_HOURS };
