"use client";

import { addDays, fromJst, toJstParts, WEEKDAYS } from "@/lib/time";

const DEADLINE_PRESETS = [
  { key: "1d", label: "明日まで", days: 1 },
  { key: "3d", label: "3日後", days: 3 },
  { key: "7d", label: "1週間後", days: 7 },
] as const;
export type DeadlineKey = (typeof DEADLINE_PRESETS)[number]["key"] | "custom";

export function presetDeadline(now: Date, days: number) {
  const p = toJstParts(addDays(now, days));
  return fromJst(p.year, p.month, p.day, 18, 0);
}

export function DeadlinePicker({
  now,
  value,
  selectedKey,
  onPreset,
  onCustom,
}: {
  now: Date;
  value: Date;
  selectedKey: DeadlineKey;
  onPreset: (key: DeadlineKey, days: number) => void;
  onCustom: (d: Date) => void;
}) {
  const v = toJstParts(value);
  const dayOptions = Array.from({ length: 30 }, (_, i) => toJstParts(addDays(now, i)));
  const minuteOptions = [0, 15, 30, 45];
  const set = (patch: Partial<{ year: number; month: number; day: number; hour: number; minute: number }>) => {
    const n = { ...v, ...patch };
    onCustom(fromJst(n.year, n.month, n.day, n.hour, n.minute));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {[...DEADLINE_PRESETS, { key: "custom" as const, label: "自分で決める", days: 0 }].map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => (p.key === "custom" ? onCustom(value) : onPreset(p.key, p.days))}
            className={`rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${selectedKey === p.key ? "bg-brand text-white" : "bg-sunken text-ink shadow-soft"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center rounded-md bg-sunken p-2 text-[17px] font-bold">
        <select
          aria-label="日付"
          value={`${v.year}-${v.month}-${v.day}`}
          onChange={(e) => {
            const [year, month, day] = e.target.value.split("-").map(Number);
            set({ year, month, day });
          }}
          className="flex-1 appearance-none bg-transparent py-2 text-center outline-none"
        >
          {dayOptions.map((d) => (
            <option key={`${d.year}-${d.month}-${d.day}`} value={`${d.year}-${d.month}-${d.day}`}>
              {d.month}/{d.day}（{WEEKDAYS[d.weekday]}）
            </option>
          ))}
        </select>
        <select
          aria-label="時"
          value={v.hour}
          onChange={(e) => set({ hour: Number(e.target.value) })}
          className="flex-1 appearance-none bg-transparent py-2 text-center outline-none"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          aria-label="分"
          value={v.minute}
          onChange={(e) => set({ minute: Number(e.target.value) })}
          className="flex-1 appearance-none bg-transparent py-2 text-center outline-none"
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
      </div>
      {value <= now && <p className="text-xs leading-[1.5] font-medium text-ink-sub">締切は今より後にしてね</p>}
    </div>
  );
}

