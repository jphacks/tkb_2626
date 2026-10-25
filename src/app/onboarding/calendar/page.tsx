import Image from "next/image";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { connectCalendar, skipCalendar } from "../actions";

function safeCallbackUrl(value: string | string[] | undefined) {
  const url = typeof value === "string" ? value : undefined;
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/home";
}

// C3: 初回だけ。Google でログインした人は events.signIn で onboardedAt が立っているので素通りする
export default async function CalendarOnboardingPage(props: PageProps<"/onboarding/calendar">) {
  const searchParams = await props.searchParams;
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  const user = await requireUser(`/onboarding/calendar?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, onboardedAt: true } });
  if (me?.onboardedAt) redirect(callbackUrl);

  const needsName = !me?.name;
  const googleReady = Boolean(process.env.AUTH_GOOGLE_ID);
  const microsoftReady = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID);

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="はじめに" />
      <form className="flex flex-1 flex-col">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="flex flex-1 flex-col gap-4 px-6 pt-2">
          <Illustration />
          <h1 className="font-display text-[28px] leading-[1.3]">
            予定、のぞいても
            <br />
            いい？
          </h1>
          <p className="text-[15px] leading-[1.6] font-medium text-ink-sub">カレンダーを見て、AIが○△×を先に埋めておくよ。あなたは確認して送るだけ。</p>

          {needsName && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">なまえ（みんなに表示されるよ）</span>
              <input name="name" required maxLength={20} placeholder="例: あやは" className="rounded-md bg-sunken p-3.5 text-[15px] font-medium outline-brand" />
            </label>
          )}

          <div className="flex flex-col gap-3">
            <Button type="submit" variant="primary" formAction={connectCalendar.bind(null, "google")} disabled={!googleReady}>
              Googleカレンダーをつなぐ
            </Button>
            <Button type="submit" variant="secondary" formAction={connectCalendar.bind(null, "microsoft-entra-id")} disabled={!microsoftReady}>
              Outlookをつなぐ
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-card p-3 shadow-soft">
            <Image src="/figma/icon-check-16.svg" alt="" width={16} height={16} className="mt-0.5" />
            <p className="flex-1 text-xs leading-[1.5] font-medium text-ink-sub">予定の中身は相手に見えません。空いてる／埋まってるだけを使います。</p>
          </div>
        </div>

        <footer className="flex flex-col items-center px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
          <button type="submit" formAction={skipCalendar} className="w-full p-2 text-center text-[15px] leading-[1.6] font-bold text-ink-sub">
            今回はスキップして手で答える
          </button>
        </footer>
      </form>
    </main>
  );
}

// Figma の位置どおりに重ねたカレンダーの絵（幅342の枠の中で配置）
function Illustration() {
  return (
    <div className="relative mx-auto h-[200px] w-[342px] shrink-0">
      <div className="absolute top-[50px] left-[31px] h-[120px] w-[150px] rotate-8 overflow-hidden rounded-md bg-accent-soft">
        <div className="h-7 bg-muted" />
      </div>
      <div className="absolute top-[22px] left-[156px] h-[120px] w-[150px] -rotate-6 overflow-hidden rounded-md bg-brand-soft">
        <div className="h-7 bg-muted" />
      </div>
      <div className="absolute top-[55px] left-[95px] h-[120px] w-[150px] overflow-hidden rounded-md bg-card shadow-[0px_4px_0px_0px_#1b1f3b]">
        <div className="h-7 bg-brand" />
      </div>
      <span className="absolute top-[158px] left-[202px] rotate-6 rounded-pill bg-accent px-3 py-1.5 text-[13px] leading-[1.4] font-bold tracking-[0.26px] whitespace-nowrap">
        ○ 空いてる！
      </span>
      <Image src="/figma/c3-star-1.svg" alt="" width={26} height={26} className="absolute top-[12px] left-[17.5px] rotate-10" />
      <Image src="/figma/c3-star-2.svg" alt="" width={18} height={18} className="absolute top-[-2px] left-[301.7px] -rotate-12" />
      <Image src="/figma/c3-star-3.svg" alt="" width={22} height={22} className="absolute top-[150px] left-[310px]" />
    </div>
  );
}
