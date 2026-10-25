import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/Button";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Reveal } from "./Reveal";

// R3: 催促のプレゼントを開ける。宛先の本人だけが開けられる
export default async function PresentPage(props: PageProps<"/p/[token]">) {
  const { token } = await props.params;
  const user = await requireUser(`/p/${token}`);
  const nudge = await prisma.nudge.findUnique({
    where: { token },
    include: { from: { select: { name: true } }, to: { select: { name: true, reduceEffects: true } }, event: { select: { shareToken: true } } },
  });
  if (!nudge) notFound();

  if (nudge.toUserId !== user.id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
        <p className="font-display text-[28px] leading-[1.3]">ひみつのプレゼント</p>
        <p className="text-[15px] leading-[1.6] font-medium text-ink-sub">これは {nudge.to.name}さん宛てなので、開けられないよ</p>
        <Link href="/home" className={buttonClassName("secondary")}>
          ホームへ
        </Link>
      </main>
    );
  }

  if (!nudge.openedAt) await prisma.nudge.update({ where: { id: nudge.id }, data: { openedAt: new Date() } });

  return (
    <Reveal
      fromName={nudge.from.name ?? "だれか"}
      count={nudge.count}
      message={nudge.message}
      answerHref={`/e/${nudge.event.shareToken}`}
      reduceEffects={nudge.to.reduceEffects}
    />
  );
}
