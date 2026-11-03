import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { logout, removeRequest } from "@/lib/actions";
import { LinkButton } from "@/components/ui";
import { quietAction } from "@/components/styles";
import { penVar } from "@/lib/pens";
import { ThemeScope } from "@/components/theme-scope";
import { EnterCode, MakeCode } from "@/components/connect-code";
import { Page, PageHead, SectionHead, TopBar } from "@/components/page";

export const dynamic = "force-dynamic";

/**
 * 연결 화면. 누가 이 앱을 쓰는지는 절대 보여주지 않는다 —
 * 아는 사람끼리 6자리 코드를 주고받아 잇는다.
 */
export default async function ConnectPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const me = await store.getUser(session.uid);
  if (!me) redirect("/login");

  const connections = await store.listConnectionsFor(me.id);
  const accepted = connections.filter((c) => c.status === "accepted");
  const partnerOf = (c: store.Connection) => (c.requester === me.id ? c.addressee : c.requester);
  const partners = await Promise.all(accepted.map((c) => store.getUser(partnerOf(c))));
  const myCode = accepted.length > 0 ? null : await store.getInviteCode(me.id);

  return (
    <ThemeScope mine={me.pen} className="min-h-dvh">
      <TopBar
        href={null}
        right={
          <form action={logout}>
            <button type="submit" className={quietAction}>나가기</button>
          </form>
        }
      />
      <Page>
        {accepted.length > 0 ? (
          <>
            <PageHead title={`${me.name}, 한 권을 같이 쓰는 중`} sub="공책을 열면 오늘부터 이어집니다." />
            <section>
              <SectionHead>함께 쓰는 중</SectionHead>
              <ul className="divide-y divide-rule-soft">
                {accepted.map((c, i) => (
                  <li key={c.id} className="py-[var(--space-md)] space-y-[var(--space-sm)]">
                    <p className="flex items-center gap-[var(--space-xs)] text-[length:var(--text-base)] text-ink">
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full shrink-0"
                        style={{ background: penVar(partners[i]?.pen) }}
                      />
                      {partnerOf(c)}
                    </p>
                    <LinkButton href="/diary/bucket" full>
                      <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
                      공책 열기
                    </LinkButton>
                    {/* 끊기는 주 동작과 같은 무게로 두지 않는다 — 전폭 빨강 버튼이 공책 열기 바로 밑에 있으면 잘못 눌린다. */}
                    <form action={removeRequest} className="pt-[var(--space-xs)] text-right">
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className={`${quietAction} hover:text-danger`}>연결 끊기</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <>
            <PageHead title={`${me.name}, 누구와 쓸까요`} sub="둘 중 한 사람만 코드를 만들면 됩니다." />
            <section>
              <SectionHead>코드 만들기</SectionHead>
              <MakeCode code={myCode} />
            </section>
            <section>
              <SectionHead>코드 입력하기</SectionHead>
              <EnterCode />
            </section>
          </>
        )}
      </Page>
    </ThemeScope>
  );
}
