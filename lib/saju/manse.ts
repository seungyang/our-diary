/**
 * 만세력 엔진 — 사주팔자를 코드로 계산한다. LLM은 여기서 나온 값만 받는다.
 *
 * 시간 처리 규칙
 *  1. 입력은 그 당시 한국 벽시계 시각(양력). 서머타임이 있던 해(1948~1960, 1987~1988)는 자동으로 1시간 뺀다.
 *  2. 한국 표준시 이력(1954-03-21~1961-08-09는 UTC+8:30, 그 외 UTC+9)을 반영해 UTC 시각을 구한다.
 *  3. 연주·월주는 절기 순간(UTC)과 비교한다. 절기 시각은 lunar-javascript(북경시 UTC+8)에서 가져와 UTC로 바꾼다.
 *  4. 일주·시주는 서울 경도(127.5°E ≈ UTC+8:30) 기준 시각으로 판단한다 — 흔히 말하는 "동경 135도 30분 보정".
 *     옵션으로 끌 수 있다(longitudeCorrection: false → UTC+9 벽시계 그대로).
 *  5. 일주는 보정 후 시각의 '자정'에 바뀐다(0~24시 기준). 23시대는 그날의 자시로 보고 시간(時干)도 그날 일간으로 정한다.
 *     — 사주풀이도우미·타임루팡 골든 데이터와 같은 방식. 야자시 옵션은 두지 않는다.
 *  6. 대운수는 절입까지의 일수(올림)를 3으로 나눈 몫에 1을 더한다(세는나이) — 사주풀이도우미와 가장 가까운 규칙.
 */
import { Lunar, Solar } from "lunar-javascript";

export type Gender = "M" | "F";
export type Element = "목" | "화" | "토" | "금" | "수";
export type YinYang = "양" | "음";
export type TenGod =
  | "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

export const GAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const JI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const GAN_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const JI_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const GAN_ELEMENT: Element[] = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
const JI_ELEMENT: Element[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
/** 지장간(여기→중기→본기). 마지막이 본기. 천간 인덱스. */
const HIDDEN: number[][] = [
  [9], // 자: 계
  [9, 7, 5], // 축: 계 신 기
  [4, 2, 0], // 인: 무 병 갑
  [1], // 묘: 을
  [1, 9, 4], // 진: 을 계 무
  [4, 6, 2], // 사: 무 경 병
  [2, 5, 3], // 오: 병 기 정
  [3, 1, 5], // 미: 정 을 기
  [4, 8, 6], // 신: 무 임 경
  [7], // 유: 신
  [7, 3, 4], // 술: 신 정 무
  [4, 0, 8], // 해: 무 갑 임
];
const ELEMENT_ORDER: Element[] = ["목", "화", "토", "금", "수"];
export const GENERATES: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
export const CONTROLS: Record<Element, Element> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

export type Pillar = { gan: number; ji: number };

export function pillarText(p: Pillar): string {
  return GAN[p.gan] + JI[p.ji];
}
export function pillarHanja(p: Pillar): string {
  return GAN_HANJA[p.gan] + JI_HANJA[p.ji];
}
export function ganElement(g: number): Element {
  return GAN_ELEMENT[g];
}
export function jiElement(j: number): Element {
  return JI_ELEMENT[j];
}
export function ganYinYang(g: number): YinYang {
  return g % 2 === 0 ? "양" : "음";
}
export function jiMainGan(j: number): number {
  return HIDDEN[j][HIDDEN[j].length - 1];
}
export function hiddenGans(j: number): number[] {
  return HIDDEN[j];
}

/** 일간 기준으로 다른 천간의 십신. */
export function tenGod(dayGan: number, other: number): TenGod {
  const me = GAN_ELEMENT[dayGan];
  const it = GAN_ELEMENT[other];
  const same = ganYinYang(dayGan) === ganYinYang(other);
  if (it === me) return same ? "비견" : "겁재";
  if (GENERATES[me] === it) return same ? "식신" : "상관";
  if (CONTROLS[me] === it) return same ? "편재" : "정재";
  if (CONTROLS[it] === me) return same ? "편관" : "정관";
  return same ? "편인" : "정인"; // it generates me
}

// ───────────── 시간대 이력 ─────────────

/** 한국 표준시 오프셋(분). 1954-03-21 ~ 1961-08-09는 UTC+8:30. */
function standardOffsetMin(y: number, m: number, d: number): number {
  const key = y * 10000 + m * 100 + d;
  if (key >= 19080401 && key <= 19111231) return 510;
  if (key >= 19540321 && key <= 19610809) return 510;
  return 540;
}

/** 서머타임 구간(벽시계 기준). [시작 포함, 끝 미포함] */
const DST: Array<[string, string]> = [
  ["1948-06-01T00:00", "1948-09-13T00:00"],
  ["1949-04-03T00:00", "1949-09-11T00:00"],
  ["1950-04-01T00:00", "1950-09-10T00:00"],
  ["1951-05-06T00:00", "1951-09-09T00:00"],
  ["1955-05-05T00:00", "1955-09-09T00:00"],
  ["1956-05-20T00:00", "1956-09-30T00:00"],
  ["1957-05-05T00:00", "1957-09-22T00:00"],
  ["1958-05-04T00:00", "1958-09-21T00:00"],
  ["1959-05-03T00:00", "1959-09-20T00:00"],
  ["1960-05-01T00:00", "1960-09-18T00:00"],
  ["1987-05-10T02:00", "1987-10-11T03:00"],
  ["1988-05-08T02:00", "1988-10-09T03:00"],
];

function wallToMin(iso: string): number {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
}

export function inDst(wallMin: number): boolean {
  return DST.some(([a, b]) => wallMin >= wallToMin(a) && wallMin < wallToMin(b));
}

// ───────────── 절기 ─────────────

/** 12절(節)만. 입춘부터 순서대로 → 인월(1)…축월(12). */
const JIE_NAMES = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"];

type Jie = { name: string; utcMin: number; monthIndex: number; year: number };

const jieCache = new Map<number, Jie[]>();

/** 그 해 입춘부터 다음 해 소한까지 12절의 UTC 순간. */
function jieOfYear(year: number): Jie[] {
  const hit = jieCache.get(year);
  if (hit) return hit;
  const table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable() as Record<string, { toYmdHms(): string }>;
  const list: Jie[] = [];
  JIE_NAMES.forEach((name, i) => {
    // 표에서 이 해 12월 뒤의 소한은 XIAO_HAN 키다.
    const key = name === "小寒" ? "XIAO_HAN" : name;
    const s = table[key];
    if (!s) throw new Error(`절기 없음: ${year} ${key}`);
    const [d, t] = s.toYmdHms().split(" ");
    const [y, m, dd] = d.split("-").map(Number);
    const [hh, mm, ss] = t.split(":").map(Number);
    const beijing = Date.UTC(y, m - 1, dd, hh, mm, ss) / 60000;
    list.push({ name, utcMin: beijing - 480, monthIndex: i + 1, year });
  });
  jieCache.set(year, list);
  return list;
}

/** 이 순간이 속한 연도(입춘 기준)와 월(절 기준). */
function solarYearMonth(utcMin: number, calendarYear: number): { year: number; month: number; prevJie: Jie; nextJie: Jie } {
  let year = calendarYear;
  if (utcMin < jieOfYear(year)[0].utcMin) year -= 1;
  const list = jieOfYear(year);
  const next = jieOfYear(year + 1)[0];
  let idx = 0;
  for (let i = 0; i < list.length; i++) if (list[i].utcMin <= utcMin) idx = i;
  const prevJie = list[idx];
  const nextJie = idx + 1 < list.length ? list[idx + 1] : next;
  return { year, month: idx + 1, prevJie, nextJie };
}

// ───────────── 계산 ─────────────

export type ChartInput = {
  /** "YYYY-MM-DD" 양력 */
  date: string;
  /** "HH:mm" 0~24시 벽시계. 모르면 null(시주 미상). */
  time: string | null;
  gender: Gender;
  /** 서울 경도 보정(UTC+8:30 기준으로 일·시주 판정). 기본 true. */
  longitudeCorrection?: boolean;
};

export type Chart = {
  input: ChartInput;
  timing: {
    dstApplied: boolean;
    standardOffsetMin: number;
    utcIso: string;
    /** 일·시주 판정에 쓴 기준 시각(현지) */
    localIso: string;
  };
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: { gan: number; text: string; hanja: string; element: Element; yinYang: YinYang };
  /** 8글자 오행 개수(시주 미상이면 6글자). */
  elements: Record<Element, number>;
  /** 일간을 뺀 나머지 글자의 십신. 지지는 본기 기준. */
  tenGods: {
    yearGan: TenGod; monthGan: TenGod; hourGan: TenGod | null;
    yearJi: TenGod; monthJi: TenGod; dayJi: TenGod; hourJi: TenGod | null;
  };
  tenGodCounts: Record<TenGod, number>;
  strength: {
    deukryeong: boolean; // 득령
    deukji: boolean; // 득지
    deukse: boolean; // 득세
    supporters: number; // 비겁+인성 개수(일간 제외)
    verdict: "신강" | "신약" | "중화";
  };
  daeun: {
    direction: "순행" | "역행";
    daysToJie: number;
    startAge: number; // 대운수
    startAgeExact: number;
    list: Array<{ age: number; fromYear: number; pillar: Pillar }>;
  };
  monthJie: { prev: string; next: string };
};

const JIE_KO: Record<string, string> = {
  立春: "입춘", 惊蛰: "경칩", 清明: "청명", 立夏: "입하", 芒种: "망종", 小暑: "소서",
  立秋: "입추", 白露: "백로", 寒露: "한로", 立冬: "입동", 大雪: "대설", 小寒: "소한",
};

function toIso(min: number): string {
  return new Date(min * 60000).toISOString().slice(0, 16);
}

/** 간지 → 60갑자 인덱스 */
export function sexagenaryIndex(p: Pillar): number {
  for (let i = 0; i < 60; i++) if (i % 10 === p.gan && i % 12 === p.ji) return i;
  throw new Error(`없는 간지: ${p.gan}/${p.ji}`);
}

/** 60갑자 인덱스 → 간지. */
export function sexagenary(idx: number): Pillar {
  const i = ((idx % 60) + 60) % 60;
  return { gan: i % 10, ji: i % 12 };
}

export function computeChart(input: ChartInput): Chart {
  const [y, m, d] = input.date.split("-").map(Number);
  const time = input.time ?? "12:00"; // 시주 미상이면 정오로 두고 시주는 비운다
  const wallMin = wallToMin(`${input.date}T${time}`);
  const dst = inDst(wallMin);
  const std = standardOffsetMin(y, m, d);
  const utcMin = wallMin - std - (dst ? 60 : 0);
  const useCorrection = input.longitudeCorrection ?? true;
  const localMin = utcMin + (useCorrection ? 510 : 540);

  // 연·월 — 절기 순간과 비교
  const calYear = new Date(utcMin * 60000).getUTCFullYear();
  const ym = solarYearMonth(utcMin, calYear);
  const yearGan = ((ym.year - 4) % 10 + 10) % 10;
  const yearJi = ((ym.year - 4) % 12 + 12) % 12;
  // 월간: 갑기년→병인, 을경→무인, 병신→경인, 정임→임인, 무계→갑인
  const monthGan = ((yearGan % 5) * 2 + 2 + (ym.month - 1)) % 10;
  const monthJi = (ym.month + 1) % 12; // 인월=1 → 인(2)

  // 일 — 보정 후 현지 시각의 달력 날짜. 자정에 바뀐다.
  const localDate = new Date(localMin * 60000);
  const localHour = localDate.getUTCHours();
  const dayCount = Math.floor(localMin / 1440);
  const dayIdx = ((dayCount - 10957 + 54) % 60 + 60) % 60; // 2000-01-01 = 무오(54)
  const day: Pillar = { gan: dayIdx % 10, ji: dayIdx % 12 };

  // 시 — 시간: 갑기일→갑자, 을경→병자, 병신→무자, 정임→경자, 무계→임자
  let hour: Pillar | null = null;
  if (input.time !== null) {
    const hj = Math.floor(((localHour + 1) % 24) / 2);
    const hg = ((day.gan % 5) * 2 + hj) % 10;
    hour = { gan: hg, ji: hj };
  }

  const pillars = { year: { gan: yearGan, ji: yearJi }, month: { gan: monthGan, ji: monthJi }, day, hour };

  // 오행
  const elements: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    if (!p) continue;
    elements[GAN_ELEMENT[p.gan]]++;
    elements[JI_ELEMENT[p.ji]]++;
  }

  // 십신
  const dm = day.gan;
  const tg = {
    yearGan: tenGod(dm, pillars.year.gan),
    monthGan: tenGod(dm, pillars.month.gan),
    hourGan: hour ? tenGod(dm, hour.gan) : null,
    yearJi: tenGod(dm, jiMainGan(pillars.year.ji)),
    monthJi: tenGod(dm, jiMainGan(pillars.month.ji)),
    dayJi: tenGod(dm, jiMainGan(day.ji)),
    hourJi: hour ? tenGod(dm, jiMainGan(hour.ji)) : null,
  };
  const tenGodCounts = Object.fromEntries(
    ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"].map((k) => [k, 0]),
  ) as Record<TenGod, number>;
  for (const v of Object.values(tg)) if (v) tenGodCounts[v]++;

  // 신강·신약(단순 판정 — 득령 2점, 득지 1점, 득세 1점)
  const me = GAN_ELEMENT[dm];
  const helps = (e: Element) => e === me || GENERATES[e] === me;
  const deukryeong = helps(JI_ELEMENT[pillars.month.ji]);
  const deukji = helps(JI_ELEMENT[day.ji]);
  let supporters = 0;
  for (const v of Object.values(tg)) if (v && ["비견", "겁재", "편인", "정인"].includes(v)) supporters++;
  const total = Object.values(tg).filter(Boolean).length;
  const deukse = supporters >= Math.ceil(total / 2);
  const score = (deukryeong ? 2 : 0) + (deukji ? 1 : 0) + (deukse ? 1 : 0);
  const verdict = score >= 3 ? "신강" : score <= 1 ? "신약" : "중화";

  // 대운 — 양남음녀 순행, 음남양녀 역행. 3일 = 1년.
  const yangYear = yearGan % 2 === 0;
  const forward = (yangYear && input.gender === "M") || (!yangYear && input.gender === "F");
  const daysToJie = forward ? (ym.nextJie.utcMin - utcMin) / 1440 : (utcMin - ym.prevJie.utcMin) / 1440;
  const startAgeExact = daysToJie / 3;
  const startAge = daeunStartAge(daysToJie);
  const monthIdx60 = sexagenaryIndex(pillars.month);
  const list = Array.from({ length: 10 }, (_, k) => {
    const step = forward ? k + 1 : -(k + 1);
    return { age: startAge + k * 10, fromYear: ym.year + startAge + k * 10, pillar: sexagenary(monthIdx60 + step) };
  });

  return {
    input,
    timing: { dstApplied: dst, standardOffsetMin: std, utcIso: toIso(utcMin), localIso: toIso(localMin) },
    pillars,
    dayMaster: { gan: dm, text: GAN[dm], hanja: GAN_HANJA[dm], element: me, yinYang: ganYinYang(dm) },
    elements,
    tenGods: tg,
    tenGodCounts,
    strength: { deukryeong, deukji, deukse, supporters, verdict },
    daeun: { direction: forward ? "순행" : "역행", daysToJie: Math.round(daysToJie * 10) / 10, startAge, startAgeExact, list },
    monthJie: { prev: JIE_KO[ym.prevJie.name], next: JIE_KO[ym.nextJie.name] },
  };
}

/**
 * 대운수: 절입까지 일수(올림)를 3으로 나눈 몫 + 1(세는나이).
 * 사주풀이도우미 24건 중 19건 일치가 최고였던 규칙. 사이트마다 ±1 차이는 절기 시각·날짜 세는 법 차이라 정상.
 */
export function daeunStartAge(daysToJie: number): number {
  return Math.floor(Math.ceil(daysToJie) / 3) + 1;
}

/** 지금 이 순간의 세운·월운(절기 기준). */
export function currentLuck(nowMs = Date.now()): { year: number; seun: Pillar; wolun: Pillar } {
  const utcMin = nowMs / 60000;
  const calYear = new Date(nowMs).getUTCFullYear();
  const ym = solarYearMonth(utcMin, calYear);
  const yg = ((ym.year - 4) % 10 + 10) % 10;
  return {
    year: ym.year,
    seun: { gan: yg, ji: ((ym.year - 4) % 12 + 12) % 12 },
    wolun: { gan: ((yg % 5) * 2 + 2 + (ym.month - 1)) % 10, ji: (ym.month + 1) % 12 },
  };
}

/** 어떤 해의 월운 12개(입춘부터 인월…축월). 절기 기준이라 양력 달과 어긋난다. */
export function monthPillarsOf(year: number): Array<{ month: number; from: string; pillar: Pillar }> {
  const yg = ((year - 4) % 10 + 10) % 10;
  return jieOfYear(year).map((j, i) => ({
    month: i + 1,
    from: `${JIE_KO[j.name]} ${toIso(j.utcMin + 540).slice(5, 10).replace("-", "/")}`,
    pillar: { gan: ((yg % 5) * 2 + 2 + i) % 10, ji: (i + 2) % 12 },
  }));
}

/** 현재 대운과 다음 대운(태어난 해 기준 나이). */
export function currentDaeun(chart: Chart, nowYear = new Date().getFullYear()) {
  const birthYear = Number(chart.input.date.slice(0, 4));
  const age = nowYear - birthYear;
  const list = chart.daeun.list;
  if (age < list[0].age) return { age, current: null, next: list[0] };
  let i = 0;
  for (let k = 0; k < list.length; k++) if (list[k].age <= age) i = k;
  return { age, current: list[i], next: list[i + 1] ?? null };
}

export const ELEMENTS = ELEMENT_ORDER;

/** 음력(윤달 포함) → 양력 "YYYY-MM-DD". 없는 날이면 null. */
export function lunarToSolar(y: number, m: number, d: number, leap = false): string | null {
  try {
    const l = Lunar.fromYmd(y, leap ? -m : m, d) as { getSolar(): { toYmd(): string } };
    return l.getSolar().toYmd();
  } catch {
    return null;
  }
}

/** 12운성 — 일간 기준. 양간은 장생에서 순행, 음간은 역행. */
const TWELVE_STAGES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"] as const;
export type Stage = (typeof TWELVE_STAGES)[number];
// 일간 → 장생 지지: 갑해 을오 병인 정유 무인 기유 경사 신자 임신 계묘
const BIRTH_JI = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
export function stageOf(dayGan: number, ji: number): Stage {
  const start = BIRTH_JI[dayGan];
  const step = dayGan % 2 === 0 ? (ji - start + 12) % 12 : (start - ji + 12) % 12;
  return TWELVE_STAGES[step];
}
export function stages(chart: Chart): Array<{ pos: string; ji: number; stage: Stage }> {
  const pl = chart.pillars;
  const cols: Array<[string, Pillar | null]> = [["연", pl.year], ["월", pl.month], ["일", pl.day], ["시", pl.hour]];
  return cols.filter((c): c is [string, Pillar] => c[1] !== null).map(([pos, p]) => ({ pos, ji: p.ji, stage: stageOf(pl.day.gan, p.ji) }));
}

/** 지장간 십신 — 지지 속에 숨은 천간까지. 본기만 세는 tenGodCounts를 보완한다. */
export function hiddenTenGods(chart: Chart): Array<{ pos: string; ji: number; gans: Array<{ gan: number; god: TenGod; main: boolean }> }> {
  const pl = chart.pillars;
  const dm = pl.day.gan;
  const cols: Array<[string, Pillar | null]> = [["연", pl.year], ["월", pl.month], ["일", pl.day], ["시", pl.hour]];
  return cols.filter((c): c is [string, Pillar] => c[1] !== null).map(([pos, p]) => {
    const hs = HIDDEN[p.ji];
    return { pos, ji: p.ji, gans: hs.map((g, i) => ({ gan: g, god: tenGod(dm, g), main: i === hs.length - 1 })) };
  });
}
