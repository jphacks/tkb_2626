"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { buttonClassName } from "@/components/Button";
import { GENRE_ICON_SMALL } from "@/lib/genre";
import { tap } from "@/lib/fx";
import { toJstParts } from "@/lib/time";

export type HistoryItem = {
  id: string;
  title: string;
  genre: string | null;
  date: string;
  status: "DECIDED" | "CANCELED" | "EXPIRED";
  detail: string;
  href: string;
  canDecide: boolean;
};

const ROW = 48;
const VISIBLE = 330;

// C2 のドラムピッカー: 上下にスワイプで回し、中央で止まった調整の詳細を下に出す
export function HistoryDrum({ items }: { items: HistoryItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pad = (VISIBLE - ROW) / 2;
  const current = items[index];

  return (
    <div className="flex flex-col gap-3 px-6 pt-1">
      <div className="relative h-[330px] overflow-hidden rounded-lg bg-card shadow-soft">
        <div className="pointer-events-none absolute inset-x-2 top-[141px] h-12 rounded-md border-y border-muted bg-brand-soft" />
        <div className="pointer-events-none absolute top-0 bottom-0 left-[132px] w-px bg-sunken" />
        <div
          ref={ref}
          onScroll={(e) => {
            const i = Math.max(0, Math.min(items.length - 1, Math.round(e.currentTarget.scrollTop / ROW)));
            if (i !== index) {
              tap();
              setIndex(i);
            }
          }}
          className="relative h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none]"
          style={{ paddingTop: pad, paddingBottom: pad }}
        >
          {items.map((it, i) => {
            const dist = Math.abs(i - index);
            const size = [22, 17, 14, 11][Math.min(dist, 3)];
            const opacity = [1, 0.6, 0.32, 0.15][Math.min(dist, 3)];
            const d = toJstParts(new Date(it.date));
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => ref.current?.scrollTo({ top: i * ROW, behavior: "smooth" })}
                className="flex h-12 w-full snap-center items-center text-left font-bold"
                style={{ opacity, fontSize: size }}
              >
                <span className={`w-[132px] shrink-0 text-center whitespace-nowrap ${dist === 0 ? "text-brand" : ""}`}>
                  {d.month}月 {d.day}日
                </span>
                <span className="flex min-w-0 items-center gap-2 pl-4">
                  {it.genre && <Image src={GENRE_ICON_SMALL[it.genre]} alt="" width={size + 8} height={size + 8} />}
                  <span className="truncate">{it.title}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-white to-white/0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-b from-white/0 to-white" />
      </div>
      <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">上下にスワイプで回す・中央で止まる</p>

      {current && (
        <section className="flex w-full flex-col gap-2 rounded-lg bg-card p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-[15px] leading-[1.6] font-bold">
            <Image src="/figma/icon-clock-16.svg" alt="" width={16} height={16} />
            {current.detail}
          </p>
          <p className="text-xs leading-[1.5] font-medium text-ink-sub">{current.title}</p>
          <Link href={current.canDecide ? `${current.href}/decide` : current.href} className={buttonClassName("primary")}>
            {current.canDecide ? "日程を決める" : "くわしく見る"}
          </Link>
        </section>
      )}
    </div>
  );
}
