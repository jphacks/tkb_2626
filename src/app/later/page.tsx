import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { GENRE_ICON_SMALL, genreTileBg } from "@/lib/genre";
import { requireUser } from "@/lib/session";
import { initial } from "@/lib/status";
import { formatDateTime, formatTime } from "@/lib/time";

const leftText = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)}日` : h >= 1 ? `${h}時間` : `${Math.max(1, Math.floor(ms / 60000))}分`;
};

// R5: 返す時間を宣言した調整の一覧（宣言した時刻が近い順）
export default async function LaterPage() {
  const user = await requireUser("/later");
  const now = new Date();
  const parts = await prisma.participation.findMany({
    where: {
      userId: user.id,
      attendance: { not: "DECLINED" },
      answeredAt: null,
      replyBy: { gt: now },
      event: { status: "OPEN", deadlineAt: { gt: now } },
    },
    include: { event: { include: { owner: { select: { name: true } } } } },
    orderBy: { replyBy: "asc" },
  });
  const [next, ...rest] = parts;

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="あとで返す" backHref="/home?tab=received" />
      <div className="flex flex-1 flex-col gap-3 px-6 pt-1 pb-8">
        <div className="flex items-center gap-3">
          <Image src="/figma/mascot-sloth-later.svg" alt="" width={52} height={52} />
          <div className="flex flex-1 flex-col gap-0.5 leading-[1.5]">
            <p className="text-[17px] font-bold">保留中が {parts.length}件</p>
            <p className="text-xs font-medium text-ink-sub">宣言した時間が近い順</p>
          </div>
        </div>

        {parts.length === 0 && <p className="py-10 text-center text-[15px] font-medium text-ink-sub">保留中の調整はないよ</p>}

        {next && (() => {
          const left = next.replyBy!.getTime() - now.getTime();
          // 宣言した時刻までの残りを、24時間を満タンとしてメモリで出す
          const filled = Math.max(1, Math.min(20, Math.round((1 - left / 86400000) * 20)));
          const daysToDeadline = Math.ceil((next.event.deadlineAt.getTime() - now.getTime()) / 86400000);
          return (
            <section className="flex w-full flex-col gap-2.5 rounded-lg bg-ink p-4 text-white shadow-pop">
              <div className="flex items-center gap-2.5">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-md ${genreTileBg(next.event.genre)}`}>
                  {next.event.genre ? <Image src={GENRE_ICON_SMALL[next.event.genre]} alt="" width={32} height={32} /> : <span className="font-display text-xl text-ink">{initial(next.event.title)}</span>}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-[15px] leading-[1.6] font-bold">{next.event.title}</p>
                  <p className="truncate text-xs leading-[1.5] font-medium">
                    {next.event.owner.name} から・{formatTime(next.replyBy!)} に返すと宣言
                  </p>
                </div>
              </div>
              <p className="flex items-baseline gap-2 whitespace-nowrap">
                <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px]">宣言した時間まで</span>
                <span className="font-dot text-[40px] text-accent [text-shadow:0_0_10px_rgba(244,224,28,0.7)]">
                  あと {Math.floor(left / 3600000)}:{String(Math.floor((left % 3600000) / 60000)).padStart(2, "0")}
                </span>
              </p>
              <div className="flex gap-[3px]">
                {Array.from({ length: 20 }, (_, i) => (
                  <span key={i} className={`h-2 flex-1 rounded-[2px] ${i < filled ? "bg-accent" : "bg-white/20"}`} />
                ))}
              </div>
              <p className="flex items-center gap-1.5 text-xs leading-[1.5] font-medium">
                <Image src="/figma/icon-clock-14.svg" alt="" width={14} height={14} />
                締切 {formatDateTime(next.event.deadlineAt)} まで あと{daysToDeadline}日
              </p>
              <Link href={`/e/${next.event.shareToken}/answer`} className={buttonClassName("accent")}>
                いま答える
              </Link>
            </section>
          );
        })()}

        {rest.map((p) => {
          const daysToDeadline = Math.ceil((p.event.deadlineAt.getTime() - now.getTime()) / 86400000);
          return (
            <Link key={p.id} href={`/e/${p.event.shareToken}/answer`} className="flex w-full items-center gap-3 rounded-lg bg-card p-3 shadow-soft">
              <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-md ${genreTileBg(p.event.genre)}`}>
                {p.event.genre ? <Image src={GENRE_ICON_SMALL[p.event.genre]} alt="" width={34} height={34} /> : <span className="font-display text-xl">{initial(p.event.title)}</span>}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] leading-[1.6] font-bold">{p.event.title}</span>
                <span className="truncate text-xs leading-[1.5] font-medium text-ink-sub">
                  {p.event.owner.name}・{p.replyByLabel} に返す
                </span>
                <span className="text-xs leading-[1.5] font-medium text-ink-sub">締切まで あと{daysToDeadline}日</span>
              </span>
              <span className="flex shrink-0 flex-col items-center rounded-md bg-accent-soft p-2">
                <span className="text-xs leading-[1.5] font-medium">あと</span>
                <span className="font-dot text-xl">{leftText(p.replyBy!.getTime() - now.getTime())}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
