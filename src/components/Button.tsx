import type { ButtonHTMLAttributes } from "react";

// Figma の Button: 太線＋ハードシャドウのピル型。Accent=楽しい系、Secondary=白
const variants = {
  accent: "bg-accent",
  secondary: "bg-card",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = "accent", className = "", children, ...props }: Props) {
  return (
    <button
      className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-pill px-6 py-4 text-[15px] leading-[1.6] font-bold text-ink drop-shadow-pop transition active:translate-y-[2px] active:drop-shadow-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
