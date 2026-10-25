import { TopBar } from "@/components/TopBar";

export const metadata = { title: "プライバシーポリシー | ぽちぷりーず" };

// Google の OAuth 公開に必要なページ。取得する情報と使い道だけを書く
export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col pt-11">
      <TopBar title="プライバシーポリシー" backHref="/login" />
      <article className="flex flex-col gap-5 px-6 pb-12 text-[15px] leading-[1.7] font-medium text-ink">
        <p>ぽちぷりーず（以下「本サービス」）は、日程調整のために次の情報を扱います。</p>

        <Section title="取得する情報">
          <li>ログインに使ったアカウントの名前・メールアドレス・アイコン（Google または LINE）</li>
          <li>連携したカレンダーの予定（Google カレンダーの読み取りのみ。書き込みはしません）</li>
          <li>本サービスで作った調整、候補日への回答、ひとことなどの入力内容</li>
        </Section>

        <Section title="使い道">
          <li>カレンダーの予定は、回答の下書き（○△×）を作るためだけに使います。予定の中身を他の参加者に見せることはありません</li>
          <li>下書きを作るときに、候補日の前後の予定の名前・時刻・場所を Anthropic 社の Claude API に送ります。送った内容が AI の学習に使われることはありません</li>
          <li>カレンダーの予定は保存せず、画面を開いたときにその都度読み込みます</li>
        </Section>

        <Section title="第三者への提供">
          <li>上の Claude API への送信を除き、取得した情報を第三者に提供しません</li>
        </Section>

        <Section title="削除・連携の解除">
          <li>カレンダーの連携は設定画面からいつでも解除できます</li>
          <li>Google アカウントからは https://myaccount.google.com/permissions で本サービスへのアクセスを取り消せます</li>
          <li>アカウントとデータの削除を希望する場合は、下の連絡先までご連絡ください</li>
        </Section>

        <Section title="連絡先">
          <li>ggrs0201@gmail.com</li>
        </Section>

        <p className="text-xs text-ink-sub">2026年10月25日 制定</p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[17px] leading-[1.5] font-bold">{title}</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>
    </section>
  );
}
