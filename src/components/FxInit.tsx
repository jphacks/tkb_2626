"use client";

import { useEffect } from "react";
import { unlockAudio } from "@/lib/fx";

// 最初のタップで音を鳴らせる状態にしておく（iOS 対策）
export function FxInit() {
  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener("pointerdown", on, { capture: true, once: true });
    return () => window.removeEventListener("pointerdown", on, { capture: true });
  }, []);
  return null;
}
