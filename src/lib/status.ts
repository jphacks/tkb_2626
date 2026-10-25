import type { Answer, Candidate, Participation } from "@prisma/client";

export type ParticipantStatus = "DECLINED" | "ANSWERED" | "DECLARED" | "PENDING";

// 参加者の表示（CLAUDE.md「参加者の表示」）
export function participantStatus(p: Pick<Participation, "attendance" | "answeredAt" | "replyBy">, now = new Date()): ParticipantStatus {
  if (p.attendance === "DECLINED") return "DECLINED";
  if (p.answeredAt) return "ANSWERED";
  if (p.replyBy && p.replyBy > now) return "DECLARED";
  return "PENDING";
}

export const STATUS_LABEL: Record<ParticipantStatus, string> = {
  DECLINED: "不参加",
  ANSWERED: "回答済",
  DECLARED: "宣言中",
  PENDING: "未回答",
};

export type Tally = { candidate: Candidate; yes: number; maybe: number; no: number };

// 候補ごとの○△×の人数（回答済の人だけ数える）と、有力候補順の並び
export function tally(candidates: Candidate[], participations: (Participation & { answers: Answer[] })[]): Tally[] {
  const answered = participations.filter((p) => participantStatus(p) === "ANSWERED");
  return candidates.map((candidate) => {
    const t = { candidate, yes: 0, maybe: 0, no: 0 };
    for (const p of answered) {
      const v = p.answers.find((a) => a.candidateId === candidate.id)?.value;
      if (v === "YES") t.yes++;
      else if (v === "MAYBE") t.maybe++;
      else if (v === "NO") t.no++;
    }
    return t;
  });
}

// 有力候補: ○が多い → △が多い → 日時が早い
export function rankTallies(tallies: Tally[]): Tally[] {
  return [...tallies].sort(
    (a, b) => b.yes - a.yes || b.maybe - a.maybe || a.candidate.startAt.getTime() - b.candidate.startAt.getTime(),
  );
}

// 締切までの残り％
export function remainingRatio(createdAt: Date, deadlineAt: Date, now = new Date()): number {
  const total = deadlineAt.getTime() - createdAt.getTime();
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, (deadlineAt.getTime() - now.getTime()) / total));
}

export const initial = (name: string | null | undefined) => (name ?? "？").slice(0, 1);
