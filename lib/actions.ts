"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import * as store from "./store";
import { clearSession, readSession, writeSession } from "./session";
import { isPenId } from "./pens";
import { today } from "./date";
import { questionFor } from "./questions";
import { CODE_LENGTH, isCodeShape, makeCode, normalizeCode } from "./invite-code";

export type FormState = { error?: string; ok?: boolean } | undefined;

const MAX_BODY = 5000;
const MAX_PHOTO = 6 * 1024 * 1024;

/**
 * 사진 저장. Vercel Blob 토큰이 있으면 거기로, 없으면(목업) data URL로 메모리에 둔다.
 * 목업에서는 1.5MB까지만 — 서버 메모리라 커지면 안 된다.
 */
async function putOne(file: File, folder: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, { access: "public", addRandomSuffix: true });
    return blob.url;
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

type Stored = { url: string | null; thumb: string | null; error?: string };

/** 원본(photo)과 썸네일(thumb)을 같이 받는다. 브라우저가 줄여서 보내지만, 크기 검사는 서버가 다시 한다. */
async function storePhoto(form: FormData, folder: string): Promise<Stored> {
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { url: null, thumb: null };
  if (!photo.type.startsWith("image/")) return { url: null, thumb: null, error: "이미지 파일만 올릴 수 있어요." };
  if (photo.size > MAX_PHOTO) return { url: null, thumb: null, error: "사진은 6MB까지 올릴 수 있어요." };
  if (!process.env.BLOB_READ_WRITE_TOKEN && photo.size > 1.5 * 1024 * 1024) {
    return { url: null, thumb: null, error: "지금은 1.5MB까지만 올릴 수 있어요. 저장소를 붙이면 6MB까지 됩니다." };
  }
  const thumbFile = form.get("thumb");
  const thumb = thumbFile instanceof File && thumbFile.size > 0 && thumbFile.type.startsWith("image/") ? thumbFile : photo;

  const [url, thumbUrl] = await Promise.all([putOne(photo, folder), putOne(thumb, `${folder}/thumb`)]);
  return { url, thumb: thumbUrl };
}

function str(form: FormData, key: string, max = 40): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

async function requireUid(): Promise<string> {
  const session = await readSession();
  if (!session) redirect("/login");
  return session.uid;
}

/* ─────────────────────────── 로그인 ─────────────────────────── */

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id", 30);
  const password = String(form.get("password") ?? "");
  if (!id || !password) return { error: "아이디와 비밀번호를 모두 적어주세요." };

  const user = await store.authenticate(id, password);
  if (!user) return { error: "아이디 또는 비밀번호가 맞지 않아요." };

  await writeSession({ uid: user.id });
  const active = await store.activeConnection(user.id);
  redirect(active ? "/diary/bucket" : "/connect");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}

/* ─────────────────────────── 연결 ─────────────────────────── */

/**
 * 연결은 6자리 비밀코드로 한다. 한쪽이 코드를 만들어 알려주고 다른 쪽이 적는다.
 * 코드를 만들어 건넨 것이 곧 승낙이라, 적는 순간 바로 이어진다(따로 수락 화면이 없다).
 * 쓰인 코드는 그 자리에서 지운다 — 한 번만 통한다.
 */

/** 내 코드 만들기. 이미 있으면 새것으로 갈아 끼운다(옛 코드는 그때 못 쓰게 된다). */
export async function createMyCode(): Promise<void> {
  const uid = await requireUid();
  for (let i = 0; i < 8; i++) {
    if (await store.setInviteCode(uid, makeCode())) break;
  }
  revalidatePath("/connect");
}

/** 내 코드 거두기. */
export async function clearMyCode(): Promise<void> {
  const uid = await requireUid();
  await store.setInviteCode(uid, null);
  revalidatePath("/connect");
}

export async function connectByCode(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const code = normalizeCode(String(form.get("code") ?? "").slice(0, 32));
  if (!code) return { error: "코드를 적어주세요." };
  if (!isCodeShape(code)) return { error: `코드는 ${CODE_LENGTH}자리예요. 받은 그대로 적어주세요.` };

  const owner = await store.findUserByCode(code);
  if (!owner) return { error: "맞는 코드가 없어요. 상대에게 다시 물어보세요." };
  if (owner.id === uid) return { error: "내 코드예요. 상대가 만든 코드를 적어주세요." };

  const asked = await store.requestConnection(uid, owner.id);
  if (asked.error) return { error: asked.error };

  // 코드를 건넨 쪽이 이미 승낙한 것이므로 바로 잇는다.
  const made = (await store.listConnectionsFor(uid)).find(
    (c) => c.status === "pending" && c.requester === uid && c.addressee === owner.id,
  );
  if (made) await store.acceptConnection(made.id, owner.id);
  await store.setInviteCode(owner.id, null);

  revalidatePath("/connect");
  revalidatePath("/diary");
  redirect("/diary/bucket");
}

/** 연결 끊기(설정 화면에서도 쓴다). */
export async function removeRequest(form: FormData): Promise<void> {
  const uid = await requireUid();
  await store.removeConnection(Number(str(form, "id", 24)), uid);
  revalidatePath("/connect");
  revalidatePath("/diary");
}

/* ─────────────────────────── 기록 ─────────────────────────── */

export async function saveEntry(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const body = String(form.get("body") ?? "").trim().slice(0, MAX_BODY);
  const mood = str(form, "mood", 16) || null;
  const wroteOn = str(form, "wroteOn", 10);
  if (!body) return { error: "한 줄이라도 적어야 남길 수 있어요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wroteOn)) return { error: "날짜를 다시 골라주세요." };

  const photo = await storePhoto(form, `${conn.id}/entries`);
  if (photo.error) return { error: photo.error };

  const id = str(form, "id", 24);
  if (id) {
    await store.updateEntry(Number(id), uid, { body, mood, ...(photo.url ? { photoUrl: photo.url, thumbUrl: photo.thumb } : {}) });
  } else {
    await store.insertEntry({ connectionId: conn.id, author: uid, wroteOn, mood, body, photoUrl: photo.url, thumbUrl: photo.thumb });
    await store.notifyPartner(conn, uid, `${uid}가 오늘 일기를 남겼어요`, "/diary");
  }

  revalidatePath("/diary");
  revalidatePath("/diary/calendar");
  revalidatePath("/diary/album");
  return { ok: true };
}

export async function deleteEntry(form: FormData): Promise<void> {
  const uid = await requireUid();
  await store.deleteEntry(Number(str(form, "id", 24)), uid);
  revalidatePath("/diary");
  revalidatePath("/diary/calendar");
}

/* ─────────────────────────── 설정 ─────────────────────────── */

export async function saveMetOn(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const metOn = str(form, "metOn", 10);
  if (metOn && !/^\d{4}-\d{2}-\d{2}$/.test(metOn)) return { error: "날짜를 다시 골라주세요." };
  await store.setMetOn(conn.id, metOn || null);
  revalidatePath("/diary");
  revalidatePath("/diary/settings");
  return { ok: true };
}

export async function addMilestone(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const label = str(form, "label", 40);
  const onDate = str(form, "onDate", 10);
  const yearly = form.get("yearly") === "on";
  if (!label) return { error: "무슨 날인지 이름을 적어주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(onDate)) return { error: "날짜를 골라주세요." };

  await store.insertMilestone({ connectionId: conn.id, label, onDate, yearly });
  revalidatePath("/diary/settings");
  revalidatePath("/diary");
  return { ok: true };
}

export async function deleteMilestone(form: FormData): Promise<void> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");
  await store.deleteMilestone(Number(str(form, "id", 24)), conn.id);
  revalidatePath("/diary/settings");
  revalidatePath("/diary");
}

/* ─────────────────────────── 버킷리스트 ─────────────────────────── */

export async function addBucket(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const title = str(form, "title", 80);
  if (!title) return { error: "하고 싶은 걸 한 줄 적어주세요." };

  await store.insertBucket({ connectionId: conn.id, title, addedBy: uid });
  await store.notifyPartner(conn, uid, `${uid}가 '${title}'을(를) 버킷에 적었어요`, "/diary/bucket");
  revalidatePath("/diary/bucket");
  return { ok: true };
}

export async function toggleBucket(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const id = Number(str(form, "id", 24));
  if (!Number.isFinite(id)) return { error: "어떤 항목인지 알 수 없어요. 화면을 새로 고쳐주세요." };
  const done = form.get("done") === "1";
  await store.setBucketDone(id, conn.id, done ? today() : null);
  if (done) await store.notifyPartner(conn, uid, `${uid}가 버킷 하나를 이뤘어요`, "/diary/bucket");
  revalidatePath("/diary/bucket");
  revalidatePath("/diary/album");
  return { ok: true };
}

export async function deleteBucket(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");
  const id = Number(str(form, "id", 24));
  if (!Number.isFinite(id)) return { error: "어떤 항목인지 알 수 없어요. 화면을 새로 고쳐주세요." };
  await store.deleteBucket(id, conn.id);
  revalidatePath("/diary/bucket");
  revalidatePath("/diary/album");
  return { ok: true };
}

export async function restoreBucket(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");
  const ok = await store.restoreBucket(Number(str(form, "id", 24)), conn.id);
  revalidatePath("/diary/bucket");
  revalidatePath("/diary/album");
  return ok ? { ok: true } : { error: "되돌릴 수 없었어요. 이미 지워졌을 수 있어요." };
}

export async function attachBucketPhoto(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const photo = await storePhoto(form, `${conn.id}/buckets`);
  if (photo.error) return { error: photo.error };
  if (!photo.url) return { error: "사진을 골라주세요." };

  await store.setBucketPhoto(Number(str(form, "id", 24)), conn.id, photo.url, photo.thumb);
  revalidatePath("/diary/bucket");
  revalidatePath("/diary/album");
  return { ok: true };
}

/* ─────────────────────────── 오늘의 질문 ─────────────────────────── */

export async function answerQuestion(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const text = String(form.get("text") ?? "").trim().slice(0, 1000);
  if (!text) return { error: "한 줄이라도 적어주세요." };

  const askedOn = today();
  await store.upsertAnswer({ connectionId: conn.id, askedOn, questionIndex: questionFor(askedOn).index, uid, text });
  await store.notifyPartner(conn, uid, `${uid}가 오늘의 질문에 답했어요`, "/diary/question");
  revalidatePath("/diary/question");
  return { ok: true };
}

/* ─────────────────────────── 함께 간 곳 ─────────────────────────── */

export async function addPlace(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const name = str(form, "name", 60);
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  const visitedOn = str(form, "visitedOn", 10);
  const note = str(form, "note", 80) || null;
  if (!name) return { error: "장소 이름을 적어주세요." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "지도에서 자리를 골라주세요." };
  if (visitedOn && !/^\d{4}-\d{2}-\d{2}$/.test(visitedOn)) return { error: "날짜를 다시 골라주세요." };

  await store.insertPlace({ connectionId: conn.id, name, lat, lng, visitedOn: visitedOn || null, note, addedBy: uid });
  await store.notifyPartner(conn, uid, `${uid}가 '${name}'을(를) 지도에 꽂았어요`, "/diary/places");
  revalidatePath("/diary/places");
  return { ok: true };
}

export async function deletePlace(form: FormData): Promise<void> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");
  await store.deletePlace(Number(str(form, "id", 24)), conn.id);
  revalidatePath("/diary/places");
}

/* ─────────────────────────── 위시리스트 ─────────────────────────── */

export async function addWish(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const conn = await store.activeConnection(uid);
  if (!conn) redirect("/connect");

  const title = str(form, "title", 60);
  const link = str(form, "link", 300) || null;
  const note = str(form, "note", 80) || null;
  if (!title) return { error: "갖고 싶은 걸 적어주세요." };
  if (link && !/^https?:\/\//.test(link)) return { error: "링크는 http로 시작해야 해요." };

  await store.insertWish({ connectionId: conn.id, owner: uid, title, link, note });
  await store.notifyPartner(conn, uid, `${uid}의 위시리스트에 '${title}'이(가) 생겼어요`, "/diary/wish");
  revalidatePath("/diary/wish");
  return { ok: true };
}

export async function deleteWish(form: FormData): Promise<void> {
  const uid = await requireUid();
  await store.deleteWish(Number(str(form, "id", 24)), uid);
  revalidatePath("/diary/wish");
}

/* ─────────────────────────── 알림 ─────────────────────────── */

export async function readAllNotices(): Promise<void> {
  const uid = await requireUid();
  await store.markAllRead(uid);
  revalidatePath("/diary/more");
}

/* ─────────────────────────── 사주 ─────────────────────────── */

export async function saveSajuProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const { parseBirthDate, parseBirthTime } = await import("./saju/parse");
  const dateText = str(form, "birthDateText", 30);
  const timeText = str(form, "birthTimeText", 30);
  const calendar = str(form, "calendar", 5) === "lunar" ? "lunar" : "solar";
  const leap = form.get("leap") === "on";
  const gender = str(form, "gender", 1);

  const ymd = parseBirthDate(dateText);
  if (!ymd) return { error: "생년월일을 '1995년 3월 15일'처럼 적어 주세요." };
  if (ymd.y < 1900 || ymd.y > new Date().getFullYear()) return { error: "1900년 이후 날짜만 볼 수 있어요." };
  const pad = (n: number) => String(n).padStart(2, "0");
  let birthDate: string;
  let lunarInput: { date: string; leap: boolean } | null = null;
  if (calendar === "lunar") {
    const { lunarToSolar } = await import("./saju/manse");
    const solar = lunarToSolar(ymd.y, ymd.m, ymd.d, leap);
    if (!solar) return { error: leap ? "그 해에는 그 윤달이 없어요." : "음력에 없는 날짜예요." };
    birthDate = solar;
    lunarInput = { date: `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`, leap };
  } else {
    const dim = new Date(ymd.y, ymd.m, 0).getDate();
    if (ymd.d > dim) return { error: "없는 날짜예요." };
    birthDate = `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
  }

  const t = parseBirthTime(timeText);
  if (t === undefined) return { error: "시간은 '오전 10시 30분'이나 '22:10'처럼, 모르면 '모름'이라고 적어 주세요." };
  if (gender !== "M" && gender !== "F") return { error: "성별을 골라 주세요." };

  const profile = {
    uid, birthDate, birthTime: t ? `${pad(t.h)}:${pad(t.mi)}` : null, gender: gender as "M" | "F",
    calendar: calendar as "solar" | "lunar", lunarInput,
  };
  await store.upsertSajuProfile(profile);
  if (store.isMock) {
    // 목업 모드는 서버 메모리가 인스턴스마다 달라서, 입력값은 쿠키에도 남긴다.
    const { writeSajuCookie } = await import("./saju/cookie");
    await writeSajuCookie(profile);
  }
  // 사주가 바뀌면 대화도 처음부터 — 새 기본 풀이를 바로 연다.
  const cur = await store.findSajuThread(uid, "main");
  if (cur) await store.deleteSajuThread(cur.id, uid);
  const r = await sajuCtx(uid);
  if (!("error" in r)) await ensureMainThread(uid, r.ctx);
  revalidatePath("/diary/saju");
  redirect("/diary/saju");
}

type Ctx = Awaited<ReturnType<typeof import("./saju/server").loadCharts>>;

async function sajuCtx(uid: string): Promise<{ ctx: Ctx } | { error: string }> {
  const { loadCharts } = await import("./saju/server");
  const ctx = await loadCharts(uid);
  if (!ctx.chart) return { error: "먼저 생년월일을 적어 주세요." };
  return { ctx };
}

/** me 턴을 넣고, API 키가 있으면 바로 답까지 받는다. */
async function pushQuestion(uid: string, threadId: number, text: string, prompt: string): Promise<FormState> {
  const me = await store.appendSajuTurn(threadId, uid, { role: "me", text, prompt, source: null, model: null });
  if (!me) return { error: "문답을 찾지 못했어요." };
  const { apiAvailable, interpret } = await import("./saju/llm");
  if (apiAvailable()) {
    try {
      const t = await store.getSajuThread(threadId, uid);
      const built = { system: "", user: "", full: prompt, knowledgeVersion: t?.knowledgeVersion ?? "" };
      // API 모드는 system/user를 나눠 보내야 캐시가 맞는다 — 프롬프트 앞부분(페르소나)이 system.
      const { personaBlock } = await import("./saju/prompts");
      built.system = personaBlock();
      built.user = prompt.startsWith(built.system) ? prompt.slice(built.system.length).trimStart() : prompt;
      const { text: answer, model } = await interpret(built);
      await store.appendSajuTurn(threadId, uid, { role: "reader", text: answer, prompt: null, source: "api", model });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "풀이를 받지 못했어요." };
    }
  }
  return { ok: true };
}

/** 한 사람의 대화는 하나. 없으면 만들고 기본 풀이를 첫 질문으로 넣는다. */
async function ensureMainThread(uid: string, ctx: Ctx): Promise<{ thread: store.SajuThread; created: boolean }> {
  const cur = await store.findSajuThread(uid, "main");
  if (cur) return { thread: cur, created: false };
  const { buildTurnPrompt } = await import("./saju/prompts");
  const { BASE_READING } = await import("./saju/catalog");
  const built = buildTurnPrompt(ctx.chart!, undefined, [], BASE_READING.text, BASE_READING.guide);
  const t = await store.createSajuThread({ uid, questionId: "main", title: "사주 상담", partnerUid: ctx.partnerUid, knowledgeVersion: built.knowledgeVersion });
  await pushQuestion(uid, t.id, BASE_READING.text, built.full);
  return { thread: (await store.getSajuThread(t.id, uid))!, created: true };
}

/** 화면이 렌더링 중에 부른다 — 기본 풀이가 첫 문답으로 열리게. (렌더 중이라 revalidate는 하지 않는다) */
export async function openSajuConversation(): Promise<void> {
  const uid = await requireUid();
  const r = await sajuCtx(uid);
  if ("error" in r) return;
  await ensureMainThread(uid, r.ctx);
}

async function askInMain(uid: string, question: string, guide?: string, withPartner = false): Promise<FormState> {
  const r = await sajuCtx(uid);
  if ("error" in r) return { error: r.error };
  if (withPartner && !r.ctx.partnerChart) return { error: `${r.ctx.partnerUid ?? "상대"}의 사주가 아직 없어요.` };
  const { thread } = await ensureMainThread(uid, r.ctx);
  if (thread.turns.at(-1)?.role === "me") return { error: "먼저 앞 질문의 답을 붙여넣어 주세요." };
  const { buildTurnPrompt } = await import("./saju/prompts");
  const history = thread.turns.map((x) => ({ role: x.role, text: x.text }));
  const built = buildTurnPrompt(r.ctx.chart!, withPartner ? r.ctx.partnerChart ?? undefined : undefined, history, question, guide);
  const res = await pushQuestion(uid, thread.id, question, built.full);
  revalidatePath("/diary/saju");
  return res;
}

/** 준비된 질문 누르기. */
export async function askSajuCatalog(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const { catalogItem } = await import("./saju/catalog");
  const item = catalogItem(str(form, "itemId", 40));
  if (!item) return { error: "없는 질문이에요." };
  return askInMain(uid, item.text, item.guide, Boolean(item.needsPartner));
}

/** 세션에서 받은 답 붙여넣기. */
export async function saveSajuAnswer(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const threadId = Number(form.get("threadId"));
  const answer = String(form.get("answer") ?? "").trim().slice(0, 12000);
  if (answer.length < 20) return { error: "답이 너무 짧아요. 세션의 답을 그대로 붙여넣어 주세요." };
  const t = await store.getSajuThread(threadId, uid);
  if (!t) return { error: "대화를 잠시 놓쳤어요. 화면을 새로 고치면 되살아나요. 답은 그대로 두고 다시 저장해 주세요." };
  if (t.turns.at(-1)?.role !== "me") return { error: "지금은 붙여넣을 차례가 아니에요." };
  await store.appendSajuTurn(threadId, uid, { role: "reader", text: answer, prompt: null, source: "copy", model: null });
  revalidatePath("/diary/saju");
  return { ok: true };
}

/** 직접 묻기(이어 묻기 포함) — 같은 대화에 붙는다. */
export async function askSajuFree(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const text = String(form.get("text") ?? "").trim().slice(0, 1000);
  if (text.length < 2) return { error: "무엇이 궁금한지 적어 주세요." };
  const withPartner = form.get("withPartner") === "on";
  return askInMain(uid, text, undefined, withPartner);
}

/** 예전 이름 호환 — 이어 묻기도 직접 묻기와 같다. */
export async function askSajuFollowUp(prev: FormState, form: FormData): Promise<FormState> {
  return askSajuFree(prev, form);
}

/**
 * 브라우저에 남아 있던 대화를 서버로 되돌려 넣는다(목업 전용 안전장치).
 * 서버가 새로 떠서 대화를 잃었을 때 `components/saju-sync.tsx`가 부른다.
 */
export async function restoreSajuConversation(json: string): Promise<void> {
  const uid = await requireUid();
  if (!store.isMock) return; // DB가 있으면 서버가 원본이다
  let incoming: Array<{ role: string; text: string; prompt?: string | null; source?: string | null }>;
  try {
    incoming = JSON.parse(json);
  } catch {
    return;
  }
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 60) return;

  const r = await sajuCtx(uid);
  if ("error" in r) return;
  const cur = await store.findSajuThread(uid, "main");
  if (cur && cur.turns.length >= incoming.length) return; // 서버가 이미 같거나 앞선다

  if (cur) await store.deleteSajuThread(cur.id, uid);
  const { KNOWLEDGE_VERSION } = await import("./saju/knowledge");
  const t = await store.createSajuThread({
    uid, questionId: "main", title: "사주 상담", partnerUid: r.ctx.partnerUid, knowledgeVersion: KNOWLEDGE_VERSION,
  });
  for (const x of incoming) {
    const role = x.role === "reader" ? "reader" : "me";
    const text = String(x.text ?? "").slice(0, 12000);
    if (!text) continue;
    await store.appendSajuTurn(t.id, uid, {
      role,
      text,
      prompt: role === "me" && typeof x.prompt === "string" ? x.prompt.slice(0, 40000) : null,
      source: x.source === "api" || x.source === "copy" ? x.source : null,
      model: null,
    });
  }
  revalidatePath("/diary/saju");
}

/** 대화를 처음부터 다시. */
export async function resetSajuConversation(form: FormData): Promise<void> {
  const uid = await requireUid();
  const threadId = Number(form.get("threadId"));
  if (Number.isFinite(threadId)) await store.deleteSajuThread(threadId, uid);
  // 지운 뒤 기본 풀이를 다시 연다 — 빈 화면이 남지 않게.
  const r = await sajuCtx(uid);
  if (!("error" in r)) await ensureMainThread(uid, r.ctx);
  revalidatePath("/diary/saju");
}

export async function scoreSaju(form: FormData): Promise<void> {
  const uid = await requireUid();
  const threadId = Number(form.get("threadId"));
  const turnId = Number(form.get("turnId"));
  const raw = str(form, "score", 2);
  const score = raw === "1" ? 1 : raw === "-1" ? -1 : null;
  if (Number.isFinite(threadId) && Number.isFinite(turnId)) await store.scoreSajuTurn(threadId, turnId, uid, score);
  revalidatePath("/diary/saju");
}

export async function deleteSajuThread(form: FormData): Promise<void> {
  const uid = await requireUid();
  const threadId = Number(form.get("threadId"));
  if (Number.isFinite(threadId)) await store.deleteSajuThread(threadId, uid);
  revalidatePath("/diary/saju");
}

/* ─────────────────────────── 펜 색 ─────────────────────────── */

export async function savePen(_prev: FormState, form: FormData): Promise<FormState> {
  const uid = await requireUid();
  const pen = str(form, "pen", 16);
  if (!isPenId(pen)) return { error: "고를 수 없는 색이에요." };

  await store.setPen(uid, pen);
  revalidatePath("/diary", "layout");
  return { ok: true };
}
