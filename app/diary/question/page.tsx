import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { humanDate, today } from "@/lib/date";
import { QUESTIONS, questionFor } from "@/lib/questions";
import { pensFor } from "@/lib/pens-server";
import { QuestionForm } from "@/components/question-form";
import { PageHead, SectionHead } from "@/components/page";
import { cardClass } from "@/components/styles";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function QuestionPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const now = today();
  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const q = questionFor(now);
  const [todays, past, pens] = await Promise.all([
    store.listAnswers(conn.id, now),
    store.listAnsweredDays(conn.id),
    pensFor(session.uid, partner),
  ]);
  const mine = todays.find((a) => a.uid === session.uid);
  const theirs = todays.find((a) => a.uid === partner);
  const revealed = Boolean(mine && theirs);

  return (
    <>
      <PageHead title="오늘의 질문" sub={humanDate(now)} />

      <section className={cardClass}>
        <p className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] leading-[var(--leading-snug)] text-ink">
          {q.text}
        </p>

        <div className="mt-[var(--space-md)] pt-[var(--space-md)] border-t border-rule-soft space-y-[var(--space-md)]">
          <div>
            <label htmlFor="answer-text" className="block w-fit text-[length:var(--text-sm)] font-medium mb-[var(--space-xs)] cursor-pointer" style={{ color: pens[session.uid] }}>나</label>
            <QuestionForm initial={mine?.text ?? ""} />
          </div>

          <div>
            <p className="text-[length:var(--text-sm)] font-medium mb-[var(--space-xs)]" style={{ color: pens[partner] }}>{partner}</p>
            {revealed ? (
              <p className="text-[length:var(--text-base)] leading-[var(--leading-body)] text-ink whitespace-pre-wrap">
                {theirs?.text}
              </p>
            ) : theirs ? (
              <p className="text-[length:var(--text-base)] text-neutral">
                {partner}는 답했어요. 내 답을 남기면 보여요.
              </p>
            ) : (
              <p className="text-[length:var(--text-base)] text-neutral">아직 안 썼어요.</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHead>지난 질문</SectionHead>
        {past.filter((d) => d.askedOn !== now).length === 0 ? (
          <EmptyState title="둘 다 답한 날이 아직 없어요" body="오늘 질문에 둘 다 답하면 그날부터 여기 쌓입니다." />
        ) : (
          <ul className="divide-y divide-rule-soft">
            {past
              .filter((d) => d.askedOn !== now)
              .map((d) => (
                <li key={d.askedOn} className="py-[var(--space-md)] space-y-[var(--space-xs)]">
                  <p className="text-[length:var(--text-sm)] text-neutral tnum">{humanDate(d.askedOn, now)}</p>
                  <p className="font-[family-name:var(--font-display)] text-[length:var(--text-base)] text-ink">
                    {QUESTIONS[d.questionIndex]}
                  </p>
                  {d.answers.map((a) => (
                    <p key={a.id} className="text-[length:var(--text-base)] leading-[var(--leading-body)] text-ink flex gap-2">
                      <span
                        className="shrink-0 text-[length:var(--text-sm)] font-medium"
                        style={{ color: pens[a.uid] ?? pens[session.uid] }}
                      >
                        {a.uid}
                      </span>
                      <span className="min-w-0 whitespace-pre-wrap">{a.text}</span>
                    </p>
                  ))}
                </li>
              ))}
          </ul>
        )}
      </section>
    </>
  );
}
