import type { ButtonHTMLAttributes } from "react";

// Figma の Button: 太線＋ハードシャドウのピル型。Primary=主要、Accent=楽しい系、Secondary=白
const variants = {
  primary: "bg-brand text-white",
  accent: "bg-accent text-ink",
  secondary: "bg-card text-ink",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

// リンクをボタンの見た目にするときにも使う
export function buttonClassName(variant: keyof typeof variants = "accent", className = "") {
  return `flex min-h-14 w-full items-center justify-center gap-2 rounded-pill px-6 py-4 text-[15px] leading-[1.6] font-bold drop-shadow-pop transition active:translate-y-[2px] active:drop-shadow-none disabled:opacity-35 disabled:active:translate-y-0 ${variants[variant]} ${className}`;
}

export function Button({ variant = "accent", className = "", children, ...props }: Props) {
  return (
    <button className={buttonClassName(variant, className)} {...props}>
      {children}
    </button>
  );
}
