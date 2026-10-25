"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/token";
import { safePath } from "@/lib/safe-path";

export const isDevLoginEnabled = async () => process.env.DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

// 開発用ログイン: 名前だけでユーザーを作り、Auth.js と同じ DB セッションを発行する。本番では無効
export async function devLogin(formData: FormData) {
  if (!(await isDevLoginEnabled())) throw new Error("dev login is disabled");

  const name = String(formData.get("name") ?? "").trim().slice(0, 20);
  const callbackUrl = String(formData.get("callbackUrl") ?? "/home");
  if (!name) return;

  const email = `${encodeURIComponent(name)}@dev.pochiplease.test`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, calendarProvider: "GOOGLE", onboardedAt: new Date() },
  });

  const sessionToken = randomToken(32);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

  (await cookies()).set("authjs.session-token", sessionToken, { httpOnly: true, sameSite: "lax", path: "/", expires });
  redirect(safePath(callbackUrl));
}
