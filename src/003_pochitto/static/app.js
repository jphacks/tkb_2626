// 画面共通の小物
window.Pochi = {
  toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 1800);
  },
  async copy(text, msg = "コピーしたよ！") {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand("copy"); t.remove();
    }
    this.toast(msg);
  },
  lineShare(text) {
    location.href = "https://line.me/R/share?text=" + encodeURIComponent(text);
  },
  async share(text, url) {
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { return; } }
    this.copy(text + "\n" + url);
  },
  async postJSON(url, body) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(res.status);
    return res.status === 204 ? null : res.json();
  },
  buzz(ms = 8) { if (navigator.vibrate) navigator.vibrate(ms); },
};
