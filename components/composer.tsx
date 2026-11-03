"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2, PenLine } from "lucide-react";
import { saveEntry } from "@/lib/actions";
import { MOODS } from "@/lib/date";
import { shrinkPhoto } from "@/lib/image-client";
import { Button, ErrorNote, Textarea, cardClass, chipClass, quietAction } from "./ui";
import { DateField } from "./date-field";

/**
 * 한 화면에서 끝나야 한다. 날짜는 이미 오늘로 맞춰져 있고, 적고, 기분 하나 고르고, 남기기.
 * 라벨은 눈에 보이게 둔다 — 칩만 덩그러니 있으면 그게 답인지 기분인지 알 수 없다.
 * 저장되면 조용히 목록에 나타난다. 축하 토스트 없음.
 */
export function Composer({ today }: { today: string }) {
  const [state, action, pending] = useActionState(saveEntry, undefined);
  const [mood, setMood] = useState<string>("");
  const [openDate, setOpenDate] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [shrinking, setShrinking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setMood("");
      setOpenDate(false);
      setPhotoName("");
    }
  }, [state]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = fd.get("photo");
    if (raw instanceof File && raw.size > 0) {
      setShrinking(true);
      const { photo, thumb } = await shrinkPhoto(raw);
      fd.set("photo", photo);
      fd.set("thumb", thumb);
      setShrinking(false);
    } else {
      fd.delete("photo");
    }
    startTransition(() => action(fd));
  }

  const busy = pending || shrinking;

  return (
    <form ref={formRef} onSubmit={submit} className={`${cardClass} space-y-[var(--space-md)]`}>
      <div>
        <label
          htmlFor="entry-body"
          className="block text-[length:var(--text-md)] font-medium text-ink mb-[var(--space-xs)]"
        >
          오늘 어땠어?
        </label>
        <Textarea
          id="entry-body"
          name="body"
          required
          maxLength={5000}
          rows={3}
          placeholder="여기에 적어 주세요"
        />
      </div>

      <fieldset>
        <legend className="text-[length:var(--text-sm)] text-muted mb-[var(--space-xs)]">
          오늘 기분 <span className="text-neutral">(안 골라도 돼요)</span>
        </legend>
        <div className="flex flex-wrap gap-[var(--space-2xs)]">
          {MOODS.map((m) => (
            <label key={m} className={chipClass(mood === m)}>
              <input
                type="radio"
                name="mood"
                value={m}
                checked={mood === m}
                onChange={() => setMood(m)}
                className="sr-only"
              />
              {m}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="pt-[var(--space-sm)] border-t border-rule-soft space-y-[var(--space-sm)]">
        <div className="flex items-center justify-between gap-[var(--space-sm)]">
          {openDate ? (
            <div className="flex-1 min-w-0">
              <DateField name="wroteOn" defaultValue={today} max={today} />
            </div>
          ) : (
            <>
              <input type="hidden" name="wroteOn" value={today} />
              <button type="button" onClick={() => setOpenDate(true)} className={quietAction}>
                오늘 말고 다른 날
              </button>
            </>
          )}

          <label
            className={`${quietAction} gap-1.5 max-w-[55%] rounded-[var(--radius-pill)] px-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-offset-2`}
          >
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setPhotoName(e.currentTarget.files?.[0]?.name ?? "")}
            />
            <Camera size={18} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{photoName || "사진 한 장"}</span>
          </label>
        </div>

        <Button type="submit" full disabled={busy}>
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <PenLine size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {shrinking ? "사진 줄이는 중" : pending ? "남기는 중" : "남기기"}
        </Button>
      </div>

      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}
    </form>
  );
}
