/**
 * 클래스 문자열만 모아둔 파일. "use client"가 없어서 서버·클라이언트 어디서든 그냥 문자열이다.
 * (클라이언트 모듈에서 문자열을 export하면 서버 쪽에선 함수 스텁이 되어 버린다 — 그래서 분리.)
 */

export const buttonBase =
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] " +
  "px-5 min-h-11 text-[length:var(--text-sm)] font-medium cursor-pointer " +
  "disabled:cursor-not-allowed disabled:opacity-55";

export const buttonSkin = {
  primary: "bg-pen-a text-on-accent hover:bg-pen-a/90",
  quiet: "bg-transparent text-ink border border-rule hover:border-neutral hover:bg-paper-2",
  danger: "bg-transparent text-danger border border-rule hover:border-danger",
} as const;

/** 짝 버튼(수락/거절, 고쳤어요/그만두기)은 반반. 어느 쪽도 작지 않게. */
export const pairRow = "grid grid-cols-2 gap-[var(--space-sm)]";

/** 글자만 있는 작은 동작(고치기·지우기·취소). 44px 높이는 지킨다. */
export const quietAction =
  "press inline-flex items-center min-h-11 px-1 text-[length:var(--text-sm)] text-neutral hover:text-ink whitespace-nowrap cursor-pointer";

/** 아이콘 하나짜리 버튼 — 손가락이 닿는 44px, 눌리면 살짝 줄어든다. */
export const iconBtn =
  "press inline-flex items-center justify-center size-11 rounded-[var(--radius-pill)] cursor-pointer shrink-0";

export const inputClass =
  "w-full min-h-11 rounded-[var(--radius-input)] border border-rule bg-paper px-3 " +
  "text-[length:var(--text-base)] text-ink placeholder:text-neutral " +
  "transition-[color,box-shadow,border-color] duration-[var(--dur-micro)] outline-none " +
  "focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/30";

/** 고르는 칩(기분 등). 선택되면 파란 잉크로 채워진다. 높이는 다른 컨트롤과 같은 44px. */
export function chipClass(selected: boolean): string {
  return (
    "press cursor-pointer rounded-[var(--radius-pill)] border px-3 min-h-11 inline-flex items-center " +
    "text-[length:var(--text-sm)] whitespace-nowrap " +
    (selected
      ? "border-pen-a/70 bg-pen-a-soft text-pen-a-on font-medium"
      : "border-rule text-muted hover:border-neutral hover:text-ink")
  );
}

/** 카드 면 — 내용을 담는 유일한 컨테이너 스타일. */
export const cardClass = "rounded-[var(--radius-card)] border border-rule bg-paper-2 p-[var(--space-md)]";
