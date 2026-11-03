import { Skeleton } from "@/components/ui";

/** 오늘 — 쓰는 칸 하나와 지난 기록 몇 줄. */
export default function DiaryLoading() {
  return (
    <div className="space-y-[var(--space-xl)]" aria-busy="true" aria-label="불러오는 중">
      <div className="space-y-[var(--space-xs)]">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-36 w-full rounded-[var(--radius-card)]" />
      <div className="space-y-[var(--space-lg)]">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-[var(--space-xs)]">
            <Skeleton className="h-4 w-24" />
            <Skeleton className={`h-4 ${i === 0 ? "w-full" : "w-4/5"}`} />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
