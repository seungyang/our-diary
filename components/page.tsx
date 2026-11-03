import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 모든 화면이 같은 뼈대를 쓴다.
 * 상단 바 48px · 콘텐츠 폭 28rem(폰 한 화면) · 상하좌우 여백 20px 동일 · 섹션 간격 28px.
 * 데스크톱에서도 폰 폭 그대로 가운데에 놓인다 — 이 앱은 폰에서 쓴다.
 * 여기 값을 바꾸면 전 화면이 같이 바뀐다 — 화면마다 따로 정하지 않는다.
 */

export function TopBar({
  title = "우리의 다이어리",
  href = "/",
  right,
}: {
  title?: string;
  href?: string | null;
  right?: ReactNode;
}) {
  const mark = (
    <span className="font-[family-name:var(--font-display)] text-[length:var(--text-base)] text-ink truncate">
      {title}
    </span>
  );
  return (
    <header className="sticky top-0 z-10 bg-paper/85 backdrop-blur-sm border-b border-rule-soft">
      <div className="mx-auto max-w-[28rem] px-5 h-12 flex items-center justify-between gap-4">
        {href ? (
          <Link
            href={href}
            className="min-w-0 min-h-11 -my-1 inline-flex items-center hover:text-pen-a transition-colors duration-[var(--dur-micro)]"
          >
            {mark}
          </Link>
        ) : (
          mark
        )}
        {right}
      </div>
    </header>
  );
}

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={`mx-auto w-full max-w-[28rem] min-h-[calc(100dvh-3rem)] px-5 pt-5 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-7 sm:border-x sm:border-rule-soft ${className}`}
    >
      {children}
    </main>
  );
}

export function PageHead({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <header>
      <h1 className="text-[length:var(--text-xl)] text-ink">{title}</h1>
      {sub ? (
        <p className="mt-[var(--space-2xs)] text-[length:var(--text-sm)] text-muted tnum">{sub}</p>
      ) : null}
    </header>
  );
}

/** 섹션 제목 — 페이지 제목보다 한 단계 작고, 같은 명조. */
export function SectionHead({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-base)] text-ink mb-[var(--space-sm)]">
      {children}
    </h2>
  );
}

/** 텍스트 링크 — 밑줄 한 가지 스타일만 쓴다. */
export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-pen-a underline decoration-[1.5px] underline-offset-4 decoration-pen-a/40 hover:decoration-pen-a whitespace-nowrap transition-[text-decoration-color] duration-[var(--dur-short)]"
    >
      {children}
    </Link>
  );
}
