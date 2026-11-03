/**
 * 사람이 적은 생년월일·시각을 읽는다. 달력 위젯 없이 글자로 받는다.
 *  날짜: "1995년 3월 15일", "1995-03-15", "1995.3.15", "19950315", "95년 3월 15일"(1900년대로 봄)
 *  시각: "오전 10시 30분", "오후 3시", "22:10", "22시", "밤 11시 5분", "새벽 1시", "모름"
 */
export type Ymd = { y: number; m: number; d: number };

export function parseBirthDate(input: string): Ymd | null {
  const s = input.trim().replace(/\s+/g, " ");
  if (!s) return null;
  let m = /^(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/.exec(s);
  if (!m) m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) {
    const two = /^(\d{2})\D+(\d{1,2})\D+(\d{1,2})\D*$/.exec(s);
    if (two) m = [two[0], String(1900 + Number(two[1])), two[2], two[3]] as unknown as RegExpExecArray;
  }
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** null = 모름. undefined = 못 읽음. */
export function parseBirthTime(input: string): { h: number; mi: number } | null | undefined {
  const s = input.trim().replace(/\s+/g, "");
  if (!s || /(모름|몰라|미상|모르|없음|\?)/.test(s)) return null;
  const pm = /(오후|저녁|밤|pm|PM|p\.m)/.test(s);
  const am = /(오전|아침|새벽|am|AM|a\.m)/.test(s);
  const body = s.replace(/(오전|오후|아침|저녁|밤|새벽|am|AM|pm|PM|a\.m\.?|p\.m\.?)/g, "");
  let h: number | undefined, mi = 0;
  let m = /^(\d{1,2})[:시.](\d{1,2})분?$/.exec(body);
  if (m) { h = Number(m[1]); mi = Number(m[2]); }
  else if ((m = /^(\d{1,2})시?(반)?$/.exec(body))) { h = Number(m[1]); mi = m[2] ? 30 : 0; }
  else if ((m = /^(\d{2})(\d{2})$/.exec(body))) { h = Number(m[1]); mi = Number(m[2]); }
  if (h === undefined || h > 24 || mi > 59) return undefined;
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h === 24) h = 0;
  return { h, mi };
}

export function fmtTime(t: string | null): string {
  if (!t) return "모름";
  const [h, mi] = t.split(":").map(Number);
  const half = h < 12 ? "오전" : "오후";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${hh}시${mi ? ` ${mi}분` : ""}`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
