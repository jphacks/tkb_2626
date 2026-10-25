"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { AnswerChip, type Mark } from "@/components/AnswerChip";
import { Button, buttonClassName } from "@/components/Button";
import { REPLY_LABELS } from "@/lib/invite-labels";
import { formatDay, formatTime, toJstParts, WEEKDAYS } from "@/lib/time";
import { clearDeclaration, declareReply, submitAnswers } from "../actions";
import { pop, tap } from "@/lib/fx";

type DayEvent = { title: string; start: string; end: string };
type Candidate = {
  id: string;
  startAt: string;
  endAt: string;
  value: Mark | null;
  byAi: boolean;
  reason: string | null;
  detail: string | null;
  dayEvents: DayEvent[];
};

export function AnswerForm(props: {
  token: string;
  ownerName: string;
  title: string;
  memo: string | null;
  urgent: boolean;
  deadline: string;
  note: string;
  declaredLabel: string | null;
  calendarConnected: boolean;
  candidates: Candidate[];
}) {
  const { token } = props;
  const [values, setValues] = useState(() => new Map(props.candidates.map((c) => [c.id, { value: c.value, byAi: c.byAi }])));
  const [note, setNote] = useState(props.note);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sidebarFor, setSidebarFor] = useState<string | null>(null);

  const hasAi = props.candidates.some((c) => c.byAi);
  const allAnswered = [...values.values()].every((v) => v.value);

  function pick(id: string, value: Mark) {
    setValues((prev) => new Map(prev).set(id, { value, byAi: false }));
  }

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        if (e instanceof Error && !e.message.includes("NEXT_REDIRECT")) setError("送れませんでした。もう一度ためしてね");
      }
    });
  }

  function submit() {
    run(() =>
      submitAnswers(token, {
        answers: [...values.entries()].map(([candidateId, v]) => ({ candidateId, value: v.value!, byAi: v.byAi })),
        note,
      }),
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 px-6 pt-2">
        <section className="flex w-full flex-col gap-3 rounded-md bg-card p-4 shadow-pop">
          <div className="flex items-center gap-2">
            <p className="rounded-pill bg-brand-soft px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand">{props.ownerName} から</p>
            {props.urgent && <p className="-rotate-3 rounded-pill bg-alert px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px]">急ぎ！</p>}
          </div>
          <h1 className="font-display text-xl leading-[1.4]">{props.title}</h1>
          <div className="flex w-full items-start gap-2 rounded-md bg-brand-soft p-3">
            <Image src="/figma/icon-sparkle-18.svg" alt="" width={18} height={18} />
            <p className="flex-1 text-xs leading-[1.5] font-medium whitespace-pre-wrap">
              {props.memo ? `${props.memo}\n` : ""}
              {props.deadline}までに返してほしいって。
            </p>
          </div>
        </section>

        <div className="flex w-full items-center gap-2">
          {hasAi && <Image src="/figma/icon-sparkle-24.svg" alt="" width={24} height={24} />}
          <p className="text-[17px] leading-[1.5] font-bold whitespace-nowrap">{hasAi ? "AIが埋めておいたよ" : "いつなら行ける？"}</p>
          {!props.calendarConnected && (
            <p className="flex-1 text-right text-xs leading-[1.5] font-medium text-ink-sub">{hasAi ? "違ったらタップで修正" : "タップで選んでね"}</p>
          )}
          {props.calendarConnected && <span className="flex-1" />}
          {props.calendarConnected && props.candidates.length > 0 && (
            <button
              type="button"
              onClick={() => setSidebarFor(props.candidates[0].id)}
              className="flex shrink-0 items-center gap-1 rounded-pill bg-brand-soft px-2.5 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand"
            >
              <Image src="/figma/icon-calendar-s1.svg" alt="" width={14} height={14} />
              カレンダー
            </button>
          )}
        </div>

        {props.calendarConnected && hasAi && <p className="-mt-2 text-xs leading-[1.5] font-medium text-ink-sub">違ったらタップで修正。日付をタップすると、その日の予定が見られるよ</p>}

        {props.candidates.map((c) => {
          const v = values.get(c.id)!;
          const start = new Date(c.startAt);
          return (
            <div key={c.id} className="flex w-full items-center gap-3 rounded-md bg-card p-4 shadow-soft">
              <button
                type="button"
                disabled={!props.calendarConnected}
                onClick={() => setSidebarFor(c.id)}
                className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
              >
                <p className="font-display text-xl leading-[1.4]">{formatDay(start)}</p>
                <p className="text-[15px] leading-[1.6] font-bold text-ink-sub">
                  {formatTime(start)}–{formatTime(new Date(c.endAt))}
                </p>
                {v.byAi && c.reason && (
                  <p className="flex items-center gap-1 pt-1 text-xs leading-[1.5] font-medium text-brand">
                    <Image src="/figma/icon-sparkle-14.svg" alt="" width={14} height={14} />
                    {c.reason}
                  </p>
                )}
              </button>
              <div className="flex gap-1.5">
                {(["YES", "MAYBE", "NO"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={(e) => {
                      pick(c.id, m);
                      tap();
                      pop(e.currentTarget);
                    }} aria-pressed={v.value === m} aria-label={{ YES: "○", MAYBE: "△", NO: "×" }[m]}>
                    <AnswerChip mark={m} selected={v.value === m} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <label className="flex w-full flex-col gap-2">
          <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">備考（任意）</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="11/2は15分くらい遅れるかも！"
            className="w-full resize-none rounded-md bg-card p-4 text-[15px] leading-[1.6] font-medium shadow-soft outline-none placeholder:text-ink-sub/50"
          />
        </label>

        <div className="flex w-full items-center gap-2">
          <span className="h-px flex-1 bg-sunken" />
          <p className="text-xs leading-[1.5] font-medium text-ink-sub">いま決められないときは</p>
          <span className="h-px flex-1 bg-sunken" />
        </div>

        {props.declaredLabel ? (
          <div className="flex w-full items-center gap-3 rounded-md bg-brand p-3 text-white">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-card">
              <Image src="/figma/icon-check-ink.svg" alt="" width={20} height={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[15px] leading-[1.6] font-bold">「{props.declaredLabel}に返す」って伝えたよ</p>
              <p className="text-xs leading-[1.5] font-medium">{props.ownerName}さんの回答状況に表示されるよ</p>
            </div>
            <button type="button" disabled={pending} onClick={() => run(() => clearDeclaration(token))} className="shrink-0 text-[13px] font-bold">
              変更
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 rounded-md bg-accent-soft p-3">
            <p className="text-[13px] leading-[1.4] font-bold tracking-[0.26px]">候補を見ても決めきれない？ 返す時間だけ宣言しよう</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-pill bg-brand px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-white">いま返す</span>
              {REPLY_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => declareReply(token, label))}
                  className="rounded-pill bg-sunken px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] shadow-soft"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {sidebarFor && (
        <CalendarSidebar
          candidates={props.candidates}
          selectedId={sidebarFor}
          values={values}
          onSelect={setSidebarFor}
          onPick={pick}
          onClose={() => setSidebarFor(null)}
        />
      )}

      <div className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        {error && <p className="text-center text-xs font-medium text-ink-sub">{error}</p>}
        <Button type="button" variant="primary" disabled={!allAnswered || pending} onClick={submit}>
          {pending ? "送っています…" : "これで送る"}
        </Button>
      </div>
    </>
  );
}

const HOUR_PX = 40;
const MARK_SYMBOL: Record<Mark, string> = { YES: "○", MAYBE: "△", NO: "×" };

// R1-a v4: 候補日の1日の予定を横から出して確かめる
function CalendarSidebar({
  candidates,
  selectedId,
  values,
  onSelect,
  onPick,
  onClose,
}: {
  candidates: Candidate[];
  selectedId: string;
  values: Map<string, { value: Mark | null; byAi: boolean }>;
  onSelect: (id: string) => void;
  onPick: (id: string, value: Mark) => void;
  onClose: () => void;
}) {
  const c = candidates.find((x) => x.id === selectedId)!;
  const start = new Date(c.startAt);
  const end = new Date(c.endAt);
  const blocks = [
    ...c.dayEvents.map((e) => ({ title: `${e.title} ${formatTime(new Date(e.start))}–${formatTime(new Date(e.end))}`, start: new Date(e.start), end: new Date(e.end), candidate: false })),
    { title: `候補 ${formatTime(start)}–${formatTime(end)}`, start, end, candidate: true },
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const hourOf = (d: Date) => {
    const p = toJstParts(d);
    return p.hour + p.minute / 60;
  };
  const firstHour = Math.min(9, Math.floor(Math.min(...blocks.map((b) => hourOf(b.start)))));
  const lastHour = Math.max(20, Math.ceil(Math.max(...blocks.map((b) => hourOf(b.end) || 24))));
  const top = (d: Date) => (hourOf(d) - firstHour) * HOUR_PX;
  const gaps = blocks.slice(1).map((b, i) => ({ at: blocks[i].end, minutes: Math.round((b.start.getTime() - blocks[i].end.getTime()) / 60000) })).filter((g) => g.minutes > 0);
  const current = values.get(c.id)?.value ?? null;
  const day = toJstParts(start);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] justify-end">
      <button type="button" aria-label="閉じる" onClick={onClose} className="absolute inset-0 bg-ink/35" />
      <aside className="relative flex h-full w-[304px] flex-col gap-3 overflow-y-auto rounded-l-[24px] bg-card px-4 pt-14 pb-6 shadow-[-6px_0_24px_rgba(24,50,56,0.25)]">
        <div className="flex items-center gap-2 text-[17px] leading-[1.5] font-bold">
          <p className="flex-1">あなたの予定</p>
          <button type="button" onClick={onClose} aria-label="閉じる" className="-m-2 p-2 text-ink-sub">
            ×
          </button>
        </div>
        <div className="flex gap-1 text-center">
          {candidates.map((x) => {
            const p = toJstParts(new Date(x.startAt));
            const on = x.id === selectedId;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => onSelect(x.id)}
                className={`flex flex-1 flex-col items-center rounded-sm p-1 ${on ? "bg-brand text-white" : "bg-accent-soft"}`}
              >
                <span className={`text-xs leading-[1.5] font-medium ${on ? "" : "text-ink-sub"}`}>{WEEKDAYS[p.weekday]}</span>
                <span className="text-[15px] leading-[1.6] font-bold">{p.day}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">
          {day.month}月{day.day}日 の1日
        </p>
        <div className="relative w-full shrink-0" style={{ height: (lastHour - firstHour) * HOUR_PX }}>
          {Array.from({ length: lastHour - firstHour }, (_, i) => (
            <div key={i} className="absolute inset-x-0" style={{ top: i * HOUR_PX }}>
              <p className="absolute -top-[9px] left-0 text-xs leading-[1.5] font-medium text-ink-sub">{firstHour + i}:00</p>
              <span className="absolute left-[46px] right-0 h-px bg-sunken" />
            </div>
          ))}
          {blocks.map((b, i) => (
            <div
              key={i}
              className={`absolute left-12 right-0.5 overflow-hidden rounded-sm p-2 text-[13px] leading-[1.4] font-bold tracking-[0.26px] ${
                b.candidate ? "border-2 border-dashed border-alert bg-accent-soft" : "bg-brand-soft text-brand"
              }`}
              style={{ top: top(b.start) + 2, height: Math.max(24, (b.end.getTime() - b.start.getTime()) / 3600000 * HOUR_PX - 4) }}
            >
              {b.title}
            </div>
          ))}
          {gaps.map((g, i) => (
            <p key={i} className="absolute left-[150px] text-xs leading-[1.5] font-medium text-ink-sub" style={{ top: top(g.at) + 2 }}>
              {g.minutes >= 60 ? `${Math.floor(g.minutes / 60)}時間${g.minutes % 60 ? `${g.minutes % 60}分` : ""}あき` : `${g.minutes}分あき`}
            </p>
          ))}
        </div>
        {c.detail && current && (
          <div className="flex w-full flex-col gap-2 rounded-md bg-brand-soft p-3">
            <p className="flex items-start gap-1.5 text-xs leading-[1.5] font-medium">
              <Image src="/figma/icon-sparkle-14.svg" alt="" width={16} height={16} />
              <span className="flex-1">{c.detail}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={buttonClassName("secondary", "min-h-0 !py-2.5 !px-3")}>
                {MARK_SYMBOL[current]}のまま
              </button>
              <button
                type="button"
                onClick={() => {
                  onPick(c.id, current === "YES" ? "MAYBE" : "YES");
                  onClose();
                }}
                className={buttonClassName("primary", "min-h-0 !py-2.5 !px-3")}
              >
                {current === "YES" ? "△にする" : "○にする"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
