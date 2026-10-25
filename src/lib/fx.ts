// 押したときの手ごたえ（カチッ＋短い振動）と効果音。ブラウザでだけ呼ぶ
// 「光とバイブを弱める」は <html data-calm="1"> で受け取り、振動と激しい動きを止める

let ac: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ac ??= new Ctor();
    if (ac.state === "suspended") void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

export const isCalm = () => typeof document !== "undefined" && document.documentElement.dataset.calm === "1";

// 揺れ・点滅など激しい動きを止めるか（OS の「視差効果を減らす」も見る）
export const lessMotion = () =>
  isCalm() || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

function vibrate(pattern: number | number[]) {
  if (isCalm()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // 振動できない端末は何もしない
  }
}

// iOS は最初のタップまで音を鳴らせないので、最初のタップで AudioContext を起こしておく
export function unlockAudio() {
  audio();
}

// カチッ（strong は10回ごとなど区切りの強め）
export function tap(strong = false) {
  vibrate(strong ? 18 : 7);
  const c = audio();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime;
  o.type = "square";
  o.frequency.value = strong ? 1300 : 2100;
  g.gain.setValueAtTime(strong ? 0.07 : 0.045, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.035);
}

function noise(c: AudioContext, sec: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * sec), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = b;
  return s;
}

function envelope(g: GainNode, t: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

// パンッ：短いノイズのはじけ＋低いドン
export function sfxPop() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(c.destination);
  const nz = noise(c, 0.25);
  const hp = c.createBiquadFilter();
  const g1 = c.createGain();
  hp.type = "highpass";
  hp.frequency.value = 900;
  nz.connect(hp).connect(g1).connect(out);
  envelope(g1, t, 0.9, 0.16);
  nz.start(t);
  nz.stop(t + 0.25);
  const o = c.createOscillator();
  const g2 = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  o.connect(g2).connect(out);
  envelope(g2, t, 0.8, 0.2);
  o.start(t);
  o.stop(t + 0.25);
}

// ドンッ：太鼓の低く鈍い音＋振動
export function sfxTaiko() {
  vibrate([40, 30, 20]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const lp = c.createBiquadFilter();
  const out = c.createGain();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  out.gain.value = 1;
  lp.connect(out).connect(c.destination);
  for (const [f0, f1, type, peak, decay] of [
    [130, 50, "sine", 1, 1.1],
    [95, 62, "triangle", 0.35, 0.7],
  ] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.22);
    o.connect(g).connect(lp);
    envelope(g, t, peak, decay);
    o.start(t);
    o.stop(t + decay + 0.05);
  }
  const nz = noise(c, 0.08);
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = "lowpass";
  f.frequency.value = 700;
  nz.connect(f).connect(g).connect(out);
  envelope(g, t, 0.5, 0.07);
  nz.start(t);
  nz.stop(t + 0.08);
}

// 小刻みに揺らす（Web Animations）
export function shake(el: Element, amp: number, ms: number) {
  if (lessMotion()) return;
  el.animate(
    [0, 1, 2, 3, 4, 5, 6]
      .map((i) => ({ transform: `translate(${i % 2 ? amp : -amp}px,${i % 3 ? amp / 2 : -amp / 2}px)` }))
      .concat([{ transform: "none" }]),
    { duration: ms },
  );
}

// ぷにっと弾ませる
export function pop(el: Element | null, from = 0.85, ms = 200) {
  el?.animate([{ transform: `scale(${from})` }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: ms });
}

// 振動だけ（音は別に鳴らすとき）
export function buzz(strong = false) {
  vibrate(strong ? 18 : 7);
}

// 録音した効果音。前後の無音を切り、音量をそろえて鳴らす（連打で重なっても鳴るよう Web Audio で再生）
type Sample = { buffer: AudioBuffer; start: number; end: number; gain: number };
const samples = new Map<string, Promise<Sample | null>>();

function loadSample(url: string) {
  let p = samples.get(url);
  if (!p) {
    p = (async () => {
      const c = audio();
      if (!c) return null;
      try {
        const buffer = await c.decodeAudioData(await (await fetch(url)).arrayBuffer());
        const ch = buffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
        const th = peak * 0.1;
        let first = 0;
        while (first < ch.length && Math.abs(ch[first]) < th) first++;
        let last = ch.length - 1;
        while (last > first && Math.abs(ch[last]) < th) last--;
        const sr = buffer.sampleRate;
        return { buffer, start: Math.max(0, first / sr - 0.01), end: Math.min(buffer.duration, last / sr + 0.05), gain: peak > 0 ? 0.8 / peak : 1 };
      } catch {
        return null;
      }
    })();
    samples.set(url, p);
  }
  return p;
}

export function preloadSamples(urls: string[]) {
  urls.forEach((u) => void loadSample(u));
}

// urls のどれか1つをランダムに鳴らす。読み込めていなければ false（呼び出し側でカチッに切り替える）
export async function playRandomSample(urls: string[]) {
  const c = audio();
  const s = c && (await loadSample(urls[Math.floor(Math.random() * urls.length)]));
  if (!c || !s) return false;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = s.buffer;
  g.gain.value = s.gain;
  src.connect(g).connect(c.destination);
  src.start(0, s.start, s.end - s.start);
  return true;
}
