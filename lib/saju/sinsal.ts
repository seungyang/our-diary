/**
 * 신살(길신·흉신) — 전부 표 조회라 코드로 계산한다. LLM은 결과만 받는다.
 * 규칙 H: 신살은 보조 축. 십신·강약 판단을 뒤집지 않는다.
 */
import { type Chart, type Pillar, JI, GAN, sexagenaryIndex } from "./manse";

export type Sinsal = {
  name: string;
  kind: "길신" | "흉신" | "중립";
  /** 어느 기둥에서 나왔는지(연·월·일·시) */
  where: string[];
  note: string;
};

// 일간 → 천을귀인 지지
const CHEONEUL: number[][] = [
  [1, 7], // 갑: 축미
  [0, 8], // 을: 자신
  [11, 9], // 병: 해유
  [11, 9], // 정: 해유
  [1, 7], // 무: 축미
  [0, 8], // 기: 자신
  [1, 7], // 경: 축미
  [2, 6], // 신: 인오
  [5, 3], // 임: 사묘
  [5, 3], // 계: 사묘
];
// 일간 → 문창귀인 지지
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
// 양간 → 양인 지지 (갑→묘, 병→오, 무→오, 경→유, 임→자)
const YANGIN: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };
// 삼합 그룹(연지·일지 기준) → 역마·도화·화개
function group(ji: number): number {
  // 신자진 0, 인오술 1, 사유축 2, 해묘미 3
  return [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3][ji];
}
const YEOKMA = [2, 8, 11, 5];
const DOHWA = [9, 3, 6, 0];
const HWAGAE = [4, 10, 1, 7];
// 월지 → 천덕귀인 천간 (인정 묘신 진임 사신 오해 미갑 신계 유인 술병 해을 자사 축경; 해·인·사·신은 지지라 지지 인덱스+100으로 표기)
const CHEONDEOK: number[] = [105, 6, 3, 7, 8, 7, 111, 0, 9, 102, 2, 1]; // index = 월지(자0…해11)
// 월지 삼합 → 월덕귀인 천간: 인오술→병, 신자진→임, 사유축→경, 해묘미→갑
const WOLDEOK = [8, 2, 6, 0];
// 일간 → 홍염 지지: 갑오 을신 병인 정미 무진 기진 경술 신유 임자 계신
const HONGYEOM = [6, 8, 2, 7, 4, 4, 10, 9, 0, 8];
// 일간 → 태극귀인 지지: 갑을→자오, 병정→묘유, 무기→진술축미, 경신→인해, 임계→사신
const TAEGEUK: number[][] = [[0, 6], [0, 6], [3, 9], [3, 9], [4, 10, 1, 7], [4, 10, 1, 7], [2, 11], [2, 11], [5, 8], [5, 8]];
// 일간 → 문곡귀인: 갑해 을자 병인 정묘 무인 기묘 경사 신오 임신 계유
const MUNGOK = [11, 0, 2, 3, 2, 3, 5, 6, 8, 9];
// 일간 → 학당귀인(장생 자리): 갑해 을오 병인 정유 무인 기유 경사 신자 임신 계묘
const HAKDANG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
// 일간 → 암록: 갑해 을술 병신 정미 무신 기미 경사 신진 임인 계축
const AMROK = [11, 10, 8, 7, 8, 7, 5, 4, 2, 1];
// 일간 → 금여: 갑진 을사 병미 정신 무미 기신 경술 신해 임축 계인
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];
// 일간 → 천복귀인: 갑유 을신 병자 정해 무묘 기인 경오 신사 임오 계사
const CHEONBOK = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5];
// 일간 → 천주귀인: 갑사 을오 병사 정오 무신 기유 경해 신자 임인 계묘
const CHEONJU = [5, 6, 5, 6, 8, 9, 11, 0, 2, 3];
// 현침살: 갑·신(辛) 천간, 묘·오·신(申) 지지
const HYEONCHIM_GAN = new Set([0, 7]);
const HYEONCHIM_JI = new Set([3, 6, 8]);
// 급각살 — 월지 계절: 인묘진월→해·자, 사오미월→묘·미, 신유술월→인·술, 해자축월→축·진
const GEUPGAK: Record<number, number[]> = { 2: [11, 0], 3: [11, 0], 4: [11, 0], 5: [3, 7], 6: [3, 7], 7: [3, 7], 8: [2, 10], 9: [2, 10], 10: [2, 10], 11: [1, 4], 0: [1, 4], 1: [1, 4] };
// 원진(=귀문관살로도 씀): 자미 축오 인유 묘신 진해 사술
const WONJIN: Record<number, number> = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 9, 9: 2, 3: 8, 8: 3, 4: 11, 11: 4, 5: 10, 10: 5 };
// 백호대살·괴강은 기둥 단위
const BAEKHO = new Set(["갑진", "을미", "병술", "정축", "무진", "임술", "계축"]);
const GOEGANG = new Set(["경진", "경술", "임진", "임술"]);

const POS = ["연", "월", "일", "시"] as const;

export function computeSinsal(chart: Chart): Sinsal[] {
  const pl = chart.pillars;
  const list: Array<{ pos: string; p: Pillar }> = [
    { pos: "연", p: pl.year },
    { pos: "월", p: pl.month },
    { pos: "일", p: pl.day },
    ...(pl.hour ? [{ pos: "시", p: pl.hour }] : []),
  ];
  const dm = pl.day.gan;
  const out: Sinsal[] = [];
  const hit = (name: string, kind: Sinsal["kind"], where: string[], note: string) => {
    if (where.length) out.push({ name, kind, where, note });
  };

  hit("천을귀인", "길신", list.filter((x) => CHEONEUL[dm].includes(x.p.ji)).map((x) => `${x.pos}지 ${JI[x.p.ji]}`), "막힐 때 사람이 나타나는 자리");
  hit("문창귀인", "길신", list.filter((x) => x.p.ji === MUNCHANG[dm]).map((x) => `${x.pos}지 ${JI[x.p.ji]}`), "배우고 시험 보는 힘");

  // 역마·도화·화개는 연지와 일지 둘 다 기준으로 본다
  const bases = [{ label: "연지", ji: pl.year.ji }, { label: "일지", ji: pl.day.ji }];
  for (const [name, table, kind, note] of [
    ["역마", YEOKMA, "중립", "이동·변동이 잦은 자리"],
    ["도화", DOHWA, "중립", "눈에 띄고 끌리는 힘"],
    ["화개", HWAGAE, "중립", "혼자 파고드는 힘"],
  ] as const) {
    const where = new Set<string>();
    for (const b of bases) {
      const target = table[group(b.ji)];
      for (const x of list) if (x.p.ji === target && !(x.pos === b.label[0] && x.p.ji === b.ji)) where.add(`${x.pos}지 ${JI[x.p.ji]}(${b.label} 기준)`);
    }
    hit(name, kind, [...where], note);
  }

  // 천덕·월덕은 월지 기준으로 팔자 안에 그 글자가 있는지 본다
  const cd = CHEONDEOK[pl.month.ji];
  hit(
    "천덕귀인", "길신",
    cd >= 100
      ? list.filter((x) => x.p.ji === cd - 100).map((x) => `${x.pos}지 ${JI[x.p.ji]}`)
      : list.filter((x) => x.p.gan === cd).map((x) => `${x.pos}간 ${GAN[x.p.gan]}`),
    "큰 화를 비켜 가는 자리",
  );
  const wd = WOLDEOK[group(pl.month.ji)];
  hit("월덕귀인", "길신", list.filter((x) => x.p.gan === wd).map((x) => `${x.pos}간 ${GAN[x.p.gan]}`), "주변이 도와주는 자리");
  hit("홍염", "중립", list.filter((x) => x.p.ji === HONGYEOM[dm]).map((x) => `${x.pos}지 ${JI[x.p.ji]}`), "사람을 끄는 매력");

  const byJi = (name: string, kind: Sinsal["kind"], targets: number[], note: string) =>
    hit(name, kind, list.filter((x) => targets.includes(x.p.ji)).map((x) => `${x.pos}지 ${JI[x.p.ji]}`), note);
  byJi("태극귀인", "길신", TAEGEUK[dm], "끝까지 버티면 뒤집히는 자리");
  byJi("천복귀인", "길신", [CHEONBOK[dm]], "먹고사는 걱정을 덜어 주는 자리");
  byJi("천주귀인", "길신", [CHEONJU[dm]], "일한 만큼 돌아오는 자리");
  byJi("문곡귀인", "길신", [MUNGOK[dm]], "글과 말로 인정받는 힘");
  byJi("학당귀인", "길신", [HAKDANG[dm]], "배우면 바로 느는 자리");
  byJi("암록", "길신", [AMROK[dm]], "드러나지 않는 뒷받침");
  byJi("금여", "길신", [GEUMYEO[dm]], "배우자·주변에서 오는 편안함");
  hit(
    "현침살", "중립",
    [
      ...list.filter((x) => HYEONCHIM_GAN.has(x.p.gan)).map((x) => `${x.pos}간 ${GAN[x.p.gan]}`),
      ...list.filter((x) => HYEONCHIM_JI.has(x.p.ji)).map((x) => `${x.pos}지 ${JI[x.p.ji]}`),
    ],
    "찌르고 파고드는 힘 — 말이 날카롭다",
  );
  byJi("급각살", "흉신", GEUPGAK[pl.month.ji], "뼈·관절에 무리 가는 자리");
  {
    const pairs: string[] = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (WONJIN[list[i].p.ji] === list[j].p.ji) pairs.push(`${list[i].pos}지 ${JI[list[i].p.ji]}·${list[j].pos}지 ${JI[list[j].p.ji]}`);
    hit("원진", "흉신", pairs, "이유 없이 서로 불편한 자리");
  }

  const yi = YANGIN[dm];
  if (yi !== undefined) hit("양인", "흉신", list.filter((x) => x.p.ji === yi).map((x) => `${x.pos}지 ${JI[x.p.ji]}`), "힘이 넘쳐 부딪히는 자리");

  hit("백호대살", "흉신", list.filter((x) => BAEKHO.has(GAN[x.p.gan] + JI[x.p.ji])).map((x) => `${x.pos}주 ${GAN[x.p.gan]}${JI[x.p.ji]}`), "급하게 다치기 쉬운 기둥");
  hit("괴강", "중립", list.filter((x) => GOEGANG.has(GAN[x.p.gan] + JI[x.p.ji])).map((x) => `${x.pos}주 ${GAN[x.p.gan]}${JI[x.p.ji]}`), "극단으로 가는 힘");

  // 공망: 일주가 속한 순(旬)의 빈 지지 둘
  const idx = sexagenaryIndex(pl.day);
  const start = idx - (idx % 10);
  const empty = [(start + 10) % 12, (start + 11) % 12];
  hit(
    "공망",
    "중립",
    list.filter((x) => x.pos !== "일" && empty.includes(x.p.ji)).map((x) => `${x.pos}지 ${JI[x.p.ji]}`),
    `일주 기준 공망 지지: ${JI[empty[0]]}·${JI[empty[1]]}`,
  );

  return out;
}

/** 12신살 — 연지 삼합 기준. 신자진(수국)이면 겁살 사 … 화개 진. 포스텔러 이미지와 같은 표. */
const TWELVE = ["겁살", "재살", "천살", "지살", "연살", "월살", "망신", "장성", "반안", "역마", "육해", "화개"];
export function twelveSinsal(chart: Chart): Array<{ name: string; where: string }> {
  // 삼합 그룹의 겁살 시작 지지: 신자진→사(5), 인오술→해(11), 사유축→인(2), 해묘미→신(8)
  const start = [5, 11, 2, 8][group(chart.pillars.year.ji)];
  const pl = chart.pillars;
  const cols: Array<[string, Pillar | null]> = [["연", pl.year], ["월", pl.month], ["일", pl.day], ["시", pl.hour]];
  return cols
    .filter((c): c is [string, Pillar] => c[1] !== null)
    .map(([pos, p]) => ({ name: TWELVE[((p.ji - start) % 12 + 12) % 12], where: `${pos}지 ${JI[p.ji]}` }));
}

export function sinsalLine(chart: Chart): string {
  const s = computeSinsal(chart);
  const twelve = twelveSinsal(chart).map((x) => `${x.where} ${x.name}`).join(", ");
  const main = s.length ? s.map((x) => `${x.name}(${x.kind}): ${x.where.join(", ")}`).join(" / ") : "해당 없음";
  return `${main} · 12신살(연지 기준): ${twelve}`;
}

export { POS };
