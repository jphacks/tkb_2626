"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { randomToken } from "@/lib/token";

const CreateEventInput = z.object({
  title: z.string().trim().min(1).max(40),
  genre: z.enum(["DRINK", "LUNCH", "CAMP", "STUDY"]).nullable(),
  memo: z.string().trim().max(200).nullable(),
  headcount: z.number().int().min(2).max(50),
  priority: z.enum(["LOW", "NORMAL", "URGENT"]),
  candidates: z
    .array(z.object({ startAt: z.coerce.date(), endAt: z.coerce.date(), byAi: z.boolean() }))
    .min(1)
    .max(10),
  deadlineAt: z.coerce.date(),
});

export type CreateEventInput = z.input<typeof CreateEventInput>;

// S1「リンクをつくる」: 調整・候補日・送り手の参加（全候補○）を作って S2 へ
export async function createEvent(input: CreateEventInput) {
  const user = await requireUser("/events/new");
  const data = CreateEventInput.parse(input);
  if (data.deadlineAt <= new Date()) throw new Error("締切は今より後にしてください");

  const now = new Date();
  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        ownerId: user.id,
        title: data.title,
        genre: data.genre,
        memo: data.memo || null,
        headcount: data.headcount,
        priority: data.priority,
        deadlineAt: data.deadlineAt,
        shareToken: randomToken(),
        candidates: { create: data.candidates },
      },
      include: { candidates: true },
    });
    await tx.participation.create({
      data: {
        eventId: created.id,
        userId: user.id,
        attendance: "ATTENDING",
        answeredAt: now,
        answers: { create: created.candidates.map((c) => ({ candidateId: c.id, value: "YES" as const })) },
      },
    });
    return created;
  });

  redirect(`/events/${event.id}/share`);
}

// D1「〜に決める」: 送り手だけ。締切前でも後でも決められる
export async function decideEvent(eventId: string, candidateId: string) {
  const user = await requireUser(`/events/${eventId}/decide`);
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { candidates: { select: { id: true } } } });
  if (!event || event.ownerId !== user.id) throw new Error("not found");
  if (event.status !== "OPEN") redirect(`/events/${eventId}`);
  if (!event.candidates.some((c) => c.id === candidateId)) throw new Error("候補日が見つかりません");

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "DECIDED", decidedCandidateId: candidateId, decidedAt: new Date() },
  });
  redirect(`/events/${eventId}/decided`);
}

const EditEventInput = z.object({
  title: z.string().trim().min(1).max(40),
  headcount: z.number().int().min(2).max(50),
  deadlineAt: z.coerce.date(),
});

// E1「保存する」: 名前・人数・締切だけ変えられる。保存後は S3 に戻り、リンクのコピーを出す
export async function updateEvent(eventId: string, input: z.input<typeof EditEventInput>) {
  const user = await requireUser(`/events/${eventId}/edit`);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { ownerId: true, status: true } });
  if (!event || event.ownerId !== user.id) throw new Error("not found");
  if (event.status !== "OPEN") redirect(`/events/${eventId}`);
  const data = EditEventInput.parse(input);
  if (data.deadlineAt <= new Date()) throw new Error("締切は今より後にしてください");

  await prisma.event.update({ where: { id: eventId }, data });
  redirect(`/events/${eventId}?saved=1`);
}

// E2「中止する」: 送り手だけ。中止後は E3 へ
export async function cancelEvent(eventId: string, note: string) {
  const user = await requireUser(`/events/${eventId}/cancel`);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { ownerId: true, status: true } });
  if (!event || event.ownerId !== user.id) throw new Error("not found");
  if (event.status === "OPEN") {
    await prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELED", canceledAt: new Date(), cancelNote: note.trim().slice(0, 100) || null },
    });
  }
  redirect(`/events/${eventId}/cancel`);
}
