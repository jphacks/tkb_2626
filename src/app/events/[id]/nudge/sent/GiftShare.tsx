"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonClassName } from "@/components/Button";
import { lineShareUrl } from "@/lib/share";
import { setNudgeMessage } from "../actions";
import { tap } from "@/lib/fx";

type Gift = { id: string; toName: string; url: string };

// P1: プレゼントできた（送る前）。ひとことを添えて、相手ごとに LINE で渡す
export function GiftShare({ eventId, count, message: initial, senderName, gifts }: { eventId: string; count: number; message: string; senderName: string; gifts: Gift[] }) {
  const [message, setMessage] = useState(initial || "はよ〜〜！");
  const [copied, setCopied] = useState<string | null>(null);
  const ids = gifts.map((g) => g.id);
  const save = () => setNudgeMessage(eventId, ids, message);

  async function share(g: Gift) {
    await save();
    window.location.assign(lineShareUrl(`${senderName}からプレゼントが届いたよ！`, g.url));
  }

  async function copy(g: Gift) {
    tap();
    await save();
    await navigator.clipboard.writeText(g.url);
    setCopied(g.id);
    setTimeout(() => setCopied(null), 2000);
  }

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
          <div key={g.id} className="flex gap-2">
            <button type="button" onClick={() => share(g)} className={buttonClassName("accent", "flex-1")}>
              LINEで{g.toName}さんに渡す
            </button>
            <button type="button" onClick={() => copy(g)} className={buttonClassName("secondary", "!w-auto shrink-0 !px-4")}>
              {copied === g.id ? "コピーした" : "コピー"}
            </button>
          </div>
        ))}
        <Link href={`/events/${eventId}`} className="py-2 text-center text-[15px] leading-[1.6] font-bold text-brand">
          回答状況に戻る
        </Link>
      </div>
    </>
  );
}
