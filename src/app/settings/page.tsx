import { TopBar } from "@/components/TopBar";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { connectGoogle, disconnectCalendar, logout } from "./actions";
import { EffectsToggle } from "./EffectsToggle";

const PROVIDER_LABEL: Record<string, string> = { google: "Google", line: "LINE", nodemailer: "メール" };

// ST1: アカウント、カレンダー連携・解除、演出、ログアウト（通知・リマインドの項目は出さない）
export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, calendarProvider: true, reduceEffects: true, accounts: { select: { provider: true } } },
  });
  const loginWith = me?.accounts.map((a) => PROVIDER_LABEL[a.provider] ?? a.provider) ?? [];
  const isDevUser = me?.email?.endsWith("@dev.pochiplease.test");
  const googleReady = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="設定" backHref="/home" />
      <div className="flex flex-1 flex-col gap-3.5 px-6 pb-10">
        <Group label="アカウント">
          <Row title={me?.name ?? "名前なし"} sub={isDevUser ? "開発用ログイン中" : `${loginWith.join("・") || "—"}でログイン中`} />
        </Group>

        <Group label="カレンダー">
          <Row title="Googleカレンダー" sub={me?.calendarProvider === "GOOGLE" ? `連携中${me.email && !isDevUser ? `・${me.email}` : ""}` : "未連携"}>
            {me?.calendarProvider === "GOOGLE" ? (
              <form action={disconnectCalendar}>
                <button type="submit" className="p-2 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-urgent">
                  解除
                </button>
              </form>
            ) : (
              <form action={connectGoogle}>
                <button type="submit" disabled={!googleReady} className="p-2 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-brand disabled:opacity-40">
                  連携する
                </button>
              </form>
            )}
          </Row>
          <Row title="Outlook" sub={me?.calendarProvider === "MICROSOFT" ? "連携中" : "未連携"}>
            <span className="p-2 text-[13px] leading-[1.4] font-bold tracking-[0.26px] text-ink-sub/50">準備中</span>
          </Row>
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
