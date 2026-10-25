import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { googleCalendarUrl } from "@/lib/calendar-link";
import { prisma } from "@/lib/db";
import { attendeesOf, GENRE_ICON } from "@/lib/decided";
import { requireUser } from "@/lib/session";
import { lineShareUrl } from "@/lib/share";
import { formatDateTime } from "@/lib/time";

export default async function DecidedPage(props: PageProps<"/events/[id]/decided">) {
  const { id } = await props.params;
  const user = await requireUser(`/events/${id}/decided`);
  const event = await prisma.event.findUnique({
    where: { id },
    include: { decidedCandidate: true, participations: { include: { answers: true, user: { select: { name: true } } } } },
  });
  if (!event || event.ownerId !== user.id) notFound();
  if (event.status !== "DECIDED" || !event.decidedCandidate) redirect(`/events/${id}`);

  const decided = event.decidedCandidate;
  const attendees = attendeesOf(event, decided);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/e/${event.shareToken}`;
  const message = `【${event.title}】${formatDateTime(decided.startAt)} に決まりました！`;

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar />
      <div className="flex flex-1 flex-col items-center gap-3 px-6 pt-6">
        <Image src="/figma/mascot-sloth-d2.svg" alt="" width={150} height={150} />
        <h1 className="text-center font-display text-[28px] leading-[1.3]">決まった！</h1>
        <section className="flex w-full flex-col items-center gap-1.5 rounded-lg bg-brand p-5 text-white shadow-pop">
          {event.genre && <Image src={GENRE_ICON[event.genre]} alt="" width={40} height={40} />}
          <p className="text-center text-[17px] leading-[1.5] font-bold">{event.title}</p>
          <p className="text-center font-display text-[30px] leading-tight">{formatDateTime(decided.startAt)}</p>
          <p className="text-center text-xs leading-[1.5] font-medium">{attendees.length}人で参加</p>
        </section>
        <a
          href={`/events/${id}/calendar.ics`}
          className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand underline"
        >
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
        <a href={lineShareUrl(message, url)} target="_blank" rel="noopener noreferrer" className={buttonClassName("accent")}>
          LINEでみんなに知らせる
        </a>
        <Link href="/home" className={buttonClassName("secondary")}>
          ホームへ
        </Link>
      </footer>
    </main>
  );
}
