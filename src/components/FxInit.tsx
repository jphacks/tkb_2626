"use client";

import { useEffect } from "react";
import { buzz, unlockAudio } from "@/lib/fx";

// 押せるもの全部に「ポコっ」を付ける（押した瞬間にへこみ、離すと弾んで戻る）。
// 自前の動きがあるもの・押せないものは data-no-pop か disabled で外す
const PRESSABLE = 'button, a, [role="button"]';

function pressable(target: EventTarget | null) {
  const el = target instanceof Element ? (target.closest(PRESSABLE) as HTMLElement | null) : null;
  if (!el || el.closest("[data-no-pop]") || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return null;
  return el;
}

export function FxInit() {
  useEffect(() => {
    // 最初のタップで音を鳴らせる状態にしておく（iOS 対策）
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { capture: true, once: true });

    let pressed: { el: HTMLElement; anim: Animation } | null = null;
    const down = (e: PointerEvent) => {
      const el = pressable(e.target);
      if (!el) return;
      buzz();
      // CSS の scale プロパティだけ動かす（translate や rotate のクラスを壊さない）
      pressed = { el, anim: el.animate([{ scale: "1" }, { scale: "0.92" }], { duration: 90, easing: "ease-out", fill: "forwards" }) };
    };
    const up = () => {
      if (!pressed) return;
      const { el, anim } = pressed;
      pressed = null;
      el.animate([{ scale: "0.92" }, { scale: "1.05" }, { scale: "1" }], { duration: 220, easing: "ease-out" }).onfinish = () => anim.cancel();
    };
    window.addEventListener("pointerdown", down, { capture: true });
    window.addEventListener("pointerup", up, { capture: true });
    window.addEventListener("pointercancel", up, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("pointerup", up, { capture: true });
      window.removeEventListener("pointercancel", up, { capture: true });
    };
  }, []);
  return null;
}
