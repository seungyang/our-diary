import { Skeleton } from "@/components/ui";

/** 앨범 — 3열 격자. 진짜 화면과 같은 칸 크기로 둔다. */
export default function AlbumLoading() {
  return (
    <div className="space-y-[var(--space-xl)]" aria-busy="true" aria-label="불러오는 중">
      <div className="space-y-[var(--space-xs)]">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
      <ul className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-square w-full rounded-[var(--radius-input)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
