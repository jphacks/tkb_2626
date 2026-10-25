// Auth.js がエラー画面に付けて返すコード（?error=）ごとの表示文言
export const AUTH_ERROR_MESSAGE: Record<string, string> = {
  OAuthAccountNotLinked: "そのアカウントは、もう別のユーザーで使われています。",
  AccessDenied: "つなげませんでした。もう一度ためしてね。",
  Verification: "ログインリンクの期限が切れているか、もう使われています。もう一度送ってね。",
  Default: "うまくいきませんでした。もう一度ためしてね。",
};
