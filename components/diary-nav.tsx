"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, ListChecks, Menu, MessageCircleQuestion, PenLine } from "lucide-react";

/* 탭은 다섯 개까지만. 나머지는 '더보기' 안에 산다. */
const LINKS = [
  { href: "/diary/bucket", label: "버킷", Icon: ListChecks, match: ["/diary/bucket"] },
  { href: "/diary", label: "오늘", Icon: PenLine, match: ["/diary"] },
  { href: "/diary/question", label: "질문", Icon: MessageCircleQuestion, match: ["/diary/question"] },
  { href: "/diary/album", label: "앨범", Icon: Images, match: ["/diary/album"] },
  {
    href: "/diary/more",
    label: "더보기",
    Icon: Menu,
    match: ["/diary/more", "/diary/places", "/diary/wish", "/diary/calendar", "/diary/settings", "/diary/saju"],
  },
];

export function DiaryTabs({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 화면"
      className="fixed bottom-0 inset-x-0 z-10 bg-paper/95 backdrop-blur-sm border-t border-rule-soft pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-[28rem] flex">
        {LINKS.map(({ href, label, Icon, match }) => {
          // '/diary'는 정확히 일치할 때만. 나머지는 하위 경로(/diary/saju/…)도 같은 탭이다.
          const active = match.some((m) => pathname === m || (m !== "/diary" && pathname.startsWith(m + "/")));
          const badge = href === "/diary/more" && unread > 0;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${label}, 새 알림 ${unread}개` : undefined}
              className={`press relative flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[length:var(--text-xs)] whitespace-nowrap ${
                active ? "text-pen-a font-medium" : "text-neutral"
              }`}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                {badge ? (
                  <span aria-hidden="true" className="absolute -top-0.5 -right-1 size-2 rounded-full bg-pen-b ring-2 ring-paper" />
                ) : null}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
