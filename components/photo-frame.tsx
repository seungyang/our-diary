"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoViewer, type Photo } from "./photo-viewer";

/**
 * 한 장짜리 사진. 누르면 원본으로 확대된다.
 * 일기와 버킷에서 같은 부품을 쓴다 — 비율과 모서리만 다르게 준다.
 */
export function PhotoFrame({
  thumb,
  photo,
  className = "",
  sizes = "448px",
}: {
  /** 목록에 보이는 작은 사진 */
  thumb: string;
  /** 확대해서 볼 원본과 설명 */
  photo: Photo;
  className?: string;
  sizes?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${photo.alt} 크게 보기`}
        className={`press relative block w-full overflow-hidden border border-rule-soft bg-paper-2 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 ${className}`}
      >
        <Image src={thumb} alt="" fill sizes={sizes} className="object-cover" unoptimized />
      </button>
      {open ? (
        <PhotoViewer photos={[photo]} index={0} onIndexChange={() => {}} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
