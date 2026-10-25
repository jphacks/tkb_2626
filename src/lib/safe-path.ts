// ログイン後などの戻り先は、このアプリの中のパスだけ受け付ける。
// 「//evil.com」や「/\evil.com」（ブラウザが //evil.com として扱う）、制御文字で外へ飛ばされるのを防ぐ
export function safePath(value: unknown, fallback = "/home"): string {
  return typeof value === "string" && /^\/(?![/\\])[^\\\s\x00-\x1f]*$/.test(value) ? value : fallback;
}
