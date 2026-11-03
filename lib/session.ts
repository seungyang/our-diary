import "server-only";
import { cookies } from "next/headers";

const COOKIE = "od_session";
const MONTH = 60 * 60 * 24 * 30;

export type Session = { uid: string };

export async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.uid === "string" && parsed.uid) return { uid: parsed.uid };
  } catch {
    // 깨진 쿠키는 없는 것으로 친다
  }
  return null;
}

export async function writeSession(session: Session): Promise<void> {
  const value = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MONTH,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
