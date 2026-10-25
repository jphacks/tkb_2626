"use client";

import { Drum } from "@/components/Drum";
import { tap } from "@/lib/fx";
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
  const dayLabels = dayOptions.map((d) => `${d.month}/${d.day}（${WEEKDAYS[d.weekday]}）`);
  const dayIndex = dayOptions.findIndex((d) => d.year === v.year && d.month === v.month && d.day === v.day);
  const hourLabels = Array.from({ length: 24 }, (_, h) => String(h));
  const minuteLabels = minuteOptions.map((m) => String(m).padStart(2, "0"));
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
            onClick={() => {
              tap();
              if (p.key === "custom") onCustom(value);
              else onPreset(p.key, p.days);
            }}
            className={`rounded-pill px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${selectedKey === p.key ? "bg-brand text-white" : "bg-sunken text-ink shadow-soft"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {/* ドラムで日付・時・分を回す。中央の白い帯が選んでいる値 */}
      <div className="relative flex items-center gap-1 rounded-md bg-sunken px-2 py-1">
        <span className="pointer-events-none absolute inset-x-2 top-1/2 h-[34px] -translate-y-1/2 rounded-sm bg-card shadow-[0_2px_6px_rgba(27,31,59,0.06)]" />
        <div className="relative flex-[1.6_0_0]">
          <Drum label="日付" values={dayLabels} index={Math.max(0, dayIndex)} onChange={(i) => set({ year: dayOptions[i].year, month: dayOptions[i].month, day: dayOptions[i].day })} />
        </div>
        <div className="relative flex-1">
          <Drum label="時" values={hourLabels} index={v.hour} onChange={(h) => set({ hour: h })} />
        </div>
        <div className="relative flex-1">
          <Drum label="分" values={minuteLabels} index={Math.max(0, minuteOptions.indexOf(v.minute))} onChange={(i) => set({ minute: minuteOptions[i] })} />
        </div>
      </div>
      {value <= now && <p className="text-xs leading-[1.5] font-medium text-ink-sub">締切は今より後にしてね</p>}
    </div>
  );
}

