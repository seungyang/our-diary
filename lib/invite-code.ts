/**
 * 연결 코드 — 상대에게 알려주는 6자리 비밀코드.
 *
 * 글자는 헷갈리는 것을 뺀 31가지(0·O·1·I 없음). 6자리면 약 8억 9천만 가지라
 * 찍어서 맞히기 어렵다. 소문자로 적어도 되게 읽을 때 대문자로 올린다.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CODE_LENGTH = 6;

/** 무작위 코드 한 장. */
export function makeCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** 사람이 적은 코드를 비교할 수 있는 모양으로. 공백·붙임표를 버리고 대문자로. */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isCodeShape(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}
