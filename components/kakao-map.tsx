"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { loadKakao } from "@/lib/kakao";
import type { Place } from "@/lib/store";

/* 핀은 이미지가 아니라 펜 색 점이다. */
function dotHtml(color: string, big = false) {
  const s = big ? 18 : 14;
  return `<span style="display:block;width:${s}px;height:${s}px;border-radius:999px;background:${color};border:2px solid var(--color-paper);box-shadow:0 0 0 1px ${color};transform:translate(-50%,-50%)"></span>`;
}

export function KakaoMap({
  places,
  me,
  pens,
  picked,
  focus,
  onPick,
}: {
  places: Place[];
  me: string;
  pens: Record<string, string>;
  picked: { lat: number; lng: number } | null;
  focus?: { lat: number; lng: number; key: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const overlays = useRef<any[]>([]);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  // 지도 한 번 만들기
  useEffect(() => {
    let alive = true;
    loadKakao()
      .then((kakao) => {
        if (!alive || !box.current) return;
        const first = places[0];
        const center = new kakao.maps.LatLng(first?.lat ?? 37.5665, first?.lng ?? 126.978);
        map.current = new kakao.maps.Map(box.current, { center, level: places.length > 1 ? 9 : 5 });
        kakao.maps.event.addListener(map.current, "click", (e: any) => {
          pickRef.current(e.latLng.getLat(), e.latLng.getLng());
        });
        setStatus("ready");
      })
      .catch(() => alive && setStatus("failed"));
    return () => {
      alive = false;
    };
    // 최초 1회만. places는 아래 effect가 따라간다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 목록에서 고른 곳으로
  useEffect(() => {
    if (status !== "ready" || !map.current || !focus) return;
    const kakao = window.kakao;
    map.current.setLevel(4);
    map.current.panTo(new kakao.maps.LatLng(focus.lat, focus.lng));
  }, [focus, status]);

  // 핀 갱신
  useEffect(() => {
    if (status !== "ready" || !map.current) return;
    const kakao = window.kakao;
    for (const o of overlays.current) o.setMap(null);
    overlays.current = [];

    const pins = places.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      html: dotHtml(pens[p.addedBy] ?? pens[me]),
      title: p.name,
    }));
    if (picked) pins.push({ lat: picked.lat, lng: picked.lng, html: dotHtml("var(--color-ink)", true), title: "" });

    for (const pin of pins) {
      const o = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        content: pin.title ? `<span title="${pin.title.replace(/"/g, "")}">${pin.html}</span>` : pin.html,
        yAnchor: 0,
        xAnchor: 0,
      });
      o.setMap(map.current);
      overlays.current.push(o);
    }

    if (picked) {
      map.current.panTo(new kakao.maps.LatLng(picked.lat, picked.lng));
      if (map.current.getLevel() > 4) map.current.setLevel(4);
    }
  }, [places, picked, me, pens, status]);

  return (
    <div className="relative h-[280px] w-full rounded-[var(--radius-card)] border border-rule bg-paper-2 overflow-hidden">
      <div ref={box} className="absolute inset-0" />
      {status !== "ready" ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[length:var(--text-sm)] text-neutral">
          {status === "loading"
            ? "지도 불러오는 중"
            : "지도를 못 불러왔어요. 카카오 개발자 콘솔에서 이 주소가 Web 플랫폼에 등록돼 있는지 확인해주세요."}
        </p>
      ) : null}
    </div>
  );
}
