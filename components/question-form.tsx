"use client";

import { useActionState } from "react";
import { Check, Loader2, MessageCircleReply } from "lucide-react";
import { answerQuestion } from "@/lib/actions";
import { Button, ErrorNote, Textarea } from "./ui";

export function QuestionForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState(answerQuestion, undefined);

  return (
    <form action={action} className="space-y-[var(--space-sm)]">
      <Textarea
        id="answer-text"
        name="text"
        required
        maxLength={1000}
        rows={3}
        defaultValue={initial}
        placeholder="여기에 적어 주세요"
      />
      <Button type="submit" full disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : state?.ok ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <MessageCircleReply size={16} strokeWidth={2} aria-hidden="true" />}
        {pending ? "남기는 중" : state?.ok ? "남겼어요" : initial ? "답 고치기" : "답하기"}
      </Button>
      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
    </form>
  );
}
