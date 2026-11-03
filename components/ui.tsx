"use client";

import Link from "next/link";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button as ShButton } from "./shadcn/button";
import { Input as ShInput } from "./shadcn/input";
import { Textarea as ShTextarea } from "./shadcn/textarea";
import { quietAction } from "./styles";

/* 화면이 쓰는 부품은 여기 한 곳. 속은 shadcn/ui(Radix), 겉은 우리 토큰.
   클래스 문자열 자체는 styles.ts에 있다 — 서버 컴포넌트는 거기서 직접 가져온다. */
export { cardClass, chipClass, iconBtn, inputClass, pairRow, quietAction } from "./styles";

const skin = { primary: "default", quiet: "outline", danger: "outline" } as const;

/* 폰에서 누르는 버튼: 44px, 알약, 눌리면 살짝 줄어든다. */
const shape =
  "press h-auto min-h-11 rounded-[var(--radius-pill)] px-5 text-[length:var(--text-sm)] font-medium shadow-none";

/* 기본 버튼은 파스텔로 채우고 글자는 같은 색의 진한 단계로. 테두리 한 겹이 버튼임을 말해 준다. */
const primarySkin = "border border-pen-a/70 hover:bg-pen-a-soft/70";

const quietSkin = "bg-transparent border-rule text-ink hover:bg-paper-2 hover:text-ink";
const dangerSkin = "bg-transparent border-rule text-danger hover:border-danger hover:bg-transparent hover:text-danger";

export function Button({
  variant = "primary",
  full = false,
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "quiet" | "danger"; full?: boolean }) {
  return (
    <ShButton
      variant={skin[variant]}
      className={cn(shape, variant === "primary" && primarySkin, variant === "quiet" && quietSkin, variant === "danger" && dangerSkin, full && "w-full", className)}
      {...props}
    />
  );
}

/** 버튼처럼 보이는 링크. 화면 이동이 주된 동작일 때. */
export function LinkButton({
  href,
  variant = "primary",
  full = false,
  className = "",
  children,
}: {
  href: string;
  variant?: "primary" | "quiet";
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ShButton asChild variant={skin[variant]} className={cn(shape, variant === "primary" && primarySkin, variant === "quiet" && quietSkin, full && "w-full", className)}>
      <Link href={href}>{children}</Link>
    </ShButton>
  );
}

/* 입력: 44px, 종이 면, 포커스는 잉크색 링. 폰에서 글자 17px 그대로(확대 방지). */
const fieldShape =
  "h-auto min-h-11 rounded-[var(--radius-input)] border-rule bg-paper px-3 " +
  "text-[length:var(--text-base)] md:text-[length:var(--text-base)] shadow-none placeholder:text-neutral " +
  // 포커스는 알아보되 요란하지 않게. 테두리 1px + 옅은 링.
  "focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <ShInput className={cn(fieldShape, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <ShTextarea className={cn(fieldShape, "min-h-24 resize-none py-2.5 leading-[var(--leading-body)]", className)} {...props} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[length:var(--text-sm)] text-muted mb-[var(--space-xs)]">{label}</span>
      {children}
      {hint ? (
        <span className="block text-[length:var(--text-xs)] text-neutral mt-[var(--space-2xs)]">{hint}</span>
      ) : null}
    </label>
  );
}

/** 에러는 사과하지 않고, 무엇이 잘못됐고 어떻게 고치는지만 말한다. */
export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[length:var(--text-sm)] text-danger flex items-start gap-2">
      <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-danger" />
      <span>{children}</span>
    </p>
  );
}

/** 로딩 자리표시 — 선 하나. 색만 숨 쉰다, 움직이지 않는다. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-[var(--radius-input)] bg-paper-3 animate-pulse", className)} />;
}

/** 빈 화면은 분위기가 아니라 다음 행동을 말한다. */
export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="py-[var(--space-lg)] space-y-[var(--space-sm)]">
      <p className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] text-ink">{title}</p>
      {body ? <p className="text-[length:var(--text-base)] text-muted">{body}</p> : null}
      {children ? <div className="pt-[var(--space-xs)] flex flex-wrap gap-[var(--space-xs)]">{children}</div> : null}
    </div>
  );
}

/**
 * 되돌리기 바 — 확인창 대신. 지우고 나서 5초 동안만 떠 있다.
 * (버킷은 sonner 토스트로 옮겼고, 다른 화면이 아직 이걸 쓸 수 있어 남겨둔다.)
 */
export function Undo({
  text,
  onUndo,
  onDismiss,
  ms = 5000,
}: {
  text: string;
  onUndo: () => void;
  onDismiss: () => void;
  ms?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, ms);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [ms, onDismiss]);

  return (
    <div className="fixed inset-x-0 z-20 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+12px)] px-5 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto mx-auto max-w-[28rem] flex items-center gap-[var(--space-sm)] rounded-[var(--radius-card)] border border-rule bg-paper-3 pl-4 pr-1.5 py-1.5 shadow-[var(--shadow-lift)] transition-[opacity,transform] duration-[var(--dur-short)] ease-[var(--ease-out)] starting:opacity-0 starting:translate-y-2"
      >
        <span className="flex-1 min-w-0 truncate text-[length:var(--text-sm)] text-ink">{text}</span>
        <button type="button" onClick={onUndo} className={`${quietAction} text-pen-a hover:text-pen-a font-medium px-3`}>
          되돌리기
        </button>
      </div>
    </div>
  );
}
