import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { nudgeTargets } from "@/lib/nudge";
import { requireUser } from "@/lib/session";
import { NudgeFlow } from "./NudgeFlow";

export default async function NudgePage(props: PageProps<"/events/[id]/nudge">) {
  const { id } = await props.params;
  const { to } = await props.searchParams;
  const target = typeof to === "string" ? to : "all";
  const user = await requireUser(`/events/${id}/nudge?to=${target}`);
  const result = await nudgeTargets(id, user.id, target);
  if (!result) notFound();
  if (!result.open || result.targets.length === 0) redirect(`/events/${id}`);

  const title = result.targets.length === 1 ? `${result.targets[0].name}さんを催促` : `まだの${result.targets.length}人を催促`;

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title={title} backHref={`/events/${id}`} />
      <NudgeFlow eventId={id} to={target} targets={result.targets} />
    </main>
  );
}
