import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CalendarEvent } from "@/lib/calendar";
import { formatTime, toJstParts } from "@/lib/time";

export type Mark = "YES" | "MAYBE" | "NO";
export type Draft = { mark: Mark; reason: string; detail: string };
type CandidateInput = { id: string; startAt: Date; endAt: Date };

const NEAR_MINUTES = 60;

const SYSTEM_PROMPT = `あなたは日程調整アプリ「ぽちぷりーず」の回答アシスタントです。
受け手のカレンダーの予定を見て、候補日ごとに参加できそうかを ○（YES）・△（MAYBE）・×（NO）で下書きします。

判断の考え方:
- 候補の時間と予定が重なっていれば、基本は ×。ただし終日の予定（allDay）や、短くて動かせそうな予定なら △ も検討する
- 重ならなくても、前後の予定との間隔が短く、予定の場所から候補の場所（メモに書かれていれば）への移動が間に合わなさそうなら △ か ×
- 移動時間は、日本の都市部の一般的な移動を目安に、場所の文字列から推測する。場所が分からないときは推測しすぎない
- その日の予定が詰まっていて疲れていそう、終わりが23時を過ぎる、などは △ の理由になる
- 予定がなく、無理のない時間なら ○
- 渡された予定にないことを作り上げない

書き方:
- reason: 候補の一覧に出す短い理由。20字以内。例「予定なし」「前後にバイトあり」「『家族ごはん』と重なる」
- detail: カレンダーの横に出す説明。60字以内。友だちに話すようなくだけた口調。例「前後がバイトで移動が30分。行けるけどギリギリなので△にしておいたよ」
- すべての候補について、渡された candidateId をそのまま使って1件ずつ返す`;

const DraftSchema = z.object({
  answers: z.array(
    z.object({
      candidateId: z.string(),
      mark: z.enum(["YES", "MAYBE", "NO"]),
      reason: z.string(),
      detail: z.string(),
    }),
  ),
});

// 候補日ごとの○△×の下書き。Claude が使えないときや失敗したときはルールで埋める
export async function draftAnswers(input: {
  title: string;
  memo: string | null;
  candidates: CandidateInput[];
  events: CalendarEvent[];
}): Promise<Map<string, Draft>> {
  const facts = input.candidates.map((c) => factsFor(c, input.events));
  const fallback = new Map(facts.map((f) => [f.candidate.id, ruleDraft(f)]));

  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-sonnet-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(DraftSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(promptPayload(input, facts)) }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return fallback;

    const result = new Map(fallback);
    for (const a of response.parsed_output.answers) {
      if (result.has(a.candidateId)) {
        result.set(a.candidateId, { mark: a.mark, reason: a.reason.slice(0, 30), detail: a.detail.slice(0, 90) });
      }
    }
    return result;
  } catch (e) {
    console.error("ai draft failed", e);
    return fallback;
  }
}

type Facts = {
  candidate: CandidateInput;
  dayEvents: CalendarEvent[];
  overlapping: CalendarEvent[];
  before?: { event: CalendarEvent; gapMinutes: number };
  after?: { event: CalendarEvent; gapMinutes: number };
};

// コードで確実に出せること（重なり・前後の予定までの空き）を計算しておく
function factsFor(candidate: CandidateInput, events: CalendarEvent[]): Facts {
  const day = toJstParts(candidate.startAt);
  const dayEvents = events
    .filter((e) => {
      const s = toJstParts(e.start);
      const en = toJstParts(new Date(e.end.getTime() - 1));
      const key = (p: { year: number; month: number; day: number }) => p.year * 10000 + p.month * 100 + p.day;
      return key(s) <= key(day) && key(day) <= key(en);
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const timed = dayEvents.filter((e) => !e.allDay);
  const overlapping = timed.filter((e) => e.start < candidate.endAt && e.end > candidate.startAt);
  const prev = timed.filter((e) => e.end <= candidate.startAt).at(-1);
  const next = timed.find((e) => e.start >= candidate.endAt);
  const minutes = (ms: number) => Math.round(ms / 60000);

  return {
    candidate,
    dayEvents,
    overlapping,
    before: prev && { event: prev, gapMinutes: minutes(candidate.startAt.getTime() - prev.end.getTime()) },
    after: next && { event: next, gapMinutes: minutes(next.start.getTime() - candidate.endAt.getTime()) },
  };
}

// 失敗時のルール: 重なる→×、前後60分以内に予定→△、それ以外→○
function ruleDraft(f: Facts): Draft {
  if (f.overlapping.length) {
    const t = f.overlapping[0].title;
    return { mark: "NO", reason: `「${t}」と重なる`, detail: `「${t}」と時間がかぶってるから×にしておいたよ` };
  }
  const near = [f.before, f.after].filter((x) => x && x.gapMinutes < NEAR_MINUTES).map((x) => x!.event.title);
  if (near.length) {
    const t = [...new Set(near)].join("・");
    return { mark: "MAYBE", reason: `前後に${t}あり`, detail: `前後に${t}があって間があまりないから△にしておいたよ` };
  }
  return { mark: "YES", reason: "予定なし", detail: "この時間は予定が入ってないから○にしておいたよ" };
}

function promptPayload(input: { title: string; memo: string | null }, facts: Facts[]) {
  const ev = (e: CalendarEvent) => ({
    title: e.title,
    time: e.allDay ? "終日" : `${formatTime(e.start)}–${formatTime(e.end)}`,
    location: e.location ?? null,
  });
  return {
    event: { title: input.title, memo: input.memo },
    candidates: facts.map((f) => {
      const d = toJstParts(f.candidate.startAt);
      return {
        candidateId: f.candidate.id,
        date: `${d.year}-${d.month}-${d.day}`,
        time: `${formatTime(f.candidate.startAt)}–${formatTime(f.candidate.endAt)}`,
        overlappingEvents: f.overlapping.map((e) => e.title),
        minutesSincePreviousEvent: f.before ? { title: f.before.event.title, minutes: f.before.gapMinutes } : null,
        minutesUntilNextEvent: f.after ? { title: f.after.event.title, minutes: f.after.gapMinutes } : null,
        eventsThatDay: f.dayEvents.map(ev),
      };
    }),
  };
}
