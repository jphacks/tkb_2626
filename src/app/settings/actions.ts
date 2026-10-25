"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function setReduceEffects(on: boolean) {
  const user = await requireUser("/settings");
  await prisma.user.update({ where: { id: user.id }, data: { reduceEffects: on } });
  revalidatePath("/settings");
}

// 解除は calendarProvider を外すだけ。ログインに使っている Account は消さない
export async function disconnectCalendar() {
  const user = await requireUser("/settings");
  await prisma.user.update({ where: { id: user.id }, data: { calendarProvider: null } });
  revalidatePath("/settings");
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
