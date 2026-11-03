/**
 * 날짜는 한국 시간 기준입니다. 서버가 어디에 있든 "밤 열한 시에 쓴 글"은
 * 오늘 자로 남아야 하기 때문입니다. (다른 시간대에서 쓴다면 TZ만 바꾸면 됩니다.)
 */
export const TZ = "Asia/Seoul";

const ymdFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD */
export function today(): string {
  return ymdFormat.format(new Date());
}

export function thisMonth(): string {
  return today().slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "3월 14일 금요일" — 올해가 아니면 연도를 붙인다. */
export function humanDate(ymd: string, reference = today()): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const sameYear = ymd.slice(0, 4) === reference.slice(0, 4);
  const head = sameYear ? "" : `${y}년 `;
  return `${head}${m}월 ${d}일 ${weekdayOf(ymd)}요일`;
}

/** 오늘·어제·그저께만 이름으로 부르고, 나머지는 날짜로 부른다. */
export function relativeDate(ymd: string, reference = today()): string | null {
  const diff = daysBetween(ymd, reference);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff === 2) return "그저께";
  return null;
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** 처음 만난 날을 1일째로 센다 (한국식 D+1). */
export function daysTogether(metOn: string, reference = today()): number {
  return daysBetween(metOn, reference) + 1;
}

/** 다음 기념일까지 남은 날. 해마다 돌아오는 날이면 올해/내년 중 가까운 쪽. */
export function daysUntil(onDate: string, yearly: boolean, reference = today()): number {
  if (!yearly) return daysBetween(reference, onDate);
  const [, m, d] = onDate.split("-").map(Number);
  const year = Number(reference.slice(0, 4));
  for (const y of [year, year + 1]) {
    const candidate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const diff = daysBetween(reference, candidate);
    if (diff >= 0) return diff;
  }
  return 0;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 그 달 1일이 무슨 요일인지 (0=일) */
export function firstWeekdayOf(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

/** 한 줄에 고르는 오늘의 기분. 다섯 개를 넘기면 고르는 게 일이 된다. */
export const MOODS = ["좋았어", "설렜어", "그냥그래", "피곤해", "힘들었어"] as const;
