"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

// 締切までの残り時間（時:分:秒）。1秒ごとに更新
export function Countdown({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const left = now === null ? 0 : Math.max(0, Math.floor((end - now) / 1000));
  const text = now === null ? "--:--:--" : `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
  return <span suppressHydrationWarning>{text}</span>;
}
