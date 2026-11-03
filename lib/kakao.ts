/**
 * 카카오맵 SDK — 브라우저에서만 쓴다. 키는 도메인으로 잠기는 공개 키(NEXT_PUBLIC).
 * 키가 없거나 도메인 등록이 안 됐으면 load가 실패하고, 화면은 그 사실을 말해준다.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    kakao?: any;
  }
}

export const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

let sdk: Promise<any> | null = null;

export function loadKakao(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("server"));
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao);
  if (!KAKAO_KEY) return Promise.reject(new Error("no-key"));
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    s.async = true;
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    s.onerror = () => {
      sdk = null;
      reject(new Error("load-failed"));
    };
    document.head.appendChild(s);
  });
  return sdk;
}

export type KakaoHit = { name: string; address: string; lat: number; lng: number };

/** 키워드 검색 — 상호명·주소 한국어로 정확하다. 최대 8개. */
export async function searchKakao(query: string): Promise<KakaoHit[]> {
  const kakao = await loadKakao();
  return new Promise((resolve) => {
    new kakao.maps.services.Places().keywordSearch(
      query,
      (data: any[], status: string) => {
        if (status !== kakao.maps.services.Status.OK) return resolve([]);
        resolve(
          data.slice(0, 8).map((d) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat: Number(d.y),
            lng: Number(d.x),
          })),
        );
      },
      { size: 8 },
    );
  });
}
