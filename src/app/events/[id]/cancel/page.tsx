import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CancelForm } from "./CancelForm";

// E2 中止の確認 → E3 中止したよ
export default async function CancelPage(props: PageProps<"/events/[id]/cancel">) {
  const { id } = await props.params;
  const user = await requireUser(`/events/${id}/cancel`);
  const event = await prisma.event.findUnique({ where: { id }, select: { ownerId: true, status: true, title: true, shareToken: true, cancelNote: true } });
  if (!event || event.ownerId !== user.id) notFound();
  if (event.status === "DECIDED") redirect(`/events/${id}`);

  if (event.status === "OPEN") {
    return (
      <main className="flex flex-1 flex-col pt-11">
        <TopBar title={event.title} backHref={`/events/${id}`} />
        <CancelForm eventId={id} />
      </main>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar />
      <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-10">
        <Image src="/figma/mascot-sloth-angry.svg" alt="" width={128} height={128} />
        <h1 className="text-center font-display text-[28px] leading-[1.3]">中止にしたよ</h1>
        <div className="flex w-full flex-col gap-2 rounded-md bg-card p-4 shadow-soft">
          <p className="flex items-start gap-2 text-[15px] leading-[1.6] font-bold">
            <Image src="/figma/icon-check-ink.svg" alt="" width={18} height={18} className="mt-1" />
            招待リンクを開くと「中止になりました」と出るよ
          </p>
          <p className="flex items-start gap-2 text-[15px] leading-[1.6] font-bold">
            <Image src="/figma/icon-check-ink.svg" alt="" width={18} height={18} className="mt-1" />
            「過去の調整」に中止として残っています
          </p>
        </div>
      </div>
      <footer className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <CopyLinkButton url={`${proto}://${host}/e/${event.shareToken}`} label="リンクをコピーしてみんなに知らせる" />
        <Link href="/home" className={buttonClassName("primary")}>
          ホームへ
        </Link>
      </footer>
    </main>
  );
}
