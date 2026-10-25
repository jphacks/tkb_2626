// LINE などのアプリ内ブラウザだと Google ログインが拒否されるので、外部ブラウザで開かせる
export function withExternalBrowser(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}openExternalBrowser=1`;
}

// リンクをクリップボードへ。API が使えない・断られたときは、選択→コピーで試す
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      // コピーできない環境
    }
    ta.remove();
    return ok;
  }
}
