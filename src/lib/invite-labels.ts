// クライアントからも使う宣言の選択肢（invite.ts はサーバー専用の処理を含むため分ける）
export const REPLY_LABELS = ["今夜21時", "明日の朝", "週末"] as const;
export type ReplyLabel = (typeof REPLY_LABELS)[number];
