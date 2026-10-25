import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { createTransport } from "nodemailer";
import { prisma } from "@/lib/db";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const MICROSOFT_CALENDAR_SCOPE = "Calendars.Read";
// 個人の Microsoft アカウント（consumers）だけを受け付ける
export const MICROSOFT_ISSUER = "https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0";
// カレンダー連携のボタンから来たことを signIn に伝えるクッキー（中身は provider の id）
export const CONNECT_COOKIE = "pp_calendar_connect";

const CALENDAR_OF = { google: "GOOGLE", "microsoft-entra-id": "MICROSOFT" } as const;

// 設定値が入っている provider だけ有効にする（未設定のまま起動しても落ちないように）
const providers: Provider[] = [];

if (process.env.AUTH_LINE_ID) {
  providers.push(Line({ authorization: { params: { scope: "openid profile" } } }));
}

if (process.env.AUTH_GOOGLE_ID) {
  providers.push(
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
  );
}

if (process.env.EMAIL_SERVER_USER) {
  providers.push(
    Nodemailer({
      server: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
      },
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url, provider }) {
        const transport = createTransport(provider.server);
        const result = await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "ぽちぷりーずのログインリンク",
          text: `下のリンクを開くと、ぽちぷりーずにログインできます（24時間有効）。\n\n${url}\n\n心当たりがない場合は、このメールを無視してください。`,
          html: `<p>下のボタンを開くと、ぽちぷりーずにログインできます（24時間有効）。</p><p><a href="${url}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#2e8a7f;color:#fff;font-weight:bold;text-decoration:none">ログインする</a></p><p style="color:#4f6f6f;font-size:12px">心当たりがない場合は、このメールを無視してください。</p>`,
        });
        if (result.rejected.length) throw new Error(`login mail rejected: ${result.rejected.join(", ")}`);
      },
    }),
  );
}

// Microsoft はカレンダー連携のみ。ログイン画面には出さない
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
  providers.push(
    MicrosoftEntraID({
      issuer: MICROSOFT_ISSUER,
      authorization: { params: { scope: `openid profile email offline_access User.Read ${MICROSOFT_CALENDAR_SCOPE}` } },
    }),
  );
}

async function readConnectCookie() {
  const jar = await cookies();
  const value = jar.get(CONNECT_COOKIE)?.value;
  try {
    jar.delete(CONNECT_COOKIE);
  } catch {
    // 消せない場面でも、短い有効期限で自然に消える
  }
  return value;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/sent", error: "/settings" },
  providers,
  callbacks: {
    // Microsoft でのログインは受け付けない。連携ボタン（ログイン中のみ押せる）から来たときだけ通す
    async signIn({ account }) {
      if (account?.provider !== "microsoft-entra-id") return true;
      return (await cookies()).get(CONNECT_COOKIE)?.value === "microsoft-entra-id";
    },
  },
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

      const calendar = CALENDAR_OF[account.provider as keyof typeof CALENDAR_OF];
      if (!calendar) return;
      const hasScope = account.scope?.includes(calendar === "GOOGLE" ? GOOGLE_CALENDAR_SCOPE : MICROSOFT_CALENDAR_SCOPE);
      if (!hasScope) return;

      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { calendarProvider: true, onboardedAt: true },
      });
      // 連携ボタンから来たときはそのカレンダーに切り替える。Google でのふつうのログインは、未設定のときだけ Google にする（C3 も飛ばす）
      const connecting = (await readConnectCookie()) === account.provider;
      if (!connecting && current?.calendarProvider) return;
      await prisma.user.update({
        where: { id: user.id },
        data: { calendarProvider: calendar, onboardedAt: current?.onboardedAt ?? new Date() },
      });
    },
  },
});
