import { chromium } from "playwright";

/**
 * 간격·터치영역·글자크기를 재서 규칙을 벗어난 곳만 뽑는다.
 * 눈으로 보는 대신 숫자로 본다 — 4px 어긋난 건 눈보다 자가 먼저 안다.
 */

const BASE = process.env.BASE ?? "https://twopens.vercel.app";
const UID = process.env.UID ?? "현지";
const SCALE = [0, 4, 8, 12, 16, 24, 28, 36, 56, 88]; // 우리 간격 사다리

const PAGES = [
  ["bucket", "/diary/bucket"],
  ["today", "/diary"],
  ["question", "/diary/question"],
  ["album", "/diary/album"],
  ["more", "/diary/more"],
  ["places", "/diary/places"],
  ["wish", "/diary/wish"],
  ["calendar", "/diary/calendar"],
  ["settings", "/diary/settings"],
];

const cookie = Buffer.from(JSON.stringify({ uid: UID }), "utf8").toString("base64url");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: "ko-KR" });
await ctx.addCookies([
  { name: "od_session", value: cookie, domain: new URL(BASE).hostname, path: "/", httpOnly: true, secure: true },
]);
const page = await ctx.newPage();

const findings = [];

for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const out = await page.evaluate((scale) => {
    const res = { gaps: [], small: [], tiny: [], overflow: [] };
    const seen = new Set();

    const label = (el) => {
      const t = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
      return t.slice(0, 22) || `<${el.tagName.toLowerCase()}>`;
    };

    // 1) 형제 사이 세로 간격이 사다리에 없는 경우
    const walk = (parent, depth) => {
      if (depth > 6) return;
      const kids = [...parent.children].filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.height > 0 && r.width > 0 && cs.position !== "fixed" && cs.position !== "absolute";
      });
      for (let i = 1; i < kids.length; i++) {
        const a = kids[i - 1].getBoundingClientRect();
        const b = kids[i].getBoundingClientRect();
        if (b.top < a.bottom - 1) continue; // 가로 배치
        const gap = Math.round(b.top - a.bottom);
        if (gap > 0 && !scale.includes(gap)) {
          const key = `${label(kids[i - 1])}|${label(kids[i])}|${gap}`;
          if (!seen.has(key)) {
            seen.add(key);
            res.gaps.push({ gap, after: label(kids[i - 1]), before: label(kids[i]) });
          }
        }
      }
      for (const k of kids) walk(k, depth + 1);
    };
    walk(document.querySelector("main") ?? document.body, 0);

    // 2) 44px 안 되는 누를 것
    for (const el of document.querySelectorAll("button, a, input[type=checkbox], [role=checkbox], label:has(input)")) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      if (r.height < 44 || r.width < 24) res.small.push({ what: label(el), h: Math.round(r.height), w: Math.round(r.width) });
    }

    // 3) 15px 미만 글자
    for (const el of document.querySelectorAll("p, span, li, button, a, label, legend, h1, h2, h3, dt, dd")) {
      const txt = (el.textContent || "").trim();
      if (!txt || el.children.length) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 15) res.tiny.push({ what: txt.slice(0, 20), px: Math.round(fs * 10) / 10 });
    }

    // 4) 가로 넘침
    if (document.documentElement.scrollWidth > 360) res.overflow.push(document.documentElement.scrollWidth);
    return res;
  }, SCALE);

  findings.push([name, out]);
}

let bad = 0;
for (const [name, f] of findings) {
  const lines = [];
  for (const g of f.gaps) lines.push(`  간격 ${String(g.gap).padStart(3)}px  「${g.after}」 → 「${g.before}」`);
  for (const s of [...new Map(f.small.map((x) => [x.what + x.h, x])).values()])
    lines.push(`  작은 타깃 ${s.w}×${s.h}  「${s.what}」`);
  for (const t of [...new Map(f.tiny.map((x) => [x.what, x])).values()]) lines.push(`  작은 글자 ${t.px}px  「${t.what}」`);
  for (const o of f.overflow) lines.push(`  가로 넘침 ${o}px`);
  if (lines.length) {
    bad += lines.length;
    console.log(`\n## ${name}`);
    console.log(lines.join("\n"));
  }
}
console.log(bad ? `\n총 ${bad}건` : "\n전부 규칙 안에 있음");
await browser.close();
