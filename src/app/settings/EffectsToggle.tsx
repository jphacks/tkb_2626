"use client";

import { useOptimistic, useTransition } from "react";
import { setReduceEffects } from "./actions";

export function EffectsToggle({ on }: { on: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      aria-label="光とバイブを弱める"
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setReduceEffects(!optimistic);
        })
      }
      className={`relative h-7 w-[46px] shrink-0 rounded-pill transition-colors ${optimistic ? "bg-brand" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-pill bg-white shadow-soft transition-[left] ${optimistic ? "left-[20px]" : "left-0.5"}`} />
    </button>
  );
}
