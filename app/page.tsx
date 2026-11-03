import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { readSession } from "@/lib/session";
import { TwoPens } from "@/components/two-pens";
import { TextLink, TopBar } from "@/components/page";
import { LinkButton } from "@/components/ui";

export default async function Home() {
  if (await readSession()) redirect("/diary/bucket");

  return (
    <div className="min-h-dvh flex flex-col">
      {/* N1a — 갈 곳이 하나뿐인 페이지의 내비 */}
      <TopBar href={null} right={<TextLink href="/login">들어가기</TextLink>} />

      <main className="flex-1 px-5">
        <article className="mx-auto w-full max-w-[28rem] pt-[var(--space-2xl)] pb-[var(--space-3xl)]">
          <p className="text-[length:var(--text-sm)] text-neutral mb-[var(--space-md)]">
            밤 열한 시 사십 분
          </p>

          <h1 className="text-[length:var(--text-display)] text-ink mb-[var(--space-xl)]">
            오늘 뭐 했어?
            <br />
            묻기엔 둘 다 졸린 시간.
          </h1>

          <div className="space-y-[var(--space-lg)] text-[length:var(--text-md)] text-ink/90">
            <p>
              그래서 공책을 한 권 뒀습니다. 같은 날짜 아래에 각자 한 칸씩. 먼저
              잠든 쪽은 다음 날 아침에 읽으면 됩니다.
            </p>

            <TwoPens />

            <p>
              펜 색이 다릅니다. 파란 잉크와 마른 장미색. 이름을 읽지 않아도 누가
              썼는지 압니다.
            </p>
          </div>

          <div className="mt-[var(--space-2xl)]">
            <LinkButton href="/login" full><BookOpen size={16} strokeWidth={2} aria-hidden="true" />공책 펴기</LinkButton>
          </div>
        </article>
      </main>

      {/* Ft6 — 편지의 맺음 */}
      <footer className="px-5 pb-[var(--space-xl)]">
        <div className="mx-auto w-full max-w-[28rem] pt-[var(--space-lg)] border-t border-rule-soft">
          <p className="text-[length:var(--text-sm)] text-neutral">
            둘만 읽는 공책입니다. 연결된 두 사람만 열 수 있어요.
          </p>
        </div>
      </footer>
    </div>
  );
}
