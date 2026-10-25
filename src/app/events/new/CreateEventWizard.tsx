"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { Drum } from "@/components/Drum";
import { pop, tap } from "@/lib/fx";
import { TopBar } from "@/components/TopBar";
import type { SlotSuggestion } from "@/lib/suggest";
import { addDays, formatDateTime, formatDay, formatRange, fromJst, toJstParts, WEEKDAYS } from "@/lib/time";
import { createEvent } from "../actions";
import { DeadlinePicker, presetDeadline, type DeadlineKey } from "@/components/DeadlinePicker";

type Genre = "DRINK" | "LUNCH" | "CAMP" | "STUDY";
type Priority = "LOW" | "NORMAL" | "URGENT";
type Candidate = { startAt: string; endAt: string; byAi: boolean };

const GENRES: { value: Genre; label: string; icon: string }[] = [
  { value: "DRINK", label: "飲み会", icon: "/figma/genre-drink.svg" },
  { value: "LUNCH", label: "ランチ", icon: "/figma/genre-lunch.svg" },
  { value: "CAMP", label: "合宿", icon: "/figma/genre-camp.svg" },
  { value: "STUDY", label: "勉強会", icon: "/figma/genre-study.svg" },
];

const PRIORITIES: { value: Priority; label: string; note: string }[] = [
  { value: "LOW", label: "ゆるめ", note: "返事はのんびりでOK" },
  { value: "NORMAL", label: "ふつう", note: "いつものペースで" },
  { value: "URGENT", label: "急ぎ！", note: "バナーで目立たせる" },
];

const STEPS = [
  { label: "なまえ", ask: "なにを決める？", hint: "" },
  { label: "人数", ask: "何人で集まる？", hint: "何人で集まる？" },
  { label: "優先度", ask: "どのくらい急ぎ？", hint: "急ぎ？ゆるめ？" },
  { label: "候補日", ask: "いつがいい？", hint: "AIが空きから提案" },
  { label: "締切", ask: "いつまでに返事がほしい？", hint: "いつまでに返事がほしい？" },
];

export function CreateEventWizard({ suggestions, busyDays, now: nowIso }: { suggestions: SlotSuggestion[]; busyDays: string[]; now: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  const [active, setActive] = useState(0);
  const [confirmed, setConfirmed] = useState([false, false, false, false, false]);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [memo, setMemo] = useState("");
  const [headcount, setHeadcount] = useState(5);
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [candidates, setCandidates] = useState<Candidate[]>(() => suggestions.slice(0, 3).map((s) => ({ ...s, byAi: true })));
  const [deadlineKey, setDeadlineKey] = useState<DeadlineKey>("3d");
  const [deadline, setDeadline] = useState(() => presetDeadline(now, 3));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const headcountRef = useRef<HTMLSpanElement>(null);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextSuggestion = suggestions.find((s) => !candidates.some((c) => c.startAt === s.startAt));
  const canProceed = [title.trim().length > 0, headcount >= 2, true, candidates.length > 0, deadline > now];
  const allDone = confirmed.every(Boolean) && active === -1;

  const summaries = [
    title,
    `${headcount}人`,
    PRIORITIES.find((p) => p.value === priority)?.label ?? "",
    `${candidates.length}つ`,
    formatDateTime(deadline),
  ];

  // 人数の＋−：はじに来たら強めに鳴らすだけ。変わったら数字を弾ませる
  function bumpHeadcount(d: number) {
    const n = Math.max(2, Math.min(50, headcount + d));
    if (n === headcount) return tap(true);
    tap();
    setHeadcount(n);
    pop(headcountRef.current, 1.25, 160);
  }

  // 候補日を消すときは横にすっと消してから外す
  function removeCandidate(startAt: string) {
    tap();
    setRemoving(startAt);
    setTimeout(() => {
      setCandidates((prev) => prev.filter((p) => p.startAt !== startAt));
      setRemoving(null);
    }, 180);
  }

  function confirmStep(i: number) {
    const next = confirmed.map((c, j) => (j === i ? true : c));
    setConfirmed(next);
    setActive(next.findIndex((c) => !c));
  }

  function addCandidate(c: Candidate) {
    tap(true);
    setCandidates((prev) =>
      prev.some((p) => p.startAt === c.startAt) ? prev : [...prev, c].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createEvent({
          title,
          genre,
          memo: memo.trim() || null,
          headcount,
          priority,
          candidates,
          deadlineAt: deadline.toISOString(),
        });
      } catch (e) {
        // redirect() は例外として投げられるので、それ以外だけ表示する
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError("リンクをつくれませんでした。もう一度ためしてね");
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col gap-3 pt-11 pb-[max(34px,env(safe-area-inset-bottom))]">
      <TopBar title="新しい日程調整" backHref="/home" />

      <div className="flex flex-1 flex-col gap-2 px-6 pt-1">
        {STEPS.map((step, i) => {
          if (i === active) {
            return (
              <section key={i} className="flex w-full flex-col gap-3 rounded-lg border-2 border-brand bg-card p-4 shadow-pop">
                <div className="flex items-center gap-2.5">
                  <Image src="/figma/mascot-sloth.svg" alt="" width={48} height={48} />
                  <p className="flex-1 text-[17px] leading-[1.5] font-bold">{step.ask}</p>
                </div>

                {i === 0 && (
                  <>
                    <input
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={40}
                      placeholder="ゼミの打ち上げ"
                      className="w-full rounded-md bg-sunken p-3.5 text-[15px] leading-[1.6] font-medium caret-brand outline-none placeholder:text-ink-sub/50"
                    />
                    <p className="text-xs leading-[1.5] font-medium text-ink-sub">ジャンルを選ぶとアイコンがつくよ</p>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => {
                            tap();
                            setGenre(genre === g.value ? null : g.value);
                          }}
                          className={`flex items-center gap-1 rounded-pill px-2.5 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${genre === g.value ? "bg-accent-soft" : "bg-sunken"}`}
                        >
                          <Image src={g.icon} alt="" width={22} height={22} />
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      maxLength={200}
                      rows={2}
                      placeholder="場所・説明（任意）"
                      className="w-full resize-none rounded-md bg-sunken p-3.5 text-[15px] leading-[1.6] font-medium caret-brand outline-none placeholder:text-ink-sub/50"
                    />
                  </>
                )}

                {i === 1 && (
                  <>
                    <div className="flex items-center justify-center gap-4 rounded-pill bg-sunken p-2">
                      <button
                        type="button"
                        aria-label="減らす"
                        onClick={() => bumpHeadcount(-1)}
                        className="flex size-11 items-center justify-center rounded-pill bg-card font-display text-xl"
                      >
                        −
                      </button>
                      <p className="flex items-baseline gap-0.5">
                        <span ref={headcountRef} className="inline-block font-display text-[28px] leading-[1.3]">{headcount}</span>
                        <span className="text-[15px] font-bold">人</span>
                      </p>
                      <button
                        type="button"
                        aria-label="増やす"
                        onClick={() => bumpHeadcount(1)}
                        className="flex size-11 items-center justify-center rounded-pill bg-brand font-display text-xl text-white"
                      >
                        ＋
                      </button>
                    </div>
                    <p className="text-xs leading-[1.5] font-medium text-ink-sub">自分もふくめた人数</p>
                  </>
                )}

                {i === 2 && (
                  <div className="flex flex-col gap-2.5">
                    {PRIORITIES.map((p) => {
                      const selected = priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            tap();
                            setPriority(p.value);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-md p-3 text-left ${selected ? "border-2 border-alert bg-accent-soft" : "bg-sunken"}`}
                        >
                          <span className="flex flex-1 flex-col">
                            <span className="text-[15px] leading-[1.6] font-bold">{p.label}</span>
                            <span className="text-xs leading-[1.5] font-medium text-ink-sub">{p.note}</span>
                          </span>
                          {selected && <Image src="/figma/icon-check-ink.svg" alt="" width={20} height={20} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {i === 3 && (
                  <div className="flex flex-col gap-2.5">
                    {candidates.map((c) => (
                      <div
                        key={c.startAt}
                        className={`flex w-full items-center gap-2 rounded-sm bg-accent-soft p-2.5 transition duration-200 ${removing === c.startAt ? "translate-x-6 opacity-0" : ""}`}
                      >
                        <Image src="/figma/icon-calendar-s1.svg" alt="" width={18} height={18} />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-[15px] leading-[1.6] font-bold">{formatRange(new Date(c.startAt), new Date(c.endAt))}</p>
                          <p className="text-xs leading-[1.5] font-medium text-ink-sub">{c.byAi ? "AIおすすめ" : "自分で追加"}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="この候補日を消す"
                          onClick={() => removeCandidate(c.startAt)}
                          className="flex size-7 items-center justify-center rounded-pill bg-card text-[15px] font-bold text-ink-sub"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSheetOpen(true)}
                      className="flex w-full items-center justify-center rounded-sm border-[1.5px] border-dashed border-brand bg-brand-soft p-2.5 text-[15px] leading-[1.6] font-bold text-brand"
                    >
                      ＋ 候補日を追加
                    </button>
                    {nextSuggestion && (
                      <button
                        type="button"
                        onClick={() => addCandidate({ ...nextSuggestion, byAi: true })}
                        className="flex w-full items-center gap-1.5 rounded-sm bg-sunken p-2 text-left text-xs leading-[1.5] font-medium text-brand"
                      >
                        <Image src="/figma/icon-sparkle.svg" alt="" width={14} height={14} />
                        <span className="flex-1">
                          AIのおすすめ：{formatDateTime(new Date(nextSuggestion.startAt))} も空いてるよ　＋
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {i === 4 && (
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
                )}

                <Button type="button" variant="primary" disabled={!canProceed[i]} onClick={() => confirmStep(i)}>
                  {i === 4 ? "これで決定" : "次へ"}
                </Button>
              </section>
            );
          }

          if (confirmed[i]) {
            return (
              <div key={i} className="flex w-full items-center gap-2.5 rounded-md bg-card p-3 shadow-soft">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-pill bg-brand">
                  <Image src="/figma/icon-check-white.svg" alt="" width={16} height={16} />
                </span>
                <span className="shrink-0 text-xs leading-[1.5] font-medium text-ink-sub">{step.label}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] leading-[1.6] font-bold">{summaries[i]}</span>
                <button type="button" onClick={() => setActive(i)} className="shrink-0 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand">
                  変更
                </button>
              </div>
            );
          }

          return (
            <div key={i} className="flex w-full items-center gap-2.5 rounded-md bg-sunken p-3 opacity-55">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-pill bg-card text-[13px] font-bold text-ink-sub">{i + 1}</span>
              <span className="shrink-0 text-[15px] leading-[1.6] font-bold text-ink-sub">{step.label}</span>
              <span className="min-w-0 flex-1 text-xs leading-[1.5] font-medium text-ink-sub">{step.hint}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 px-6">
        {error && <p className="text-center text-xs font-medium text-ink-sub">{error}</p>}
        <Button type="button" variant="primary" disabled={!allDone || pending} onClick={submit}>
          {pending ? "つくっています…" : "リンクをつくる"}
        </Button>
      </div>

      {sheetOpen && (
        <AddCandidateSheet
          now={now}
          busyDays={busyDays}
          candidates={candidates}
          onClose={() => setSheetOpen(false)}
          onAdd={(c) => {
            addCandidate(c);
            setSheetOpen(false);
          }}
        />
      )}
    </main>
  );
}

// 候補日の時刻（7:00〜23:00、30分きざみ）
const TIMES = Array.from({ length: 33 }, (_, i) => `${String(7 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

function AddCandidateSheet({
  now,
  busyDays,
  candidates,
  onClose,
  onAdd,
}: {
  now: Date;
  busyDays: string[];
  candidates: Candidate[];
  onClose: () => void;
  onAdd: (c: Candidate) => void;
}) {
  const tomorrow = toJstParts(addDays(now, 1));
  const [view, setView] = useState({ year: tomorrow.year, month: tomorrow.month });
  const [picked, setPicked] = useState<{ year: number; month: number; day: number } | null>(null);
  const [startIdx, setStartIdx] = useState(TIMES.indexOf("18:00"));
  const [endIdx, setEndIdx] = useState(TIMES.indexOf("20:00"));

  const firstWeekday = toJstParts(fromJst(view.year, view.month, 1, 12)).weekday;
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const tomorrowStart = fromJst(tomorrow.year, tomorrow.month, tomorrow.day);
  const candidateDays = new Set(candidates.map((c) => {
    const p = toJstParts(new Date(c.startAt));
    return `${p.year}-${p.month}-${p.day}`;
  }));
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const m = v.month + delta;
      return m < 1 ? { year: v.year - 1, month: 12 } : m > 12 ? { year: v.year + 1, month: 1 } : { year: v.year, month: m };
    });

  const at = (idx: number) => {
    if (!picked) return null;
    const [h, m] = TIMES[idx].split(":").map(Number);
    return fromJst(picked.year, picked.month, picked.day, h, m);
  };
  const start = at(startIdx);
  const end = at(endIdx);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col justify-end">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div className="relative flex flex-col gap-2.5 rounded-t-[24px] bg-card px-5 pt-3.5 pb-[max(30px,env(safe-area-inset-bottom))]">
        <div className="mx-auto h-[5px] w-10 rounded-[3px] bg-muted" />
        <p className="text-[17px] leading-[1.5] font-bold">候補日を追加</p>
        <div className="flex items-center justify-between">
          <p className="text-[15px] leading-[1.6] font-bold">
            {view.year}年 {view.month}月
          </p>
          <div className="flex gap-1">
            <button type="button" aria-label="前の月" onClick={() => shiftMonth(-1)} className="size-11 rounded-pill text-[15px] font-bold text-brand">
              ‹
            </button>
            <button type="button" aria-label="次の月" onClick={() => shiftMonth(1)} className="size-11 rounded-pill text-[15px] font-bold text-brand">
              ›
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <p key={w} className="flex h-[18px] items-center justify-center text-xs font-medium text-ink-sub">
              {w}
            </p>
          ))}
          {cells.map((day, idx) => {
            if (!day) return <span key={idx} className="h-[30px]" />;
            const key = `${view.year}-${view.month}-${day}`;
            const disabled = fromJst(view.year, view.month, day) < tomorrowStart;
            const isPicked = picked && picked.year === view.year && picked.month === view.month && picked.day === day;
            const isCandidate = candidateDays.has(key);
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => setPicked({ year: view.year, month: view.month, day })}
                className={`flex h-[30px] flex-col items-center justify-center rounded-pill disabled:opacity-30 ${
                  isPicked ? "bg-brand text-[15px] font-bold text-white" : isCandidate ? "bg-accent-soft text-[15px] font-bold" : "text-xs font-medium"
                }`}
              >
                {day}
                {busyDays.includes(key) && !isPicked && <Image src="/figma/dot-busy.svg" alt="" width={4} height={4} />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2.5 rounded-md bg-sunken px-2.5 py-1">
          <p className="text-[15px] leading-[1.6] font-bold whitespace-nowrap">{picked ? formatDay(fromJst(picked.year, picked.month, picked.day, 12)) : "日付を選んでね"}</p>
          {/* 開始と終了をドラムで回す */}
          <div className="relative ml-auto flex w-[210px] items-center gap-1.5">
            <span className="pointer-events-none absolute inset-x-0 top-1/2 h-[30px] -translate-y-1/2 rounded-sm bg-card" />
            <div className="relative flex-1">
              <Drum label="開始" variant="time" itemHeight={28} values={TIMES} index={startIdx} onChange={(i) => {
                setStartIdx(i);
                if (endIdx <= i) setEndIdx(Math.min(TIMES.length - 1, i + 2));
              }} />
            </div>
            <span className="relative font-dot text-[22px] text-brand">–</span>
            <div className="relative flex-1">
              <Drum label="終了" variant="time" itemHeight={28} values={TIMES} index={endIdx} onChange={(i) => {
                setEndIdx(i);
                if (i <= startIdx) setStartIdx(Math.max(0, i - 2));
              }} />
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={!start}
          onClick={() => start && end && onAdd({ startAt: start.toISOString(), endAt: end.toISOString(), byAi: false })}
        >
          この日を追加
        </Button>
      </div>
    </div>
  );
}
