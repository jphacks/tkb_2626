import { redirect } from "next/navigation";
import { auth } from "@/auth";

// ログイン必須のページ・Server Actions の先頭で呼ぶ
export async function requireUser(callbackUrl?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  }
  return session.user as typeof session.user & { id: string };
}
