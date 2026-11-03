/**
 * 페이지에 단 하나 있는 "기억에 남는 것".
 * 두 줄의 손글씨 — 파란 잉크 한 줄, 마른 장미색 한 줄.
 * 로드될 때 한 번 그어지고 끝. 이 페이지의 유일한 모션이다.
 */
export function TwoPens() {
  return (
    <figure className="my-[var(--space-xl)]" aria-hidden="true">
      <svg
        viewBox="0 0 420 96"
        className="w-full h-auto max-w-full"
        fill="none"
        strokeLinecap="round"
        strokeWidth="2.25"
      >
        <path
          className="pen-stroke pen-stroke--a"
          d="M8 36 C 40 14, 62 58, 96 36 S 150 10, 182 38 S 232 62, 268 32 S 322 12, 356 40"
          stroke="var(--color-pen-a)"
          pathLength={1}
        />
        <path
          className="pen-stroke pen-stroke--b"
          d="M18 72 C 54 52, 76 92, 114 68 S 170 46, 206 74 S 260 92, 298 66 S 350 50, 402 74"
          stroke="var(--color-pen-b)"
          pathLength={1}
        />
      </svg>
    </figure>
  );
}
