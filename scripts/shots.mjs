import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "https://twopens.vercel.app";
const OUT = process.env.OUT ?? "shots";
const UID = process.env.UID ?? "현지";

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

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 800 }, // 갤럭시 S24 기준
  deviceScaleFactor: 1,
  locale: "ko-KR",
});
await ctx.addCookies([
  { name: "od_session", value: cookie, domain: new URL(BASE).hostname, path: "/", httpOnly: true, secure: true },
]);

const page = await ctx.newPage();
const report = [];

for (const [name, path] of PAGES) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

  // 상단 여백과 섹션 간격을 재서 페이지끼리 비교한다
  const m = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return null;
    const cs = getComputedStyle(main);
    const kids = [...main.children].filter((el) => el.getBoundingClientRect().height > 0);
    const gaps = [];
    for (let i = 1; i < kids.length; i++) {
      const prev = kids[i - 1].getBoundingClientRect();
      const cur = kids[i].getBoundingClientRect();
      gaps.push(Math.round(cur.top - prev.bottom));
    }
    const first = kids[0]?.getBoundingClientRect();
    return {
      padTop: cs.paddingTop,
      padLeft: cs.paddingLeft,
      padRight: cs.paddingRight,
      firstTop: first ? Math.round(first.top) : null,
      kids: kids.length,
      gaps,
      scrollW: document.documentElement.scrollWidth,
    };
  });
  report.push({ name, ...m });
}

console.log("페이지       상단패딩  첫요소y  좌우패딩   자식  요소간격        가로스크롤");
for (const r of report) {
  const side = `${r.padLeft}/${r.padRight}`;
  const over = r.scrollW > 360 ? `⚠ ${r.scrollW}px` : "없음";
  console.log(
    `${r.name.padEnd(11)} ${String(r.padTop).padStart(6)}  ${String(r.firstTop).padStart(6)}  ${side.padStart(9)}  ${String(r.kids).padStart(3)}  ${JSON.stringify(r.gaps).padEnd(14)} ${over}`,
  );
}

await browser.close();
