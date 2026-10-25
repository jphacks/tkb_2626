import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { googleCalendarUrl } from "@/lib/calendar-link";
import { prisma } from "@/lib/db";
import { attendeesOf, GENRE_ICON } from "@/lib/decided";
import { formatDateTime, formatRange } from "@/lib/time";

// D3: 確定後に受け手が招待リンクを開いたときの表示
export async function DecidedView({ token, eventId }: { token: string; eventId: string }) {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      owner: { select: { name: true } },
      decidedCandidate: true,
      participations: { include: { answers: true, user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  const decided = event.decidedCandidate!;
  const ownerName = event.owner.name ?? "送り手";
  const attendees = attendeesOf(event, decided);

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="日程が決まったよ" backHref="/home" />
      <div className="flex flex-1 flex-col gap-3 px-6 pt-1">
        <div className="flex w-full items-start gap-2.5 rounded-md bg-sunken p-3">
          <Image src="/figma/mascot-sloth-d3.svg" alt="" width={36} height={36} />
          <p className="flex-1 text-[15px] leading-[1.6] font-bold">
            【{event.title}】{formatDateTime(decided.startAt)} に決まりました！
          </p>
        </div>

        <section className="flex w-full flex-col gap-2.5 rounded-lg bg-card p-[18px] shadow-soft">
          <div className="flex items-center gap-2.5">
            {event.genre && <Image src={GENRE_ICON[event.genre]} alt="" width={40} height={40} />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5]">
              <p className="text-[17px] font-bold">{event.title}</p>
              <p className="text-xs font-medium text-ink-sub">{ownerName} が決めました</p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 rounded-md bg-brand-soft p-3.5">
            <Image src="/figma/icon-calendar.svg" alt="" width={24} height={24} />
            <p className="font-display text-xl leading-snug text-brand">{formatRange(decided.startAt, decided.endAt)}</p>
          </div>
          {event.memo && <p className="text-xs leading-[1.5] font-medium whitespace-pre-wrap text-ink-sub">{event.memo}</p>}
          <p className="text-xs leading-[1.5] font-medium">参加：{attendees.map((p) => p.user.name).join("・")}</p>
        </section>
        <a href={`/events/${event.id}/calendar.ics`} className="self-center text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand underline">
          iPhone・Outlook のカレンダーに追加（.ics）
        </a>
      </div>

      <footer className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <a
          href={googleCalendarUrl({ title: event.title, start: decided.startAt, end: decided.endAt, details: event.memo ?? undefined })}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName("primary")}
        >
          カレンダーに追加
        </a>
        <Link href={`/e/${token}/decline`} className={buttonClassName("secondary")}>
          やっぱり行けない
        </Link>
      </footer>
    </main>
  );
}
