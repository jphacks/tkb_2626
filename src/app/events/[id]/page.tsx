import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { lineShareUrl } from "@/lib/share";
import { ManageMenu } from "./ManageMenu";
import { initial, participantStatus, rankTallies, remainingRatio, STATUS_LABEL, tally, type ParticipantStatus } from "@/lib/status";
import { formatDateTime, formatDay, toJstParts } from "@/lib/time";

const STICKER: Record<ParticipantStatus, string> = {
  ANSWERED: "bg-brand text-white",
  DECLARED: "bg-accent",
  PENDING: "bg-alert",
  DECLINED: "bg-sunken shadow-soft",
};

export default async function EventStatusPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/events/${id}`);
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      candidates: { orderBy: { startAt: "asc" } },
      participations: { include: { user: { select: { name: true } }, answers: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!event || event.ownerId !== user.id) notFound();
  if (event.status === "DECIDED") redirect(`/events/${id}/decided`);
  if (event.status === "CANCELED") redirect(`/events/${id}/cancel`);
  const { saved } = await props.searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const now = new Date();
  const open = event.status === "OPEN";
  const beforeDeadline = event.deadlineAt > now;
  const people = event.participations.map((p) => ({ ...p, status: participantStatus(p, now), isOwner: p.userId === user.id }));
  const others = people.filter((p) => !p.isOwner);
  const waiting = others.filter((p) => p.status === "PENDING" || p.status === "DECLARED");
  const answered = people.filter((p) => p.status === "ANSWERED");
  const declined = people.filter((p) => p.status === "DECLINED");
  const replied = answered.length + declined.length;
  const allReplied = replied >= event.headcount;

  const best = rankTallies(tally(event.candidates, event.participations))[0];
  const ratio = remainingRatio(event.createdAt, event.deadlineAt, now);
  const urgent = event.priority === "URGENT";

  // 「見てるのに、まだ返してない」: 1時間以内にリンクを開いて、まだ返していない人
  const peeking = others.filter((p) => p.status === "PENDING" && p.lastOpenedAt && now.getTime() - p.lastOpenedAt.getTime() < 60 * 60 * 1000);
  const lastPeek = Math.max(0, ...peeking.map((p) => p.lastOpenedAt!.getTime()));
  const peekMinutes = Math.max(1, Math.round((now.getTime() - lastPeek) / 60000));

  const yesDays = (p: (typeof people)[number]) =>
    event.candidates
      .filter((c) => p.answers.find((a) => a.candidateId === c.id)?.value === "YES")
      .map((c) => {
        const d = toJstParts(c.startAt);
        return `${d.month}/${d.day}`;
      })
      .join("・");

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar
        title={event.title}
        backHref="/home"
        action={<ManageMenu eventId={id} title={event.title} deadline={formatDateTime(event.deadlineAt)} headcount={event.headcount} />}
      />

      <div className="flex flex-1 flex-col gap-4 px-6 pt-2 pb-6">
        {saved === "1" && (
          <div className="flex w-full items-center gap-3 rounded-md bg-brand-soft p-3">
            <p className="flex-1 text-[13px] leading-[1.4] font-bold">変更を保存したよ。みんなにも知らせよう</p>
            <a
              href={lineShareUrl(`【${event.title}】の内容を変えたよ（締切 ${formatDateTime(event.deadlineAt)}）`, `${proto}://${host}/e/${event.shareToken}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-pill bg-accent px-3 py-2 text-[13px] font-bold drop-shadow-pop"
            >
              LINEで知らせる
            </a>
          </div>
        )}
        {/* 締切のカウントダウン */}
        <section className="relative flex w-full flex-col gap-3 overflow-hidden rounded-lg bg-ink px-[18px] pt-[26px] pb-[18px] shadow-pop">
          {urgent && (
            <div aria-hidden className="absolute inset-x-0 top-0 h-2.5 bg-[repeating-linear-gradient(-55deg,#f4e01c_0_10px,transparent_10px_20px)]" />
          )}
          <div className="flex items-center gap-2">
            <p className="font-dot text-sm tracking-[2.8px] text-accent">DEADLINE</p>
            <span className="flex-1" />
            {urgent && <p className="rounded-sm bg-accent px-2.5 py-1 font-display text-[13px]">急ぎ</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 font-dot">
              <p className="text-[54px] leading-none text-accent [text-shadow:0_0_16px_rgba(244,224,28,0.8)]">
                <Countdown deadline={event.deadlineAt.toISOString()} />
              </p>
              <p className="flex gap-[46px] pl-2.5 text-[10px] text-ink-sub">
                <span>HRS</span>
                <span>MIN</span>
                <span>SEC</span>
              </p>
            </div>
            <Image src="/figma/mascot-sloth-s3.svg" alt="" width={64} height={64} />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={`h-2 flex-1 rounded-sm ${i >= 12 - Math.ceil(ratio * 12) ? "bg-accent shadow-[0_0_8px_#f4e01c]" : "bg-[#1e3e44]"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs leading-[1.5] font-medium text-white">締切 {formatDateTime(event.deadlineAt)}</p>
            <span className="flex-1" />
            <p className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-accent">{beforeDeadline ? `残り ${Math.round(ratio * 100)}%` : "締切を過ぎたよ"}</p>
          </div>
        </section>

        {waiting.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <p className="text-[17px] leading-[1.5] font-bold">まだの人</p>
              <p className="rounded-pill bg-alert px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px]">{waiting.length}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {waiting.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1.5 rounded-md bg-card px-2 py-3 shadow-soft">
                  <span className="flex size-[52px] items-center justify-center rounded-pill border-3 border-alert bg-card font-display text-xl">{initial(p.user.name)}</span>
                  <p className="w-full truncate text-center text-[15px] leading-[1.6] font-bold">{p.user.name}</p>
                  <p className="w-full truncate text-center text-xs leading-[1.5] font-medium text-ink-sub">
                    {p.status === "DECLARED" ? `${p.replyByLabel}に返す` : "未回答"}
                  </p>
                  {p.status === "DECLARED" ? (
                    <span className="rounded-pill bg-card px-4 py-2 text-[15px] leading-[1.6] font-bold text-ink-sub drop-shadow-pop">待つ</span>
                  ) : open && beforeDeadline ? (
                    <Link href={`/events/${id}/nudge?to=${p.userId}`} className="rounded-pill bg-alert px-4 py-2 text-[15px] leading-[1.6] font-bold drop-shadow-pop">
                      連打
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        {peeking.length > 0 && (
          <div className="flex w-full items-center gap-3 rounded-md bg-accent-soft px-4 py-3.5">
            <Image src="/figma/icon-eye.svg" alt="" width={28} height={28} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[15px] leading-[1.6] font-bold">見てるのに、まだ返してない</p>
              <p className="text-xs leading-[1.5] font-medium text-ink-sub">
                {peeking.map((p) => p.user.name).join("・")} が{peekMinutes}分前にリンクを開いたよ
              </p>
            </div>
          </div>
        )}

        <div className="flex w-full items-center gap-2 rounded-md bg-card p-3 shadow-soft">
          <div className="flex">
            {answered.slice(0, 6).map((p, i) => (
              <span
                key={p.id}
                className={`flex size-7 items-center justify-center rounded-pill text-[13px] font-bold ${i > 0 ? "-ml-1.5" : ""} ${p.isOwner ? "bg-brand text-white" : "bg-brand-soft"}`}
              >
                {initial(p.user.name)}
              </span>
            ))}
          </div>
          <p className="min-w-0 flex-1 text-xs leading-[1.5] font-medium text-ink-sub">
            回答済 {answered.length}人{best && best.yes > 0 ? `・いまは ${formatDay(best.candidate.startAt)}が有力` : ""}
          </p>
        </div>

        {/* 全員の状況 */}
        <div className="flex w-full items-center gap-2 rounded-lg bg-brand p-3.5 text-white shadow-pop">
          <p className="font-display text-[28px] leading-[1.3] whitespace-nowrap">
            {replied}/{event.headcount}人
          </p>
          <p className="flex-1 text-xs leading-[1.5] font-medium">
            が返事ずみ（参加{answered.length}・不参加{declined.length}）
          </p>
        </div>
        {people.map((p) => (
          <div key={p.id} className={`flex w-full flex-col gap-1.5 rounded-md p-3 shadow-soft ${p.status === "DECLINED" && p.note ? "bg-accent-soft" : "bg-card"}`}>
            <div className="flex items-center gap-2.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-pill text-[13px] font-bold ${p.isOwner ? "bg-brand text-white" : "bg-brand-soft"}`}>
                {initial(p.user.name)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[15px] leading-[1.6] font-bold">
                  {p.user.name}
                  {p.isOwner ? "（あなた）" : ""}
                </p>
                <p className="truncate text-xs leading-[1.5] font-medium text-ink-sub">
                  {p.status === "ANSWERED" && (yesDays(p) ? `○ ${yesDays(p)}` : "○なし")}
                  {p.status === "DECLARED" && `${p.replyByLabel}に返す`}
                  {p.status === "PENDING" && "まだ返していません"}
                  {p.status === "DECLINED" && "今回は不参加"}
                </p>
              </div>
              <p className={`shrink-0 rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${STICKER[p.status]}`}>{STATUS_LABEL[p.status]}</p>
            </div>
            {p.status === "DECLINED" && p.note && <p className="rounded-sm bg-card p-2 text-xs leading-[1.5] font-medium">「{p.note}」</p>}
          </div>
        ))}
      </div>

      {open && (
        <footer className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
          {waiting.length > 0 && beforeDeadline && !allReplied ? (
            <>
              <Link href={`/events/${id}/nudge?to=all`} className={buttonClassName("accent", "!bg-alert")}>
                まだの{waiting.length}人をまとめて連打
              </Link>
              <Link href={`/events/${id}/decide`} className="py-2 text-center text-[15px] leading-[1.6] font-bold text-brand">
                日程を決める →
              </Link>
            </>
          ) : (
            <Link href={`/events/${id}/decide`} className={buttonClassName("primary")}>
              日程を決める
            </Link>
          )}
        </footer>
      )}
    </main>
  );
}
