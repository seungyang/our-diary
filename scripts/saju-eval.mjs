// 해석 품질 평가 루프 — 앱이 실제로 쓰는 프롬프트(기본 풀이 + 항목 질문)로 돌린다.
//
//  npm run saju:eval            케이스 × 프롬프트를 eval/prompts/<case>-<item>.md 로 쓴다.
//                               복사 모드: 이 파일을 세션에 붙여넣고 답을 eval/answers/<같은 이름>.md 에 저장.
//  npm run saju:eval -- --api   ANTHROPIC_API_KEY가 있으면 모델을 직접 불러 답을 저장.
//  npm run saju:eval -- --grade eval/answers/*.md 를 규칙으로 채점해 eval/log.jsonl 에 남기고 요약을 찍는다.
//
// 자동 채점 규칙(각 +1/-1):
//  R1 결론 문장이 먼저(첫 200자 안에 판단 동사)   R2 "확신:" 줄
//  R3 근거 글자가 팔자·대운·세운·월운 안에 있다(그 밖의 간지 3개 이상 언급 = 위반)
//  R4 금지어(색깔·방위·행운의 숫자·부적·풍수) 없음   R5 양다리 문장 없음
//  R6 성격 형용사 나열 없음   R7 확률·점수·백분율 없음   R8 병명 없음   R9 길이 상한
//  R10 없는 지지 관계(가짜 합·충·형)를 말하지 않음
import fs from "node:fs";
import path from "node:path";
import { computeChart, GAN, JI, currentLuck, monthPillarsOf, pillarText } from "../lib/saju/manse.ts";
import { buildTurnPrompt } from "../lib/saju/prompts.ts";
import { BASE_READING, catalogItem } from "../lib/saju/catalog.ts";
import { KNOWLEDGE_VERSION } from "../lib/saju/knowledge.ts";

const args = new Set(process.argv.slice(2));
const { cases } = JSON.parse(fs.readFileSync("lib/saju/golden/cases.json", "utf8"));
const OUT_P = "eval/prompts";
const OUT_A = "eval/answers";
fs.mkdirSync(OUT_P, { recursive: true });
fs.mkdirSync(OUT_A, { recursive: true });

// 평가 케이스: 앞 3개 + 시주 미상 1개. 항목: 기본 풀이 + 대표 질문 4개.
const evalCases = [...cases.slice(0, 3), { ...cases[6], id: cases[6].id + "-nohour", birth: cases[6].birth.split("T")[0] }];
const ITEMS = ["base", "job-fit", "wealth-this-year", "spouse", "life-flow"];

function chartOf(c) {
  const [date, time] = c.birth.split("T");
  return computeChart({ date, time: time ?? null, gender: c.gender });
}

function promptFor(item, chart) {
  if (item === "base") return buildTurnPrompt(chart, undefined, [], BASE_READING.text, BASE_READING.guide);
  const it = catalogItem(item);
  return buildTurnPrompt(chart, undefined, [], it.text, it.guide);
}

const ALL_PAIRS = [];
for (const g of GAN) for (const j of JI) ALL_PAIRS.push(g + j);

function allowedPairs(chart) {
  const set = new Set();
  for (const p of [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]) if (p) set.add(pillarText(p));
  for (const d of chart.daeun.list) set.add(pillarText(d.pillar));
  const luck = currentLuck();
  set.add(pillarText(luck.seun)); set.add(pillarText(luck.wolun));
  for (const y of [luck.year - 1, luck.year, luck.year + 1, luck.year + 2, luck.year + 3]) {
    set.add(pillarText({ gan: ((y - 4) % 10 + 10) % 10, ji: ((y - 4) % 12 + 12) % 12 }));
    for (const m of monthPillarsOf(y)) set.add(pillarText(m.pillar));
  }
  return set;
}

// 지지 관계 표 — 여기 없는 조합을 합·충·형이라 부르면 오답.
const JI_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const REL = {
  반합: ["인오", "오술", "신자", "자진", "사유", "유축", "해묘", "묘미"],
  육합: ["자축", "인해", "묘술", "진유", "사신", "오미"],
  충: ["자오", "축미", "인신", "묘유", "진술", "사해"],
  형: ["인사", "사신", "인신", "축술", "술미", "축미", "자묘", "묘자", "진진", "오오", "유유", "해해"],
  해: ["자미", "축오", "인사", "묘진", "신해", "유술"],
  파: ["자유", "축진", "인해", "묘오", "사신", "술미"],
  원진: ["자미", "축오", "인유", "묘신", "진해", "사술"],
};
/** "사미반합", "해축반합"처럼 표에 없는 조합을 찾아낸다. 순서가 뒤집힌 것은 인정. */
function fakeRelations(answer) {
  const bad = [];
  for (const [kind, table] of Object.entries(REL)) {
    const ok = new Set(table.flatMap((t) => [t, t[1] + t[0]]));
    const re = new RegExp(`([${JI_KO.join("")}])([${JI_KO.join("")}])${kind}`, "g");
    for (const m of answer.matchAll(re)) {
      const pair = m[1] + m[2];
      if (!ok.has(pair)) bad.push(m[0]);
    }
  }
  return [...new Set(bad)];
}

export function grade(answer, chart, item) {
  const notes = [];
  let score = 0;
  const r = (ok, id, msg) => { score += ok ? 1 : -1; notes.push(`${ok ? "+" : "-"} ${id} ${msg}`); };
  const head = answer.slice(0, 200);
  r(/(이다|입니다|다\.|하라|고른다|맞는다|유리|불리|신강|신약|중화)/.test(head), "R1", "결론 먼저");
  r(/확신\s*[:：]/.test(answer), "R2", "확신 줄");
  const ok = allowedPairs(chart);
  const foreign = ALL_PAIRS.filter((p) => answer.includes(p) && !ok.has(p));
  r(foreign.length < 3, "R3", foreign.length ? `데이터 밖 간지: ${foreign.slice(0, 5).join(",")}` : "근거 글자 데이터 안");
  r(!/(색깔|색상|방위|행운의 숫자|부적|풍수)/.test(answer), "R4", "색·방위 금지");
  r(!/(수도 있고|수도 있지만|일 수도 있으며)/.test(answer), "R5", "양다리 문장");
  const ADJ = /(성실하|책임감이 강|긍정적인 성격|밝은 성격|리더십|진취적|카리스마|포용력|지혜롭|유연한 성향|실용주의적|독립적이며|치밀하고|주관이 뚜렷|고집이 (상당히 )?강|권력욕|명예욕|완벽주의|프로 의식|예리한 비판력)/;
  const adjHits = answer.match(new RegExp(ADJ, "g")) ?? [];
  r(adjHits.length === 0, "R6", adjHits.length ? `성격 형용사: ${[...new Set(adjHits)].slice(0, 4).join(",")}` : "성격 형용사 없음");
  r(!/(\d+(\.\d+)?\s*%|확률이 높|점수)/.test(answer), "R7", "확률·백분율");
  r(!/(신장|방광|심혈관|혈압|암\b|당뇨|우울증)/.test(answer), "R8", "병명");
  const limit = item === "base" ? 1600 : item === "life-flow" ? 1600 : 700;
  r(answer.length <= limit * 1.5, "R9", `길이 ${answer.length}/${limit}`);
  const fake = fakeRelations(answer);
  r(fake.length === 0, "R10", fake.length ? `없는 관계: ${fake.slice(0, 4).join(",")}` : "관계 표 준수");
  return { score, notes };
}

async function callApi(built) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 4000,
    system: [{ type: "text", text: built.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: built.user }],
  });
  const m = await stream.finalMessage();
  return m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

if (args.has("--grade") && process.argv[1] && process.argv[1].includes("saju-eval")) {
  const log = [];
  const byRule = {};
  const byItem = {};
  for (const c of evalCases) {
    const chart = chartOf(c);
    for (const item of ITEMS) {
      const f = path.join(OUT_A, `${c.id}-${item}.md`);
      if (!fs.existsSync(f)) continue;
      const answer = fs.readFileSync(f, "utf8").trim();
      if (!answer) continue;
      const g = grade(answer, chart, item);
      log.push({ at: new Date().toISOString(), knowledge: KNOWLEDGE_VERSION, case: c.id, item, score: g.score, notes: g.notes });
      byItem[item] = (byItem[item] ?? 0) + g.score;
      for (const n of g.notes) { const id = n.split(" ")[1]; byRule[id] = (byRule[id] ?? 0) + (n.startsWith("+") ? 1 : -1); }
    }
  }
  if (!log.length) { console.log("채점할 답이 없습니다. eval/answers/<case>-<item>.md 를 채워 주세요."); process.exit(0); }
  fs.appendFileSync("eval/log.jsonl", log.map((x) => JSON.stringify(x)).join("\n") + "\n");
  console.log(`채점 ${log.length}건 · 규칙 v${KNOWLEDGE_VERSION} · 총점 ${log.reduce((a, b) => a + b.score, 0)} / 만점 ${log.length * 10}`);
  console.log("규칙별 합계(음수면 그 규칙을 지식창고에서 강화):", byRule);
  console.log("항목별 합계:", byItem);
  for (const w of [...log].sort((a, b) => a.score - b.score).slice(0, 3)) console.log(`낮음: ${w.case}-${w.item} (${w.score})`, w.notes.filter((n) => n.startsWith("-")).join(" | "));
  process.exit(0);
}

// 이 파일을 import 해서 grade만 쓰는 경우엔 생성부를 돌리지 않는다.
const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (!isMain) { /* 라이브러리로 불렸다 */ } else {

let n = 0;
for (const c of evalCases) {
  const chart = chartOf(c);
  for (const item of ITEMS) {
    const built = promptFor(item, chart);
    fs.writeFileSync(path.join(OUT_P, `${c.id}-${item}.md`), built.full, "utf8");
    n++;
    if (args.has("--api")) {
      if (!process.env.ANTHROPIC_API_KEY) { console.error("ANTHROPIC_API_KEY 없음"); process.exit(1); }
      const out = path.join(OUT_A, `${c.id}-${item}.md`);
      if (fs.existsSync(out)) continue;
      process.stdout.write(`${c.id}-${item} … `);
      fs.writeFileSync(out, await callApi(built), "utf8");
      console.log("ok");
    }
  }
}
console.log(`프롬프트 ${n}개 → ${OUT_P}/  (답은 ${OUT_A}/<같은 이름>.md 에 저장 후 --grade)`);
}
