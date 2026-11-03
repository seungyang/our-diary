import { Skeleton } from "@/components/ui";

/** 더보기 — 줄 목록과 알림. */
export default function MoreLoading() {
  return (
    <div className="space-y-[var(--space-xl)]" aria-busy="true" aria-label="불러오는 중">
      <Skeleton className="h-7 w-24" />
      <ul className="divide-y divide-rule-soft">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex items-center gap-[var(--space-sm)] min-h-14">
            <Skeleton className="size-6 rounded-[var(--radius-input)]" />
            <Skeleton className="h-4 w-28" />
          </li>
        ))}
      </ul>
      <div className="space-y-[var(--space-xs)]">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
