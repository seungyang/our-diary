"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * 사진 확대 뷰어.
 *
 * 종이 사진을 집어 눈앞에 가까이 대는 느낌. 사진이 전부이고 나머지는 가장자리로 물러난다.
 * - 손가락 두 개로 벌리거나 두 번 두드리면 커진다(최대 4배). 커진 뒤에는 끌어서 옮긴다.
 * - 원래 크기일 때 좌우로 밀면 다음 사진, 아래로 밀면 닫힌다.
 * - Esc·바깥 누르기·닫기 단추로도 닫힌다(Radix Dialog가 포커스와 스크롤을 맡는다).
 *
 * 배율·위치 상태는 Stage가 들고 있고 사진이 바뀌면 key로 새로 만든다 — 되돌리는 코드가 필요 없다.
 */

export type Photo = {
  /** 확대해서 볼 원본 */
  url: string;
  alt: string;
  /** 사진 아래 한 줄 */
  caption?: string;
  /** 언제 */
  on?: string;
  /** 누가 — 이름 앞에 펜 색 점이 찍힌다 */
  by?: string;
  /** 그 사람의 펜 색(CSS 색 문자열) */
  penColor?: string;
};

const MAX = 4;
const DOUBLE_TAP_MS = 280;
const SWIPE_PX = 56;
const CLOSE_PX = 120;

export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: Photo[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [fade, setFade] = useState(1);
  const photo = photos[index];
  const many = photos.length > 1;

  const go = useCallback(
    (step: number) => {
      if (!many) return;
      onIndexChange((index + step + photos.length) % photos.length);
    },
    [index, many, onIndexChange, photos.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!photo) return null;

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-[oklch(14%_0.012_250)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          style={{ opacity: fade }}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <DialogPrimitive.Title className="sr-only">{photo.alt}</DialogPrimitive.Title>

          {/* 위 — 몇 장 중 몇 번째인지, 닫기 */}
          <div
            className="relative z-10 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
            style={{ opacity: fade }}
          >
            <span className="min-w-14 px-2 text-[length:var(--text-sm)] text-white/70 tnum">
              {many ? `${index + 1} / ${photos.length}` : ""}
            </span>
            <DialogPrimitive.Close
              aria-label="닫기"
              className="press inline-flex size-11 items-center justify-center rounded-[var(--radius-pill)] text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X size={22} strokeWidth={2} aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* 가운데 — 사진. key로 사진마다 새 상태를 준다. */}
          <Stage key={index} photo={photo} many={many} onGo={go} onClose={onClose} onFade={setFade} />

          {/* 아래 — 누가 언제, 무슨 사진 */}
          {photo.caption || photo.on || photo.by ? (
            <div
              className="relative z-10 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3"
              style={{ opacity: fade }}
            >
              <div className="mx-auto max-w-[40rem]">
                {photo.on || photo.by ? (
                  <p className="flex items-center gap-2 text-[length:var(--text-sm)] text-white/60 tnum">
                    {photo.penColor ? (
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: photo.penColor }} />
                    ) : null}
                    {[photo.by, photo.on].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {photo.caption ? (
                  <p className="mt-1 line-clamp-3 text-[length:var(--text-base)] leading-[var(--leading-body)] text-white/90">
                    {photo.caption}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type Transform = { scale: number; x: number; y: number };
const RESET: Transform = { scale: 1, x: 0, y: 0 };

function Stage({
  photo,
  many,
  onGo,
  onClose,
  onFade,
}: {
  photo: Photo;
  many: boolean;
  onGo: (step: number) => void;
  onClose: () => void;
  onFade: (v: number) => void;
}) {
  const [t, setT] = useState<Transform>(RESET);
  const [slideX, setSlideX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ dist: number; scale: number; cx: number; cy: number; x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const moved = useRef(false);

  const zoomed = t.scale > 1.01;
  const fade = Math.max(0, 1 - dragY / 320);

  useEffect(() => {
    onFade(fade);
  }, [fade, onFade]);

  /** 배율이 바뀌어도 사진이 화면 밖으로 달아나지 않게 가둔다. */
  const clamp = useCallback((next: Transform): Transform => {
    const box = stage.current?.getBoundingClientRect();
    if (!box || next.scale <= 1) return { ...next, scale: Math.max(1, next.scale), x: 0, y: 0 };
    const maxX = (box.width * (next.scale - 1)) / 2;
    const maxY = (box.height * (next.scale - 1)) / 2;
    return {
      scale: Math.min(MAX, next.scale),
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }, []);

  /** 손가락이 짚은 지점이 제자리에 남도록 위치까지 같이 옮긴다. */
  const zoomAt = useCallback(
    (nextScale: number, cx: number, cy: number) => {
      const box = stage.current?.getBoundingClientRect();
      if (!box) return;
      setT((cur) => {
        const s = Math.max(1, Math.min(MAX, nextScale));
        if (s === 1) return RESET;
        const ox = cx - box.left - box.width / 2;
        const oy = cy - box.top - box.height / 2;
        const k = s / cur.scale;
        return clamp({ scale: s, x: ox - (ox - cur.x) * k, y: oy - (oy - cur.y) * k });
      });
    },
    [clamp],
  );

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    setDragging(true);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      start.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: t.scale,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        x: t.x,
        y: t.y,
      };
    } else {
      start.current = { dist: 0, scale: t.scale, cx: e.clientX, cy: e.clientY, x: t.x, y: t.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = start.current;
    if (!s) return;

    // 두 손가락 — 벌리고 오므려 배율을 바꾼다.
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (s.dist > 0) {
        moved.current = true;
        zoomAt(s.scale * (dist / s.dist), s.cx, s.cy);
      }
      return;
    }

    const dx = e.clientX - s.cx;
    const dy = e.clientY - s.cy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;

    if (zoomed) {
      // 커진 상태 — 사진을 끌어서 옮긴다.
      setT(clamp({ scale: t.scale, x: s.x + dx, y: s.y + dy }));
    } else if (Math.abs(dx) > Math.abs(dy)) {
      // 좌우 — 넘기기. 한 장뿐이면 살짝만 따라온다.
      setSlideX(many ? dx : dx * 0.25);
    } else if (dy > 0) {
      // 아래 — 닫기.
      setDragY(dy);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) {
      start.current = null;
      return;
    }
    setDragging(false);

    // 두 번 두드리기 — 2.5배로 키우거나 되돌린다.
    if (!moved.current) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        if (zoomed) setT(RESET);
        else zoomAt(2.5, e.clientX, e.clientY);
        setSlideX(0);
        setDragY(0);
        start.current = null;
        return;
      }
      lastTap.current = now;
    }

    if (dragY > CLOSE_PX) {
      onClose();
      return;
    }
    if (!zoomed && many && Math.abs(slideX) > SWIPE_PX) onGo(slideX < 0 ? 1 : -1);

    setSlideX(0);
    setDragY(0);
    start.current = null;
  }

  /** 마우스 휠 — 데스크톱에서 배율 조절. */
  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey && !zoomed) return;
    zoomAt(t.scale * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX, e.clientY);
  }

  return (
    <div
      ref={stage}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      className="relative flex-1 touch-none select-none overflow-hidden"
      style={{ cursor: zoomed ? "grab" : "zoom-in" }}
    >
      {!loaded ? (
        <span className="absolute inset-0 grid place-items-center text-[length:var(--text-sm)] text-white/50">
          불러오는 중…
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- 원본을 그대로 띄우고 직접 변형한다 */}
      <img
        src={photo.url}
        alt={photo.alt}
        draggable={false}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
        style={{
          transform: `translate3d(${t.x + slideX}px, ${t.y + dragY}px, 0) scale(${t.scale})`,
          transition: dragging ? "none" : "transform var(--dur-short) var(--ease-out)",
          opacity: loaded ? fade : 0,
        }}
      />

      {many ? (
        <>
          <ArrowButton side="left" onClick={() => onGo(-1)} />
          <ArrowButton side="right" onClick={() => onGo(1)} />
        </>
      ) : null}
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "이전 사진" : "다음 사진"}
      className={`press absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-black/30 text-white/80 backdrop-blur-sm hover:bg-black/50 hover:text-white [@media(hover:hover)]:flex ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <Icon size={24} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
