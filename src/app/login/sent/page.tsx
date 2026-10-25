import Image from "next/image";
import Link from "next/link";

// メールのログインリンクを送ったあと（Auth.js の verifyRequest）。Figma に無い画面なので C0 の見た目に合わせる
export default function LoginSentPage() {
  return (
    <main className="flex flex-1 flex-col pt-11">
      <div className="flex flex-1 flex-col items-center gap-4 px-6 pt-10">
        <Image src="/logo-pochiplease.svg" alt="ぽちぷりーず" width={232} height={84} priority />
        <h1 className="w-full text-center font-display text-[28px] leading-[1.3]">メールを送ったよ</h1>
        <p className="w-full text-center text-[15px] leading-[1.6] font-medium text-ink-sub">
          届いたメールのリンクを開くと、そのままログインできるよ。リンクは24時間有効です。
        </p>
        <p className="w-full text-center text-xs leading-[1.5] font-medium text-ink-sub">届かないときは、迷惑メールのフォルダも見てみてね。</p>
      </div>
      <footer className="flex justify-center px-6 pt-4 pb-[max(34px,env(safe-area-inset-bottom))]">
        <Link href="/login" className="p-2 text-[15px] leading-[1.6] font-bold text-brand">
          ログイン画面にもどる
        </Link>
      </footer>
    </main>
  );
}
