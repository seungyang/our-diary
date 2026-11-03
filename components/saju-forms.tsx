"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { askSajuCatalog, askSajuFree, resetSajuConversation, saveSajuAnswer, saveSajuProfile, scoreSaju } from "@/lib/actions";
import { Button, ErrorNote, Field, chipClass, inputClass, quietAction } from "./ui";

/* ── 사주 정보 입력 ──
   줄 하나에 한 가지만 묻는다. 라벨 오른쪽에 딸린 선택지(양력·음력, 시간 모름)를 두어
   무엇을 눌러도 아래가 밀려 내려가지 않는다. 밑줄 칸에 숫자만 치면 알아서 정리된다. */

/** 라벨 줄에 붙는 작은 고르기 단추. */
function MiniPill({
  on, onClick, children, disabled = false, label,
}: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
      className={`press rounded-[var(--radius-pill)] px-3 min-h-9 text-[length:var(--text-sm)] cursor-pointer whitespace-nowrap border transition-colors duration-[var(--dur-micro)] ${
        on ? "border-transparent bg-pen-a text-paper font-medium" : "border-rule bg-paper text-neutral hover:text-ink"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

/** 라벨 + 오른쪽 선택지 + 밑줄 칸. */
function Line({
  label, right, children, hint,
}: { label: string; right?: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <section className="space-y-[var(--space-xs)]">
      <div className="flex items-center justify-between gap-[var(--space-sm)] min-h-9">
        <h3 className="text-[length:var(--text-sm)] text-neutral">{label}</h3>
        {right ? <div className="flex items-center gap-[var(--space-2xs)]">{right}</div> : null}
      </div>
      {children}
      {hint ? <p className="text-[length:var(--text-sm)] text-neutral min-h-5">{hint}</p> : null}
    </section>
  );
}

const underline =
  "w-full min-h-14 bg-transparent border-0 border-b border-rule px-0 " +
  "text-[length:var(--text-lg)] text-ink tnum placeholder:text-neutral placeholder:font-normal " +
  "focus:border-pen-a focus:outline-none focus-visible:outline-none " +
  "transition-colors duration-[var(--dur-micro)] disabled:opacity-40";

/** 숫자만 남겨 "1995.03.15"로. */
function fmtDateDigits(raw: string): { text: string; digits: string } {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const p: string[] = [digits.slice(0, 4)];
  if (digits.length > 4) p.push(digits.slice(4, 6));
  if (digits.length > 6) p.push(digits.slice(6, 8));
  return { text: p.join("."), digits };
}

/** 숫자만 남겨 "10:30"으로. */
function fmtTimeDigits(raw: string): { text: string; digits: string } {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return { text: digits, digits };
  return { text: `${digits.slice(0, 2)}:${digits.slice(2)}`, digits };
}

export function SajuProfileForm({
  initial,
}: {
  initial: { birthDate: string; birthTime: string | null; gender: "M" | "F"; calendar?: "solar" | "lunar"; lunarInput?: { date: string; leap: boolean } | null } | null;
}) {
  const [state, action, pending] = useActionState(saveSajuProfile, undefined);

  const initIso = initial ? (initial.calendar === "lunar" && initial.lunarInput ? initial.lunarInput.date : initial.birthDate) : "";
  const [dateDigits, setDateDigits] = useState(initIso.replace(/-/g, ""));
  const [calendar, setCalendar] = useState<"solar" | "lunar">(initial?.calendar ?? "solar");
  const [leap, setLeap] = useState(initial?.lunarInput?.leap ?? false);
  const [timeDigits, setTimeDigits] = useState(initial?.birthTime ? initial.birthTime.replace(":", "") : "");
  const [unknown, setUnknown] = useState(initial ? initial.birthTime === null : false);
  const [gender, setGender] = useState<"M" | "F" | "">(initial?.gender ?? "");

  const dateView = fmtDateDigits(dateDigits);
  const timeView = fmtTimeDigits(timeDigits);
  const dateOk = dateDigits.length === 8;
  const hh = Number(timeDigits.slice(0, 2));
  const mi = Number(timeDigits.slice(2, 4) || 0);
  const timeOk = timeDigits.length === 4 && hh <= 24 && mi <= 59;

  // 서버로 보내는 값은 말로 적은 형태 — 파서(lib/saju/parse.ts)가 읽는다.
  const dateText = dateOk ? `${dateDigits.slice(0, 4)}년 ${Number(dateDigits.slice(4, 6))}월 ${Number(dateDigits.slice(6, 8))}일` : "";
  const timeText = unknown ? "모름" : timeOk ? `${String(hh % 24).padStart(2, "0")}:${String(mi).padStart(2, "0")}` : "";
  const ready = dateOk && (unknown || timeOk) && Boolean(gender);

  const clock =
    unknown ? "시주 없이 봐요"
    : timeOk ? `${hh % 24 < 12 ? "오전" : "오후"} ${(hh % 12 === 0 ? 12 : hh % 12)}시${mi ? ` ${mi}분` : ""}`
    : timeDigits.length ? "네 자리로 적어요" : "예: 1030 → 10:30";

  return (
    <form action={action} className="space-y-[var(--space-xl)]">
      <input type="hidden" name="birthDateText" value={dateText} />
      <input type="hidden" name="birthTimeText" value={timeText} />
      <input type="hidden" name="calendar" value={calendar} />
      {leap && calendar === "lunar" ? <input type="hidden" name="leap" value="on" /> : null}

      <Line
        label="생년월일"
        right={
          <>
            <MiniPill on={calendar === "solar"} onClick={() => setCalendar("solar")}>양력</MiniPill>
            <MiniPill on={calendar === "lunar"} onClick={() => setCalendar("lunar")}>음력</MiniPill>
            <MiniPill on={leap && calendar === "lunar"} onClick={() => setLeap(!leap)} disabled={calendar !== "lunar"} label="윤달">윤달</MiniPill>
          </>
        }
        hint={dateOk ? dateText : "숫자 여덟 자리를 이어서 적어요. 예: 19950315"}
      >
        <input
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          value={dateView.text}
          onChange={(e) => setDateDigits(fmtDateDigits(e.target.value).digits)}
          placeholder="1995.03.15"
          aria-label="생년월일"
          aria-invalid={dateDigits.length > 0 && !dateOk}
          className={underline}
        />
      </Line>

      <Line
        label="태어난 시간"
        right={<MiniPill on={unknown} onClick={() => setUnknown(!unknown)}>시간 모름</MiniPill>}
        hint={clock}
      >
        <input
          inputMode="numeric"
          autoComplete="off"
          value={unknown ? "" : timeView.text}
          onChange={(e) => setTimeDigits(fmtTimeDigits(e.target.value).digits)}
          disabled={unknown}
          placeholder={unknown ? "모름" : "10:30"}
          aria-label="태어난 시간"
          aria-invalid={!unknown && timeDigits.length > 0 && !timeOk}
          className={underline}
        />
      </Line>

      <Line label="성별">
        <div className="grid grid-cols-2 gap-[var(--space-sm)]">
          {(["M", "F"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              aria-pressed={gender === g}
              className={`press flex items-center justify-center min-h-14 rounded-[var(--radius-card)] border text-[length:var(--text-md)] cursor-pointer transition-colors duration-[var(--dur-micro)] ${
                gender === g ? "border-transparent bg-pen-a text-paper font-medium" : "border-rule bg-paper text-ink hover:border-neutral"
              }`}
            >
              {g === "M" ? "남자" : "여자"}
            </button>
          ))}
        </div>
      </Line>
      <input type="hidden" name="gender" value={gender} />

      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Button type="submit" full disabled={pending || !ready} className="min-h-14 text-[length:var(--text-md)]">
        {pending ? "계산 중" : "사주 뽑기"}
      </Button>
      <p className="text-[length:var(--text-sm)] text-neutral -mt-[var(--space-md)]">
        그때 시계가 가리키던 시각이면 돼요. 서머타임과 30분 보정은 앱이 알아서 해요.
      </p>
    </form>
  );
}

/* ── 질문 복사 ── */
export function CopyPrompt({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state !== "done") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
      return;
    } catch {
      // 클립보드가 막힌 브라우저(사파리 일부, 앱 내 브라우저) — 직접 고르게 열어 준다
    }
    setState("failed");
    const box = boxRef.current;
    if (box) {
      box.closest("details")?.setAttribute("open", "");
      box.focus();
      box.select();
    }
  }

  return (
    <div className="space-y-[var(--space-sm)]">
      <Button type="button" full onClick={copy} aria-live="polite">
        {state === "done" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        {state === "done" ? "복사됐어요" : "질문 복사"}
      </Button>
      {state === "failed" ? (
        <p className="text-[length:var(--text-sm)] text-muted">
          이 브라우저에서는 자동 복사가 막혀 있어요. 아래 글이 이미 선택돼 있으니 길게 눌러 복사해 주세요.
        </p>
      ) : null}
      <details className="group">
        <summary className={`${quietAction} list-none`}>무엇이 복사되는지 보기</summary>
        <textarea
          ref={boxRef}
          readOnly
          value={text}
          rows={10}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} mt-[var(--space-xs)] font-mono text-[length:var(--text-xs)] leading-[var(--leading-snug)]`}
        />
      </details>
    </div>
  );
}

/* ── 세션 답 붙여넣기 ── */
export function AnswerForm({ threadId }: { threadId: number }) {
  const [state, action, pending] = useActionState(saveSajuAnswer, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-[var(--space-sm)]">
      <input type="hidden" name="threadId" value={threadId} />
      <Field label="Claude가 준 답" hint="받은 답을 통째로 붙여넣어요">
        <textarea name="answer" required rows={7} placeholder="여기에 붙여넣기 (Ctrl+V)" className={inputClass} />
      </Field>
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Button type="submit" variant="quiet" full disabled={pending}>
        {pending ? "저장 중" : "답 저장"}
      </Button>
    </form>
  );
}

/* ── 직접 묻기 — 같은 대화에 이어진다 ── */
export function AskForm({ api, partnerName, disabled }: { api: boolean; partnerName: string | null; disabled: boolean }) {
  const [state, action, pending] = useActionState(askSajuFree, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-[var(--space-sm)]">
      <Field label="직접 묻기" hint={disabled ? "앞 질문의 답을 먼저 붙여넣어요" : "예: 그 근거가 된 글자는 뭐예요? 반대로 볼 수는 없나요?"}>
        <textarea name="text" required rows={2} maxLength={1000} placeholder="궁금한 걸 그대로 적어요" className={inputClass} disabled={disabled} />
      </Field>
      {partnerName ? (
        <label className="flex items-center gap-2 text-[length:var(--text-sm)] text-muted cursor-pointer min-h-11">
          <input type="checkbox" name="withPartner" className="size-4 accent-[var(--color-pen-a)]" disabled={disabled} />
          {partnerName}의 사주도 같이 놓고 봐요
        </label>
      ) : null}
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Button type="submit" full disabled={pending || disabled}>
        {pending ? (api ? "답 받는 중" : "프롬프트 만드는 중") : "묻기"}
      </Button>
    </form>
  );
}

/* ── 준비된 질문 한 줄 ── */
export function CatalogButton({ itemId, text, disabled, note }: { itemId: string; text: string; disabled: boolean; note?: string }) {
  const [state, action, pending] = useActionState(askSajuCatalog, undefined);
  return (
    <form action={action} className="min-h-11">
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="press w-full text-left flex items-center gap-[var(--space-sm)] min-h-11 py-[var(--space-xs)] text-[length:var(--text-base)] text-ink cursor-pointer disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="flex-1">{text}</span>
        <span className="text-[length:var(--text-xs)] text-neutral whitespace-nowrap">{pending ? "묻는 중" : note ?? "묻기"}</span>
      </button>
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
    </form>
  );
}

/* ── 맞음/틀림 ── */
export function ScoreButtons({ threadId, turnId, score }: { threadId: number; turnId: number; score: 1 | -1 | null }) {
  return (
    <form action={scoreSaju} className="flex items-center gap-[var(--space-xs)]">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="turnId" value={turnId} />
      <span className="text-[length:var(--text-sm)] text-neutral mr-auto">맞았나요?</span>
      <button type="submit" name="score" value={score === 1 ? "" : "1"} className={chipClass(score === 1)} aria-pressed={score === 1}>
        맞아요
      </button>
      <button type="submit" name="score" value={score === -1 ? "" : "-1"} className={chipClass(score === -1)} aria-pressed={score === -1}>
        아니에요
      </button>
    </form>
  );
}

/* ── 대화 처음부터 다시 ── */
export function ResetConversationButton({ threadId, uid }: { threadId: number; uid: string }) {
  return (
    <form
      action={resetSajuConversation}
      onSubmit={() => {
        try {
          localStorage.removeItem(`saju:conv:${uid}`);
        } catch {
          // 저장소가 막혔으면 그냥 넘어간다
        }
      }}
      className="flex justify-end"
    >
      <input type="hidden" name="threadId" value={threadId} />
      <button type="submit" className={`${quietAction} hover:text-danger`}>대화 처음부터 다시</button>
    </form>
  );
}
