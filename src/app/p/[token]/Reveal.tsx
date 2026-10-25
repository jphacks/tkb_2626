"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClassName } from "@/components/Button";
import { sfxPop, sfxTaiko, shake } from "@/lib/fx";

type Props = { fromName: string; count: number; message: string | null; answerHref: string; reduceEffects: boolean };

const STICKER = {
  sunken: "bg-sunken text-ink shadow-soft",
  accent: "bg-accent text-ink",
  soft: "bg-brand-soft text-brand",
} as const;

// delay を渡すと、その時間にぽんっと出てくる
function Sticker({ tone, x, y, r, size = 13, delay, children }: { tone: keyof typeof STICKER; x: number; y: number; r: number; size?: number; delay?: number; children: React.ReactNode }) {
  return (
    <span
      className={`absolute ${delay != null ? "animate-[pop-in_400ms_cubic-bezier(.2,1.6,.4,1)_backwards]" : ""}`}
      style={{ left: x, top: y, animationDelay: delay != null ? `${delay}ms` : undefined }}
    >
      <span
        className={`block rounded-pill px-3 py-1.5 leading-[1.4] font-bold tracking-[0.02em] whitespace-nowrap ${STICKER[tone]}`}
        style={{ transform: `rotate(${r}deg)`, fontSize: size }}
      >
        {children}
      </span>
    </span>
  );
}

const popIn = (delay: number, ms = 400) => ({
  className: "animate-[pop-in_var(--d)_cubic-bezier(.2,1.6,.4,1)_backwards]",
  style: { animationDelay: `${delay}ms`, ["--d" as string]: `${ms}ms` },
});

// R3-a パーン！ → R3-b① ドンッ！！ → R3-b② 落ち着くまで◯連打。自動で進み、タップで早送り。最後に回答へ
export function Reveal({ fromName, count, message, answerHref, reduceEffects }: Props) {
  const [stage, setStage] = useState(0);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (stage === 0) {
      const t1 = setTimeout(sfxPop, 600);
      const t2 = setTimeout(() => setStage(1), 2600);
      return () => (clearTimeout(t1), clearTimeout(t2));
    }
    if (stage !== 1) return;
    const t1 = setTimeout(() => {
      sfxTaiko();
      if (!reduceEffects && "vibrate" in navigator) {
        // ドンッ→ゴゴゴゴ（連打数に比例）
        const rumble = Array.from({ length: Math.min(20, Math.ceil(count / 5)) }, () => [40, 30]).flat();
        navigator.vibrate?.([300, 120, ...rumble]);
      }
    }, 200);
    const t2 = setTimeout(() => rootRef.current && !reduceEffects && shake(rootRef.current, 10, 450), 380);
    const t3 = setTimeout(() => setStage(2), 1800);
    return () => (clearTimeout(t1), clearTimeout(t2), clearTimeout(t3));
  }, [stage, count, reduceEffects]);

  return (
    <main ref={rootRef} className="fixed inset-0 z-50 mx-auto max-w-[430px] overflow-hidden" onClick={() => stage < 2 && setStage((s) => s + 1)}>
      <div className="absolute top-1/2 left-1/2 h-[844px] w-[390px] -translate-x-1/2 -translate-y-1/2">
        {stage === 0 && <Burst fromName={fromName} count={count} reduceEffects={reduceEffects} />}
        {stage === 1 && <Don reduceEffects={reduceEffects} />}
        {stage === 2 && <Calm fromName={fromName} count={count} message={message} answerHref={answerHref} reduceEffects={reduceEffects} />}
      </div>
      {stage === 1 && !reduceEffects && <div className="pointer-events-none absolute inset-0 bg-accent opacity-0 animate-[flash_1s_linear_1]" />}
    </main>
  );
}

function Burst({ fromName, count, reduceEffects }: { fromName: string; count: number; reduceEffects: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);

  // 箱がガタガタ揺れてから、ふくらんではじける
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (!reduceEffects) shake(box, 6, 600);
    box.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 500, delay: 600 });
  }, [reduceEffects]);

  const stickers: [keyof typeof STICKER, number, number, number][] = [
    ["sunken", 100, 284, -7.5],
    ["accent", 30, 372, -20],
    ["soft", 315, 316, 10],
    ["sunken", 330, 432, 20],
    ["accent", 43, 538, 13.6],
    ["soft", 330, 530, -13],
    ["sunken", 162, 262, 15.3],
    ["accent", 126, 350, 8.6],
    ["soft", 260, 238, -15],
  ];
  const stars = [
    { src: "/figma/r3-star-1.svg", size: 40, cls: "top-[170px] left-10" },
    { src: "/figma/r3-star-2.svg", size: 28, cls: "top-[190px] left-[320px]" },
    { src: "/figma/r3-star-3.svg", size: 26, cls: "top-[640px] left-[60px]" },
    { src: "/figma/r3-star-4.svg", size: 36, cls: "top-[660px] left-[300px]" },
    { src: "/figma/r3-star-5.svg", size: 20, cls: "top-[140px] left-[180px]" },
  ];

  return (
    <div className="absolute inset-0 cursor-pointer bg-brand">
      <Image src="/figma/fx-sunburst-a.svg" alt="" width={840} height={840} className={`absolute top-[-40px] left-[-225px] max-w-none ${reduceEffects ? "" : "animate-[spin_20s_linear_infinite]"}`} />
      <Image
        src="/figma/fx-confetti.svg"
        alt=""
        width={390}
        height={844}
        className="absolute inset-0 animate-[pop-in_700ms_cubic-bezier(.1,.9,.3,1)_900ms_backwards]"
      />
      <div ref={boxRef} className="absolute top-[470px] left-[110px] h-[130px] w-[170px] overflow-hidden rounded-md bg-accent shadow-pop">
        <span className="absolute inset-y-0 left-[73px] w-6 bg-alert" />
      </div>
      <div className="absolute top-[288px] left-[21px] h-11 w-[196px] -rotate-24 overflow-hidden rounded-sm bg-accent shadow-pop">
        <span className="absolute inset-y-0 left-[86px] w-6 bg-alert" />
      </div>
      <Image src="/figma/mascot-sloth-excited.svg" alt="" width={120} height={120} className="absolute top-[372px] left-[135px]" />
      {stickers.map(([tone, x, y, r], i) => (
        <Sticker key={i} tone={tone} x={x} y={y} r={r} delay={900 + i * 40}>
          はよ〜〜！
        </Sticker>
      ))}
      {stars.map((st, i) => (
        <Image key={st.src} src={st.src} alt="" width={st.size} height={st.size} className={`absolute ${st.cls} ${popIn(0, 400).className}`} style={popIn(900 + (stickers.length + i) * 40).style} />
      ))}
      <Sticker tone="accent" x={38} y={104} r={8} size={18} delay={900}>
        {count}連！
      </Sticker>
      <p className="absolute top-[640px] left-[80px] rotate-6 font-display text-[56px] leading-[1.2] text-accent [text-shadow:0_4px_0_#183238]">パーン！</p>
      <p className="absolute top-[740px] w-full text-center text-[15px] leading-[1.6] font-bold text-white">{fromName}から</p>
      <p className="absolute top-[790px] w-full text-center text-xs font-medium text-white/80">タップで先へ</p>
    </div>
  );
}

function Don({ reduceEffects }: { reduceEffects: boolean }) {
  const anger = [
    { src: "/figma/fx-anger-1.svg", size: 70, cls: "top-[243px] left-[265px] -rotate-10" },
    { src: "/figma/fx-anger-2.svg", size: 54, cls: "top-[626px] left-[53px] rotate-14" },
    { src: "/figma/fx-anger-3.svg", size: 40, cls: "top-[560px] left-[300px]" },
  ];
  return (
    <div className="absolute inset-0 cursor-pointer bg-[radial-gradient(ellipse_195px_917px_at_center,#fff_0%,#f4e01c_45%,#d4be00_75%,#183238_100%)]">
      <Image src="/figma/fx-sunburst-b.svg" alt="" width={840} height={840} className={`absolute top-[2px] left-[-225px] max-w-none ${reduceEffects ? "" : "animate-[spin_12s_linear_infinite]"}`} />
      {/* 上から叩きつけるように登場 */}
      <Image
        src="/figma/mascot-sloth-don.svg"
        alt=""
        width={221}
        height={221}
        className="absolute top-[300px] left-[85px] animate-[slam_380ms_ease-in_backwards]"
      />
      <p className="absolute top-[170px] left-0 rotate-6 font-display text-[76px] whitespace-nowrap text-white [text-shadow:0_0_52px_#f4e01c,0_0_22px_rgba(255,255,255,0.9)]">ドンッ！！</p>
      {anger.map((a, i) => (
        <span key={a.src} className={`absolute ${a.cls}`}>
          <Image src={a.src} alt="" width={a.size} height={a.size} className={popIn(0).className} style={popIn(420 + i * 80, 300).style} />
        </span>
      ))}
    </div>
  );
}

function Calm({ fromName, count, message, answerHref, reduceEffects }: { fromName: string; count: number; message: string | null; answerHref: string; reduceEffects: boolean }) {
  const [shown, setShown] = useState(0);

  // 連打数を0から数え上げる
  useEffect(() => {
    const step = Math.max(1, Math.round(count / 33));
    const t = setInterval(() => setShown((n) => (n + step >= count ? (clearInterval(t), count) : n + step)), 40);
    return () => clearInterval(t);
  }, [count]);

  const stickers: [keyof typeof STICKER, number, number, number, number, string][] = [
    ["sunken", 34, 44, 21, 13, "はよ〜〜！"],
    ["soft", 232, 52, 3.6, 18, "返事して！"],
    ["sunken", 129, 222, 13.6, 19, "おーい！！"],
    ["accent", -30, 620, 21, 17, "おーい！！"],
    ["soft", 322, 628, 11, 14, "まだ〜！？"],
  ];

  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_195px_917px_at_center,#fff_0%,#f4e01c_15%,#d4be00_40%,#183238_70%)]">
      <Image src="/figma/fx-sunburst-c.svg" alt="" width={1008} height={1008} className={`absolute top-[-104px] left-[-309px] max-w-none ${reduceEffects ? "" : "animate-[spin_16s_linear_infinite]"}`} />
      <Image
        src="/figma/fx-sunburst-c.svg"
        alt=""
        width={1008}
        height={1008}
        className={`absolute top-[-104px] left-[-309px] max-w-none opacity-40 ${reduceEffects ? "" : "animate-[spin_16s_linear_infinite_reverse]"}`}
      />
      {stickers.map(([tone, x, y, r, size, text], i) => (
        <Sticker key={i} tone={tone} x={x} y={y} r={r} size={size} delay={i * 90}>
          {text}
        </Sticker>
      ))}
      <Image src="/figma/fx-anger-1.svg" alt="" width={64} height={64} className="absolute top-[100px] left-[72px] -rotate-12" />
      <Image src="/figma/fx-anger-2.svg" alt="" width={62} height={62} className="absolute top-[410px] left-[236px] -rotate-18" />
      <Image src="/figma/fx-anger-3.svg" alt="" width={40} height={40} className="absolute top-[236px] left-[86px] rotate-10" />
      <Image src="/figma/fx-bolt-1.svg" alt="" width={33} height={52} className="absolute top-[225px] left-[31px] -rotate-28" />
      <Image src="/figma/fx-bolt-2.svg" alt="" width={41} height={66} className="absolute top-[344px] left-[319px] rotate-14" />
      <Image src="/figma/fx-bolt-3.svg" alt="" width={60} height={95} className="absolute top-[436px] left-[64px] -rotate-28" />
      <Image src="/figma/fx-bolt-4.svg" alt="" width={58} height={92} className="absolute top-[653px] left-[335px] rotate-20" />
      {/* 怒りがおさまらず小刻みに震える */}
      <Image
        src="/figma/mascot-sloth-calm.svg"
        alt=""
        width={259}
        height={256}
        className={`absolute top-[255px] left-[66px] ${reduceEffects ? "" : "animate-[jitter_90ms_linear_20_alternate]"}`}
      />
      <Image src="/figma/fx-steam-1.svg" alt="" width={48} height={38} className="fx-loop absolute top-[286px] left-[76px] animate-[steam_900ms_ease-out_infinite]" />
      <Image
        src="/figma/fx-steam-2.svg"
        alt=""
        width={54}
        height={43}
        className="fx-loop absolute top-[282px] left-[256px] animate-[steam_900ms_ease-out_150ms_infinite]"
      />
      <p
        className={`absolute top-[176px] left-[26px] rotate-5 font-display text-[54px] whitespace-nowrap text-white [text-shadow:0_0_38px_#f4e01c,0_0_16px_rgba(255,255,255,0.9)] ${reduceEffects ? "" : "animate-[blink_333ms_linear_3]"}`}
      >
        はよ〜〜！！
      </p>
      <span className="absolute top-[104px] left-[166px] rotate-8 rounded-pill bg-alert px-3 py-1.5 text-[14.5px] leading-[1.4] font-bold whitespace-nowrap">
        {message ? `「${message}」` : `${count}連打でやっと落ち着いた`}
      </span>
      <span className="absolute top-[256px] left-[74px] rotate-3 rounded-pill bg-sunken px-3.5 py-1.5 text-[15.6px] leading-[1.4] font-bold whitespace-nowrap shadow-soft">
        {fromName}から {count}連打 とどいた
      </span>
      <p className="absolute top-[40px] left-2.5 font-display text-lg text-white [text-shadow:0_2px_0_rgba(24,50,56,0.8)]">ゴゴゴゴ…</p>
      <p className="absolute top-[488px] w-full text-center text-xl font-bold text-white">{fromName}が落ち着くのに</p>
      <p className="absolute top-[512px] w-full text-center font-dot text-[110px] leading-none text-accent tabular-nums [-webkit-text-stroke:4px_#183238] [paint-order:stroke_fill] [text-shadow:0_6px_0_#183238,0_0_40px_rgba(255,255,255,0.9)]">
        {shown}
      </p>
      <p className="absolute top-[640px] w-full text-center text-[22px] font-bold text-white [text-shadow:0_0_17px_#f4e01c,0_0_7px_rgba(255,255,255,0.9)]">連打かかりました</p>
      <div className="absolute inset-x-6 bottom-[max(34px,env(safe-area-inset-bottom))]">
        <Link href={answerHref} className={buttonClassName("primary")}>
          返事する
        </Link>
      </div>
    </div>
  );
}
