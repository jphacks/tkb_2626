import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/Button";
import { devLogin, isDevLoginEnabled } from "@/lib/dev-login";
import { AUTH_ERROR_MESSAGE } from "@/lib/auth-error";
import { safePath } from "@/lib/safe-path";

// 外部サイトへ飛ばされないよう、アプリ内のパスだけ受け付ける
function safeCallbackUrl(value: string | string[] | undefined) {
  return safePath(value);
}

async function findInvite(callbackUrl: string) {
  const token = callbackUrl.match(/^\/e\/([^/?#]+)/)?.[1];
  if (!token) return null;
  return prisma.event.findUnique({
    where: { shareToken: token },
    select: { title: true, owner: { select: { name: true } } },
  });
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);

  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  const invite = await findInvite(callbackUrl);
  const showDevLogin = await isDevLoginEnabled();
  // LINE の設定値が無い環境でも、ボタンは出しておく（押すと「準備中」を出す）
  const lineReady = Boolean(process.env.AUTH_LINE_ID);
  const showGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
  const showEmail = Boolean(process.env.EMAIL_SERVER_USER);
  const error = typeof searchParams.error === "string" ? (AUTH_ERROR_MESSAGE[searchParams.error] ?? AUTH_ERROR_MESSAGE.Default) : null;

  // ログイン後はいったん C3 に通す（連携済み・2回目以降はそのまま callbackUrl へ進む）
  const redirectTo = `/onboarding/calendar?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  async function signInWithLine() {
    "use server";
    if (!lineReady) redirect(`/login?error=LineComingSoon&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    await signIn("line", { redirectTo });
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo });
  }

  async function signInWithEmail(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("nodemailer", { email, redirectTo });
  }

  return (
    <main className="relative flex flex-1 flex-col pt-11">
      <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-10">
        <Image src="/logo-pochiplease.svg" alt="ぽちぷりーず" width={232} height={84} priority />
        <h1 className="w-full text-center font-display text-[28px] leading-[1.3]">はじめまして！</h1>
        <p className="w-full text-center text-[15px] leading-[1.6] font-medium text-ink-sub">
          LINEやGoogleのアカウントで、そのまま始められるよ。
        </p>

        {invite && (
          <div className="flex w-full items-center gap-3 rounded-md bg-brand-soft p-4">
            <Image src="/figma/icon-calendar.svg" alt="" width={24} height={24} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-xs leading-[1.5] font-medium text-ink-sub">
                {invite.owner.name ?? "だれか"}さんから招待されています
              </p>
              <p className="text-[15px] leading-[1.6] font-bold">{invite.title}</p>
            </div>
          </div>
        )}

        {error && <p className="w-full rounded-md bg-card p-3 text-[13px] leading-[1.5] font-bold text-urgent shadow-soft">{error}</p>}

        <div className="h-2" />


        {showGoogle && (
          <form action={signInWithGoogle} className="w-full">
            <Button type="submit" variant="accent">
              Googleで続ける
            </Button>
          </form>
        )}

        <form action={signInWithLine} className="w-full">
          <Button type="submit" variant="secondary">
            LINEで続ける
          </Button>
        </form>

        {showEmail && (
          <details className="group w-full">
            <summary className="cursor-pointer list-none text-center text-[15px] leading-[1.6] font-bold text-brand group-open:hidden [&::-webkit-details-marker]:hidden">
              メールアドレスで登録
            </summary>
            <form action={signInWithEmail} className="flex w-full flex-col gap-3">
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="rounded-md bg-sunken p-3.5 text-[15px] font-medium outline-brand"
              />
              <Button type="submit" variant="secondary">
                ログインリンクを送る
              </Button>
            </form>
          </details>
        )}

        {showDevLogin && (
          <form action={devLogin} className="flex w-full flex-col gap-2 rounded-md border-2 border-dashed border-brand p-3">
            <p className="text-xs font-medium text-ink-sub">開発用ログイン（本番では出ません）</p>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <input name="name" required placeholder="名前（例: あやは）" className="rounded-md bg-sunken p-3.5 text-[15px] font-medium outline-brand" />
            <Button type="submit" variant="secondary">
              この名前でログイン
            </Button>
          </form>
        )}
      </div>

      {/* 飾りの星（Figma の位置どおり） */}
      <Image src="/figma/star-yellow-l.svg" alt="" width={30} height={30} className="pointer-events-none absolute top-[152.8px] left-[20.8px] rotate-12" />
      <Image src="/figma/star-teal.svg" alt="" width={20} height={20} className="pointer-events-none absolute top-[119.6px] left-[345.6px] -rotate-10" />
      <Image src="/figma/star-yellow-s.svg" alt="" width={14} height={14} className="pointer-events-none absolute top-[50px] left-[336px]" />

      <footer className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">
          続けると、利用規約と
          <Link href="/privacy" className="underline">
            プライバシーポリシー
          </Link>
          に同意したことになります。
        </p>
      </footer>
    </main>
  );
}
