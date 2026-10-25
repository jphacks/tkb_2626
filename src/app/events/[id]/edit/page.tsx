import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { EditForm } from "./EditForm";

export default async function EditPage(props: PageProps<"/events/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireUser(`/events/${id}/edit`);
  const event = await prisma.event.findUnique({ where: { id }, select: { ownerId: true, status: true, title: true, headcount: true, deadlineAt: true } });
  if (!event || event.ownerId !== user.id) notFound();
  if (event.status !== "OPEN") redirect(`/events/${id}`);

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="調整を編集" backHref={`/events/${id}`} />
      <EditForm eventId={id} title={event.title} headcount={event.headcount} deadline={event.deadlineAt.toISOString()} now={new Date().toISOString()} />
    </main>
  );
}
