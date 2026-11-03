"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { savePen } from "@/lib/actions";
import { PENS, penOnVar, penSoftVar, penVar, type PenId } from "@/lib/pens";
import { Button, ErrorNote } from "./ui";

/** 내 펜 색 고르기. 고르고 저장하면 상대 화면에서도 그 색으로 보인다. */
export function PenPicker({ current }: { current: string }) {
  const [state, action, pending] = useActionState(savePen, undefined);
  const [pen, setPen] = useState<string>(current);

  return (
    <form action={action} className="space-y-[var(--space-md)]">
      <fieldset>
        <legend className="text-[length:var(--text-sm)] text-muted mb-[var(--space-sm)]">
          이름 앞의 점과 버튼·링크까지 이 색이 돼요
        </legend>
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {PENS.map((p) => {
            const on = pen === p.id;
            return (
              <label
                key={p.id}
                className="press flex flex-col items-center gap-1 cursor-pointer"
                title={p.label}
              >
                <input
                  type="radio"
                  name="pen"
                  value={p.id}
                  checked={on}
                  onChange={() => setPen(p.id as PenId)}
                  className="sr-only peer"
                />
                <span
                  aria-hidden="true"
                  className="size-11 rounded-full inline-flex items-center justify-center border ring-offset-2 ring-offset-paper peer-focus-visible:ring-2 peer-focus-visible:ring-focus"
                  style={{
                    background: penSoftVar(p.id),
                    color: penOnVar(p.id),
                    borderColor: on ? penVar(p.id) : "transparent",
                  }}
                >
                  {on ? <Check size={20} strokeWidth={2.5} /> : null}
                </span>
                <span
                  className={`text-[length:var(--text-xs)] ${on ? "text-ink font-medium" : "text-neutral"}`}
                >
                  {p.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Button type="submit" variant="quiet" full disabled={pending || pen === current}>
        {pending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Check size={16} strokeWidth={2} aria-hidden="true" />
        )}
        {pending ? "바꾸는 중" : state?.ok ? "바꿨어요" : "이 색으로"}
      </Button>
    </form>
  );
}
