import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, fromJst, toJstParts } from "@/lib/time";

import { REPLY_LABELS, type ReplyLabel } from "@/lib/invite-labels";

export { REPLY_LABELS };

// 宣言の時刻（CLAUDE.md「受け手の流れ」）
export function replyByFor(label: ReplyLabel, now = new Date()): Date {
  const today = toJstParts(now);
  if (label === "今夜21時") {
    const t = fromJst(today.year, today.month, today.day, 21);
    return t > now ? t : addDays(t, 1);
  }
  if (label === "明日の朝") {
    const d = toJstParts(addDays(now, 1));
    return fromJst(d.year, d.month, d.day, 9);
  }
  const daysToSat = (6 - today.weekday + 7) % 7 || 7;
  const sat = toJstParts(addDays(now, daysToSat));
  return fromJst(sat.year, sat.month, sat.day, 10);
}

// 受け手のページの共通処理: ログイン必須、送り手本人は回答状況へ、Participation を upsert
export async function loadInvite(token: string, path: string) {
  const user = await requireUser(path);
  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      owner: { select: { name: true } },
      candidates: { orderBy: { startAt: "asc" } },
    },
  });
  if (!event) redirect("/home");
  if (event.ownerId === user.id) redirect(`/events/${event.id}`);

  const participation = await prisma.participation.upsert({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    update: { lastOpenedAt: new Date() },
    create: { eventId: event.id, userId: user.id, lastOpenedAt: new Date() },
    include: { answers: true },
  });

  const canAnswer = event.status === "OPEN" && event.deadlineAt > new Date();
  return { user, event, participation, canAnswer, ownerName: event.owner.name ?? "送り手" };
}
