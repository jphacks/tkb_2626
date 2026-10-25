"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button, buttonClassName } from "@/components/Button";
import { lineShareUrl } from "@/lib/share";
import { pop, tap } from "@/lib/fx";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const message = `「${title}」の日程調整、回答おねがい！`;

  const copyRef = useRef<HTMLButtonElement>(null);

  async function copy() {
    tap();
    pop(copyRef.current, 1, 220);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareOther() {
    if (navigator.share) {
      await navigator.share({ title, text: message, url }).catch(() => {});
    } else {
      await copy();
    }
  }

  return (
    <>
      <div className="flex w-full items-center gap-3 rounded-md bg-card p-4 shadow-pop">
        <p className="min-w-0 flex-1 truncate text-[15px] leading-[1.6] font-bold">{url.replace(/^https?:\/\//, "")}</p>
        <button ref={copyRef} type="button" onClick={copy} aria-label="リンクをコピー" className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-accent">
          <Image src="/figma/icon-copy.svg" alt="" width={24} height={24} />
        </button>
      </div>
      <p className="-my-3 h-4 text-xs font-medium text-white" aria-live="polite">
        {copied ? "コピーしたよ" : ""}
      </p>
      <div className="flex w-full flex-col gap-3">
        <a href={lineShareUrl(message, url)} target="_blank" rel="noopener noreferrer" className={buttonClassName("accent")}>
          LINEで送る
        </a>
        <Button type="button" variant="secondary" onClick={shareOther}>
          その他にシェア
        </Button>
      </div>
    </>
  );
}
