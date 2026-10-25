"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// E0: S3 の「…」から開く管理メニュー（候補日の追加・削除は出さない）
export function ManageMenu({ eventId, title, deadline, headcount }: { eventId: string; title: string; deadline: string; headcount: number }) {
  const [open, setOpen] = useState(false);
  const items = [
    { icon: <span className="text-[15px] font-bold">✎</span>, label: "なまえを変える", value: title, href: `/events/${eventId}/edit` },
    { icon: <Image src="/figma/icon-clock-16.svg" alt="" width={16} height={16} />, label: "締切を変える", value: deadline, href: `/events/${eventId}/edit` },
    { icon: <span className="text-[13px] font-bold">人</span>, label: "人数を変える", value: `${headcount}人`, href: `/events/${eventId}/edit` },
  ];

  return (
    <>
      <button type="button" aria-label="この調整を管理" onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-pill bg-sunken text-[17px] font-bold">
        …
      </button>
      {open && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col justify-end">
          <button type="button" aria-label="閉じる" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div className="relative flex flex-col items-center gap-1 rounded-t-[24px] bg-card px-5 pt-3.5 pb-[max(34px,env(safe-area-inset-bottom))]">
            <span className="h-[5px] w-10 rounded-[3px] bg-muted" />
            <p className="w-full text-[17px] leading-[1.5] font-bold">この調整を管理</p>
            {items.map((it) => (
              <Link key={it.label} href={it.href} className="flex w-full items-center gap-3 rounded-md p-3 active:bg-sunken">
                <span className="flex size-9 items-center justify-center rounded-sm bg-brand-soft">{it.icon}</span>
                <span className="flex-1 text-[15px] leading-[1.6] font-bold">{it.label}</span>
                <span className="max-w-[45%] truncate text-xs leading-[1.5] font-medium text-ink-sub">{it.value}</span>
              </Link>
            ))}
            <Link href={`/events/${eventId}/cancel`} className="flex w-full items-center gap-3 rounded-md p-3 active:bg-sunken">
              <span className="flex size-9 items-center justify-center rounded-sm bg-urgent-soft text-[15px] font-bold text-urgent">×</span>
              <span className="flex-1 text-[15px] leading-[1.6] font-bold text-urgent">この調整を中止する</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
