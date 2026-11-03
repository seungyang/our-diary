import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, Gift, MapPinned, Settings2, Sparkles } from "lucide-react";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { PageHead, SectionHead } from "@/components/page";

export const dynamic = "force-dynamic";

const LINKS: Array<{ href: string; label: string; Icon: typeof Sparkles; soon?: boolean }> = [
  { href: "/diary/places", label: "함께 간 곳", Icon: MapPinned },
  { href: "/diary/wish", label: "위시리스트", Icon: Gift },
  { href: "/diary/saju", label: "사주 풀이", Icon: Sparkles, soon: true },
  { href: "/diary/calendar", label: "달력", Icon: CalendarDays },
  { href: "/diary/settings", label: "설정", Icon: Settings2 },
];

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

export default async function MorePage() {
  const session = await readSession();
  if (!session) redirect("/login");

  // 이 화면을 연 것 자체가 '읽음'이다.
  const notices = await store.listNotices(session.uid);
  await store.markAllRead(session.uid);

  return (
    <>
      <PageHead title="더보기" />

      <nav aria-label="다른 화면">
        <ul className="divide-y divide-rule-soft">
          {LINKS.map(({ href, label, Icon, soon }) => (
            <li key={href}>
              <Link href={href} className="press flex items-center gap-[var(--space-sm)] min-h-14 text-ink">
                <Icon size={22} strokeWidth={1.75} className="text-muted" aria-hidden="true" />
                <span className="flex-1 text-[length:var(--text-base)]">{label}</span>
                {soon ? <span className="text-[length:var(--text-xs)] text-neutral whitespace-nowrap">준비중</span> : null}
                <ChevronRight size={18} className="text-rule" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section>
        <SectionHead>알림</SectionHead>
        {notices.length === 0 ? (
          <p className="text-[length:var(--text-base)] text-neutral">아직 없어요.</p>
        ) : (
          <ul className="divide-y divide-rule-soft">
            {notices.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="press flex items-start gap-[var(--space-sm)] py-[var(--space-sm)]">
                  <span
                    aria-hidden="true"
                    className={`mt-[9px] size-2 rounded-full shrink-0 ${n.readAt ? "bg-rule" : "bg-pen-b"}`}
                  />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[length:var(--text-base)] ${n.readAt ? "text-muted" : "text-ink"}`}>{n.text}</span>
                    <span className="block text-[length:var(--text-sm)] text-neutral tnum">{ago(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pt-[var(--space-lg)] border-t border-rule-soft">
        <SectionHead>홈 화면에 두기</SectionHead>
        <p className="text-[length:var(--text-base)] text-muted">
          한 번 추가해 두면 앱처럼 열립니다.
        </p>
        <dl className="mt-[var(--space-sm)] space-y-[var(--space-sm)]">
          <div className="flex items-baseline gap-[var(--space-sm)]">
            <dt className="w-16 shrink-0 text-[length:var(--text-sm)] text-neutral">아이폰</dt>
            <dd className="flex-1 text-[length:var(--text-base)] text-ink">
              Safari 공유 버튼 → 홈 화면에 추가
            </dd>
          </div>
          <div className="flex items-baseline gap-[var(--space-sm)]">
            <dt className="w-16 shrink-0 text-[length:var(--text-sm)] text-neutral">안드로이드</dt>
            <dd className="flex-1 text-[length:var(--text-base)] text-ink">
              Chrome 메뉴 → 홈 화면에 추가
            </dd>
          </div>
        </dl>
        <p className="mt-[var(--space-md)] text-[length:var(--text-sm)] text-neutral">
          상대가 뭘 남기면 이 화면 알림에 쌓이고, 아래 더보기 탭에 점이 붙어요.
        </p>
      </section>
    </>
  );
}
