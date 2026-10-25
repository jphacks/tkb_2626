"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { sendNudges } from "./actions";

const MAX = 100;
const STICKER_TONES = ["bg-sunken text-ink shadow-soft", "bg-accent text-ink", "bg-brand-soft text-brand"];
const SFX = [
  { text: "デュクシッ！", className: "top-[204px] left-[7px] -rotate-8 text-[44px] text-accent" },
  { text: "ズドッ", className: "top-[347px] left-[240px] -rotate-12 text-[22px] text-brand-soft" },
  { text: "ドゥクシ！", className: "top-[518px] left-0 rotate-10 text-[26px] text-white" },
];

// 擬似乱数（同じ順番で毎回同じ位置に積もる）
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// S4 v6: 連打ボタンと、積もっていく「はよ〜〜！」だけの画面
export function MashPad({ eventId, to }: { eventId: string; to: string }) {
  const [count, setCount] = useState(0);
  const [bump, setBump] = useState(0);
  const [pending, startTransition] = useTransition();

  const stickers = useMemo(
    () =>
      Array.from({ length: MAX }, (_, i) => ({
        left: rand(i, 1) * 300 - 20,
        bottom: Math.floor(i / 8) * 18 + rand(i, 2) * 14 - 6,
        rotate: rand(i, 3) * 40 - 20,
        tone: STICKER_TONES[Math.floor(rand(i, 4) * 3)],
      })),
    [],
  );

  function mash() {
    if (count >= MAX) return;
    setCount((c) => Math.min(MAX, c + 1));
    setBump((b) => b + 1);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(15);
  }

  return (
    <>
      <div className="relative mx-6 mt-2 flex-1 overflow-hidden rounded-lg bg-brand-soft" style={{ minHeight: 600 }}>
        {/* 積もる「はよ〜〜！」 */}
        {stickers.slice(0, Math.min(count, 64)).map((s, i) => (
          <span
            key={i}
            className={`absolute rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] whitespace-nowrap ${s.tone}`}
            style={{ left: s.left, bottom: s.bottom, transform: `rotate(${s.rotate}deg)` }}
          >
            はよ〜〜！
          </span>
        ))}

        <p className="absolute top-6 left-1/2 flex -translate-x-1/2 items-baseline gap-1.5 font-display text-brand">
          <span className="text-[56px] leading-[1.2]">{count}</span>
          <span className="text-[28px] leading-[1.4]">連</span>
        </p>

        {/* ゲージ */}
        <p className="absolute top-[18px] right-2.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand">{MAX}</p>
        <div className="absolute top-10 right-4 bottom-4 w-3.5 overflow-hidden rounded-pill bg-card">
          <div className="absolute inset-x-0 bottom-0 rounded-pill bg-alert transition-[height]" style={{ height: `${(count / MAX) * 100}%` }} />
        </div>

        {/* 効果音（押すたびに入れ替わる） */}
        {count > 0 && (
          <p key={bump} className={`pointer-events-none absolute font-display whitespace-nowrap [text-shadow:0_4px_0_#183238] ${SFX[bump % SFX.length].className}`}>
            {SFX[bump % SFX.length].text}
          </p>
        )}

        <div className="absolute top-[302px] left-1/2 size-[250px] -translate-x-1/2">
          <Image src="/figma/impact-burst.svg" alt="" width={244} height={250} className="absolute inset-0 m-auto" />
          <button
            type="button"
            onClick={mash}
            disabled={count >= MAX}
            className="absolute top-[45px] left-[47px] flex size-[155px] flex-col items-center justify-center rounded-pill bg-accent shadow-[0_3.7px_0_#183238] transition active:scale-90 disabled:opacity-60"
          >
            <span className="font-display text-[26px] leading-[1.3]">連打</span>
            <span className="text-xs leading-[1.4] font-bold tracking-[0.24px]">{count >= MAX ? "満タン！" : "タップ！"}</span>
          </button>
        </div>
      </div>

      <div className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Button type="button" variant="primary" disabled={count === 0 || pending} onClick={() => startTransition(() => sendNudges(eventId, to, count))}>
          {pending ? "包んでいます…" : count === 0 ? "連打してね" : `${count}コのはよ〜〜！をプレゼントで送る`}
        </Button>
      </div>
    </>
  );
}
