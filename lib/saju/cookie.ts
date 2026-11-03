import "server-only";
import { cookies } from "next/headers";
import type { SajuProfile } from "@/lib/store";

/**
 * 사주 입력값 쿠키. 목업(인메모리) 모드에서 서버리스 인스턴스가 바뀌어도 내 사주가 사라지지 않게.
 * DB가 붙으면 store만 보면 되고 이 파일은 지워도 된다.
 */
const COOKIE = "od_saju";
const YEAR = 60 * 60 * 24 * 365;

type Stored = Omit<SajuProfile, "updatedAt">;

export async function readSajuCookie(uid: string): Promise<Stored | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Stored;
    if (p?.uid !== uid || !/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate ?? "")) return null;
    if (p.gender !== "M" && p.gender !== "F") return null;
    return {
      uid, birthDate: p.birthDate, birthTime: typeof p.birthTime === "string" ? p.birthTime : null, gender: p.gender,
      calendar: p.calendar === "lunar" ? "lunar" : "solar", lunarInput: p.lunarInput ?? null,
    };
  } catch {
    return null;
  }
}

export async function writeSajuCookie(p: Stored): Promise<void> {
  const value = Buffer.from(JSON.stringify(p), "utf8").toString("base64url");
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
}
