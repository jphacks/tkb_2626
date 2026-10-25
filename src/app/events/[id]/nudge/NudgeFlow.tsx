"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { tap } from "@/lib/fx";
import { MashPad } from "./MashPad";

const PHRASES = ["まだ〜？", "おねがい！", "待ってるよ", "ジュース奢る"];

type Target = { id: string; name: string | null; label: string };

// S4 v3 ひとこと → S4 v6 連打。ひとことは相手の開封画面に降ってくる
export function NudgeFlow({ eventId, to, targets }: { eventId: string; to: string; targets: Target[] }) {
  const [step, setStep] = useState<"message" | "mash">("message");
  const [message, setMessage] = useState("はよ〜〜！");

  if (step === "mash") return <MashPad eventId={eventId} to={to} message={message} />;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pt-2">
        <div className="flex flex-col gap-2">
          {targets.map((t) => (
            <div key={t.id} className="flex w-full items-center gap-3 rounded-md bg-card p-3 shadow-soft">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-accent-soft font-display text-xl leading-[1.4]">
                {(t.name ?? "？").slice(0, 1)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-[15px] leading-[1.6] font-bold">{t.name ?? "だれか"} さん</p>
                <p className="truncate text-xs leading-[1.5] font-medium text-ink-sub">{t.label}</p>
              </div>
            </div>
          ))}
        </div>

        <label className="flex w-full flex-col gap-2">
          <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">ひとこと（相手の画面に降ってくる）</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={100}
            placeholder="はよ〜〜！"
            className="w-full rounded-md bg-card p-4 text-[15px] leading-[1.6] font-medium caret-brand shadow-soft outline-none placeholder:text-ink-sub/50"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {PHRASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                tap();
                setMessage(p);
              }}
              className={`rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] drop-shadow-[0_6px_8px_rgba(24,50,56,0.08)] ${
                message === p ? "bg-brand text-white" : "bg-sunken"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            tap();
            setStep("mash");
          }}
        >
          このひとことで連打へ
        </Button>
        <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">連打したあと、プレゼントのリンクができるよ</p>
      </div>
    </>
  );
}
