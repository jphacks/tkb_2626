"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { REPLY_LABELS, replyByFor } from "@/lib/invite";

async function load(token: string) {
  const user = await requireUser(`/e/${token}`);
  const event = await prisma.event.findUnique({ where: { shareToken: token }, include: { candidates: true } });
  if (!event || event.ownerId === user.id) redirect("/home");
  const participation = await prisma.participation.upsert({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    update: {},
    create: { eventId: event.id, userId: user.id },
  });
  const canAnswer = event.status === "OPEN" && event.deadlineAt > new Date();
  return { event, participation, canAnswer };
}

// R0「参加する」
export async function joinEvent(token: string) {
  const { participation, canAnswer } = await load(token);
  if (!canAnswer) redirect(`/e/${token}`);
  await prisma.participation.update({ where: { id: participation.id }, data: { attendance: "ATTENDING" } });
  redirect(`/e/${token}/answer`);
}

const AnswersInput = z.object({
  answers: z.array(z.object({ candidateId: z.string(), value: z.enum(["YES", "MAYBE", "NO"]), byAi: z.boolean() })),
  note: z.string().trim().max(200),
});

// R1「これで送る」: 回答を保存し、宣言を消して R2 へ
export async function submitAnswers(token: string, input: z.input<typeof AnswersInput>) {
  const { event, participation, canAnswer } = await load(token);
  if (!canAnswer) redirect(`/e/${token}`);
  const data = AnswersInput.parse(input);
  const candidateIds = new Set(event.candidates.map((c) => c.id));
  if (data.answers.length !== candidateIds.size || data.answers.some((a) => !candidateIds.has(a.candidateId))) {
    throw new Error("すべての候補日に回答してください");
  }

  await prisma.$transaction([
    ...data.answers.map((a) =>
      prisma.answer.upsert({
        where: { participationId_candidateId: { participationId: participation.id, candidateId: a.candidateId } },
        update: { value: a.value, byAi: a.byAi },
        create: { participationId: participation.id, candidateId: a.candidateId, value: a.value, byAi: a.byAi },
      }),
    ),
    prisma.participation.update({
      where: { id: participation.id },
      data: { attendance: "ATTENDING", answeredAt: new Date(), note: data.note || null, replyBy: null, replyByLabel: null },
    }),
  ]);
  redirect(`/e/${token}/done`);
}

// R1 の宣言: replyBy と replyByLabel だけ保存（○△×は保存しない）
export async function declareReply(token: string, label: string) {
  const { participation, canAnswer } = await load(token);
  if (!canAnswer) redirect(`/e/${token}`);
  const parsed = z.enum(REPLY_LABELS).parse(label);
  await prisma.participation.update({
    where: { id: participation.id },
    data: { replyBy: replyByFor(parsed), replyByLabel: parsed },
  });
  revalidatePath(`/e/${token}/answer`);
}

export async function clearDeclaration(token: string) {
  const { participation } = await load(token);
  await prisma.participation.update({ where: { id: participation.id }, data: { replyBy: null, replyByLabel: null } });
  revalidatePath(`/e/${token}/answer`);
}

// R0-b「不参加で送る」: 回答後・確定後もできる（中止後は不可）
export async function declineEvent(token: string, note: string) {
  const { event, participation } = await load(token);
  if (event.status === "CANCELED") redirect(`/e/${token}`);
  await prisma.participation.update({
    where: { id: participation.id },
    data: { attendance: "DECLINED", note: note.trim().slice(0, 200) || null, answeredAt: null, replyBy: null, replyByLabel: null },
  });
  redirect(`/e/${token}/declined`);
}
