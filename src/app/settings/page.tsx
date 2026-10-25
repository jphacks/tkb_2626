import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { AUTH_ERROR_MESSAGE } from "@/lib/auth-error";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { connectCalendar } from "../onboarding/actions";
import { disconnectCalendar, logout } from "./actions";
import { EffectsToggle } from "./EffectsToggle";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", line: "LINE", nodemailer: "メール" };

// ST1: アカウント、カレンダー連携・解除、演出、ログアウト（通知・リマインドの項目は出さない）
// Auth.js のエラー画面（pages.error）も兼ねる。未ログインで来たエラーはログイン画面に回す
export default async function SettingsPage(props: PageProps<"/settings">) {
  const { error: errorCode } = await props.searchParams;
  const code = typeof errorCode === "string" ? errorCode : undefined;
  if (code && !(await auth())?.user) redirect(`/login?error=${encodeURIComponent(code)}`);
  const error = code ? (AUTH_ERROR_MESSAGE[code] ?? AUTH_ERROR_MESSAGE.Default) : null;

  const user = await requireUser("/settings");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, calendarProvider: true, reduceEffects: true, accounts: { select: { provider: true } } },
  });
  const loginWith = me?.accounts.flatMap((a) => PROVIDER_LABEL[a.provider] ?? []) ?? [];
  const isDevUser = me?.email?.endsWith("@dev.pochiplease.test");
  const calendars = [
    { key: "GOOGLE", title: "Googleカレンダー", provider: "google", ready: Boolean(process.env.AUTH_GOOGLE_ID) },
    { key: "MICROSOFT", title: "Outlook", provider: "microsoft-entra-id", ready: Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID) },
  ] as const;

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="設定" backHref="/home" />
      <div className="flex flex-1 flex-col gap-3.5 px-6 pb-10">
        <Group label="アカウント">
          <Row title={me?.name ?? "名前なし"} sub={isDevUser ? "開発用ログイン中" : `${loginWith.join("・") || "—"}でログイン中`} />
        </Group>

        {error && <p className="rounded-md bg-card p-3 text-[13px] leading-[1.5] font-bold text-urgent shadow-soft">{error}</p>}

        <Group label="カレンダー">
          {calendars.map((c) => (
            <Row key={c.key} title={c.title} sub={me?.calendarProvider === c.key ? "連携中" : "未連携"}>
              {me?.calendarProvider === c.key ? (
                <form action={disconnectCalendar}>
                  <button type="submit" className="p-2 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-urgent">
                    解除
                  </button>
                </form>
              ) : (
                <form action={connectCalendar.bind(null, c.provider)}>
                  <input type="hidden" name="callbackUrl" value="/settings" />
                  <button type="submit" disabled={!c.ready} className="p-2 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand disabled:opacity-40">
                    連携する
                  </button>
                </form>
              )}
            </Row>
          ))}
          <p className="px-3 py-2 text-xs leading-[1.5] font-medium text-ink-sub">連携できるカレンダーは1つ。もう片方をつなぐと切り替わるよ。</p>
        </Group>

        <Group label="演出">
          <Row title="光とバイブを弱める" sub="点滅をおさえた表示にする">
            <EffectsToggle on={me?.reduceEffects ?? false} />
          </Row>
        </Group>

        <form action={logout} className="flex justify-center">
          <button type="submit" className="p-3 text-[15px] leading-[1.6] font-bold text-ink-sub">
            ログアウト
          </button>
        </form>
      </div>
    </main>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <p className="text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub">{label}</p>
      <div className="flex w-full flex-col overflow-hidden rounded-md bg-card shadow-soft [&>*+*]:border-t [&>*+*]:border-sunken">{children}</div>
    </>
  );
}

function Row({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex w-full items-center gap-2.5 p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[15px] leading-[1.6] font-bold">{title}</p>
        {sub && <p className="truncate text-xs leading-[1.5] font-medium text-ink-sub">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
