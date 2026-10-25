"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { buttonClassName } from "@/components/Button";
import { cancelEvent } from "../../actions";

// E2: 中止の確認
export function CancelForm({ eventId }: { eventId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-1 flex-col justify-center px-6 pb-16">
      <section className="flex w-full flex-col items-center gap-3 rounded-lg bg-card p-5 shadow-pop">
        <Image src="/figma/mascot-sloth-angry.svg" alt="" width={96} height={96} />
        <h1 className="text-center text-[17px] leading-[1.5] font-bold">この調整を中止する？</h1>
        <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">中止すると、回答はもう受け付けません。元には戻せません。</p>
        <label className="flex w-full flex-col gap-2">
          <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">ひとこと（任意）</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            placeholder="日程が合わなかったので一回なしで！"
            className="w-full rounded-md bg-card p-4 text-[15px] leading-[1.6] font-medium shadow-soft caret-brand outline-none placeholder:text-ink-sub/50"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => cancelEvent(eventId, note))}
          className={buttonClassName("secondary", "border-2 border-urgent !text-urgent")}
        >
          {pending ? "中止しています…" : "中止する"}
        </button>
        <Link href={`/events/${eventId}`} className={buttonClassName("primary")}>
          やめない
        </Link>
      </section>
    </div>
  );
}
