import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: `openid email profile ${GOOGLE_CALENDAR_SCOPE}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  events: {
    // Auth.js は既存 Account のトークンを再ログイン時に更新しないので、毎回上書きする
    async signIn({ user, account }) {
      if (!user.id || !account || account.type !== "oauth" && account.type !== "oidc") return;

      await prisma.account.updateMany({
        where: { provider: account.provider, providerAccountId: account.providerAccountId },
        data: {
          access_token: account.access_token,
          expires_at: account.expires_at,
          scope: account.scope,
          id_token: account.id_token,
          token_type: account.token_type,
          // Google は prompt=consent のときだけ refresh_token を返す。来なかったときは既存を残す
          ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
        },
      });

      // Google でログインした人はカレンダー連携済みとして扱い、C3 を飛ばす
      if (account.provider === "google" && account.scope?.includes(GOOGLE_CALENDAR_SCOPE)) {
        const current = await prisma.user.findUnique({
          where: { id: user.id },
          select: { calendarProvider: true, onboardedAt: true },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: {
            calendarProvider: current?.calendarProvider ?? "GOOGLE",
            onboardedAt: current?.onboardedAt ?? new Date(),
          },
        });
      }
    },
  },
});
