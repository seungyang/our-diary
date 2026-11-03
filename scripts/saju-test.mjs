// 만세력 엔진 vs 참고 사이트 골든 데이터. 실행: npm run saju:test
// 사이트 파일: lib/saju/golden/sites/*.json (크롬 디버그로 수집). 케이스: lib/saju/golden/cases.json
import fs from "node:fs";
import path from "node:path";
import { computeChart, pillarText } from "../lib/saju/manse.ts";

const root = path.resolve("lib/saju/golden");
const { cases } = JSON.parse(fs.readFileSync(path.join(root, "cases.json"), "utf8"));
const siteDir = path.join(root, "sites");
const sites = fs.existsSync(siteDir)
  ? fs.readdirSync(siteDir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(siteDir, f), "utf8")))
  : [];

// cases.json 안에 expected(블로그·책 예시)가 있으면 그것도 한 사이트처럼 비교한다.
const expectedSite = {
  site: "expected(문헌 예시)",
  results: cases.filter((c) => c.expected).map((c) => ({ id: c.id, ok: true, pillars: c.expected, daeunStartAge: c.expected.daeunStartAge })),
};
if (expectedSite.results.length) sites.push(expectedSite);

if (!sites.length) {
  console.log("사이트 골든 파일이 아직 없습니다. lib/saju/golden/sites/ 에 채워지면 비교합니다.");
  process.exit(0);
}

// 알려진 관례 차이(실패로 치지 않는다). 사유는 lib/saju/golden/README.md 참고.
const KNOWN = new Set([
  "c04/fateup/day", // 1955년 표준시 UTC+8:30을 사이트가 모름
  "c05/fateup/hour", "c10/fateup/hour", "c18/fateup/hour", // 23시대 시간(時干)을 다음 날 일간으로 잡는 야자시 관례
]);
const REFERENCE_SITE = "fateup"; // 월주·일주 기준 사이트

const variants = [
  { name: "30분 보정(기본)", opt: { longitudeCorrection: true } },
  { name: "보정 없음", opt: { longitudeCorrection: false } },
];

let exit = 0;
for (const v of variants) {
  console.log(`\n=== 엔진 설정: ${v.name} ===`);
  const perSite = {};
  const disagreements = [];
  for (const c of cases) {
    const [date, time] = c.birth.split("T");
    const ch = computeChart({ date, time, gender: c.gender, ...v.opt });
    const mine = {
      year: pillarText(ch.pillars.year), month: pillarText(ch.pillars.month),
      day: pillarText(ch.pillars.day), hour: ch.pillars.hour ? pillarText(ch.pillars.hour) : null,
    };
    for (const s of sites) {
      const r = (s.results ?? []).find((x) => x.id === c.id);
      if (!r || !r.ok || !r.pillars) continue;
      perSite[s.site] ??= { total: 0, match: 0, pillarMatch: { year: 0, month: 0, day: 0, hour: 0 }, daeun: { total: 0, match: 0 } };
      const ps = perSite[s.site];
      ps.total++;
      let all = true;
      for (const k of ["year", "month", "day", "hour"]) {
        const theirs = r.pillars[k] ?? null;
        if (theirs == null) continue;
        if (theirs === mine[k]) ps.pillarMatch[k]++;
        else { all = false; disagreements.push({ id: c.id, birth: c.birth, site: s.site, pillar: k, mine: mine[k], theirs, known: KNOWN.has(`${c.id}/${s.site}/${k}`) }); }
      }
      if (all) ps.match++;
      if (typeof r.daeunStartAge === "number") {
        ps.daeun.total++;
        if (r.daeunStartAge === ch.daeun.startAge) ps.daeun.match++;
      }
    }
  }
  for (const [site, ps] of Object.entries(perSite)) {
    console.log(`${site}: 전체 일치 ${ps.match}/${ps.total} · 연 ${ps.pillarMatch.year} 월 ${ps.pillarMatch.month} 일 ${ps.pillarMatch.day} 시 ${ps.pillarMatch.hour} · 대운수 ${ps.daeun.match}/${ps.daeun.total}`);
  }
  if (disagreements.length) {
    console.log("불일치:");
    for (const d of disagreements) console.log(`  ${d.id} ${d.birth} ${d.site} ${d.pillar}: 엔진 ${d.mine} / 사이트 ${d.theirs}${d.known ? "  (알려진 관례 차이)" : ""}`);
  }
  // 실패 기준: 기준 사이트·문헌 예시와의 불일치 중 '알려진 차이'가 아닌 것이 있으면 실패.
  if (v.name.includes("기본")) {
    const bad = disagreements.filter((d) => (d.site === REFERENCE_SITE || d.site.startsWith("expected")) && !d.known);
    if (bad.length) { exit = 1; console.log(`
실패 ${bad.length}건 (기준: ${REFERENCE_SITE} + 문헌 예시)`); }
    else console.log(`
통과 — ${REFERENCE_SITE} + 문헌 예시와 일치(알려진 관례 차이 ${disagreements.filter((d) => d.known).length}건 제외)`);
  }
}
process.exit(exit);
