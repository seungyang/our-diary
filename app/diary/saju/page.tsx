import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { PageHead, TextLink } from "@/components/page";
import { SubBar } from "@/components/sub-bar";

/**
 * 준비중 화면.
 *
 * 만들어 둔 것(만세력 엔진·지식창고·문답)은 그대로 있다 — `_page-full.tsx.txt`가 예전 화면이고,
 * `lib/saju/*`도 손대지 않았다. 다시 열 때 이 파일만 되돌리면 된다.
 */
export const dynamic = "force-dynamic";

export default async function SajuPage() {
  const session = await readSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-[var(--space-xl)]">
      <SubBar title="사주 풀이" />
      <PageHead title="사주 풀이" sub="준비중이에요" />

      <section className="rounded-[var(--radius-card)] border border-rule-soft bg-paper-2 p-[var(--space-lg)] space-y-[var(--space-sm)]">
        <p className="text-[length:var(--text-base)] leading-[var(--leading-body)] text-ink">
          생년월일로 사주를 뽑고 풀이까지 받는 기능을 만들고 있어요. 아직 원하는 만큼 나오지 않아서 잠시 닫아 뒀어요.
        </p>
        <p className="text-[length:var(--text-base)] leading-[var(--leading-body)] text-muted">
          준비되면 이 자리에 열어 둘게요.
        </p>
      </section>

      <p className="text-[length:var(--text-sm)]">
        <TextLink href="/diary/more">다른 기능 보러 가기</TextLink>
      </p>
    </div>
  );
}
