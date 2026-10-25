"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { nudgeTargets } from "@/lib/nudge";
import { randomToken } from "@/lib/token";

// S4「〜をプレゼントで送る」: 相手ごとに Nudge を作って P1 へ
export async function sendNudges(eventId: string, to: string, count: number) {
  const user = await requireUser(`/events/${eventId}`);
  const n = z.number().int().min(1).max(100).parse(count);
  const result = await nudgeTargets(eventId, user.id, to);
  if (!result || !result.open || result.targets.length === 0) redirect(`/events/${eventId}`);

  const created = await prisma.$transaction(
    result.targets.map((t) =>
      prisma.nudge.create({ data: { eventId, fromUserId: user.id, toUserId: t.id, count: n, token: randomToken(10) }, select: { id: true } }),
    ),
  );
  redirect(`/events/${eventId}/nudge/sent?ids=${created.map((c) => c.id).join(",")}`);
}

// P1 のひとこと
export async function setNudgeMessage(eventId: string, ids: string[], message: string) {
  const user = await requireUser(`/events/${eventId}`);
  await prisma.nudge.updateMany({
    where: { id: { in: ids }, eventId, fromUserId: user.id },
    data: { message: message.trim().slice(0, 100) || null },
  });
}
