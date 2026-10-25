"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { lessMotion, pop, shake, tap } from "@/lib/fx";
import { sendNudges } from "./actions";

const LIMIT = 10; // 秒
const GAUGE = 100; // ゲージが満タンになる回数
const MAX_PILE = 140; // 積もる「はよ〜〜！」の上限（見た目だけ）
const STICKER_TONES = ["bg-sunken text-ink shadow-soft", "bg-accent text-ink", "bg-brand-soft text-brand"];
const ONOS = [
  { text: "デュクシッ！", className: "text-[44px] text-accent" },
  { text: "ズドッ", className: "text-[30px] text-brand-soft" },
  { text: "ドゥクシ！", className: "text-[34px] text-white" },
];

// 擬似乱数（同じ順番で毎回同じ位置に積もる）
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type Ono = { id: number; kind: number; x: number; y: number; r: number; s: number };

// S4: 10秒のあいだ連打する。押すたびに「はよ〜〜！」が落ちてきて積もり、擬音が飛ぶ
export function MashPad({ eventId, to }: { eventId: string; to: string }) {
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(LIMIT);
  const [done, setDone] = useState(false);
  const [onos, setOnos] = useState<Ono[]>([]);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  const counterRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const burstRef = useRef<HTMLImageElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const onoId = useRef(0);

  // 下の段から4列ずつ、少しずらして積む
  const pile = useMemo(
    () =>
      Array.from({ length: MAX_PILE }, (_, k) => {
        const row = Math.floor(k / 4);
        const col = (k % 4) + (row % 2 ? 0.5 : 0);
        return {
          left: 4 + (col * 204) / 3.5 + (rand(k, 1) * 14 - 7),
          bottom: 16 + row * 15 + (rand(k, 2) * 6 - 3),
          rotate: (rand(k, 3) * 2 - 1) * 18,
          tone: STICKER_TONES[(k * 7) % STICKER_TONES.length],
        };
      }),
    [],
  );

  // 残り時間を進める（最初の1回目から数える）
  useEffect(() => {
    if (count === 0 || done) return;
    let raf = 0;
    const tick = () => {
      const rest = Math.max(0, LIMIT - (performance.now() - startedAt.current) / 1000);
      setLeft(rest);
      if (rest <= 0) {
        setDone(true);
        tap(true);
        counterRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 420 });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // 1回目に始めたら止まるまで回し続ける
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count > 0, done]);

  function mash() {
    if (done) {
      if (counterRef.current) shake(counterRef.current, 6, 260);
      return;
    }
    if (count === 0) startedAt.current = performance.now();
    const n = count + 1;
    setCount(n);
    tap(n % 10 === 0);
    pop(btnRef.current, 0.9, 120);
    if (!lessMotion()) {
      burstRef.current?.animate([{ transform: "scale(.8)", opacity: 0.4 }, { transform: "scale(1.15)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }], { duration: 180 });
      // 擬音はボタンのまわりのランダムな場所に出す
      const ang = Math.random() * Math.PI * 2;
      const rad = 100 + Math.random() * 50;
      const id = ++onoId.current;
      setOnos((list) => [
        ...list.slice(-5),
        { id, kind: Math.floor(Math.random() * ONOS.length), x: 171 + Math.cos(ang) * rad, y: 427 + Math.sin(ang) * rad, r: (Math.random() * 2 - 1) * 20, s: 0.55 + Math.random() * 0.4 },
      ]);
    }
  }

  function send() {
    if (count === 0) {
      if (ctaRef.current) ctaRef.current.animate([0, -6, 6, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })), { duration: 260 });
      tap(true);
      return;
    }
    startTransition(() => sendNudges(eventId, to, count));
  }

  const urgent = count > 0 && left <= 3 && !done;

  return (
    <>
      <div className="relative mx-6 mt-2 flex-1 overflow-hidden rounded-lg bg-brand-soft" style={{ minHeight: 600 }}>
        {/* 積もる「はよ〜〜！」（増えた分だけ上から落ちてくる） */}
        {pile.slice(0, Math.min(count, MAX_PILE)).map((s, i) => (
          <span key={i} className="pointer-events-none absolute animate-[pile-drop_380ms_ease-in]" style={{ left: s.left, bottom: s.bottom }}>
            <span
              className={`block rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] whitespace-nowrap ${s.tone}`}
              style={{ transform: `rotate(${s.rotate}deg)` }}
            >
              はよ〜〜！
            </span>
          </span>
        ))}

        {/* 残り時間 */}
        <p ref={counterRef} className={`absolute top-6 left-1/2 flex -translate-x-1/2 items-baseline gap-1.5 font-display ${urgent ? "text-urgent" : "text-brand"}`}>
          <span className="text-[56px] leading-[1.2] tabular-nums">{left.toFixed(1)}</span>
          <span className="text-[28px] leading-[1.4]">秒</span>
        </p>

        {/* ゲージ */}
        <p className="absolute top-[18px] right-2.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand">{GAUGE}</p>
        <div className="absolute top-10 right-4 bottom-4 w-3.5 overflow-hidden rounded-pill bg-card">
          <div className="absolute inset-x-0 bottom-0 rounded-pill bg-alert transition-[height]" style={{ height: `${(Math.min(count, GAUGE) / GAUGE) * 100}%` }} />
        </div>

        {/* 擬音（押すたびランダムな場所に出て消える） */}
        {onos.map((o) => (
          <p
            key={o.id}
            onAnimationEnd={() => setOnos((list) => list.filter((x) => x.id !== o.id))}
            className={`pointer-events-none absolute z-30 -translate-1/2 font-display whitespace-nowrap [text-shadow:0_4px_0_#183238] animate-[ono-pop_760ms_ease-out_forwards] ${ONOS[o.kind].className}`}
            style={{ left: o.x, top: o.y, ["--r" as string]: `${o.r}deg`, ["--s" as string]: o.s }}
          >
            {ONOS[o.kind].text}
          </p>
        ))}

        <div className="absolute top-[302px] left-1/2 z-20 size-[250px] -translate-x-1/2">
          <Image ref={burstRef} src="/figma/impact-burst.svg" alt="" width={244} height={250} className="absolute inset-0 m-auto" />
          <button
            ref={btnRef}
            type="button"
            onClick={mash}
            className={`absolute top-[45px] left-[47px] flex size-[155px] flex-col items-center justify-center rounded-pill bg-accent shadow-[0_3.7px_0_#183238] ${done ? "grayscale-[.7]" : ""}`}
          >
            <span className="font-display text-[42px] leading-[1.1] tabular-nums">{count}</span>
            <span className="text-xs leading-[1.4] font-bold tracking-[0.24px]">{done ? "おわり！" : count ? "連打！" : "タップで開始"}</span>
          </button>
        </div>
      </div>

      <div className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <div ref={ctaRef} className={done && count > 0 ? "fx-loop animate-[breathe_900ms_ease-in-out_infinite]" : ""}>
          <Button type="button" variant="primary" disabled={pending} onClick={send} className={count === 0 ? "opacity-45" : ""}>
            {pending ? "包んでいます…" : count === 0 ? "連打して はよ〜〜！ をためよう" : `${count}コのはよ〜〜！をプレゼントで送る`}
          </Button>
        </div>
      </div>
    </>
  );
}
