import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

// Figma の TopBar: 戻る・タイトル・右上のロゴステッカー（常設）
// ロゴを押すとホームへ（home={null} で無効。はじめの画面など）。logoFirst はホーム用で、ロゴを左に置いて右に action
export function TopBar({
  title,
  backHref,
  tone = "ink",
  action,
  leading,
  home = "/home",
  logoFirst = false,
}: {
  title?: string;
  backHref?: string;
  tone?: "ink" | "white";
  action?: ReactNode;
  leading?: ReactNode;
  home?: string | null;
  logoFirst?: boolean;
}) {
  const logo = <Image src="/logo-pochiplease.svg" alt="ぽちぷりーず" width={88} height={32} />;
  const logoEl = home ? (
    <Link href={home} aria-label="ホームへ" className="shrink-0 transition active:scale-95">
      {logo}
    </Link>
  ) : (
    logo
  );

  if (logoFirst) {
    return (
      <header className="flex h-14 w-full shrink-0 items-center gap-2 px-6">
        {logoEl}
        <span className="flex-1" />
        {action}
      </header>
    );
  }

  return (
    <header className="flex h-14 w-full shrink-0 items-center gap-2 px-4">
      {backHref ? (
        <Link href={backHref} aria-label="戻る" className="-m-2.5 p-2.5">
          <Image src={tone === "white" ? "/figma/icon-back-s2.svg" : "/figma/icon-back.svg"} alt="" width={24} height={24} />
        </Link>
      ) : null}
      {leading}
      <p className={`min-w-0 flex-1 text-[17px] leading-[1.5] font-bold ${tone === "white" ? "text-white" : "text-ink"}`}>{title}</p>
      {action}
      {logoEl}
    </header>
  );
}
