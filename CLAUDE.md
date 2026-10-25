@AGENTS.md

# ぽちぷりーず（MVP）

日程調整アプリ。送り手が候補日を出してリンクを配り、受け手はカレンダーからAIが埋めた○△×を確認して返す。返事が遅い人には「はよ〜〜！」の連打をプレゼントとして送れる。スマホで使うWebアプリ。

## デザイン

- 正は Figma「UIデザインの部屋3」: https://www.figma.com/design/6xjdqLfKnUBsUNSmFuF7sa/2026JPHackathon?node-id=168-18049
- 画面を作るときは、下の画面表の node-id を Figma MCP（get_design_context / get_screenshot）で取得して合わせる。同じページにある2組目のコピー（168-26254 以降）は使わない
- 横幅390pxを基準にする。PCでは最大幅430pxで中央寄せ。タップ領域は高さ44px以上。下部固定ボタンは safe-area を避ける
- 参考のみで実装しないフレーム: S5（168-18739）、P2（168-25078）、S3-b v2（168-18521）、S4 v3（168-18661）、S3-b 動きの仕様（168-18580、動きの参考にはする）、回答と通知の流れ（168-19310）

### Figma から変える文言・要素

- Slack の要素（C0 の Slack ログイン、P1 の「Slackで渡す」、ST1 の Slack 通知）は出さない。C0 のボタンは LINE・Google・メールの3つ
- C0「LINEやSlackのアカウントで、そのまま始められるよ。」→「LINEやGoogleのアカウントで、そのまま始められるよ。」
- S2「相手はログインなしで答えられるよ。」→「相手はLINEかGoogleでログインして答えるよ。」
- 自動通知を前提にした文言は消す: R0-b 伝えた（168-19168）の「チャットに通知」カード、R5 の「宣言した時間の10分前に…お知らせ」、S1-② の「全員そろったらお知らせするね」、S1-⑤ の「締切の1時間前に自動でリマインド」、S1-③ の「リマインド多め」、D2 の「LINE・Slackで知らせたよ」「Googleカレンダーに追加したよ」の行
- S3「まだの人」の各人の下（Figma の「授業中」「予定ぎっしり」「未連携」）には予定の中身を出さない。宣言中なら宣言ラベル（例「21時に返す」）、それ以外は「未回答」
- C2 下部の「仮決定」「あと◯人の確認待ち」「全員に確認をおねがいする」は出さない
- S3 のリアルタイム更新（「リアルタイムで更新中」「いま更新」）は作らない。開き直したときに最新が出るだけ。宣言のバナーは最新の宣言を表示するだけ

## 画面とURL

| Figma（node-id） | URL | 備考 |
|---|---|---|
| C-0 起動（168-19791） | `/` | 未ログインは `/login`、ログイン済みは `/home` へ |
| C0 アカウント作成（168-18053） | `/login` | `?callbackUrl=` に招待リンクがあれば「◯◯さんから招待」を出す。ログイン後の戻り先は Auth.js の `signIn(provider, { redirectTo })` に callbackUrl を渡す |
| C3 カレンダー連携（168-18073） | `/onboarding/calendar` | `onboardedAt` が空の人に初回だけ。Google でログインした人は飛ばす（連携済み扱いで onboardedAt を立てる）。名前が無い人はここで名前も入れる。callbackUrl を保持し、終わったら招待に戻す |
| C1-a ホーム 自分が作った（168-25572） | `/home?tab=mine` | 右上に設定の入口 |
| C1-b ホーム 届いた（168-18175） | `/home?tab=received` | 「あとで返す N件」の入口 |
| C2 過去の調整（168-18223） | `/history` | 確定・中止・締切切れ |
| ST1 設定（168-25653） | `/settings` | アカウント、カレンダー連携・解除、ログアウト、演出を弱める。通知とリマインドの項目は出さない |
| S1 ①〜⑤（168-18269, 168-18316, 168-24727, 168-24775, 168-24837, 168-25000） | `/events/new` | 1ページで段階入力（なまえ・ジャンル→人数→優先度→候補日→締切）。メモ欄（場所・説明、任意）を①に足す |
| S2 リンク発行完了（168-18404） | `/events/[id]/share` | リンクのコピー、LINEで共有、その他の共有（Web Share API） |
| S3 回答状況（168-18424, 168-19555, 168-18617） | `/events/[id]` | 送り手のみ。まとめて連打、管理メニュー（E0）、締切後や全員回答後は「日程を決める」へ |
| E0 管理メニュー（168-24439） | `/events/[id]` 上のシート | 名前・人数・締切の変更、中止。候補日の項目は出さない |
| E1 編集（168-24569） | `/events/[id]/edit` | 名前・人数・締切だけ。ボタンは「保存する」。保存後は S3 に戻り、LINE共有ボタンを出す |
| E2 中止の確認（168-24604）／E3 中止を伝えた（168-24711） | `/events/[id]/cancel` | 中止後は LINE共有で知らせる。「同じメンバーで作りなおす」は出さない |
| D1 日程を決める（168-24351） | `/events/[id]/decide` | 候補ごとの○△×の人数 |
| D2 決まった！（168-24396） | `/events/[id]/decided` | ボタンは「カレンダーに追加」「LINEでみんなに知らせる」「ホームへ」の3つ |
| S4 連打（168-19797） | `/events/[id]/nudge?to=[userId か all]` | 連打数 1〜100 |
| P1 プレゼントできた（168-25056） | `/events/[id]/nudge/sent?ids=…` | ひとこと（任意）、LINEで渡す、リンクをコピー。まとめて送ったときは相手ごとに行を並べ、それぞれに LINEで渡すボタン |
| R0 参加確認（168-18771） | `/e/[shareToken]` | 未ログインは `/login?callbackUrl=` へ。送り手本人が開いたら `/events/[id]` へ |
| R1 回答（168-18896, 168-18923, 168-19021） | `/e/[shareToken]/answer` | AI下書き、備考、返す時間の宣言、日別カレンダー（R1-a v4） |
| R2 回答完了（168-25535） | `/e/[shareToken]/done` | 回答の変更、「やっぱり参加をやめる」 |
| R0-b 不参加（168-19148, 168-19168） | `/e/[shareToken]/decline` | ひとこと（任意） |
| D3 決定の表示（168-24416） | `/e/[shareToken]`（確定後の表示） | 「カレンダーに追加」「やっぱり行けない」 |
| 中止の表示 | `/e/[shareToken]`（中止後の表示） | 「中止になりました」と中止のひとこと |
| R5 あとで返す（168-19048） | `/later` | 宣言した時刻が近い順 |
| R3 プレゼント開封（168-19192, 168-19218, 168-19225） | `/p/[token]` | 宛先本人のログインが必要（別人なら開けない旨を表示）。開封時に openedAt を記録し、演出のあと `/e/[shareToken]` へ |
| カレンダー用ファイル | `/events/[id]/calendar.ics` | Route Handler。`text/calendar` で確定日の予定を返す |

## データモデル

Auth.js 標準の User / Account / Session / VerificationToken は `@auth/prisma-adapter` の README にあるスキーマをそのまま使う（`refresh_token`、`access_token`、`expires_at Int?` など）。カレンダーのトークンは Account（provider が `google` か `microsoft-entra-id`）に入る。

```prisma
// User に追加
//   onboardedAt      DateTime?          // C3 を通過（連携・スキップ・Googleログイン）
//   calendarProvider CalendarProvider?  // 予定を読む先。null なら未連携
//   reduceEffects    Boolean @default(false) // 演出を弱める
// enum CalendarProvider { GOOGLE MICROSOFT }

model Event {
  id                 String      @id @default(cuid())
  ownerId            String
  title              String
  genre              Genre?
  memo               String?     // 場所・説明
  headcount          Int         // 自分を含む
  priority           Priority
  deadlineAt         DateTime
  shareToken         String      @unique
  status             EventStatus @default(OPEN)
  decidedCandidateId String?     @unique
  decidedAt          DateTime?
  canceledAt         DateTime?
  cancelNote         String?     // 中止のひとこと
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt
}
enum Genre       { DRINK LUNCH CAMP STUDY }
enum Priority    { LOW NORMAL URGENT }      // ゆるめ・ふつう・急ぎ
enum EventStatus { OPEN DECIDED CANCELED }

model Candidate {
  id       String   @id @default(cuid())
  eventId  String
  startAt  DateTime
  endAt    DateTime
  byAi     Boolean  // AIの提案から追加したか
}

model Participation {
  id           String     @id @default(cuid())
  eventId      String
  userId       String
  attendance   Attendance @default(PENDING)
  note         String?    // 備考／不参加のひとこと
  answeredAt   DateTime?
  replyBy      DateTime?  // 返す時間の宣言
  replyByLabel String?    // 今夜21時／明日の朝／週末
  lastOpenedAt DateTime?
  @@unique([eventId, userId])
}
enum Attendance { PENDING ATTENDING DECLINED }

model Answer {
  participationId String
  candidateId     String
  value           Mark
  byAi            Boolean  // AIが埋めたまま触っていない
  reason          String?  // 一覧の短い理由
  detail          String?  // カレンダー横の説明
  @@id([participationId, candidateId])
}
enum Mark { YES MAYBE NO }

model Nudge {
  id         String    @id @default(cuid())
  eventId    String
  fromUserId String
  toUserId   String
  count      Int       // 1〜100
  message    String?   // P1 のひとこと
  token      String    @unique
  openedAt   DateTime?
  createdAt  DateTime  @default(now())
}
```

## 状態とルール

### 受け手の流れ

- ログイン済みで `/e/[shareToken]` を開いた時点で Participation を upsert し、lastOpenedAt を更新する（送り手本人は除く）
- R0「参加する」: attendance = ATTENDING にして R1 へ
- R0「参加しない」→ R0-b で送信: attendance = DECLINED、note にひとこと
- R1 の宣言（今夜21時／明日の朝／週末）: replyBy と replyByLabel だけ保存して R5 へ。○△×は保存しない
- R1「これで送る」: Answer を保存、answeredAt を入れ、replyBy と replyByLabel を消して R2 へ
- 宣言の時刻（Asia/Tokyo）: 今夜21時 = 当日21:00（過ぎていれば翌日21:00）、明日の朝 = 翌日9:00、週末 = 次の土曜10:00
- 「いま返す」は宣言せずそのまま R1 の回答を続ける

### 参加者の表示（S3・C1-b）

| 表示 | 条件 |
|---|---|
| 不参加 | attendance = DECLINED |
| 回答済 | answeredAt あり（DECLINED を除く） |
| 宣言中 | answeredAt なし かつ replyBy が今より後 |
| 未回答 | 上のどれでもない（宣言した時刻を過ぎた人も含む） |

リンクを開いていない人は表示しない。「2/5人」の分子は回答済の人数（送り手を含む）、分母は headcount。

### 調整のルール

- 作成時に送り手の Participation を作る（ATTENDING、全候補○、answeredAt = 作成時刻）
- 回答・宣言の変更は status = OPEN かつ締切前だけ。不参加への変更は回答後・確定後もできる（中止後は不可）
- 締切を過ぎたら送り手ができるのは確定だけ
- 確定・編集・中止は送り手だけ。確定は候補から1つ選んで DECIDED、decidedAt を入れる。中止は CANCELED、canceledAt を入れる
- 編集できるのは名前・人数・締切だけ
- 催促は送り手だけ。対象は未回答と宣言中の人、OPEN かつ締切前。S3 の一人ずつのボタンは、宣言中の人だけ「待つ」（押せない）。まとめて送るときは宣言中も含め、相手ごとに Nudge を1行作る
- 有力候補: ○の数が多い順 → △の数が多い順 → 日時が早い順
- 締切までの残り％ = (締切 − 今) ÷ (締切 − 作成日時)
- 候補日の提案（S1-④）: 明日から14日間で、送り手の予定と重ならない2時間の枠を最大5件。上位3件は最初から候補に入れ（「AIおすすめ」表示）、残りは「AIのおすすめ：… ＋」として並べる。手での追加・削除もできる（枠は2時間固定、開始時刻だけ選ぶ）
- ホームの「いちばん急ぎ」: 自分が作った OPEN の調整のうち、優先度が急ぎのものを優先し、その中で締切が近い順の1件
- ホームの「返事待ちが◯人」: 自分が作った OPEN の調整の未回答と宣言中の人数の合計
- C2 の並び: 確定した調整は decidedAt、中止は canceledAt、締切切れは deadlineAt を日付として、新しい順
- 時刻は DB に UTC で保存し、表示は Asia/Tokyo 固定
- 通知は作らない。招待・催促・確定・中止は送り手が共有ボタンで渡す
- 「カレンダーに追加」は Google カレンダーの予定作成リンク（`https://calendar.google.com/calendar/render?action=TEMPLATE&text=…&dates=…&details=…`）と `/events/[id]/calendar.ics` で行う。カレンダーへの書き込み権限は使わない

## AIの回答下書き（R1）

- 受け手が R1 を初めて開いたとき、カレンダー連携済み（calendarProvider あり）なら1回だけ生成して Answer に保存（byAi = true）。受け手が触った候補は byAi = false
- R1 のサーバーコンポーネントで候補日の全日分の予定を取得し、日別カレンダー（R1-a v4）用に props で渡す。下書きの生成は `<Suspense>` で囲み、生成中は読み込み表示を出す。ページに `export const maxDuration = 60`
- 渡すもの: 調整のタイトルとメモ、候補日の開始・終了、候補日ごとにその日1日分の受け手の予定（タイトル・時刻・場所）、コードで計算した重なりの有無と前後の予定までの空き分数
- システムプロンプトで考慮させること: 予定の場所から見た移動時間、前後の予定との間隔、その日の詰まり具合、深夜になるか
- 返させるもの（structured outputs）: 候補ごとに mark（YES/MAYBE/NO）、reason（20字程度）、detail（60字程度、くだけた口調）
- 失敗時（エラー・`stop_reason === "refusal"`・parsed_output が null）のルール: 重なる → ×「『X』と重なる」、前後60分以内に予定 → △「前後にXあり」、それ以外 → ○「予定なし」
- reason と detail は回答者本人にだけ表示する。送り手の画面には○△×だけ
- カレンダー未連携なら下書きを作らず空欄

## 技術の縛り

- Next.js 16（App Router、TypeScript、Tailwind v4）。`params` / `searchParams` / `cookies()` は async。書く前に `node_modules/next/dist/docs/` を確認
- `next.config.ts` の `cacheComponents` と `partialPrefetching` は外す（入れたままだと `auth()` を `<Suspense>` の外で呼ぶページがビルドエラーになる）
- Vercel（関数の地域 `hnd1`）。`package.json` に `"postinstall": "prisma generate"`
- Supabase（Tokyo）＋ `prisma@6` / `@prisma/client@6`。`DATABASE_URL` は Transaction pooler（ポート6543）＋`?pgbouncer=true&connection_limit=1`、`DIRECT_URL` は Session pooler（pooler ホストのポート5432。直接接続ホストは IPv6 のみのため使わない）
- 認証: `next-auth@beta`（v5）＋ `@auth/prisma-adapter`、セッションは DB
  - Google: `allowDangerousEmailAccountLinking: true`、scope `openid email profile https://www.googleapis.com/auth/calendar.readonly`、`access_type: "offline"`、`prompt: "consent"`
  - LINE: scope `openid profile` を明示（既定はメールも要求する）
  - メール: Nodemailer provider に `server: { host: "smtp.gmail.com", port: 465, secure: true, auth: { user: EMAIL_SERVER_USER, pass: EMAIL_SERVER_PASSWORD } }` と `from: EMAIL_FROM` を明示（環境変数を自動では読まない）
  - Microsoft（カレンダー連携のみ、ログイン画面には出さない）: `MicrosoftEntraID`、issuer `https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0`（末尾スラッシュなし）、scope `openid profile email offline_access User.Read Calendars.Read`
  - カレンダー連携は、ログイン中に Google / Microsoft の signIn を通して Account を今のユーザーに結びつけ、calendarProvider を設定する
  - Auth.js は既存 Account のトークンを再ログイン時に更新しないため、`callbacks.signIn({ account, user })` で Account の access_token / refresh_token / expires_at を毎回上書き保存する
  - カレンダーの解除は calendarProvider を null にするだけ。Account は消さない（ログインに使っている Account を消すとログインできなくなる）
  - 連携で `OAuthAccountNotLinked` などのエラーになったら `/settings?error=…` に戻す（`pages.error` を設定）
- カレンダー取得: Google `calendars/primary/events`（singleEvents=true）、Microsoft Graph `/me/calendarView`。読む前に `expires_at` を見て切れていればリフレッシュトークンで更新し、Account に保存
- AI: `@anthropic-ai/sdk`、`client.beta.messages.parse`、model `claude-sonnet-5-5`、`max_tokens: 4000`、`output_config: { effort: "low", format: zodOutputFormat(schema) }`（引数は schema の1つ）、`betas: ["server-side-fallback-2026-07-01"]`、`fallbacks: "default"`。サーバー側だけで呼ぶ
- 書き込みは Server Actions。Route Handler は `/api/auth/*` と `/events/[id]/calendar.ics` だけ
- middleware（proxy）は使わない。ログイン確認は各ページと Server Actions で `auth()`
- LINE 共有は `https://line.me/R/share?text=<URLエンコードした文面とURL>`。共有する URL には `?openExternalBrowser=1` を付ける（LINE内ブラウザだと Google ログインが拒否される）
- 環境変数: `AUTH_SECRET`、`AUTH_GOOGLE_ID/SECRET`、`AUTH_LINE_ID/SECRET`、`AUTH_MICROSOFT_ENTRA_ID_ID/SECRET/ISSUER`、`EMAIL_SERVER_USER/PASSWORD`、`EMAIL_FROM`、`DATABASE_URL`、`DIRECT_URL`、`ANTHROPIC_API_KEY`。シークレットはコードに書かない

## 実装の順番

1. ログイン（Google）とDB
2. 作成（S1・S2）
3. 回答（R0・R1・R2・R0-b）
4. 回答状況（S3）と確定（D1・D2・D3）
5. カレンダー取得とAI下書き
6. 催促（S4・P1・R3）
7. 編集・中止（E0〜E3）、ホーム・過去・あとで返す・設定
8. LINE・メールログイン、Outlook
