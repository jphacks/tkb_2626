import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, DotGothic16, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const delaGothicOne = Dela_Gothic_One({
  variable: "--font-dela-gothic-one",
  weight: "400",
  subsets: ["latin"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru-gothic",
  weight: ["500", "700"],
  subsets: ["latin"],
});

const dotGothic16 = DotGothic16({
  variable: "--font-dotgothic16",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ぽちぷりーず",
  description: "日程調整、ぽちっとおねがい。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafefd",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${delaGothicOne.variable} ${zenMaruGothic.variable} ${dotGothic16.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        {/* スマホ前提。PC では最大幅430pxで中央寄せ */}
        <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-canvas">{children}</div>
      </body>
    </html>
  );
}
