import type { SajuThread } from "@/lib/store";
import { SectionHead } from "./page";

/**
 * 규칙 버전별 정답률. 사용자가 누른 "맞아요/아니에요"만 센다.
 * 규칙(knowledge.ts)을 고치면 버전이 올라가고, 여기서 그 전후가 갈려 보인다.
 */

type Bucket = { version: string; good: number; bad: number; turns: number; threads: number };

export function accuracyByVersion(threads: SajuThread[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const t of threads) {
    const b = map.get(t.knowledgeVersion) ?? { version: t.knowledgeVersion, good: 0, bad: 0, turns: 0, threads: 0 };
    b.threads++;
    for (const turn of t.turns) {
      if (turn.role !== "reader") continue;
      b.turns++;
      if (turn.score === 1) b.good++;
      else if (turn.score === -1) b.bad++;
    }
    map.set(t.knowledgeVersion, b);
  }
  return [...map.values()].sort((a, b) => b.version.localeCompare(a.version));
}

function Bar({ good, bad }: { good: number; bad: number }) {
  const total = good + bad;
  if (!total) return <span className="text-[length:var(--text-sm)] text-neutral">판정 없음</span>;
  const pct = Math.round((good / total) * 100);
  return (
    <span className="flex items-center gap-[var(--space-sm)]">
      <span className="flex-1 h-2 rounded-[var(--radius-pill)] bg-paper-3 overflow-hidden min-w-16" aria-hidden="true">
        <span className="block h-full bg-pen-a" style={{ width: `${pct}%` }} />
      </span>
      <span className="tnum text-[length:var(--text-sm)] text-ink whitespace-nowrap">
        {good}/{total}
      </span>
    </span>
  );
}

export function AccuracyTable({ threads }: { threads: SajuThread[] }) {
  const rows = accuracyByVersion(threads);
  const scored = rows.reduce((n, r) => n + r.good + r.bad, 0);
  const answered = rows.reduce((n, r) => n + r.turns, 0);

  return (
    <section className="space-y-[var(--space-sm)]">
      <SectionHead>규칙 버전별 정답률</SectionHead>
      {scored === 0 ? (
        <p className="text-[length:var(--text-sm)] text-neutral">
          아직 판정이 없어요. 풀이 아래 &ldquo;맞아요 / 아니에요&rdquo;를 누르면 여기 쌓여요.
          {answered > 0 ? ` (판정을 기다리는 풀이 ${answered}개)` : ""}
        </p>
      ) : (
        <ul className="divide-y divide-rule-soft">
          {rows.map((r) => (
            <li key={r.version} className="py-[var(--space-sm)] space-y-[var(--space-2xs)]">
              <div className="flex items-baseline gap-[var(--space-sm)]">
                <span className="text-[length:var(--text-base)] text-ink tnum">v{r.version}</span>
                <span className="text-[length:var(--text-sm)] text-neutral tnum">
                  대화 {r.threads} · 풀이 {r.turns} · 판정 {r.good + r.bad}
                </span>
              </div>
              <Bar good={r.good} bad={r.bad} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[length:var(--text-xs)] text-neutral">
        막대는 판정된 풀이 중 &ldquo;맞아요&rdquo; 비율이에요. 규칙을 고치면 버전이 올라가고 줄이 새로 생겨요.
      </p>
    </section>
  );
}
