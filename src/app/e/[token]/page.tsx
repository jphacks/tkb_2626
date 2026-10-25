import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCalendarEvents } from "@/lib/calendar";
import { loadInvite } from "@/lib/invite";
import { addDays, formatDateTime, fromJst, toJstParts, WEEKDAYS } from "@/lib/time";
import { joinEvent } from "./actions";
import { DecidedView } from "./DecidedView";

const key = (p: { year: number; month: number; day: number }) => `${p.year}-${p.month}-${p.day}`;

export default async function InvitePage(props: PageProps<"/e/[token]">) {
  const { token } = await props.params;
  const { user, event, participation, canAnswer, ownerName } = await loadInvite(token, `/e/${token}`);

  if (event.status === "DECIDED") {
    if (participation.attendance === "DECLINED") redirect(`/e/${token}/declined`);
    return <DecidedView token={token} eventId={event.id} />;
  }

  if (event.status === "OPEN") {
    if (participation.attendance === "DECLINED") redirect(`/e/${token}/declined`);
    if (participation.answeredAt) redirect(`/e/${token}/done`);
  }

  // 候補日の月をカレンダーで出す。予定の点は受け手のカレンダーから
  const candidateDays = new Set(event.candidates.map((c) => key(toJstParts(c.startAt))));
  const months = [...new Map(event.candidates.map((c) => {
    const p = toJstParts(c.startAt);
    return [`${p.year}-${p.month}`, { year: p.year, month: p.month }];
  })).values()];
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { calendarProvider: true } });
  let busyDays = new Set<string>();
  if (me?.calendarProvider && months.length) {
    const from = fromJst(months[0].year, months[0].month, 1);
    const last = months[months.length - 1];
    const to = addDays(fromJst(last.year, last.month, 1), 31);
    busyDays = new Set((await getCalendarEvents(user.id, from, to)).map((e) => key(toJstParts(e.start))));
  }

  async function join() {
    "use server";
    await joinEvent(token);
  }

  return (
    <main className="relative flex flex-1 flex-col pt-11">
      <div className="flex flex-1 flex-col gap-2.5 px-6 pt-2">
        <div className="relative flex flex-col gap-2 pt-2">
          <p className="w-fit rotate-3 rounded-pill bg-brand-soft px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand">
            {ownerName} から
          </p>
          <h1 className="pr-20 font-display text-[28px] leading-[1.3]">{event.title}</h1>
          <Image src="/figma/mascot-sloth-r0.svg" alt="" width={72} height={72} className="absolute top-0 right-6" />
          <div className="absolute top-[-3px] left-[104px] rounded-[18px] bg-card px-3.5 py-2.5 text-base font-bold whitespace-nowrap shadow-soft">招待が届いたよ！</div>
        </div>

        <div className="flex w-full flex-col gap-3 rounded-md bg-card p-4 shadow-soft">
          {event.memo && (
            <div className="flex w-full items-start gap-2 rounded-md bg-brand-soft p-3">
              <Image src="/figma/icon-sparkle-18.svg" alt="" width={18} height={18} />
              <p className="flex-1 text-xs leading-[1.5] font-medium whitespace-pre-wrap">{event.memo}</p>
            </div>
          )}

          {months.map((m, i) => (
            <MonthView
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              candidateDays={candidateDays}
              busyDays={busyDays}
              count={i === 0 ? candidateDays.size : undefined}
            />
          ))}
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1 text-xs font-medium text-ink-sub">
              <Image src="/figma/legend-candidate.svg" alt="" width={12} height={12} />
              候補日
            </span>
            {busyDays.size > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-ink-sub">
                <Image src="/figma/legend-busy.svg" alt="" width={6} height={6} />
                あなたの予定
              </span>
            )}
          </div>

          <p className="w-full rounded-sm bg-sunken p-2 text-xs leading-[1.5] font-medium">
            締切 {formatDateTime(event.deadlineAt)}　・　{event.headcount}人で集まる
          </p>
        </div>

        {event.status === "CANCELED" ? (
          <p className="rounded-md bg-sunken p-4 text-center text-[15px] font-bold">
            中止になりました{event.cancelNote ? `：${event.cancelNote}` : ""}
          </p>
        ) : !canAnswer ? (
          <p className="rounded-md bg-sunken p-4 text-center text-[15px] font-bold">締切を過ぎたので、回答はしめきりました</p>
        ) : (
          <>
            <p className="text-[17px] leading-[1.5] font-bold">参加する？</p>
            <div className="flex w-full gap-3 text-center">
              <form action={join} className="flex flex-1">
                <button type="submit" className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg bg-brand px-4 py-5 text-white shadow-pop active:translate-y-[2px]">
                  <span className="font-display text-[40px] leading-[1.2]">○</span>
                  <span className="text-[17px] leading-[1.5] font-bold">参加する</span>
                  <span className="text-xs leading-[1.5] font-medium">日程の回答へ</span>
                </button>
              </form>
              <Link href={`/e/${token}/decline`} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg bg-card px-4 py-5 text-ink-sub shadow-soft">
                <span className="font-display text-[40px] leading-[1.2]">×</span>
                <span className="text-[17px] leading-[1.5] font-bold">参加しない</span>
                <span className="text-xs leading-[1.5] font-medium">{ownerName}さんに伝えるね</span>
              </Link>
            </div>
          </>
        )}
      </div>

      <footer className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">あとから変更もできます</p>
      </footer>
    </main>
  );
}

function MonthView({
  year,
  month,
  candidateDays,
  busyDays,
  count,
}: {
  year: number;
  month: number;
  candidateDays: Set<string>;
  busyDays: Set<string>;
  count?: number;
}) {
  const firstWeekday = toJstParts(fromJst(year, month, 1, 12)).weekday;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 font-bold">
        <p className="flex-1 text-[15px] leading-[1.6]">
          {year}年 {month}月
        </p>
        {count !== undefined && <p className="text-[13px] leading-[1.4] tracking-[0.26px] text-brand">候補 {count}日</p>}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <p key={w} className="flex h-5 items-center justify-center text-xs font-medium text-ink-sub">
            {w}
          </p>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} className="h-[30px]" />;
          const k = `${year}-${month}-${day}`;
          const isCandidate = candidateDays.has(k);
          return (
            <span
              key={i}
              className={`flex h-[30px] flex-col items-center justify-center rounded-pill ${isCandidate ? "bg-accent text-[15px] font-bold" : "text-xs font-medium text-ink-sub"}`}
            >
              {day}
              {busyDays.has(k) && !isCandidate && <Image src="/figma/dot-busy-r0.svg" alt="" width={4} height={4} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
