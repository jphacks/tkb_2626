type Mark = "YES" | "MAYBE" | "NO";

const SYMBOL: Record<Mark, string> = { YES: "○", MAYBE: "△", NO: "×" };
const SELECTED: Record<Mark, string> = {
  YES: "bg-brand text-white",
  MAYBE: "bg-accent text-ink",
  NO: "bg-muted text-ink",
};

// Figma の AnswerChip: ○△×。選ばれるとポップに浮き上がる
export function AnswerChip({ mark, selected, size = 42 }: { mark: Mark; selected: boolean; size?: 32 | 42 }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-pill font-display text-xl leading-[1.4] ${size === 42 ? "size-[42px]" : "size-8"} ${
        selected ? `${SELECTED[mark]} drop-shadow-[0_2px_0_#1b1f3b]` : "border-[1.5px] border-muted bg-card text-ink-sub shadow-soft"
      }`}
    >
      {SYMBOL[mark]}
    </span>
  );
}

export type { Mark };
