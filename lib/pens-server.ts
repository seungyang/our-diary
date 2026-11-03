import "server-only";
import * as store from "./store";
import { penVar } from "./pens";

/** 두 사람의 펜 색을 한 번에. `pens[uid]`를 style에 그대로 넣으면 된다. */
export async function pensFor(...uids: string[]): Promise<Record<string, string>> {
  const users = await Promise.all(uids.map((u) => store.getUser(u)));
  const out: Record<string, string> = {};
  uids.forEach((uid, i) => {
    out[uid] = penVar(users[i]?.pen);
  });
  return out;
}
