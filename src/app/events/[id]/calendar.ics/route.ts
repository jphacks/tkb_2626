import { auth } from "@/auth";
import { icsFile } from "@/lib/calendar-link";
import { prisma } from "@/lib/db";

// 確定した日の予定ファイル。送り手と参加者だけ取れる
export async function GET(_req: Request, ctx: RouteContext<"/events/[id]/calendar.ics">) {
  const { id } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const event = await prisma.event.findUnique({
    where: { id },
    include: { decidedCandidate: true, participations: { select: { userId: true } } },
  });
  const member = event && (event.ownerId === session.user.id || event.participations.some((p) => p.userId === session.user!.id));
  if (!event || !member || !event.decidedCandidate) return new Response("Not found", { status: 404 });

  const body = icsFile({
    uid: event.id,
    title: event.title,
    start: event.decidedCandidate.startAt,
    end: event.decidedCandidate.endAt,
    details: event.memo ?? undefined,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pochiplease-${event.id}.ics"`,
    },
  });
}
