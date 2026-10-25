"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/Button";
import { tap } from "@/lib/fx";
import { copyText, withExternalBrowser } from "@/lib/share";

// 送り先は人それぞれなので、リンクをコピーして自分で貼ってもらう。before はコピーの前にしておくこと（ひとことの保存など）
export function CopyLinkButton({
  url,
  label = "リンクをコピー",
  variant = "accent",
  small = false,
  before,
}: {
  url: string;
  label?: string;
  variant?: "primary" | "accent" | "secondary";
  small?: boolean;
  before?: () => Promise<unknown>;
}) {
  const [state, setState] = useState<"ok" | "ng" | null>(null);

  async function copy() {
    tap();
    await before?.();
    setState((await copyText(withExternalBrowser(url))) ? "ok" : "ng");
    setTimeout(() => setState(null), 2500);
  }

  const text = state === "ok" ? "コピーしたよ！" : state === "ng" ? "コピーできなかった…" : label;
  return small ? (
    <button type="button" onClick={copy} className="shrink-0 rounded-pill bg-accent px-3 py-2 text-[13px] font-bold drop-shadow-pop">
      {text}
    </button>
  ) : (
    <button type="button" onClick={copy} className={buttonClassName(variant)}>
      {text}
    </button>
  );
}
