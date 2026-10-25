// LINE 内ブラウザだと Google ログインが拒否されるので、外部ブラウザで開かせる
export function withExternalBrowser(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}openExternalBrowser=1`;
}

export function lineShareUrl(message: string, url: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(`${message}\n${withExternalBrowser(url)}`)}`;
}
