import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { HistoryDrum, type HistoryItem } from "./HistoryDrum";

// C2: 確定・中止・締切切れの調整（自分が作ったもの・届いたもの）
export default async function HistoryPage() {
  const user = await requireUser("/history");
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      OR: [{ ownerId: user.id }, { participations: { some: { userId: user.id } } }],
      AND: [{ OR: [{ status: { in: ["DECIDED", "CANCELED"] } }, { deadlineAt: { lte: now } }] }],
    },
    include: { decidedCandidate: true },
  });

  const items: HistoryItem[] = events
    .map((e) => {
      const date = e.status === "DECIDED" ? e.decidedAt! : e.status === "CANCELED" ? e.canceledAt! : e.deadlineAt;
      const mine = e.ownerId === user.id;
      return {
        id: e.id,
        title: e.title,
        genre: e.genre,
        date: date.toISOString(),
        status: e.status === "OPEN" ? ("EXPIRED" as const) : e.status,
        detail:
          e.status === "DECIDED" && e.decidedCandidate
            ? `${formatDateTime(e.decidedCandidate.startAt)} に決定`
            : e.status === "CANCELED"
              ? `中止${e.cancelNote ? `：${e.cancelNote}` : ""}`
              : "締切を過ぎました（まだ決まっていません）",
        href: mine ? `/events/${e.id}` : `/e/${e.shareToken}`,
        canDecide: mine && e.status === "OPEN",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="過去の調整" backHref="/home" />
      {items.length === 0 ? (
        <p className="px-6 py-16 text-center text-[15px] font-medium text-ink-sub">過去の調整はまだないよ</p>
      ) : (
        <HistoryDrum items={items} />
      )}
    </main>
  );
}
