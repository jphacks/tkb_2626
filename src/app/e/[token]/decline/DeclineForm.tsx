"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, buttonClassName } from "@/components/Button";
import { declineEvent } from "../actions";
import { tap } from "@/lib/fx";

const TEMPLATES = ["今回はごめん！", "また誘って", "予定が合わなくて"];

export function DeclineForm({ token, title, ownerName, note: initial }: { token: string; title: string; ownerName: string; note: string }) {
  const [note, setNote] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <main className="flex flex-1 flex-col pt-11">
      <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-12">
        <Image src="/figma/mascot-sloth-angry.svg" alt="" width={128} height={128} />
        <h1 className="text-center font-display text-[28px] leading-[1.3]">
          了解！
          <br />
          {ownerName}さんに伝えるね
        </h1>
        <p className="text-center text-[15px] leading-[1.6] font-medium text-ink-sub">「{title}」は不参加で返信します</p>

        <section className="flex w-full flex-col gap-2.5 rounded-lg bg-card p-4 shadow-soft">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] leading-[1.6] font-bold">ひとこと添える</p>
            <p className="text-xs leading-[1.5] font-medium text-ink-sub">（なくてもOK）</p>
          </div>
          <p className="text-xs leading-[1.5] font-medium text-ink-sub">タップで入力できるよ</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  tap();
                  setNote(t);
                }}
                className={`rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${note === t ? "bg-brand text-white" : "bg-sunken shadow-soft"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="今回はごめん！次は行く！"
            className="w-full rounded-md bg-sunken p-3 text-[15px] leading-[1.6] font-medium caret-brand outline-none placeholder:text-ink-sub/50"
          />
        </section>
      </div>

      <footer className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Button type="button" variant="primary" disabled={pending} onClick={() => startTransition(() => declineEvent(token, note))}>
          {pending ? "送っています…" : "不参加で送る"}
        </Button>
        <Link href={`/e/${token}/answer`} className={buttonClassName("secondary")}>
          やっぱり参加する
        </Link>
      </footer>
    </main>
  );
}
