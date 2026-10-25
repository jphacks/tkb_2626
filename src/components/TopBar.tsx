import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

// Figma の TopBar: 戻る・タイトル・右上のロゴステッカー（常設）
export function TopBar({ title, backHref, tone = "ink", action }: { title?: string; backHref?: string; tone?: "ink" | "white"; action?: ReactNode }) {
  return (
    <header className="flex h-14 w-full shrink-0 items-center gap-2 px-4">
      {backHref ? (
        <Link href={backHref} aria-label="戻る" className="-m-2.5 p-2.5">
          <Image src={tone === "white" ? "/figma/icon-back-s2.svg" : "/figma/icon-back.svg"} alt="" width={24} height={24} />
        </Link>
      ) : null}
      <p className={`min-w-0 flex-1 text-[17px] leading-[1.5] font-bold ${tone === "white" ? "text-white" : "text-ink"}`}>{title}</p>
      {action}
      <Image src="/figma/logo-pochiplease.png" alt="ぽちぷりーず" width={84} height={32} />
    </header>
  );
}
