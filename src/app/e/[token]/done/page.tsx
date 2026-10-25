import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnswerChip } from "@/components/AnswerChip";
import { buttonClassName } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { loadInvite } from "@/lib/invite";
import { formatDay, formatTime, formatDateTime } from "@/lib/time";

export default async function DonePage(props: PageProps<"/e/[token]/done">) {
  const { token } = await props.params;
  const { event, participation, canAnswer, ownerName } = await loadInvite(token, `/e/${token}/done`);
  if (!participation.answeredAt || participation.attendance === "DECLINED") redirect(`/e/${token}`);

  const answers = new Map(participation.answers.map((a) => [a.candidateId, a.value]));

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar />
      <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-2">
        <div className="relative flex w-full flex-col items-center gap-2 pt-6 pb-2">
          <span className="flex size-28 rotate-6 items-center justify-center rounded-pill bg-brand shadow-pop">
            <Image src="/figma/icon-check-56.svg" alt="" width={56} height={56} />
          </span>
          <Image src="/figma/r2-star-1.svg" alt="" width={28} height={28} className="absolute top-[12.6px] left-[56.8px] rotate-12" />
          <Image src="/figma/r2-star-2.svg" alt="" width={18} height={18} className="absolute top-[38.3px] left-[251.4px] -rotate-10" />
          <Image src="/figma/r2-star-3.svg" alt="" width={14} height={14} className="absolute top-[110px] left-[270px]" />
          <h1 className="text-center font-display text-[28px] leading-[1.3]">送ったよ！</h1>
          <p className="text-center text-[15px] leading-[1.6] font-medium text-ink-sub">{ownerName}さんに届きました。おつかれさま。</p>
        </div>

        <section className="flex w-full flex-col gap-3 rounded-md bg-card p-4 shadow-soft">
          <p className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">あなたの回答</p>
          {event.candidates.map((c) => {
            const v = answers.get(c.id);
            return (
              <div key={c.id} className="flex w-full items-center gap-3">
                {v ? <AnswerChip mark={v} selected size={32} /> : <span className="size-8" />}
                <p className="text-[15px] leading-[1.6] font-bold">{formatDay(c.startAt)}</p>
                <p className="flex-1 text-right text-[15px] leading-[1.6] font-medium text-ink-sub">
                  {formatTime(c.startAt)}–{formatTime(c.endAt)}
                </p>
              </div>
            );
          })}
          {participation.note && (
            <div className="flex w-full flex-col gap-1 rounded-md bg-sunken p-3">
              <p className="text-xs leading-[1.5] font-medium text-ink-sub">備考</p>
              <p className="text-[15px] leading-[1.6] font-medium whitespace-pre-wrap">{participation.note}</p>
            </div>
          )}
        </section>
      </div>

      <footer className="flex flex-col items-center gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        {canAnswer && (
          <Link href={`/e/${token}/answer`} className={buttonClassName("secondary")}>
            回答を変更する
          </Link>
        )}
        {event.status !== "CANCELED" && (
          <Link href={`/e/${token}/decline`} className="py-2 text-[15px] leading-[1.6] font-bold text-ink-sub underline">
            やっぱり参加をやめる
          </Link>
        )}
        {canAnswer && (
          <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">締切（{formatDateTime(event.deadlineAt)}）までは何度でも変更できます</p>
        )}
      </footer>
    </main>
  );
}
