import { prisma } from "@/lib/db";
import { participantStatus } from "@/lib/status";

// 催促できる相手: 送り手以外で、未回答か宣言中の人（OPEN かつ締切前だけ）
export async function nudgeTargets(eventId: string, ownerId: string, to: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participations: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!event || event.ownerId !== ownerId) return null;
  const open = event.status === "OPEN" && event.deadlineAt > new Date();
  const waiting = event.participations.filter((p) => {
    const s = participantStatus(p);
    return p.userId !== ownerId && (s === "PENDING" || s === "DECLARED");
  });
  // 一人ずつ送るときは、宣言中の人は「待つ」なので対象外
  const targets = to === "all" ? waiting : waiting.filter((p) => p.userId === to && participantStatus(p) === "PENDING");
  return {
    event,
    open,
    targets: targets.map((p) => ({
      ...p.user,
      label: participantStatus(p) === "DECLARED" ? `${p.replyByLabel}に返すと宣言中` : "まだ返していない",
    })),
  };
}
