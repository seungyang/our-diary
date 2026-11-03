"use client";

import { useActionState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { login } from "@/lib/actions";
import { Button, ErrorNote, Field, Input } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-[var(--space-md)]">
      <Field label="아이디">
        <Input name="id" required maxLength={30} autoComplete="username" autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field label="비밀번호">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>

      <ErrorNote>{state?.error}</ErrorNote>

      <div className="pt-[var(--space-xs)]">
        <Button type="submit" full disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <BookOpen size={16} strokeWidth={2} aria-hidden="true" />}
          {pending ? "여는 중" : "들어가기"}
        </Button>
      </div>
    </form>
  );
}
