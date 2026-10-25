import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/Button";
import { loadInvite } from "@/lib/invite";

export default async function DeclinedPage(props: PageProps<"/e/[token]/declined">) {
  const { token } = await props.params;
  const { event, participation, canAnswer, ownerName } = await loadInvite(token, `/e/${token}/declined`);
  if (participation.attendance !== "DECLINED") redirect(`/e/${token}`);

  return (
    <main className="flex flex-1 flex-col pt-11">
      <div className="flex flex-1 flex-col items-center gap-3 px-6 pt-6">
        <Image src="/figma/mascot-sloth-happy.svg" alt="" width={96} height={96} />
        <h1 className="text-center font-display text-[28px] leading-[1.3]">{ownerName}さんに届いたよ</h1>
        {participation.note && (
          <section className="flex w-full flex-col gap-1 rounded-lg bg-card p-3.5 shadow-soft">
            <p className="text-xs leading-[1.5] font-medium text-ink-sub">あなたのひとこと</p>
            <p className="text-[15px] leading-[1.6] font-bold">{participation.note}</p>
          </section>
        )}
        <div className="flex w-full flex-col items-center gap-1.5 rounded-md bg-brand-soft p-3">
          <Image src="/figma/icon-reflect.svg" alt="" width={32} height={32} />
          <p className="text-center text-[15px] leading-[1.6] font-bold">回答状況に反映</p>
          <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">「{event.title}」の一覧に不参加として表示</p>
        </div>
        <p className="w-full rounded-md bg-sunken p-3 text-xs leading-[1.5] font-medium text-ink-sub">
          この調整は「ホーム ＞ 届いた」にも残るので、あとから参加に変えられます
        </p>
      </div>

      <footer className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Link href="/home" className={buttonClassName("primary")}>
          ホームへ
        </Link>
        {canAnswer && (
          <Link href={`/e/${token}/answer`} className={buttonClassName("secondary")}>
            やっぱり参加する
          </Link>
        )}
      </footer>
    </main>
  );
}
