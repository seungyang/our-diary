"use client";

import { useActionState, useEffect, useRef } from "react";
import { Gift, Loader2 } from "lucide-react";
import { addWish } from "@/lib/actions";
import { Button, ErrorNote, Field, Input, cardClass } from "./ui";

export function WishForm() {
  const [state, action, pending] = useActionState(addWish, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className={`${cardClass} space-y-[var(--space-md)]`}>
      <Field label="갖고 싶은 것">
        <Input name="title" required maxLength={60} placeholder="예: 무선 헤드폰" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-md)]">
        <Field label="링크" hint="비워도 돼요">
          <Input name="link" type="url" inputMode="url" placeholder="https://" />
        </Field>
        <Field label="한 줄">
          <Input name="note" maxLength={80} placeholder="색, 사이즈 같은 거" />
        </Field>
      </div>
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <Button type="submit" full disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Gift size={16} strokeWidth={2} aria-hidden="true" />}
        {pending ? "적는 중" : "위시에 넣기"}
      </Button>
    </form>
  );
}
