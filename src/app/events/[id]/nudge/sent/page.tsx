import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { GiftShare } from "./GiftShare";

export default async function NudgeSentPage(props: PageProps<"/events/[id]/nudge/sent">) {
  const { id } = await props.params;
  const { ids } = await props.searchParams;
  const user = await requireUser(`/events/${id}`);
  const idList = typeof ids === "string" ? ids.split(",").filter(Boolean) : [];
  const nudges = await prisma.nudge.findMany({
    where: { id: { in: idList }, eventId: id, fromUserId: user.id },
    include: { to: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (nudges.length === 0) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const title = nudges.length === 1 ? `${nudges[0].to.name}さんへのプレゼント` : `${nudges.length}人へのプレゼント`;

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title={title} backHref={`/events/${id}`} />
      <GiftShare
        eventId={id}
        count={nudges[0].count}
        message={nudges[0].message ?? ""}
        gifts={nudges.map((n) => ({ id: n.id, toName: n.to.name ?? "相手", url: `${proto}://${host}/p/${n.token}` }))}
      />
    </main>
  );
}
