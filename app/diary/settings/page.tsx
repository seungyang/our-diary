import { redirect } from "next/navigation";
import { LogOut, Users } from "lucide-react";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { deleteMilestone, logout } from "@/lib/actions";
import { humanDate, today } from "@/lib/date";
import { MetOnForm, MilestoneForm } from "@/components/settings-forms";
import { PenPicker } from "@/components/pen-picker";
import { DEFAULT_PEN } from "@/lib/pens";
import { PageHead, SectionHead } from "@/components/page";
import { Button, LinkButton, quietAction } from "@/components/ui";
import { pairRow } from "@/components/styles";
import { SubBar } from "@/components/sub-bar";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const [milestones, me] = await Promise.all([store.listMilestones(conn.id), store.getUser(session.uid)]);
  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const now = today();

  return (
    <>
      <SubBar title="설정" />
      <PageHead title="설정" sub={`${session.uid}와 ${partner}의 공책`} />

      <section>
        <SectionHead>내 테마 색</SectionHead>
        <PenPicker current={me?.pen ?? DEFAULT_PEN} />
      </section>

      <section>
        <SectionHead>처음 만난 날</SectionHead>
        <MetOnForm metOn={conn.metOn} />
      </section>

      <section className="space-y-[var(--space-md)]">
        <SectionHead>기념일</SectionHead>
        {milestones.length === 0 ? (
          <p className="text-[length:var(--text-base)] text-neutral">아직 없어요. 아래에 하나 적어보세요.</p>
        ) : (
          <ul className="divide-y divide-rule-soft">
            {milestones.map((ms) => (
              <li key={ms.id} className="py-[var(--space-sm)] flex items-center gap-[var(--space-sm)]">
                <div className="flex-1 min-w-0">
                  <p className="text-[length:var(--text-base)] text-ink truncate">{ms.label}</p>
                  <p className="text-[length:var(--text-sm)] text-neutral tnum">
                    {humanDate(ms.onDate, now)}
                    {ms.yearly ? " · 해마다" : ""}
                  </p>
                </div>
                <form action={deleteMilestone}>
                  <input type="hidden" name="id" value={ms.id} />
                  <button type="submit" className={`${quietAction} hover:text-danger`}>지우기</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <MilestoneForm />
      </section>

      <section className={`pt-[var(--space-lg)] border-t border-rule-soft ${pairRow}`}>
        <LinkButton href="/connect" variant="quiet" full><Users size={16} strokeWidth={2} aria-hidden="true" />연결 관리</LinkButton>
        <form action={logout}>
          <Button type="submit" variant="quiet" full><LogOut size={16} strokeWidth={2} aria-hidden="true" />나가기</Button>
        </form>
      </section>
    </>
  );
}
