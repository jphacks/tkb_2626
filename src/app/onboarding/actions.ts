"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CONNECT_COOKIE, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { safePath } from "@/lib/safe-path";

type CalendarSignIn = "google" | "microsoft-entra-id";

// C3 で名前を聞いているときは先に保存する
async function saveName(userId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 20);
  if (name) await prisma.user.update({ where: { id: userId }, data: { name } });
}

// カレンダー連携: ログイン中に Google / Microsoft の signIn を通し、Account を今のユーザーに結びつける。
// 連携先の切り替えと onboardedAt は auth.ts の events.signIn がクッキーを見て行う
export async function connectCalendar(provider: CalendarSignIn, formData: FormData) {
  const redirectTo = safePath(formData.get("callbackUrl"));
  const user = await requireUser(redirectTo);
  await saveName(user.id, formData);

  (await cookies()).set(CONNECT_COOKIE, provider, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  await signIn(provider, { redirectTo });
}

export async function skipCalendar(formData: FormData) {
  const redirectTo = safePath(formData.get("callbackUrl"));
  const user = await requireUser(redirectTo);
  await saveName(user.id, formData);
  await prisma.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } });
  redirect(redirectTo);
}
