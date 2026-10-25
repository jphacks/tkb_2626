"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { setNudgeMessage } from "../actions";

type Gift = { id: string; toName: string; url: string };

// P1: プレゼントできた（送る前）。ひとことを添えて、相手ごとのリンクをコピーして渡す
export function GiftShare({ eventId, count, message: initial, gifts }: { eventId: string; count: number; message: string; gifts: Gift[] }) {
  const [message, setMessage] = useState(initial || "はよ〜〜！");
  const ids = gifts.map((g) => g.id);
  const save = () => setNudgeMessage(eventId, ids, message);

  return (
    <>
      <div className="flex flex-1 flex-col items-center gap-3.5 px-6 pt-5">
        {/* プレゼントがときどきゆれる */}
        <div className="fx-loop relative size-[200px] shrink-0 origin-[50%_90%] animate-[wobble_2.6s_ease-in-out_infinite]">
          <div className="absolute top-[66px] left-[15px] h-[130px] w-[170px] overflow-hidden rounded-md bg-accent shadow-pop">
            <span className="absolute inset-y-0 left-[73px] w-6 bg-brand" />
          </div>
          <div className="absolute top-[34px] left-[5px] h-10 w-[190px] overflow-hidden rounded-sm bg-accent shadow-pop">
            <span className="absolute inset-y-0 left-[83px] w-6 bg-brand" />
          </div>
          <Image src="/figma/mascot-sloth-p1.svg" alt="" width={64} height={64} className="absolute top-[-6px] left-[130px]" />
        </div>
        <p className="flex items-baseline gap-1 whitespace-nowrap">
          <span className="font-dot text-[56px] text-brand">{count}</span>
          <span className="text-[15px] leading-[1.6] font-bold">コの「はよ〜〜！」を詰めたよ</span>
        </p>
        <label className="flex w-full flex-col gap-1 rounded-md bg-card p-3 shadow-soft">
          <span className="text-xs leading-[1.5] font-medium text-ink-sub">ひとこと</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={save}
            maxLength={100}
            className="w-full bg-transparent text-[15px] leading-[1.6] font-bold caret-brand outline-none"
          />
        </label>
        <p className="w-full text-center text-xs leading-[1.5] font-medium text-ink-sub">開けるまで中身はひみつ</p>
      </div>

      <div className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        {gifts.map((g) => (
          <CopyLinkButton key={g.id} url={g.url} label={`${g.toName}さんに渡すリンクをコピー`} before={save} />
        ))}
        <Link href={`/events/${eventId}`} className="py-2 text-center text-[15px] leading-[1.6] font-bold text-brand">
          回答状況に戻る
        </Link>
      </div>
    </>
  );
}
