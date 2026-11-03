import type { SajuThread } from "@/lib/store";
import { AnswerForm, CopyPrompt, ScoreButtons } from "./saju-forms";
import { ExternalLink } from "lucide-react";

/* 역술가와 주고받는 대화. 내 말은 파란 잉크, 온재의 말은 마른 장미. 첫 문답은 "기본 풀이"로 제목을 단다. */

function Bubble({ role, children }: { role: "me" | "reader"; children: React.ReactNode }) {
  const me = role === "me";
  return (
    <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[94%] rounded-[var(--radius-card)] px-[var(--space-md)] py-[var(--space-sm)] whitespace-pre-wrap text-[length:var(--text-base)] leading-[var(--leading-body)] text-ink ${
          me ? "bg-pen-a-wash rounded-br-[4px]" : "bg-pen-b-wash rounded-bl-[4px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function PendingBox({ thread }: { thread: SajuThread }) {
  const last = thread.turns.at(-1);
  if (last?.role !== "me") return null;
  return (
    <div className="rounded-[var(--radius-card)] border border-rule-soft bg-paper-2 p-[var(--space-md)] space-y-[var(--space-lg)]">
      <div>
        <p className="text-[length:var(--text-base)] text-ink">질문을 보내려면 세 단계가 필요해요</p>
        <p className="text-[length:var(--text-sm)] text-neutral mt-[var(--space-2xs)]">
          이 앱은 사주를 계산만 해요. 풀이는 Claude가 하고, 그 사이를 손으로 한 번 옮겨요.
        </p>
      </div>

      <Step n={1} title="질문 복사하기" body="위에서 만든 질문과 내 사주 여덟 글자가 한 덩어리로 복사돼요.">
        <CopyPrompt text={last.prompt ?? ""} />
      </Step>

      <Step n={2} title="Claude에 붙여넣고 답 받기" body="Claude를 열어 붙여넣기(Ctrl+V) 하면 풀이가 나와요. 그 답을 다시 복사해요.">
        <a
          href="https://claude.ai/new"
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center justify-center gap-2 w-full min-h-12 rounded-[var(--radius-pill)] border border-rule bg-paper text-ink text-[length:var(--text-sm)] font-medium"
        >
          Claude 열기
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </Step>

      <Step n={3} title="받은 답을 여기에 붙여넣기" body="붙여넣고 저장하면 위 대화에 이어져요. 그다음부터는 계속 되물을 수 있어요.">
        <AnswerForm threadId={thread.id} />
      </Step>
    </div>
  );
}

/** 번호가 붙은 단계 하나. */
function Step({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="space-y-[var(--space-sm)]">
      <div className="flex gap-[var(--space-sm)]">
        <span
          aria-hidden="true"
          className="shrink-0 size-6 rounded-full bg-pen-a text-paper text-[length:var(--text-sm)] font-medium flex items-center justify-center tnum"
        >
          {n}
        </span>
        <div className="min-w-0">
          <h4 className="text-[length:var(--text-base)] text-ink">
            <span className="sr-only">{n}단계. </span>
            {title}
          </h4>
          <p className="text-[length:var(--text-sm)] text-neutral">{body}</p>
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}

export function Conversation({ thread }: { thread: SajuThread }) {
  return (
    <ol className="space-y-[var(--space-sm)]">
      {thread.turns.map((t, i) => (
        <li key={t.id} className="space-y-[var(--space-2xs)]">
          {i === 0 ? (
            <p className="text-[length:var(--text-xs)] text-neutral text-right">기본 풀이 요청</p>
          ) : null}
          <Bubble role={t.role}>{t.text}</Bubble>
          {t.role === "reader" ? (
            <div className="pl-1">
              <ScoreButtons threadId={thread.id} turnId={t.id} score={t.score} />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
