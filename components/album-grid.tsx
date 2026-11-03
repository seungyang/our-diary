"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoViewer, type Photo } from "./photo-viewer";

/**
 * 앨범 격자. 한 장을 누르면 확대 뷰어가 열리고, 거기서 좌우로 넘겨 전부 훑을 수 있다.
 * 격자에는 작은 사진(thumb), 뷰어에는 원본을 쓴다.
 */

export type AlbumPhoto = Photo & { key: string; thumb: string; label: string; sortKey: string };

export function AlbumGrid({ photos }: { photos: AlbumPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1">
        {photos.map((p, i) => (
          <li key={p.key}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${p.alt} 크게 보기`}
              className="press relative block aspect-square w-full overflow-hidden rounded-[var(--radius-input)] bg-paper-2 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
            >
              <Image src={p.thumb} alt="" fill sizes="(min-width: 640px) 200px, 33vw" className="object-cover" unoptimized />
              <span className="absolute bottom-1 left-1 rounded-[var(--radius-input)] bg-paper/85 px-1.5 py-0.5 text-[length:var(--text-sm)] text-ink tnum">
                {p.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null ? (
        <PhotoViewer photos={photos} index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}
