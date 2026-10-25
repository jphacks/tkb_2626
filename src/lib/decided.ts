import type { Answer, Candidate, Event, Participation } from "@prisma/client";

// 確定した日に参加する人: 不参加でなく、その日に×をつけていない人（送り手を含む）
export function attendeesOf(
  event: Event & { participations: (Participation & { answers: Answer[]; user: { name: string | null } })[] },
  decided: Candidate,
) {
  return event.participations.filter(
    (p) => p.attendance !== "DECLINED" && p.answeredAt && p.answers.find((a) => a.candidateId === decided.id)?.value !== "NO",
  );
}

export const GENRE_ICON: Record<string, string> = {
  DRINK: "/figma/genre-drink-40.svg",
  LUNCH: "/figma/genre-lunch.svg",
  CAMP: "/figma/genre-camp.svg",
  STUDY: "/figma/genre-study.svg",
};
