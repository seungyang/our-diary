import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { deleteWish } from "@/lib/actions";
import { pensFor } from "@/lib/pens-server";
import { WishForm } from "@/components/wish-form";
import { PageHead, SectionHead } from "@/components/page";
import { quietAction } from "@/components/styles";
import { EmptyState } from "@/components/ui";
import { SubBar } from "@/components/sub-bar";

export const dynamic = "force-dynamic";

export default async function WishPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const [wishes, pens] = await Promise.all([store.listWishes(conn.id), pensFor(session.uid, partner)]);
  const mine = wishes.filter((w) => w.owner === session.uid);
  const theirs = wishes.filter((w) => w.owner === partner);

  const Row = ({ w, canDelete }: { w: store.Wish; canDelete: boolean }) => (
    <li className="py-[var(--space-sm)] flex items-start gap-[var(--space-sm)]">
      <div className="flex-1 min-w-0">
        <p className="text-[length:var(--text-base)] text-ink flex items-center gap-1.5">
          {w.link ? (
            <a href={w.link} target="_blank" rel="noreferrer" className="underline decoration-[1.5px] underline-offset-4 decoration-pen-a/40 hover:decoration-pen-a text-pen-a inline-flex items-center gap-1">
              {w.title}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            w.title
          )}
        </p>
        {w.note ? <p className="text-[length:var(--text-sm)] text-neutral">{w.note}</p> : null}
      </div>
      {canDelete ? (
        <form action={deleteWish}>
          <input type="hidden" name="id" value={w.id} />
          <button type="submit" className={`${quietAction} hover:text-danger`}>지우기</button>
        </form>
      ) : null}
    </li>
  );

  return (
    <>
      <SubBar title="위시리스트" />
      <PageHead title="위시리스트" sub="서로 갖고 싶은 걸 적어두면, 선물 고를 때 덜 헤매요." />

      <section>
        <SectionHead>
          <span style={{ color: pens[partner] }}>{partner}</span>가 갖고 싶은 것
        </SectionHead>
        {theirs.length === 0 ? (
          <EmptyState title="아직 안 적었어요" body={`${partner}가 갖고 싶은 걸 적으면 여기 보여요.`} />
        ) : (
          <ul className="divide-y divide-rule-soft">
            {theirs.map((w) => <Row key={w.id} w={w} canDelete={false} />)}
          </ul>
        )}
      </section>

      <section className="space-y-[var(--space-md)]">
        <SectionHead>
          <span style={{ color: pens[session.uid] }}>나</span>는 이런 게 갖고 싶어
        </SectionHead>
        {mine.length > 0 ? (
          <ul className="divide-y divide-rule-soft">
            {mine.map((w) => <Row key={w.id} w={w} canDelete />)}
          </ul>
        ) : null}
        <WishForm />
      </section>
    </>
  );
}
