import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/Button";
import { devLogin, isDevLoginEnabled } from "@/lib/dev-login";

// 外部サイトへ飛ばされないよう、アプリ内のパスだけ受け付ける
function safeCallbackUrl(value: string | string[] | undefined) {
  const url = typeof value === "string" ? value : undefined;
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/home";
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
  const showGoogle = Boolean(process.env.AUTH_GOOGLE_ID);

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  return (
    <main className="relative flex flex-1 flex-col pt-11">
      <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-10">
        <Image src="/figma/logo-pochiplease.png" alt="ぽちぷりーず" width={220} height={84} priority />
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

        <div className="h-2" />

        {showGoogle && (
          <form action={signInWithGoogle} className="w-full">
            <Button type="submit" variant="secondary">
              Googleで続ける
            </Button>
          </form>
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
      <Image src="/figma/star-yellow-l.svg" alt="" width={30} height={30} className="pointer-events-none absolute top-[122.8px] left-[36.6px] rotate-12" />
      <Image src="/figma/star-teal.svg" alt="" width={20} height={20} className="pointer-events-none absolute top-[98.1px] left-[321.6px] -rotate-10" />
      <Image src="/figma/star-yellow-s.svg" alt="" width={14} height={14} className="pointer-events-none absolute top-[250px] left-[300px]" />

      <footer className="px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <p className="text-center text-xs leading-[1.5] font-medium text-ink-sub">
          続けると、利用規約とプライバシーポリシーに同意したことになります。
        </p>
      </footer>
    </main>
  );
}
