import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/Button";

// 実装の順番1の動作確認用。ホーム（C1）は順番7で作る
export default async function HomePage() {
  const user = await requireUser("/home");
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, calendarProvider: true },
  });

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-6 pt-11">
      <h1 className="font-display text-[28px] leading-[1.3]">ホーム</h1>
      <p className="text-[15px] font-medium text-ink-sub">
        {me?.name ?? "名前なし"}（{me?.email ?? "メールなし"}）でログイン中
      </p>
      <p className="text-[15px] font-medium text-ink-sub">
        カレンダー連携: {me?.calendarProvider ?? "未連携"}
      </p>
      <form action={logout}>
        <Button type="submit" variant="secondary">
          ログアウト
        </Button>
      </form>
    </main>
  );
}
