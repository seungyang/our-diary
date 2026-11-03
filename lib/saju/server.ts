import "server-only";
import * as store from "@/lib/store";
import { computeChart, type Chart } from "./manse";
import { buildPrompt, questionById, type BuiltPrompt, type Question } from "./prompts";
import { readSajuCookie } from "./cookie";

export type Loaded = {
  profile: store.SajuProfile | null;
  chart: Chart | null;
  partnerUid: string | null;
  partnerChart: Chart | null;
};

export function chartFromProfile(p: store.SajuProfile): Chart {
  return computeChart({ date: p.birthDate, time: p.birthTime, gender: p.gender });
}

/** 내 사주와 (연결된) 상대 사주를 한 번에. 둘 다 없을 수 있다. */
export async function loadCharts(uid: string): Promise<Loaded> {
  let profile = await store.getSajuProfile(uid);
  if (!profile && store.isMock) {
    // 목업 모드에서만: 다른 인스턴스에서 저장한 값을 쿠키로 되살린다. DB가 붙으면 필요 없다.
    const c = await readSajuCookie(uid);
    if (c) {
      await store.upsertSajuProfile(c);
      profile = await store.getSajuProfile(uid);
    }
  }
  const conn = await store.activeConnection(uid);
  const partnerUid = conn ? (conn.requester === uid ? conn.addressee : conn.requester) : null;
  const partnerProfile = partnerUid ? await store.getSajuProfile(partnerUid) : null;
  return {
    profile,
    chart: profile ? chartFromProfile(profile) : null,
    partnerUid,
    partnerChart: partnerProfile ? chartFromProfile(partnerProfile) : null,
  };
}

/** 질문에 맞는 프롬프트. 궁합인데 상대 사주가 없으면 null. */
export function promptFor(q: Question, loaded: Loaded): BuiltPrompt | null {
  if (!loaded.chart) return null;
  if (q.needsPartner) {
    if (!loaded.partnerChart) return null;
    return buildPrompt(q, loaded.chart, loaded.partnerChart);
  }
  return buildPrompt(q, loaded.chart);
}

export { questionById };
