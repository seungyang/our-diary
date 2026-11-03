import type { ReactNode } from "react";
import { penHue, penOnVar, penSoftVar, penVar, penWashVar } from "@/lib/pens";

/**
 * 고른 색이 페이지 전체의 톤이 된다.
 *
 * 강조색(버튼·링크·점)만 바꾸는 게 아니라 종이·카드·선·글자까지 같은 색상각으로 물들인다.
 * 채도는 아주 낮게 둔다 — 종이는 "그 색 기운이 도는 흰색"이지 색면이 아니다.
 *
 * `<style>`로 `:root`를 덮어쓰므로 html 배경(스크롤 바운스 영역)까지 따라온다.
 * 라이트·다크를 둘 다 적어야 다크 모드가 깨지지 않는다.
 */

/** 종이~선까지, 밝기는 고정하고 색상각만 갈아 끼운다. */
function surfaces(h: number, dark: boolean): string {
  return dark
    ? `--color-paper:oklch(16% 0.014 ${h});
    --color-paper-2:oklch(20% 0.018 ${h});
    --color-paper-3:oklch(24% 0.022 ${h});
    --color-rule:oklch(33% 0.024 ${h});
    --color-rule-soft:oklch(26% 0.02 ${h});
    --color-neutral:oklch(72% 0.022 ${h});
    --color-muted:oklch(83% 0.016 ${h});
    --color-ink:oklch(95% 0.012 ${h});`
    : `--color-paper:oklch(99.1% 0.004 ${h});
    --color-paper-2:oklch(96.2% 0.012 ${h});
    --color-paper-3:oklch(92.4% 0.02 ${h});
    --color-rule:oklch(85.5% 0.028 ${h});
    --color-rule-soft:oklch(92.2% 0.018 ${h});
    --color-neutral:oklch(46% 0.024 ${h});
    --color-muted:oklch(36% 0.026 ${h});
    --color-ink:oklch(22% 0.022 ${h});`;
}

function accents(mine: string | null | undefined, theirs: string | null | undefined): string {
  const b = theirs
    ? `--color-pen-b:${penVar(theirs)};
    --color-pen-b-soft:${penSoftVar(theirs)};
    --color-pen-b-on:${penOnVar(theirs)};
    --color-pen-b-wash:${penWashVar(theirs)};`
    : "";
  return `--color-pen-a:${penVar(mine)};
    --color-pen-a-soft:${penSoftVar(mine)};
    --color-pen-a-on:${penOnVar(mine)};
    --color-pen-a-wash:${penWashVar(mine)};
    --color-focus:${penVar(mine)};
    ${b}`;
}

export function ThemeScope({
  mine,
  theirs,
  className = "",
  children,
}: {
  mine: string | null | undefined;
  theirs?: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const h = penHue(mine);
  const css = `:root{
    ${surfaces(h, false)}
    ${accents(mine, theirs)}
  }
  @media (prefers-color-scheme: dark){:root{
    ${surfaces(h, true)}
  }}`;

  return (
    <div className={className}>
      <style>{css}</style>
      {children}
    </div>
  );
}
