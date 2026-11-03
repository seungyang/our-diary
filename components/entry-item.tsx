"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { deleteEntry, saveEntry } from "@/lib/actions";
import { MOODS } from "@/lib/date";
import type { Entry } from "@/lib/store";
import { Button, ErrorNote, Textarea, chipClass, pairRow, quietAction } from "./ui";
import { PhotoFrame } from "./photo-frame";

export function EntryItem({ entry, mine, pen }: { entry: Entry; mine: boolean; pen: string }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const penVar = pen;

  return (
    <article>
      <div className="flex items-center gap-[var(--space-xs)] flex-wrap">
        <span aria-hidden="true" className="size-2 rounded-full shrink-0" style={{ background: penVar }} />
        <span className="text-[length:var(--text-sm)] font-medium" style={{ color: penVar }}>
          {entry.author}
        </span>
        {entry.mood ? (
          <span className="text-[length:var(--text-sm)] text-neutral">· {entry.mood}</span>
        ) : null}

        {mine && !editing ? (
          <span className="ml-auto flex items-center gap-[var(--space-xs)]">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={quietAction}
            >
              고치기
            </button>
            <button
              type="button"
              onClick={() => setConfirming((v) => !v)}
              aria-expanded={confirming}
              className={`${quietAction} hover:text-danger`}
            >
              지우기
            </button>
          </span>
        ) : null}
      </div>

      {editing ? (
        <EditForm entry={entry} onDone={() => setEditing(false)} />
      ) : (
        <>
          <p className="mt-[var(--space-2xs)] text-[length:var(--text-base)] leading-[var(--leading-body)] text-ink whitespace-pre-wrap break-words">
            {entry.body}
          </p>
          {entry.photoUrl ? (
            <PhotoFrame
              className="mt-[var(--space-sm)] aspect-[4/3] rounded-[var(--radius-card)]"
              thumb={entry.thumbUrl ?? entry.photoUrl}
              sizes="448px"
              photo={{
                url: entry.photoUrl,
                alt: `${entry.author}의 사진`,
                caption: entry.body,
                on: entry.wroteOn,
                by: entry.author,
                penColor: penVar,
              }}
            />
          ) : null}
          {confirming ? (
            <form action={deleteEntry} className={`mt-[var(--space-sm)] ${pairRow}`}>
              <input type="hidden" name="id" value={entry.id} />
              <Button type="button" variant="quiet" onClick={() => setConfirming(false)}>
                <X size={16} strokeWidth={2} aria-hidden="true" />그만
              </Button>
              <Button type="submit" variant="danger">
                <Trash2 size={16} strokeWidth={2} aria-hidden="true" />정말 지우기
              </Button>
            </form>
          ) : null}
        </>
      )}
    </article>
  );
}

function EditForm({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveEntry, undefined);
  const [mood, setMood] = useState(entry.mood ?? "");

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="mt-[var(--space-xs)]">
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="wroteOn" value={entry.wroteOn} />

      <Textarea
        name="body"
        required
        maxLength={5000}
        defaultValue={entry.body}
        rows={3}
      />

      <fieldset className="mt-[var(--space-sm)]">
        <legend className="text-[length:var(--text-sm)] text-muted mb-[var(--space-xs)]">그날 기분</legend>
        <div className="flex flex-wrap gap-[var(--space-2xs)]">
          {MOODS.map((m) => (
            <label
              key={m}
              className={chipClass(mood === m)}
            >
              <input type="radio" name="mood" value={m} checked={mood === m} onChange={() => setMood(m)} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`mt-[var(--space-sm)] ${pairRow}`}>
        <Button type="button" variant="quiet" onClick={onDone}>
          <X size={16} strokeWidth={2} aria-hidden="true" />그만두기
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} strokeWidth={2} aria-hidden="true" />}
          {pending ? "고치는 중" : "고쳤어요"}
        </Button>
      </div>

      {state?.error ? (
        <div className="mt-[var(--space-sm)]">
          <ErrorNote>{state.error}</ErrorNote>
        </div>
      ) : null}
    </form>
  );
}
