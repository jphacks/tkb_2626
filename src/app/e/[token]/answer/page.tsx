import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { draftAnswers } from "@/lib/ai-draft";
import { getCalendarEvents } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { loadInvite } from "@/lib/invite";
import { addDays, formatDateTime, fromJst, toJstParts } from "@/lib/time";
import { AnswerForm } from "./AnswerForm";

// AI の下書き生成を待つことがあるので長めに
export const maxDuration = 60;

export default async function AnswerPage(props: PageProps<"/e/[token]/answer">) {
  const { token } = await props.params;
  const invite = await loadInvite(token, `/e/${token}/answer`);
  if (!invite.canAnswer) redirect(`/e/${token}`);

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="日程の回答" />
      <Suspense fallback={<Drafting />}>
        <AnswerSection token={token} invite={invite} />
      </Suspense>
    </main>
  );
}

function Drafting() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-24">
      <Image src="/figma/mascot-sloth-s3.svg" alt="" width={64} height={64} className="animate-bounce" />
      <p className="text-[15px] leading-[1.6] font-bold">AIがカレンダーを見て埋めています…</p>
      <p className="text-xs leading-[1.5] font-medium text-ink-sub">数秒で終わるよ</p>
    </div>
  );
}

async function AnswerSection({ token, invite }: { token: string; invite: Awaited<ReturnType<typeof loadInvite>> }) {
  const { user, event, participation, ownerName } = invite;
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { calendarProvider: true } });
  const connected = Boolean(me?.calendarProvider);

  // 候補日の全日分の予定（日別カレンダーと AI 下書き用）
  let events: Awaited<ReturnType<typeof getCalendarEvents>> = [];
  if (connected && event.candidates.length) {
    const first = toJstParts(event.candidates[0].startAt);
    const last = toJstParts(event.candidates[event.candidates.length - 1].startAt);
    events = await getCalendarEvents(user.id, fromJst(first.year, first.month, first.day), addDays(fromJst(last.year, last.month, last.day), 1));
  }

  // 初めて開いたときだけ下書きを作って保存する（byAi = true）
  let answers = participation.answers;
  if (connected && answers.length === 0 && event.candidates.length) {
    const drafts = await draftAnswers({ title: event.title, memo: event.memo, candidates: event.candidates, events });
    await prisma.$transaction(
      event.candidates.map((c) => {
        const d = drafts.get(c.id)!;
        return prisma.answer.upsert({
          where: { participationId_candidateId: { participationId: participation.id, candidateId: c.id } },
          update: {},
          create: { participationId: participation.id, candidateId: c.id, value: d.mark, byAi: true, reason: d.reason, detail: d.detail },
        });
      }),
    );
    answers = await prisma.answer.findMany({ where: { participationId: participation.id } });
  }

  const byCandidate = new Map(answers.map((a) => [a.candidateId, a]));
  const dayKey = (d: Date) => {
    const p = toJstParts(d);
    return `${p.year}-${p.month}-${p.day}`;
  };

  return (
    <AnswerForm
      token={token}
      ownerName={ownerName}
      title={event.title}
      memo={event.memo}
      urgent={event.priority === "URGENT"}
      deadline={formatDateTime(event.deadlineAt)}
      note={participation.note ?? ""}
      declaredLabel={participation.replyBy && participation.replyBy > new Date() ? participation.replyByLabel : null}
      calendarConnected={connected}
      candidates={event.candidates.map((c) => {
        const a = byCandidate.get(c.id);
        const key = dayKey(c.startAt);
        return {
          id: c.id,
          startAt: c.startAt.toISOString(),
          endAt: c.endAt.toISOString(),
          value: a?.value ?? null,
          byAi: a?.byAi ?? false,
          reason: a?.reason ?? null,
          detail: a?.detail ?? null,
          dayEvents: events
            .filter((e) => !e.allDay && dayKey(e.start) === key)
            .map((e) => ({ title: e.title, start: e.start.toISOString(), end: e.end.toISOString() })),
        };
      })}
    />
  );
}
