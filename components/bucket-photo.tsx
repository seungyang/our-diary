"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { attachBucketPhoto } from "@/lib/actions";
import { shrinkPhoto } from "@/lib/image-client";
import { iconBtn } from "./ui";

/**
 * 이룬 버킷에 사진 한 장. 고르면 줄여서 바로 올라간다 — 버튼 하나 더 누를 일 없게.
 * 진행·실패는 툴팁이 아니라 행 안의 글자로 알린다(onStatus).
 */
export function BucketPhotoButton({
  id,
  title,
  onStatus,
}: {
  id: number;
  title: string;
  onStatus: (msg: string, kind: "busy" | "error" | "idle") => void;
}) {
  const [state, action, pending] = useActionState(attachBucketPhoto, undefined);
  const [shrinking, setShrinking] = useState(false);
  const busy = pending || shrinking;

  useEffect(() => {
    if (shrinking) onStatus("사진 줄이는 중", "busy");
    else if (pending) onStatus("올리는 중", "busy");
    else if (state?.error) onStatus(state.error, "error");
    else onStatus("", "idle");
  }, [shrinking, pending, state, onStatus]);

  async function pick(file: File) {
    setShrinking(true);
    const { photo, thumb } = await shrinkPhoto(file);
    setShrinking(false);
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("photo", photo);
    fd.set("thumb", thumb);
    startTransition(() => action(fd));
  }

  return (
    <label
      aria-label={`${title}에 사진 붙이기`}
      aria-busy={busy}
      className={`${iconBtn} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-offset-2 ${
        busy ? "text-neutral" : state?.error ? "text-danger" : "text-neutral hover:text-pen-a"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void pick(f);
          e.currentTarget.value = "";
        }}
      />
      <ImagePlus size={18} strokeWidth={2} aria-hidden="true" />
    </label>
  );
}
