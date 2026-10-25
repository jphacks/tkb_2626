"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { pop, tap } from "@/lib/fx";
import { copyText, withExternalBrowser } from "@/lib/share";

// S2: リンクを見せて、コピーするだけ（送る手段は相手に合わせて自分で貼ってもらう）
export function ShareButtons({ url }: { url: string }) {
  const [copied, setCopied] = useState<"ok" | "ng" | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  async function copy() {
    tap();
    pop(iconRef.current, 1, 220);
    setCopied((await copyText(withExternalBrowser(url))) ? "ok" : "ng");
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <>
      {/* リンクは長押しで選んでコピーもできるよう、文字として置く */}
      <div className="flex w-full items-center gap-3 rounded-md bg-card p-4 shadow-pop">
        <span className="min-w-0 flex-1 truncate text-[15px] leading-[1.6] font-bold select-all">{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" onClick={copy} aria-label="リンクをコピー" className="shrink-0">
          <span ref={iconRef} className="flex size-11 items-center justify-center rounded-pill bg-accent">
            <Image src="/figma/icon-copy.svg" alt="" width={24} height={24} />
          </span>
        </button>
      </div>
      <Button type="button" variant="accent" onClick={copy}>
        {copied === "ok" ? "コピーしたよ！" : "リンクをコピー"}
      </Button>
      {copied === "ng" && <p className="-mt-3 text-xs font-medium text-white">コピーできなかった…上のリンクを長押ししてコピーしてね</p>}
    </>
  );
}
