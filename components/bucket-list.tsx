"use client";

import { startTransition, useCallback, useOptimistic, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "./shadcn/checkbox";
import { addBucket, deleteBucket, restoreBucket, toggleBucket, type FormState } from "@/lib/actions";
import { humanDate } from "@/lib/date";
import type { Bucket } from "@/lib/store";
import { BucketPhotoButton } from "./bucket-photo";
import { PageHead, SectionHead } from "./page";
import { EmptyState, ErrorNote, Input, chipClass, iconBtn } from "./ui";
import { PhotoFrame } from "./photo-frame";

/* ─────────────────────────── 낙관적 목록 ───────────────────────────
   탭하면 그 자리에서 바뀐다. 서버가 실패하면 원래대로 돌아오고 한 줄로 말한다. */

type Opt =
  | { type: "add"; title: string; by: string; tempId: number }
  | { type: "toggle"; id: number; doneOn: string | null }
  | { type: "remove"; id: number }
  | { type: "restore"; bucket: Bucket };

function reduce(list: Bucket[], a: Opt): Bucket[] {
  switch (a.type) {
    case "add":
      return [
        {
          id: a.tempId,
          connectionId: 0,
          title: a.title,
          addedBy: a.by,
          doneOn: null,
          photoUrl: null,
          thumbUrl: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...list,
      ];
    case "toggle":
      return list.map((b) => (b.id === a.id ? { ...b, doneOn: a.doneOn } : b));
    case "remove":
      return list.filter((b) => b.id !== a.id);
    case "restore":
      return list.some((b) => b.id === a.bucket.id) ? list : [...list, a.bucket];
  }
}

const EXAMPLES = ["같이 일출 보기", "둘이서 요리 한 번", "당일치기 기차 여행"];

export function BucketList({
  buckets,
  me,
  today,
  pens,
}: {
  buckets: Bucket[];
  me: string;
  today: string;
  pens: Record<string, string>;
}) {
  const [list, apply] = useOptimistic(buckets, reduce);
  const [notice, setNotice] = useState("");
  const [justDone, setJustDone] = useState<number | null>(null);
  const checkRefs = useRef(new Map<number, HTMLButtonElement>());
  const addRef = useRef<HTMLInputElement>(null);
  const tempSeq = useRef(-1);

  const todo = list.filter((b) => !b.doneOn);
  const done = list.filter((b) => b.doneOn);

  function run(opt: Opt, call: () => Promise<FormState>) {
    setNotice("");
    startTransition(async () => {
      apply(opt);
      const r = await call();
      if (r?.error) setNotice(r.error);
    });
  }

  function add(title: string) {
    const t = title.trim();
    if (!t) return;
    const fd = new FormData();
    fd.set("title", t);
    run({ type: "add", title: t, by: me, tempId: tempSeq.current-- }, () => addBucket(undefined, fd));
  }

  function toggle(b: Bucket) {
    const next = b.doneOn ? null : today;
    if (next) {
      setJustDone(b.id);
      try {
        navigator.vibrate?.(10);
      } catch {
        // 진동 못 하는 기기
      }
    }
    const fd = new FormData();
    fd.set("id", String(b.id));
    fd.set("done", next ? "1" : "0");
    run({ type: "toggle", id: b.id, doneOn: next }, () => toggleBucket(undefined, fd));
  }

  function remove(b: Bucket) {
    if (b.id < 0) return; // 아직 서버에 없는 임시 항목
    const order = [...todo, ...done];
    const i = order.findIndex((x) => x.id === b.id);
    const neighbor = order[i + 1] ?? order[i - 1];
    const fd = new FormData();
    fd.set("id", String(b.id));
    run({ type: "remove", id: b.id }, () => deleteBucket(undefined, fd));
    // 확인창 대신 5초 되돌리기 — 포커스는 뺏지 않는다.
    toast(`'${b.title}' 지웠어요`, {
      action: { label: "되돌리기", onClick: () => restore(b) },
    });
    // 포커스는 사라지지 않는다 — 옆 항목으로, 없으면 입력창으로
    requestAnimationFrame(() => (neighbor ? checkRefs.current.get(neighbor.id) : addRef.current)?.focus());
  }

  function restore(b: Bucket) {
    const fd = new FormData();
    fd.set("id", String(b.id));
    run({ type: "restore", bucket: b }, () => restoreBucket(undefined, fd));
  }

  const isEmpty = list.length === 0;

  return (
    <div className="space-y-7">
      <div className="reveal" style={{ "--i": 0 } as React.CSSProperties}>
        <PageHead
          title="같이 할 것"
          sub={isEmpty ? "아직 비어 있어요" : `${todo.length}개 남았고, ${done.length}개 이뤘어요`}
        />
      </div>

      <div className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
        <BucketAdd onAdd={add} inputRef={addRef} />
        {/* 서버가 거절했을 때만 말한다. 화면 낭독기에도 들린다. */}
        <div aria-live="polite" className={notice ? "mt-[var(--space-xs)]" : "sr-only"}>
          <ErrorNote>{notice}</ErrorNote>
        </div>
      </div>

      {isEmpty ? (
        <div className="reveal" style={{ "--i": 2 } as React.CSSProperties}>
          <EmptyState title="첫 줄이 제일 어렵죠." body="이런 것부터 적어봐도 돼요. 누르면 바로 들어갑니다.">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => add(ex)} className={chipClass(false)}>
                {ex}
              </button>
            ))}
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="reveal" style={{ "--i": 2 } as React.CSSProperties}>
            <h2 className="sr-only">아직 안 한 것</h2>
            {todo.length === 0 ? (
              <p className="text-[length:var(--text-base)] text-neutral">다 했어요. 위에 다음 걸 적어보세요.</p>
            ) : (
              <ul aria-label="아직 안 한 것" className="divide-y divide-rule-soft">
                {todo.map((b) => (
                  <BucketRow
                    key={b.id}
                    b={b}
                    me={me}
                    today={today}
                    pens={pens}
                    pop={justDone === b.id}
                    onToggle={() => toggle(b)}
                    onRemove={() => remove(b)}
                    checkRef={(el) => {
                      if (el) checkRefs.current.set(b.id, el);
                      else checkRefs.current.delete(b.id);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          {done.length > 0 ? (
            <section className="reveal pt-[var(--space-lg)] border-t border-rule-soft" style={{ "--i": 3 } as React.CSSProperties}>
              <SectionHead>이룬 것</SectionHead>
              <ul aria-label="이룬 것" className="divide-y divide-rule-soft">
                {done.map((b) => (
                  <BucketRow
                    key={b.id}
                    b={b}
                    me={me}
                    today={today}
                    pens={pens}
                    pop={justDone === b.id}
                    onToggle={() => toggle(b)}
                    onRemove={() => remove(b)}
                    checkRef={(el) => {
                      if (el) checkRefs.current.set(b.id, el);
                      else checkRefs.current.delete(b.id);
                    }}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

    </div>
  );
}

/* ─────────────────────────── 한 줄 적기 ─────────────────────────── */

function BucketAdd({ onAdd, inputRef }: { onAdd: (title: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = inputRef.current;
        if (!input) return;
        onAdd(input.value);
        input.value = "";
        input.focus();
      }}
    >
      <div className="flex items-center gap-[var(--space-xs)] rounded-[var(--radius-card)] border border-rule bg-paper-2 pl-4 pr-1.5 py-1.5 focus-within:border-pen-a transition-colors duration-[var(--dur-micro)]">
        <Input
          ref={inputRef}
          name="title"
          required
          maxLength={80}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="같이 하고 싶은 거"
          aria-label="같이 하고 싶은 거"
          className="flex-1 min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent scroll-mb-24"
        />
        <button type="submit" aria-label="버킷에 넣기" className={`${iconBtn} bg-pen-a-soft text-pen-a-on border border-pen-a/70`}>
          <Plus size={20} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────── 한 줄 ───────────────────────────
   체크 · 제목 · (사진) · 지우기. 지우기는 어느 폭에서나 보인다 —
   숨은 길게 누르기로 지우던 방식은 없앴다(보이지 않는 파괴 동작이라서). 지운 뒤 5초 되돌리기가 뜬다. */

function BucketRow({
  b,
  me,
  today,
  pens,
  pop,
  onToggle,
  onRemove,
  checkRef,
}: {
  b: Bucket;
  me: string;
  today: string;
  pens: Record<string, string>;
  pop: boolean;
  onToggle: () => void;
  onRemove: () => void;
  checkRef: (el: HTMLButtonElement | null) => void;
}) {
  const done = Boolean(b.doneOn);
  const penVar = pens[b.addedBy] ?? pens[me];
  const titleId = `bucket-${b.id}-title`;
  const [photoMsg, setPhotoMsg] = useState<{ text: string; kind: "busy" | "error" | "idle" }>({ text: "", kind: "idle" });
  const onStatus = useCallback((text: string, kind: "busy" | "error" | "idle") => setPhotoMsg({ text, kind }), []);

  return (
    <li className="flex items-start gap-[var(--space-xs)] py-[var(--space-2xs)]">
      <span className={`${iconBtn} ${pop ? "pop" : ""}`}>
        <Checkbox
          ref={checkRef}
          checked={done}
          onCheckedChange={onToggle}
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-meta`}
          className="hit-44 size-6 rounded-full border-2 border-muted bg-transparent shadow-none data-[state=checked]:border-pen-a/70 data-[state=checked]:bg-pen-a-soft data-[state=checked]:text-pen-a-on [&_svg]:size-4 [&_svg]:stroke-[2.5]"
        />
      </span>

      <div className="flex-1 min-w-0 min-h-11 flex flex-col justify-center">
        <p
          id={titleId}
          className={`text-[length:var(--text-base)] leading-[var(--leading-snug)] break-words ${
            done ? "text-muted line-through decoration-neutral/60" : "text-ink"
          }`}
        >
          {b.title}
        </p>
        <p id={`${titleId}-meta`} className="mt-1 text-[length:var(--text-sm)] text-neutral flex items-center gap-1.5">
          <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: penVar }} />
          {b.addedBy}
          {b.doneOn ? <span className="tnum">· {humanDate(b.doneOn, today)}</span> : null}
        </p>
        {photoMsg.text ? (
          <p
            className={`mt-1 text-[length:var(--text-sm)] ${photoMsg.kind === "error" ? "text-danger" : "text-neutral"}`}
            role={photoMsg.kind === "error" ? "alert" : "status"}
          >
            {photoMsg.text}
          </p>
        ) : null}
        {b.photoUrl ? (
          <div className="mt-[var(--space-xs)] w-full max-w-[240px]">
            <PhotoFrame
              className="aspect-[4/3] rounded-[var(--radius-input)]"
              thumb={b.thumbUrl ?? b.photoUrl}
              sizes="240px"
              photo={{
                url: b.photoUrl,
                alt: b.title,
                caption: b.title,
                on: b.doneOn ?? b.createdAt.slice(0, 10),
                by: b.addedBy,
              }}
            />
          </div>
        ) : null}
      </div>

      {done && b.id > 0 ? <BucketPhotoButton id={b.id} title={b.title} onStatus={onStatus} /> : null}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`${b.title} 지우기`}
        className={`${iconBtn} text-neutral hover:text-danger`}
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
}
