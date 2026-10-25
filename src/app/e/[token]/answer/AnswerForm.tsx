"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { AnswerChip, type Mark } from "@/components/AnswerChip";
import { Button } from "@/components/Button";
import { REPLY_LABELS } from "@/lib/invite-labels";
import { formatDay, formatTime } from "@/lib/time";
import { clearDeclaration, declareReply, submitAnswers } from "../actions";

type Candidate = { id: string; startAt: string; endAt: string; value: Mark | null; byAi: boolean; reason: string | null };

export function AnswerForm(props: {
  token: string;
  ownerName: string;
  title: string;
  memo: string | null;
  urgent: boolean;
  deadline: string;
  note: string;
  declaredLabel: string | null;
  candidates: Candidate[];
}) {
  const { token } = props;
  const [values, setValues] = useState(() => new Map(props.candidates.map((c) => [c.id, { value: c.value, byAi: c.byAi }])));
  const [note, setNote] = useState(props.note);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          <p className="flex-1 text-right text-xs leading-[1.5] font-medium text-ink-sub">{hasAi ? "違ったらタップで修正" : "タップで選んでね"}</p>
        </div>

        {props.candidates.map((c) => {
          const v = values.get(c.id)!;
          const start = new Date(c.startAt);
          return (
            <div key={c.id} className="flex w-full items-center gap-3 rounded-md bg-card p-4 shadow-soft">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
              </div>
              <div className="flex gap-1.5">
                {(["YES", "MAYBE", "NO"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => pick(c.id, m)} aria-pressed={v.value === m} aria-label={{ YES: "○", MAYBE: "△", NO: "×" }[m]}>
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

      <div className="flex flex-col gap-2 px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        {error && <p className="text-center text-xs font-medium text-ink-sub">{error}</p>}
        <Button type="button" variant="primary" disabled={!allAnswered || pending} onClick={submit}>
          {pending ? "送っています…" : "これで送る"}
        </Button>
      </div>
    </>
  );
}
