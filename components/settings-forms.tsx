"use client";

import { useActionState, useEffect, useRef } from "react";
import { CalendarHeart, Check, Loader2 } from "lucide-react";
import { addMilestone, saveMetOn } from "@/lib/actions";
import { Button, ErrorNote, Field, Input, cardClass } from "./ui";
import { DateField } from "./date-field";

export function MetOnForm({ metOn }: { metOn: string | null }) {
  const [state, action, pending] = useActionState(saveMetOn, undefined);

  return (
    <form action={action} className={`${cardClass} space-y-[var(--space-md)]`}>
      <Field label="날짜" hint="비우면 며칠째인지 세지 않아요">
        <DateField name="metOn" defaultValue={metOn ?? ""} max={undefined} />
      </Field>
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Button type="submit" variant="quiet" full disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} strokeWidth={2} aria-hidden="true" />}
        {pending ? "저장 중" : state?.ok ? "저장됨" : "저장"}
      </Button>
    </form>
  );
}

export function MilestoneForm() {
  const [state, action, pending] = useActionState(addMilestone, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className={`${cardClass} space-y-[var(--space-md)]`}>
      <Field label="무슨 날">
        <Input name="label" required maxLength={40} placeholder="예: 100일" />
      </Field>
      <Field label="언제">
        <DateField name="onDate" required />
      </Field>
      <label className="flex items-center gap-2 text-[length:var(--text-sm)] text-muted cursor-pointer min-h-11">
        <input type="checkbox" name="yearly" className="size-4 accent-[var(--color-pen-a)]" />
        해마다 돌아와요
      </label>
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Button type="submit" variant="quiet" full disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CalendarHeart size={16} strokeWidth={2} aria-hidden="true" />}
        {pending ? "적는 중" : "기념일 적기"}
      </Button>
    </form>
  );
}
