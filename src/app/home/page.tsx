import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { GENRE_ICON_SMALL, GENRE_LABEL, genreTileBg } from "@/lib/genre";
import { requireUser } from "@/lib/session";
import { initial, participantStatus, STATUS_LABEL, type ParticipantStatus } from "@/lib/status";
import { formatDateTime, formatTime, toJstParts } from "@/lib/time";

const STICKER: Record<ParticipantStatus | "DECIDED", string> = {
  ANSWERED: "bg-brand text-white",
  DECLARED: "bg-accent",
  PENDING: "bg-alert",
  DECLINED: "bg-sunken",
  DECIDED: "bg-brand-soft text-brand",
};

export default async function HomePage(props: PageProps<"/home">) {
  const { tab } = await props.searchParams;
  const user = await requireUser("/home");
  const received = tab === "received";
  const now = new Date();

  return (
    <main className="relative flex flex-1 flex-col pt-11">
      <TopBar
        title="ホーム"
        action={
          <Link href="/settings" aria-label="設定" className="flex size-9 items-center justify-center rounded-pill bg-sunken">
            <Image src="/figma/icon-settings.svg" alt="" width={24} height={24} />
          </Link>
        }
      />
      <div className="flex flex-1 flex-col gap-4 px-6 pt-2 pb-24">{received ? await Received(user.id, now) : await Mine(user.id, now)}</div>
      <Link
        href="/events/new"
        aria-label="新しく調整"
        className="fixed bottom-[max(34px,env(safe-area-inset-bottom))] left-1/2 flex size-16 translate-x-[118px] items-center justify-center rounded-pill bg-brand shadow-pop"
      >
        <Image src="/figma/icon-plus.svg" alt="" width={30} height={30} />
      </Link>
    </main>
  );
}

function Tabs({ received }: { received: boolean }) {
  const cls = (on: boolean) => `flex flex-1 items-center justify-center rounded-pill py-2.5 text-[15px] leading-[1.6] font-bold ${on ? "bg-brand text-white" : "text-ink-sub"}`;
  return (
    <div className="flex w-full gap-1 rounded-pill bg-card p-1 shadow-soft">
      <Link href="/home?tab=mine" className={cls(!received)}>
        自分が作った
      </Link>
      <Link href="/home?tab=received" className={cls(received)}>
        届いた
      </Link>
    </div>
  );
}

function Avatar({ name, kind, size }: { name: string | null; kind: "me" | "meOnBrand" | "done" | "wait" | "unknown"; size: 22 | 34 }) {
  const base = size === 34 ? "size-[34px] -mr-1.5" : "size-[22px] -mr-1";
  const style = {
    me: "bg-brand text-white",
    meOnBrand: "bg-card text-brand",
    done: "bg-brand-soft",
    wait: "border-2 border-dashed border-alert bg-card",
    unknown: "border-2 border-dashed border-alert bg-card",
  }[kind];
  return <span className={`flex shrink-0 items-center justify-center rounded-pill text-[13px] font-bold ${base} ${style}`}>{kind === "unknown" ? "?" : initial(name)}</span>;
}

async function Mine(userId: string, now: Date) {
  const events = await prisma.event.findMany({
    where: { ownerId: userId, status: "OPEN", deadlineAt: { gt: now } },
    include: { participations: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
  });
  const rows = events.map((e) => {
    const people = e.participations.map((p) => ({ ...p, status: participantStatus(p, now), isOwner: p.userId === userId }));
    const waiting = people.filter((p) => !p.isOwner && (p.status === "PENDING" || p.status === "DECLARED")).length;
    const replied = people.filter((p) => p.status === "ANSWERED" || p.status === "DECLINED").length;
    return { e, people, waiting, replied, unknown: Math.max(0, e.headcount - people.length) };
  });
  // いちばん急ぎ: 優先度が急ぎのものを優先し、その中で締切が近い順
  rows.sort((a, b) => Number(b.e.priority === "URGENT") - Number(a.e.priority === "URGENT") || a.e.deadlineAt.getTime() - b.e.deadlineAt.getTime());
  const [focus, ...others] = rows;
  const totalWaiting = rows.reduce((n, r) => n + r.waiting, 0);

  const left = focus ? focus.e.deadlineAt.getTime() - now.getTime() : 0;
  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);

  return (
    <>
      <div className="flex items-center gap-3">
        <Image src="/figma/mascot-sloth-home.svg" alt="" width={64} height={64} />
        <p className="flex-1 rounded-md bg-card p-3 text-[15px] leading-[1.6] font-bold shadow-soft">
          {rows.length === 0 ? "まずは調整をつくってみよう" : totalWaiting > 0 ? `返事待ちが ${totalWaiting}人 いるよ` : "みんな返事ずみ！"}
        </p>
      </div>
      <Tabs received={false} />

      {focus && (
        <section className="flex w-full flex-col gap-3 rounded-lg bg-brand p-5 shadow-pop">
          <p className="w-fit rotate-4 rounded-pill bg-accent px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px]">いちばん急ぎ</p>
          <Link href={`/events/${focus.e.id}`} className="font-display text-xl leading-[1.4] text-white">
            {focus.e.title}
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/figma/icon-clock-28.svg" alt="" width={28} height={28} />
            <p className="flex items-baseline gap-1 whitespace-nowrap">
              {days > 0 && (
                <>
                  <span className="font-display text-[28px] leading-[1.3] text-accent">{days}</span>
                  <span className="text-[15px] font-bold text-white">日</span>
                </>
              )}
              <span className="font-display text-[28px] leading-[1.3] text-accent">{hours}</span>
              <span className="text-[15px] font-bold text-white">時間</span>
            </p>
            <p className="flex-1 text-xs font-medium text-white">で締切</p>
          </div>
          <div className="flex items-center">
            {focus.people.map((p) => (
              <Avatar key={p.id} name={p.user.name} kind={p.isOwner ? "meOnBrand" : p.status === "ANSWERED" || p.status === "DECLINED" ? "done" : "wait"} size={34} />
            ))}
            {Array.from({ length: Math.min(focus.unknown, 5) }, (_, i) => (
              <Avatar key={`u${i}`} name={null} kind="unknown" size={34} />
            ))}
            <p className="flex-1 pl-3 text-[13px] font-bold text-white">
              {focus.replied}/{focus.e.headcount}人
            </p>
          </div>
          {focus.waiting > 0 ? (
            <Link href={`/events/${focus.e.id}/nudge?to=all`} className={buttonClassName("accent")}>
              まだの{focus.waiting}人を連打する
            </Link>
          ) : (
            <Link href={`/events/${focus.e.id}`} className={buttonClassName("accent")}>
              回答状況を見る
            </Link>
          )}
        </section>
      )}

      {others.length > 0 && <p className="text-[17px] leading-[1.5] font-bold">ほかの調整</p>}
      {others.map(({ e, people, waiting, unknown }) => {
        const d = toJstParts(e.deadlineAt);
        return (
          <Link key={e.id} href={`/events/${e.id}`} className="flex w-full items-center gap-3 rounded-md bg-card p-3 shadow-soft">
            <span className={`flex size-[52px] shrink-0 flex-col items-center justify-center rounded-md ${waiting > 0 ? "bg-accent-soft" : "bg-brand-soft"}`}>
              <span className="text-xs leading-[1.5] font-medium text-ink-sub">{d.month}月</span>
              <span className="font-display text-xl leading-[1.4]">{d.day}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="truncate text-[15px] leading-[1.6] font-bold">{e.title}</span>
              <span className="flex">
                {people.map((p) => (
                  <Avatar key={p.id} name={p.user.name} kind={p.isOwner ? "me" : p.status === "ANSWERED" || p.status === "DECLINED" ? "done" : "wait"} size={22} />
                ))}
                {Array.from({ length: Math.min(unknown, 5) }, (_, i) => (
                  <Avatar key={`u${i}`} name={null} kind="unknown" size={22} />
                ))}
              </span>
            </span>
            <span className={`shrink-0 rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${waiting > 0 ? "bg-alert" : "bg-brand text-white"}`}>
              {waiting > 0 ? `まだ${waiting}人` : "全員OK"}
            </span>
          </Link>
        );
      })}

      <Link href="/history" className="py-2 text-center text-[15px] leading-[1.6] font-bold text-brand">
        過去の調整を見る →
      </Link>
    </>
  );
}

async function Received(userId: string, now: Date) {
  const parts = await prisma.participation.findMany({
    where: { userId, event: { ownerId: { not: userId }, status: { in: ["OPEN", "DECIDED"] } } },
    include: { event: { include: { owner: { select: { name: true } }, decidedCandidate: true } } },
  });
  const rows = parts
    .filter((p) => p.event.status === "DECIDED" || p.event.deadlineAt > now)
    .map((p) => ({ p, status: p.event.status === "DECIDED" ? ("DECIDED" as const) : participantStatus(p, now) }));
  const order = { PENDING: 0, DECLARED: 1, ANSWERED: 2, DECLINED: 3, DECIDED: 4 };
  rows.sort((a, b) => order[a.status] - order[b.status] || a.p.event.deadlineAt.getTime() - b.p.event.deadlineAt.getTime());

  const waitingMe = rows.filter((r) => r.status === "PENDING" || r.status === "DECLARED").length;
  const declared = rows.filter((r) => r.status === "DECLARED").sort((a, b) => a.p.replyBy!.getTime() - b.p.replyBy!.getTime());
  const next = declared[0];
  const nextLeft = next ? Math.max(0, next.p.replyBy!.getTime() - now.getTime()) : 0;

  const sub = (r: (typeof rows)[number]) => {
    const owner = r.p.event.owner.name ?? "送り手";
    if (r.status === "DECIDED") return `${owner}・${r.p.event.decidedCandidate ? formatDateTime(r.p.event.decidedCandidate.startAt) : ""}に決定`;
    if (r.status === "DECLARED") return `${owner}・${r.p.replyByLabel}に返す宣言`;
    if (r.status === "ANSWERED") return `${owner}・決定を待っています`;
    if (r.status === "DECLINED") return `${owner}・今回は不参加`;
    const daysLeft = Math.ceil((r.p.event.deadlineAt.getTime() - now.getTime()) / 86400000);
    return `${owner}・あと${daysLeft}日`;
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Image src="/figma/mascot-sloth-received.svg" alt="" width={56} height={56} />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-[15px] leading-[1.6] font-bold">{waitingMe > 0 ? `あなたの回答待ちが ${waitingMe}件` : "回答待ちはないよ"}</p>
          {rows.length > 0 && <p className="text-xs leading-[1.5] font-medium text-ink-sub">カードをタップで回答へ</p>}
        </div>
      </div>
      <Tabs received />

      {next && (
        <Link href="/later" className="flex w-full items-center gap-2.5 rounded-md bg-ink p-3 text-white shadow-soft">
          <Image src="/figma/icon-clock-20.svg" alt="" width={20} height={20} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] leading-[1.6] font-bold">あとで返す {declared.length}件</span>
            <span className="truncate text-xs leading-[1.5] font-medium">
              次は {next.p.event.title}（{formatTime(next.p.replyBy!)}）
            </span>
          </span>
          <span className="font-dot text-[22px] text-accent">
            {Math.floor(nextLeft / 3600000)}:{String(Math.floor((nextLeft % 3600000) / 60000)).padStart(2, "0")}
          </span>
          <span className="text-[17px] font-bold">›</span>
        </Link>
      )}

      {rows.length === 0 && <p className="py-8 text-center text-[15px] font-medium text-ink-sub">届いた調整はまだないよ</p>}
      {rows.map((r) => (
        <Link key={r.p.id} href={`/e/${r.p.event.shareToken}`} className="flex w-full items-center gap-3.5 rounded-lg bg-card p-3 shadow-soft">
          <span className={`flex size-[72px] shrink-0 items-center justify-center rounded-md ${genreTileBg(r.p.event.genre)}`}>
            {r.p.event.genre ? (
              <Image src={GENRE_ICON_SMALL[r.p.event.genre]} alt="" width={48} height={48} />
            ) : (
              <span className="font-display text-2xl">{initial(r.p.event.title)}</span>
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <span className="text-xs leading-[1.5] font-medium text-ink-sub">{r.p.event.genre ? GENRE_LABEL[r.p.event.genre] : ""}</span>
              <span className="flex-1" />
              <span className={`rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${STICKER[r.status]}`}>
                {r.status === "DECIDED" ? "決定" : STATUS_LABEL[r.status]}
              </span>
            </span>
            <span className="truncate text-[17px] leading-[1.5] font-bold">{r.p.event.title}</span>
            <span className="truncate text-xs leading-[1.5] font-medium text-ink-sub">{sub(r)}</span>
          </span>
        </Link>
      ))}
    </>
  );
}
