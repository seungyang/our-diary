"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import { clearMyCode, connectByCode, createMyCode } from "@/lib/actions";
import { CODE_LENGTH } from "@/lib/invite-code";
import { Button, ErrorNote, Input } from "./ui";
import { cardClass, pairRow, quietAction } from "./styles";

/**
 * 연결하는 두 가지 길. 왼쪽 오른쪽이 아니라 위아래로 둔다 — 폰에서 한 손으로 읽는다.
 * 위: 내 코드를 만들어 상대에게 알려준다. 아래: 상대가 준 코드를 적는다.
 */

export function MakeCode({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code ?? "");
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드를 막아 둔 브라우저 — 코드는 화면에 크게 떠 있으니 눈으로 읽어 적으면 된다.
      setCopied(false);
    }
  }

  if (!code) {
    return (
      <div className={`${cardClass} space-y-[var(--space-sm)]`}>
        <p className="text-[length:var(--text-sm)] text-muted">
          코드를 만들어 상대에게 알려주세요. 상대가 적으면 바로 이어집니다.
        </p>
        <form action={createMyCode}>
          <Button type="submit" full>
            <Link2 size={16} strokeWidth={2} aria-hidden="true" />
            코드 만들기
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={`${cardClass} space-y-[var(--space-sm)]`}>
      <p
        className="text-center font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] text-pen-a tabular-nums select-all"
        style={{ letterSpacing: "0.22em", textIndent: "0.22em" }}
        aria-label={`내 코드 ${[...code].join(" ")}`}
      >
        {code}
      </p>
      <p className="text-[length:var(--text-sm)] text-muted">
        이 코드를 상대에게 알려주세요. 한 번 쓰면 사라집니다.
      </p>
      <div className={pairRow}>
        <Button type="button" variant="quiet" full onClick={copy} aria-live="polite">
          {copied ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <Copy size={16} strokeWidth={2} aria-hidden="true" />}
          {copied ? "복사했어요" : "복사하기"}
        </Button>
        <form action={createMyCode}>
          <Button type="submit" variant="quiet" full>
            <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
            새로 만들기
          </Button>
        </form>
      </div>
      <form action={clearMyCode} className="text-center">
        <button type="submit" className={quietAction}>코드 없애기</button>
      </form>
    </div>
  );
}

export function EnterCode() {
  const [state, action, pending] = useActionState(connectByCode, undefined);

  return (
    <form action={action} className={`${cardClass} space-y-[var(--space-sm)]`}>
      <p className="text-[length:var(--text-sm)] text-muted">상대에게 받은 코드를 적으세요.</p>
      <Input
        name="code"
        required
        maxLength={CODE_LENGTH + 2}
        placeholder={"".padStart(CODE_LENGTH, "·")}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        aria-label="상대에게 받은 코드"
        className="text-center uppercase"
        style={{ letterSpacing: "0.22em", textIndent: "0.22em" }}
      />
      <ErrorNote>{state?.error}</ErrorNote>
      <Button type="submit" full disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Link2 size={16} strokeWidth={2} aria-hidden="true" />}
        {pending ? "잇는 중" : "코드 입력하기"}
      </Button>
    </form>
  );
}
