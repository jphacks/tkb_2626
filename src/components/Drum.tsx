"use client";

import { useEffect, useRef } from "react";
import { tap } from "@/lib/fx";

// ドラムピッカー：上下にスクロールして回し、中央で止まった値を選ぶ。回すたびカチッと鳴る
export function Drum({
  values,
  index,
  onChange,
  itemHeight = 30,
  label,
  variant = "text",
}: {
  values: string[];
  index: number;
  onChange: (i: number) => void;
  itemHeight?: number;
  label: string;
  variant?: "text" | "time";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef(index);
  const drag = useRef<{ y: number; top: number } | null>(null);

  // 外から値が変わったとき（プリセットを押したなど）だけ位置を合わせる
  useEffect(() => {
    const el = ref.current;
    if (!el || current.current === index && Math.round(el.scrollTop / itemHeight) === index) return;
    current.current = index;
    el.scrollTo({ top: index * itemHeight });
  }, [index, itemHeight]);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / itemHeight)));
    if (i === current.current) return;
    current.current = i;
    tap();
    onChange(i);
  }

  function pick(i: number) {
    ref.current?.scrollTo({ top: i * itemHeight, behavior: "smooth" });
  }

  // マウスでもつかんで回せるように
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    drag.current = { y: e.clientY, top: ref.current.scrollTop };
    ref.current.style.scrollSnapType = "none";
    ref.current.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || !ref.current) return;
    ref.current.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  }
  function onPointerUp() {
    if (!drag.current || !ref.current) return;
    drag.current = null;
    ref.current.style.scrollSnapType = "";
    pick(current.current);
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative w-full cursor-grab snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [mask-image:linear-gradient(transparent,#000_30%,#000_70%,transparent)] [&::-webkit-scrollbar]:hidden"
      style={{ height: itemHeight * 3, paddingBlock: itemHeight }}
    >
      {values.map((v, i) => {
        const on = i === index;
        return (
          <div
            key={v}
            role="option"
            aria-selected={on}
            onClick={() => pick(i)}
            className={`flex snap-center items-center justify-center whitespace-nowrap transition-[font-size,opacity,color] duration-100 select-none ${
              variant === "time" ? "font-dot" : "font-sans"
            } ${on ? `${variant === "time" ? "text-[22px] text-brand" : "text-[17px] font-bold text-ink"} opacity-100` : `${variant === "time" ? "text-[15px]" : "text-[13px] font-medium"} text-ink-sub opacity-45`}`}
            style={{ height: itemHeight }}
          >
            {v}
          </div>
        );
      })}
    </div>
  );
}
