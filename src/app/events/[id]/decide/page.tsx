import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { participantStatus, rankTallies, tally } from "@/lib/status";
import { DecideForm } from "./DecideForm";

export default async function DecidePage(props: PageProps<"/events/[id]/decide">) {
  const { id } = await props.params;
  const user = await requireUser(`/events/${id}/decide`);
  const event = await prisma.event.findUnique({
    where: { id },
    include: { candidates: { orderBy: { startAt: "asc" } }, participations: { include: { answers: true } } },
  });
  if (!event || event.ownerId !== user.id) notFound();
  if (event.status !== "OPEN") redirect(`/events/${id}`);

  const tallies = tally(event.candidates, event.participations);
  const best = rankTallies(tallies)[0];
  const answered = event.participations.filter((p) => participantStatus(p) === "ANSWERED").length;

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="日程を決める" backHref={`/events/${id}`} />
      <DecideForm
        eventId={id}
        headline={answered >= event.headcount ? `${answered}人そろったよ！` : `${answered}人が回答したよ`}
        bestId={best?.candidate.id ?? null}
        rows={tallies.map((t) => ({
          id: t.candidate.id,
          startAt: t.candidate.startAt.toISOString(),
          endAt: t.candidate.endAt.toISOString(),
          yes: t.yes,
          maybe: t.maybe,
          no: t.no,
        }))}
      />
    </main>
  );
}
