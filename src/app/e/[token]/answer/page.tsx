import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { loadInvite } from "@/lib/invite";
import { formatDateTime } from "@/lib/time";
import { AnswerForm } from "./AnswerForm";

export default async function AnswerPage(props: PageProps<"/e/[token]/answer">) {
  const { token } = await props.params;
  const { event, participation, canAnswer, ownerName } = await loadInvite(token, `/e/${token}/answer`);
  if (!canAnswer) redirect(`/e/${token}`);

  const answers = new Map(participation.answers.map((a) => [a.candidateId, a]));

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="日程の回答" />
      <AnswerForm
        token={token}
        ownerName={ownerName}
        title={event.title}
        memo={event.memo}
        urgent={event.priority === "URGENT"}
        deadline={formatDateTime(event.deadlineAt)}
        note={participation.note ?? ""}
        declaredLabel={participation.replyBy && participation.replyBy > new Date() ? participation.replyByLabel : null}
        candidates={event.candidates.map((c) => {
          const a = answers.get(c.id);
          return {
            id: c.id,
            startAt: c.startAt.toISOString(),
            endAt: c.endAt.toISOString(),
            value: a?.value ?? null,
            byAi: a?.byAi ?? false,
            reason: a?.reason ?? null,
          };
        })}
      />
    </main>
  );
}
