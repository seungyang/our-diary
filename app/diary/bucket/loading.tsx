import { Skeleton } from "@/components/ui";

/** 탭을 누르면 이전 화면이 멈춰 있지 않고, 곧 올 화면의 뼈대가 먼저 보인다. */
export default function BucketLoading() {
  return (
    <div className="space-y-[var(--space-xl)]" aria-busy="true" aria-label="불러오는 중">
      <div className="space-y-[var(--space-xs)]">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-14 w-full rounded-[var(--radius-card)]" />
      <ul className="divide-y divide-rule-soft">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-[var(--space-xs)] py-[var(--space-2xs)]">
            <div className="size-11 flex items-center justify-center">
              <Skeleton className="size-6 rounded-full" />
            </div>
            <div className="flex-1 space-y-1.5 py-2">
              <Skeleton className={`h-4 ${i === 1 ? "w-3/5" : "w-4/5"}`} />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
