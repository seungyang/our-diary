import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { computeChart, pillarText } from "@/lib/saju/manse";

import { Page, PageHead, SectionHead, TopBar } from "@/components/page";
import { AccuracyTable } from "@/components/saju-stats";

export const dynamic = "force-dynamic";

/* 관리자 전용 — 모든 사람의 사주 입력과 문답 이력. 연결(커플) 여부와 무관하게 본다. */
export default async function SajuAdminPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const me = await store.getUser(session.uid);
  if (!me?.isAdmin) redirect("/diary");

  const profiles = await store.listSajuProfiles();
  const threads = await store.listAllSajuThreads();
  const byUser = new Map<string, store.SajuThread[]>();
  for (const t of threads) byUser.set(t.uid, [...(byUser.get(t.uid) ?? []), t]);
  const uids = [...new Set([...profiles.map((p) => p.uid), ...threads.map((t) => t.uid)])];
  const totalTurns = threads.reduce((n, t) => n + t.turns.length, 0);
  const scored = threads.flatMap((t) => t.turns).filter((x) => x.score !== null);
  const good = scored.filter((x) => x.score === 1).length;

  return (
    <div className="min-h-dvh">
      <TopBar title="사주 문답 이력" href="/diary/more" />
      <Page>
        <PageHead
          title="사주 문답 이력"
          sub={`사람 ${uids.length} · 문답 ${threads.length} · 턴 ${totalTurns} · 판정 ${scored.length}건 중 맞음 ${good}`}
        />
        {store.isMock ? (
          <p className="text-[length:var(--text-sm)] text-neutral">
            지금은 목업(서버 메모리)이라 서버가 새로 뜨면 비어요. DATABASE_URL을 붙이면 전부 남아요.
          </p>
        ) : null}

        <AccuracyTable threads={threads} />

        {uids.length === 0 ? <p className="text-[length:var(--text-base)] text-neutral">아직 아무도 사주를 뽑지 않았어요.</p> : null}

        {uids.map((uid) => {
          const p = profiles.find((x) => x.uid === uid);
          const chart = p ? computeChart({ date: p.birthDate, time: p.birthTime, gender: p.gender }) : null;
          const mine = byUser.get(uid) ?? [];
          return (
            <section key={uid} className="space-y-[var(--space-md)]">
              <SectionHead>{uid}</SectionHead>
              {p && chart ? (
                <p className="text-[length:var(--text-sm)] text-muted tnum">
                  {p.birthDate} {p.birthTime ?? "시간 미상"} · {p.gender === "M" ? "남" : "여"} ·{" "}
                  {[chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour].map((x) => (x ? pillarText(x) : "미상")).join(" ")} ·{" "}
                  {chart.strength.verdict}
                </p>
              ) : (
                <p className="text-[length:var(--text-sm)] text-neutral">사주 입력 없음(쿠키에만 있을 수 있음)</p>
              )}
              {mine.length === 0 ? <p className="text-[length:var(--text-sm)] text-neutral">문답 없음</p> : null}
              {mine.map((t) => {
                return (
                  <details key={t.id} className="rounded-[var(--radius-card)] border border-rule-soft bg-paper-2">
                    <summary className="press cursor-pointer list-none min-h-11 px-[var(--space-md)] flex items-center gap-[var(--space-sm)] text-[length:var(--text-base)] text-ink [&::-webkit-details-marker]:hidden">
                      <span className="flex-1 min-w-0 truncate">{t.questionId === "main" ? "사주 상담" : t.title}</span>
                      <span className="text-[length:var(--text-xs)] text-neutral tnum whitespace-nowrap">
                        턴 {t.turns.length} · v{t.knowledgeVersion} · {t.updatedAt.slice(0, 16).replace("T", " ")}
                      </span>
                    </summary>
                    <ol className="px-[var(--space-md)] pb-[var(--space-md)] space-y-[var(--space-sm)]">
                      {t.turns.map((x) => (
                        <li key={x.id} className="text-[length:var(--text-sm)] leading-[var(--leading-body)]">
                          <div className="text-neutral tnum">
                            {x.role === "me" ? "손님" : "온재"} · {x.createdAt.slice(0, 16).replace("T", " ")}
                            {x.source ? ` · ${x.source}${x.model ? ` ${x.model}` : ""}` : ""}
                            {x.score !== null ? ` · ${x.score === 1 ? "맞음" : "틀림"}` : ""}
                          </div>
                          <div className="whitespace-pre-wrap text-ink">{x.text}</div>
                          {x.prompt ? (
                            <details className="mt-[var(--space-2xs)]">
                              <summary className="cursor-pointer text-neutral text-[length:var(--text-xs)]">보낸 프롬프트 전문</summary>
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[length:var(--text-xs)] text-muted">{x.prompt}</pre>
                            </details>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </details>
                );
              })}
            </section>
          );
        })}
      </Page>
    </div>
  );
}
