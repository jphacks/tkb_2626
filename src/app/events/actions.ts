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
