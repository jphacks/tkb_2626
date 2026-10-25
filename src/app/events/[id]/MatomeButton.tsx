"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { buttonClassName } from "@/components/Button";
import { lessMotion, tap } from "@/lib/fx";

// S3「まだの◯人をまとめて連打」: 輪が広がって脈打つ。押すと「はよ〜〜！」がまだの人それぞれへ飛んでから連打画面へ
export function MatomeButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const btnRef = useRef<HTMLAnchorElement>(null);
  const busy = useRef(false);

  function press(e: React.MouseEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    tap(true);
    const btn = btnRef.current;
    btn?.animate([{ transform: "scale(1)" }, { transform: "scale(.9)" }, { transform: "scale(1)" }], { duration: 220 });
    const avatars = [...document.querySelectorAll<HTMLElement>("[data-wait-avatar]")];
    if (!btn || lessMotion() || avatars.length === 0) {
      router.push(href);
      return;
    }
    const from = btn.getBoundingClientRect();
    avatars.forEach((av, i) => {
      const to = av.getBoundingClientRect();
      const st = document.createElement("div");
      st.textContent = "はよ〜〜！";
      st.className =
        "pointer-events-none fixed z-50 whitespace-nowrap rounded-[10px] border-2 border-[#1b1f3b] bg-accent px-2 py-0.5 font-display text-sm text-ink shadow-[0_3px_0_#1b1f3b]";
      const x0 = from.left + from.width / 2 - 40;
      st.style.left = `${x0}px`;
      st.style.top = `${from.top}px`;
      document.body.appendChild(st);
      st.animate(
        [
          { transform: "translate(0,0) scale(.5)" },
          { transform: `translate(${to.left + to.width / 2 - 40 - x0}px,${to.top - from.top}px) scale(1)` },
        ],
        { duration: 750, delay: i * 70, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" },
      ).onfinish = () => {
        st.remove();
        av.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 220 });
      };
    });
    setTimeout(() => router.push(href), 1100);
  }

  return (
    <div className="relative">
      {/* 2秒ごとに広がる輪 */}
      {[0, 1].map((i) => (
        <span
          key={i}
          className="fx-loop pointer-events-none absolute inset-0 animate-[ring-out_2s_ease-out_infinite] rounded-pill border-3 border-alert"
          style={{ animationDelay: `${i}s` }}
        />
      ))}
      <a ref={btnRef} href={href} onClick={press} className={buttonClassName("accent", "!bg-alert relative animate-[breathe_2s_ease-in-out_infinite]")}>
        {label}
      </a>
    </div>
  );
}
