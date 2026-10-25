"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { formatDay, formatTime } from "@/lib/time";
import { decideEvent } from "../../actions";
import { tap } from "@/lib/fx";

type Row = { id: string; startAt: string; endAt: string; yes: number; maybe: number; no: number };

export function DecideForm({ eventId, headline, bestId, rows }: { eventId: string; headline: string; bestId: string | null; rows: Row[] }) {
  const [selected, setSelected] = useState(bestId ?? rows[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const picked = rows.find((r) => r.id === selected);

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 px-6 pt-1">
        <div className="flex items-center gap-2.5">
          <Image src="/figma/mascot-sloth-d1.svg" alt="" width={56} height={56} />
          <div className="flex flex-1 flex-col gap-0.5 leading-[1.5]">
            <p className="text-[17px] font-bold">{headline}</p>
            <p className="text-xs font-medium text-ink-sub">どの日にする？</p>
          </div>
        </div>

        {rows.map((r) => {
          const on = r.id === selected;
          const total = r.yes + r.maybe + r.no;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                tap();
                setSelected(r.id);
              }}
              className={`flex w-full flex-col gap-2 rounded-md p-3.5 text-left shadow-soft ${on ? "border-[2.5px] border-brand bg-brand-soft" : "bg-card"}`}
            >
              <span className="flex w-full items-center gap-2">
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-pill border-2 ${on ? "border-brand bg-brand" : "border-muted bg-card"}`}>
                  {on && <Image src="/figma/icon-check-14.svg" alt="" width={14} height={14} />}
                </span>
                <span className="flex-1 text-[15px] leading-[1.6] font-bold whitespace-pre">
                  {formatDay(new Date(r.startAt))}  {formatTime(new Date(r.startAt))}–{formatTime(new Date(r.endAt))}
                </span>
                {r.id === bestId && r.yes > 0 && (
                  <span className="rounded-pill bg-accent px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px]">いちばん多い</span>
                )}
              </span>
              <span className="flex h-2.5 w-full overflow-hidden bg-sunken">
                {total > 0 && (
                  <>
                    <span className="bg-brand" style={{ flexGrow: r.yes }} />
                    <span className="bg-accent" style={{ flexGrow: r.maybe }} />
                    <span className="bg-muted" style={{ flexGrow: r.no }} />
                  </>
                )}
              </span>
              <span className="text-xs leading-[1.5] font-medium text-ink-sub">
                ○ {r.yes}人　△ {r.maybe}人　× {r.no}人
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Button type="button" variant="primary" disabled={!picked || pending} onClick={() => picked && startTransition(() => decideEvent(eventId, picked.id))}>
          {pending ? "決めています…" : picked ? `${formatDay(new Date(picked.startAt))}${formatTime(new Date(picked.startAt))} に決める` : "日を選んでね"}
        </Button>
      </div>
    </>
  );
}
