"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { DeadlinePicker, presetDeadline, type DeadlineKey } from "@/components/DeadlinePicker";
import { updateEvent } from "../../actions";

// E1: 名前・人数・締切だけ編集できる
export function EditForm(props: { eventId: string; title: string; headcount: number; deadline: string; now: string }) {
  const now = useMemo(() => new Date(props.now), [props.now]);
  const [title, setTitle] = useState(props.title);
  const [headcount, setHeadcount] = useState(props.headcount);
  const [deadline, setDeadline] = useState(new Date(props.deadline));
  const [deadlineKey, setDeadlineKey] = useState<DeadlineKey>("custom");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length > 0 && deadline > now;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateEvent(props.eventId, { title, headcount, deadlineAt: deadline.toISOString() });
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError("保存できませんでした。もう一度ためしてね");
      }
    });
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-6 pt-2">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">なまえ</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            className="w-full rounded-md bg-card p-4 text-[15px] leading-[1.6] font-medium shadow-soft caret-brand outline-none"
          />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">人数</span>
          <div className="flex items-center justify-center gap-4 rounded-pill bg-sunken p-2">
            <button type="button" aria-label="減らす" onClick={() => setHeadcount((n) => Math.max(2, n - 1))} className="flex size-11 items-center justify-center rounded-pill bg-card font-display text-xl">
              −
            </button>
            <p className="flex items-baseline gap-0.5">
              <span className="font-display text-[28px] leading-[1.3]">{headcount}</span>
              <span className="text-[15px] font-bold">人</span>
            </p>
            <button type="button" aria-label="増やす" onClick={() => setHeadcount((n) => Math.min(50, n + 1))} className="flex size-11 items-center justify-center rounded-pill bg-brand font-display text-xl text-white">
              ＋
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">締切</span>
          <DeadlinePicker
            now={now}
            value={deadline}
            selectedKey={deadlineKey}
            onPreset={(key, days) => {
              setDeadlineKey(key);
              setDeadline(presetDeadline(now, days));
            }}
            onCustom={(d) => {
              setDeadlineKey("custom");
              setDeadline(d);
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        {error && <p className="text-center text-xs font-medium text-ink-sub">{error}</p>}
        <Button type="button" variant="primary" disabled={!valid || pending} onClick={save}>
          {pending ? "保存しています…" : "保存する"}
        </Button>
      </div>
    </>
  );
}
