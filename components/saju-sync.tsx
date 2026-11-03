"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreSajuConversation } from "@/lib/actions";

/**
 * 대화 사본을 브라우저에 둔다.
 *
 * 지금은 DB 없이 서버 메모리로 돌아서, 서버가 새로 뜨면 대화가 사라진다(문답 중간에 자주 일어난다).
 * 그래서 화면에 보이는 대화를 localStorage에 그대로 받아 두고, 서버 쪽이 비어 있으면 되돌려 넣는다.
 * DB가 붙으면 `enabled={false}`로 꺼진다 — 그때는 서버가 진짜 원본이다.
 */

export type SyncTurn = { role: "me" | "reader"; text: string; prompt: string | null; source: "copy" | "api" | null };

const KEY = (uid: string) => `saju:conv:${uid}`;

function read(uid: string): SyncTurn[] | null {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as SyncTurn[]) : null;
  } catch {
    return null;
  }
}

function write(uid: string, turns: SyncTurn[]): void {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(turns));
  } catch {
    // 저장소가 막혔거나 꽉 찼다 — 사본이 없을 뿐, 화면은 그대로 돈다
  }
}

export function SajuSync({ uid, turns, enabled = true }: { uid: string; turns: SyncTurn[]; enabled?: boolean }) {
  const router = useRouter();
  const tried = useRef(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const saved = read(uid);

    // 서버가 같거나 앞서면 서버가 옳다 — 사본만 갱신한다.
    if (!saved || turns.length >= saved.length) {
      write(uid, turns);
      return;
    }

    // 사본이 더 길다 = 서버가 대화를 잃었다. 한 번만 되돌려 넣는다.
    if (tried.current) return;
    tried.current = true;
    setRestoring(true);
    restoreSajuConversation(JSON.stringify(saved))
      .then(() => router.refresh())
      .catch(() => {
        /* 되돌리기 실패 — 사본은 그대로 두고 다음 기회에 */
      })
      .finally(() => setRestoring(false));
  }, [uid, turns, enabled, router]);

  if (!restoring) return null;
  return (
    <p className="text-[length:var(--text-sm)] text-neutral" role="status">
      이 기기에 남아 있던 대화를 되살리는 중이에요…
    </p>
  );
}
