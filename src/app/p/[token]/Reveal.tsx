"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClassName } from "@/components/Button";

type Props = { fromName: string; count: number; message: string | null; answerHref: string; reduceEffects: boolean };

const STICKER = {
  sunken: "bg-sunken text-ink shadow-soft",
  accent: "bg-accent text-ink",
  soft: "bg-brand-soft text-brand",
} as const;

function Sticker({ tone, x, y, r, size = 13, children }: { tone: keyof typeof STICKER; x: number; y: number; r: number; size?: number; children: React.ReactNode }) {
  return (
    <span
      className={`absolute rounded-pill px-3 py-1.5 leading-[1.4] font-bold tracking-[0.02em] whitespace-nowrap ${STICKER[tone]}`}
      style={{ left: x, top: y, transform: `rotate(${r}deg)`, fontSize: size }}
    >
      {children}
    </span>
  );
}

// R3-a パーン！ → R3-b① ドンッ！！ → R3-b② 落ち着くまで◯連打。最後に回答へ
export function Reveal({ fromName, count, message, answerHref, reduceEffects }: Props) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage !== 1) return;
    if (!reduceEffects && "vibrate" in navigator) {
      // ドンッ→ゴゴゴゴ（連打数に比例）
      const rumble = Array.from({ length: Math.min(20, Math.ceil(count / 5)) }, () => [40, 30]).flat();
      navigator.vibrate?.([300, 120, ...rumble]);
    }
    const t = setTimeout(() => setStage(2), 1400);
    return () => clearTimeout(t);
  }, [stage, count, reduceEffects]);

  return (
    <main className="fixed inset-0 z-50 mx-auto max-w-[430px] overflow-hidden" onClick={() => stage < 2 && setStage((s) => s + 1)}>
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
  return (
    <div className="absolute inset-0 cursor-pointer bg-brand">
      <Image src="/figma/fx-sunburst-a.svg" alt="" width={840} height={840} className={`absolute top-[-40px] left-[-225px] max-w-none ${reduceEffects ? "" : "animate-[spin_24s_linear_infinite]"}`} />
      <Image src="/figma/fx-confetti.svg" alt="" width={390} height={844} className="absolute inset-0" />
      <div className="absolute top-[470px] left-[110px] h-[130px] w-[170px] overflow-hidden rounded-md bg-accent shadow-pop">
        <span className="absolute inset-y-0 left-[73px] w-6 bg-alert" />
      </div>
      <div className="absolute top-[288px] left-[21px] h-11 w-[196px] -rotate-24 overflow-hidden rounded-sm bg-accent shadow-pop">
        <span className="absolute inset-y-0 left-[86px] w-6 bg-alert" />
      </div>
      <Image src="/figma/mascot-sloth-excited.svg" alt="" width={120} height={120} className="absolute top-[372px] left-[135px]" />
      <Sticker tone="sunken" x={100} y={284} r={-7.5}>はよ〜〜！</Sticker>
      <Sticker tone="accent" x={30} y={372} r={-20}>はよ〜〜！</Sticker>
      <Sticker tone="soft" x={315} y={316} r={10}>はよ〜〜！</Sticker>
      <Sticker tone="sunken" x={330} y={432} r={20}>はよ〜〜！</Sticker>
      <Sticker tone="accent" x={43} y={538} r={13.6}>はよ〜〜！</Sticker>
      <Sticker tone="soft" x={330} y={530} r={-13}>はよ〜〜！</Sticker>
      <Sticker tone="sunken" x={162} y={262} r={15.3}>はよ〜〜！</Sticker>
      <Sticker tone="accent" x={126} y={350} r={8.6}>はよ〜〜！</Sticker>
      <Sticker tone="soft" x={260} y={238} r={-15}>はよ〜〜！</Sticker>
      <Image src="/figma/r3-star-1.svg" alt="" width={40} height={40} className="absolute top-[170px] left-10" />
      <Image src="/figma/r3-star-2.svg" alt="" width={28} height={28} className="absolute top-[190px] left-[320px]" />
      <Image src="/figma/r3-star-3.svg" alt="" width={26} height={26} className="absolute top-[640px] left-[60px]" />
      <Image src="/figma/r3-star-4.svg" alt="" width={36} height={36} className="absolute top-[660px] left-[300px]" />
      <Image src="/figma/r3-star-5.svg" alt="" width={20} height={20} className="absolute top-[140px] left-[180px]" />
      <Sticker tone="accent" x={38} y={104} r={8} size={18}>{count}連！</Sticker>
      <p className="absolute top-[640px] left-[80px] rotate-6 font-display text-[56px] leading-[1.2] text-accent [text-shadow:0_4px_0_#183238]">パーン！</p>
      <p className="absolute top-[740px] w-full text-center text-[15px] leading-[1.6] font-bold text-white">{fromName}から</p>
      <p className="absolute top-[790px] w-full text-center text-xs font-medium text-white/80">タップして開ける</p>
    </div>
  );
}

function Don({ reduceEffects }: { reduceEffects: boolean }) {
  return (
    <div className="absolute inset-0 cursor-pointer bg-[radial-gradient(ellipse_195px_917px_at_center,#fff_0%,#f4e01c_45%,#d4be00_75%,#183238_100%)]">
      <Image src="/figma/fx-sunburst-b.svg" alt="" width={840} height={840} className={`absolute top-[2px] left-[-225px] max-w-none ${reduceEffects ? "" : "animate-[spin_12s_linear_infinite]"}`} />
      <Image src="/figma/mascot-sloth-don.svg" alt="" width={221} height={221} className={`absolute top-[300px] left-[85px] ${reduceEffects ? "" : "animate-bounce"}`} />
      <p className="absolute top-[170px] left-0 rotate-6 font-display text-[76px] whitespace-nowrap text-white [text-shadow:0_0_52px_#f4e01c,0_0_22px_rgba(255,255,255,0.9)]">ドンッ！！</p>
      <Image src="/figma/fx-anger-1.svg" alt="" width={70} height={70} className="absolute top-[243px] left-[265px] -rotate-10" />
      <Image src="/figma/fx-anger-2.svg" alt="" width={54} height={54} className="absolute top-[626px] left-[53px] rotate-14" />
      <Image src="/figma/fx-anger-3.svg" alt="" width={40} height={40} className="absolute top-[560px] left-[300px]" />
    </div>
  );
}

function Calm({ fromName, count, message, answerHref, reduceEffects }: { fromName: string; count: number; message: string | null; answerHref: string; reduceEffects: boolean }) {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_195px_917px_at_center,#fff_0%,#f4e01c_15%,#d4be00_40%,#183238_70%)]">
      <Image src="/figma/fx-sunburst-c.svg" alt="" width={1008} height={1008} className={`absolute top-[-104px] left-[-309px] max-w-none ${reduceEffects ? "" : "animate-[spin_30s_linear_infinite]"}`} />
      <Sticker tone="sunken" x={34} y={44} r={21}>はよ〜〜！</Sticker>
      <Sticker tone="soft" x={232} y={52} r={3.6} size={18}>返事して！</Sticker>
      <Sticker tone="sunken" x={129} y={222} r={13.6} size={19}>おーい！！</Sticker>
      <Sticker tone="accent" x={-30} y={620} r={21} size={17}>おーい！！</Sticker>
      <Sticker tone="soft" x={322} y={628} r={11} size={14}>まだ〜！？</Sticker>
      <Image src="/figma/fx-anger-1.svg" alt="" width={64} height={64} className="absolute top-[100px] left-[72px] -rotate-12" />
      <Image src="/figma/fx-anger-2.svg" alt="" width={62} height={62} className="absolute top-[410px] left-[236px] -rotate-18" />
      <Image src="/figma/fx-anger-3.svg" alt="" width={40} height={40} className="absolute top-[236px] left-[86px] rotate-10" />
      <Image src="/figma/fx-bolt-1.svg" alt="" width={33} height={52} className="absolute top-[225px] left-[31px] -rotate-28" />
      <Image src="/figma/fx-bolt-2.svg" alt="" width={41} height={66} className="absolute top-[344px] left-[319px] rotate-14" />
      <Image src="/figma/fx-bolt-3.svg" alt="" width={60} height={95} className="absolute top-[436px] left-[64px] -rotate-28" />
      <Image src="/figma/fx-bolt-4.svg" alt="" width={58} height={92} className="absolute top-[653px] left-[335px] rotate-20" />
      <Image src="/figma/mascot-sloth-calm.svg" alt="" width={259} height={256} className="absolute top-[255px] left-[66px]" />
      <Image src="/figma/fx-steam-1.svg" alt="" width={48} height={38} className="absolute top-[286px] left-[76px]" />
      <Image src="/figma/fx-steam-2.svg" alt="" width={54} height={43} className="absolute top-[282px] left-[256px]" />
      <p className="absolute top-[176px] left-[26px] rotate-5 font-display text-[54px] whitespace-nowrap text-white [text-shadow:0_0_38px_#f4e01c,0_0_16px_rgba(255,255,255,0.9)]">はよ〜〜！！</p>
      <span className="absolute top-[104px] left-[166px] rotate-8 rounded-pill bg-alert px-3 py-1.5 text-[14.5px] leading-[1.4] font-bold whitespace-nowrap">
        {message ? `「${message}」` : `${count}連打でやっと落ち着いた`}
      </span>
      <span className="absolute top-[256px] left-[74px] rotate-3 rounded-pill bg-sunken px-3.5 py-1.5 text-[15.6px] leading-[1.4] font-bold whitespace-nowrap shadow-soft">
        {fromName}から {count}連打 とどいた
      </span>
      <p className="absolute top-[40px] left-2.5 font-display text-lg text-white [text-shadow:0_2px_0_rgba(24,50,56,0.8)]">ゴゴゴゴ…</p>
      <p className="absolute top-[488px] w-full text-center text-xl font-bold text-white">{fromName}が落ち着くのに</p>
      <p className="absolute top-[512px] w-full text-center font-dot text-[110px] leading-none text-accent [-webkit-text-stroke:3px_#183238] [paint-order:stroke_fill] [text-shadow:0_0_66px_white,0_0_27px_rgba(255,255,255,0.9)]">{count}</p>
      <p className="absolute top-[640px] w-full text-center text-[22px] font-bold text-white [text-shadow:0_0_17px_#f4e01c,0_0_7px_rgba(255,255,255,0.9)]">連打かかりました</p>
      <div className="absolute inset-x-6 bottom-[max(34px,env(safe-area-inset-bottom))]">
        <Link href={answerHref} className={buttonClassName("primary")}>
          返事する
        </Link>
      </div>
    </div>
  );
}
