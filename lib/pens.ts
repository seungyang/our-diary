/**
 * 펜 색 — 각자 설정에서 하나 고르면 그 사람의 앱 테마가 된다.
 * 이름 앞의 점, 글쓴이 이름, 버튼, 링크, 활성 탭, 달력 점, 지도 핀이 모두 이 색을 쓴다.
 *
 * 무지개 여덟 색만 쓴다. 여기 없는 색은 화면 어디에도 칠하지 않는다.
 * 값은 tokens.css의 `--pen-*`에 있고, 색마다 네 단계가 있다:
 *   ink(글자·점) · soft(파스텔 채움) · on(채움 위 글자) · wash(가장 연한 바탕)
 */

export const PENS = [
  { id: "rose", label: "장미", hue: 17, soft: "#eea4a6" },
  { id: "peach", label: "살구", hue: 60, soft: "#f3c8a6" },
  { id: "butter", label: "노랑", hue: 94, soft: "#f0e0a8" },
  { id: "lime", label: "연두", hue: 149, soft: "#aed9b4" },
  { id: "mint", label: "민트", hue: 193, soft: "#addcda" },
  { id: "sky", label: "하늘", hue: 238, soft: "#b4d3e8" },
  { id: "peri", label: "쪽빛", hue: 272, soft: "#c3cbe6" },
  { id: "lilac", label: "라일락", hue: 331, soft: "#d8b5d3" },
] as const;

export type PenId = (typeof PENS)[number]["id"];

/** 색상각 — 페이지 전체 톤(종이·카드·선·글자)을 이 각도로 물들인다. */
export function penHue(v: string | null | undefined): number {
  return PENS.find((p) => p.id === v)?.hue ?? PENS.find((p) => p.id === DEFAULT_PEN)!.hue;
}

export const DEFAULT_PEN: PenId = "peri";
export const PARTNER_PEN: PenId = "peach";

const IDS = new Set<string>(PENS.map((p) => p.id));

export function isPenId(v: unknown): v is PenId {
  return typeof v === "string" && IDS.has(v);
}

function id(v: string | null | undefined): string {
  return isPenId(v) ? v : DEFAULT_PEN;
}

/** 흰 종이 위 글자·점. */
export function penVar(v: string | null | undefined): string {
  return `var(--pen-${id(v)})`;
}

/** 파스텔 채움 — 버튼·칩 배경. */
export function penSoftVar(v: string | null | undefined): string {
  return `var(--pen-${id(v)}-soft)`;
}

/** 파스텔 채움 위에 얹는 글자. */
export function penOnVar(v: string | null | undefined): string {
  return `var(--pen-${id(v)}-on)`;
}

/** 가장 연한 바탕 — 활성 탭, 오늘 표시. */
export function penWashVar(v: string | null | undefined): string {
  return `var(--pen-${id(v)}-wash)`;
}

export function penLabel(v: string | null | undefined): string {
  return PENS.find((p) => p.id === v)?.label ?? PENS[0].label;
}
