import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { daysTogether, daysUntil, humanDate, relativeDate, today } from "@/lib/date";
import { pensFor } from "@/lib/pens-server";
import { Composer } from "@/components/composer";
import { EntryItem } from "@/components/entry-item";
import { PageHead } from "@/components/page";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const [entries, milestones] = await Promise.all([
    store.listEntries(conn.id, 60),
    store.listMilestones(conn.id),
  ]);

  const now = today();
  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  // 내가 파란 잉크, 상대가 마른 장미. 누가 보든 '나'는 파란색이다.
  const pens = await pensFor(session.uid, partner);

  const days: { date: string; entries: store.Entry[] }[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last?.date === entry.wroteOn) last.entries.push(entry);
    else days.push({ date: entry.wroteOn, entries: [entry] });
  }

  const soonest = milestones
    .map((m) => ({ ...m, left: daysUntil(m.onDate, m.yearly, now) }))
    .filter((m) => m.left >= 0)
    .sort((a, b) => a.left - b.left)[0];

  return (
    <>
      <div className="reveal" style={{ "--i": 0 } as React.CSSProperties}>
        <PageHead
          title={humanDate(now)}
          sub={
            <>
          {conn.metOn ? (
            <>함께 {daysTogether(conn.metOn, now).toLocaleString("ko-KR")}일째</>
          ) : (
            <>{session.uid}와 {partner}의 공책</>
          )}
          {soonest ? (
            <>
              {" · "}
              {soonest.left === 0 ? `오늘은 ${soonest.label}` : `${soonest.label}까지 ${soonest.left}일`}
            </>
          ) : null}
            </>
          }
        />
      </div>

      <div className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
        <Composer today={now} />
      </div>

      <section className="reveal space-y-[var(--space-xl)]" style={{ "--i": 2 } as React.CSSProperties}>
        <h2 className="sr-only">지난 기록</h2>

        {days.length === 0 ? (
          <EmptyState title="아직 한 줄도 없어요" body="위 칸에 오늘 있었던 일을 한 줄만 적어 보세요. 상대는 내일 아침에 읽습니다." />
        ) : (
          days.map(({ date, entries: dayEntries }) => {
            const nickname = relativeDate(date, now);
            return (
              <section key={date}>
                <h3 className="pb-[var(--space-xs)] mb-[var(--space-sm)] border-b border-rule-soft text-[length:var(--text-sm)] text-neutral">
                  <span className="font-[family-name:var(--font-display)] text-[length:var(--text-base)] text-muted">
                    {nickname ?? humanDate(date, now)}
                  </span>
                  {nickname ? <span className="ml-2 tnum">{humanDate(date, now)}</span> : null}
                </h3>
                <div className="space-y-[var(--space-md)]">
                  {dayEntries.map((entry) => (
                    <EntryItem
                      key={entry.id}
                      entry={entry}
                      mine={entry.author === session.uid}
                      pen={pens[entry.author] ?? pens[session.uid]}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </section>
    </>
  );
}
