import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * 더보기에서 들어간 화면(함께 간 곳·위시·달력·설정)의 머리줄.
 *
 * 탭이 아닌 화면인데 뒤로 갈 길이 없었다 — 폰에서 제스처를 모르면 갇힌다.
 * 그래서 왼쪽에 44px 뒤로, 가운데에 지금 어느 화면인지를 둔다.
 * 오른쪽은 같은 넓이의 빈 칸이라 제목이 정확히 가운데 온다.
 */
export function SubBar({ title, back = "/diary/more" }: { title: string; back?: string }) {
  return (
    <div className="-mt-[var(--space-lg)] mb-[var(--space-xs)] flex items-center gap-[var(--space-xs)]">
      <Link
        href={back}
        aria-label="더보기로"
        className="press -ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-muted hover:text-ink"
      >
        <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
      </Link>
      <span className="min-w-0 flex-1 truncate text-center text-[length:var(--text-sm)] text-neutral">{title}</span>
      <span aria-hidden="true" className="size-11 shrink-0" />
    </div>
  );
}
