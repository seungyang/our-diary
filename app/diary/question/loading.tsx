import { Skeleton } from "@/components/ui";

/** 질문 — 오늘의 질문 한 덩이와 답 칸. */
export default function QuestionLoading() {
  return (
    <div className="space-y-[var(--space-xl)]" aria-busy="true" aria-label="불러오는 중">
      <div className="space-y-[var(--space-xs)]">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="space-y-[var(--space-sm)]">
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-11 w-full rounded-[var(--radius-pill)]" />
      </div>
    </div>
  );
}
