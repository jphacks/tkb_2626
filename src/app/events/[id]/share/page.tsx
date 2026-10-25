import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/TopBar";
import { ShareButtons } from "./ShareButtons";

export default async function SharePage(props: PageProps<"/events/[id]/share">) {
  const { id } = await props.params;
  const user = await requireUser(`/events/${id}/share`);
  const event = await prisma.event.findUnique({ where: { id }, select: { ownerId: true, title: true, shareToken: true } });
  if (!event || event.ownerId !== user.id) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/e/${event.shareToken}`;

  return (
    <main className="relative flex flex-1 flex-col bg-brand pt-11">
      <TopBar backHref="/home" tone="white" />

      <div className="flex flex-1 flex-col items-center gap-6 px-6 pt-8">
        <p className="rotate-5 rounded-pill bg-accent px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px]">{event.title}</p>
        <h1 className="w-full text-center font-display text-[40px] leading-[1.2] text-white">できた！</h1>
        <p className="w-full text-center text-[15px] leading-[1.6] font-medium text-white">
          このリンクを、LINEなどに貼るだけ。
          <br />
          相手はLINEかGoogleでログインして答えるよ。
        </p>
        <ShareButtons url={url} />
      </div>

      <Image src="/figma/s2-star-1.svg" alt="" width={40} height={40} className="pointer-events-none absolute top-[123.7px] left-[23.4px] rotate-12" />
      <Image src="/figma/s2-star-2.svg" alt="" width={26} height={26} className="pointer-events-none absolute top-[94px] left-[321.7px] -rotate-8" />
      <Image src="/figma/s2-star-3.svg" alt="" width={18} height={18} className="pointer-events-none absolute top-[326.4px] left-[302.5px] -rotate-20" />
      <Image src="/figma/s2-star-4.svg" alt="" width={14} height={14} className="pointer-events-none absolute top-[360px] left-[40px]" />

      <footer className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Link href={`/events/${id}`} className="block py-3 text-center text-[15px] leading-[1.6] font-bold text-white">
          回答状況を見る →
        </Link>
      </footer>
    </main>
  );
}
