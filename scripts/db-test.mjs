// Postgres 구현 검증 — PGlite(wasm Postgres)에 스키마를 올리고 store-pg의 모든 함수를 돌린다.
// 실행: npm run db:test
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { setQueryFn, migrate } from "../lib/db.ts";
import { hashPassword } from "../lib/auth.ts";

const pg = new PGlite();
setQueryFn(async (text, params = []) => (await pg.query(text, params)).rows);
await migrate(fs.readFileSync("lib/schema.sql", "utf8"));

const s = await import("../lib/store-pg.ts");
let pass = 0, fail = 0;
const ok = (cond, label, extra = "") => {
  if (cond) { pass++; console.log("  ok  ", label); }
  else { fail++; console.log("  FAIL", label, extra); }
};

console.log("스키마 적용 완료\n[사용자·연결]");
for (const [id, pw, admin] of [["현지", "0917", false], ["승용", "0917", false], ["admin", "admin12345", true]]) {
  await pg.query(`insert into users (id, name, password_hash, is_admin) values ($1, $1, $2, $3)`, [id, await hashPassword(pw), admin]);
}
ok((await s.authenticate("현지", "0917"))?.id === "현지", "로그인 성공");
ok((await s.authenticate("현지", "틀림")) === null, "틀린 비밀번호 거부");
ok((await s.getUser("admin"))?.isAdmin === true, "관리자 플래그");
ok((await s.listUsers()).length === 3, "사용자 목록");
ok((await s.listUsers()).every((u) => !("code" in u)), "목록에 코드 안 섞임");

console.log("[연결 코드]");
ok((await s.getInviteCode("현지")) === null, "처음엔 코드 없음");
ok((await s.setInviteCode("현지", "ABC234")) === true, "코드 걸기");
ok((await s.getInviteCode("현지")) === "ABC234", "내 코드 읽기");
ok((await s.setInviteCode("승용", "ABC234")) === false, "남이 쓰는 코드는 거부");
ok((await s.findUserByCode("ABC234"))?.id === "현지", "코드로 주인 찾기");
ok((await s.findUserByCode("ZZZZZZ")) === null, "없는 코드");
ok((await s.setInviteCode("현지", null)) === true && (await s.getInviteCode("현지")) === null, "코드 거두기");
ok((await s.findUserByCode("ABC234")) === null, "거둔 코드는 안 통함");

console.log("[연결]");
ok((await s.requestConnection("승용", "현지")).error === undefined, "연결 요청");
ok((await s.requestConnection("승용", "현지")).error?.includes("이미"), "중복 요청 거부");
ok((await s.requestConnection("승용", "없는사람")).error === "없는 사람이에요.", "없는 사람 거부");
const conn0 = (await s.listConnectionsFor("현지"))[0];
ok(conn0.status === "pending", "대기 상태");
await s.acceptConnection(conn0.id, "현지");
const conn = await s.activeConnection("현지");
ok(conn?.status === "accepted", "수락됨");
await s.setMetOn(conn.id, "2025-08-06");
ok((await s.getConnection(conn.id))?.metOn === "2025-08-06", "처음 만난 날");

console.log("[일기]");
const e1 = await s.insertEntry({ connectionId: conn.id, author: "현지", wroteOn: "2026-09-20", mood: "좋았어", body: "첫 글", photoUrl: null, thumbUrl: null });
await s.insertEntry({ connectionId: conn.id, author: "승용", wroteOn: "2026-09-22", mood: null, body: "둘째 글", photoUrl: null, thumbUrl: null });
ok(/^\d{4}-\d{2}-\d{2}T/.test(e1.createdAt), "createdAt ISO 형식", e1.createdAt);
const entries = await s.listEntries(conn.id);
ok(entries.length === 2 && entries[0].wroteOn === "2026-09-22", "최신순 목록");
ok((await s.listEntriesInMonth(conn.id, "2026-09")).length === 2, "이번 달 목록");
await s.updateEntry(e1.id, "현지", { body: "고친 글", mood: null });
ok((await s.listEntries(conn.id)).find((x) => x.id === e1.id)?.body === "고친 글", "수정");
await s.updateEntry(e1.id, "승용", { body: "남이 고침" });
ok((await s.listEntries(conn.id)).find((x) => x.id === e1.id)?.body === "고친 글", "남의 글은 못 고침");
await s.deleteEntry(e1.id, "현지");
ok((await s.listEntries(conn.id)).length === 1, "삭제");

console.log("[기념일·버킷]");
await s.insertMilestone({ connectionId: conn.id, label: "100일", onDate: "2025-11-14", yearly: false });
const ms = await s.listMilestones(conn.id);
ok(ms.length === 1 && ms[0].onDate === "2025-11-14", "기념일");
await s.deleteMilestone(ms[0].id, conn.id);
ok((await s.listMilestones(conn.id)).length === 0, "기념일 삭제");
await s.insertBucket({ connectionId: conn.id, title: "바다 보기", addedBy: "승용" });
await s.insertBucket({ connectionId: conn.id, title: "김치 담그기", addedBy: "현지" });
let buckets = await s.listBuckets(conn.id);
ok(buckets.length === 2 && buckets[0].title === "김치 담그기", "버킷 최신순");
await s.setBucketDone(buckets[1].id, conn.id, "2026-09-01");
buckets = await s.listBuckets(conn.id);
ok(buckets[1].doneOn === "2026-09-01" && buckets[0].doneOn === null, "이룬 것이 아래로");
await s.setBucketPhoto(buckets[0].id, conn.id, "u", "t");
ok((await s.listBuckets(conn.id))[0].photoUrl === "u", "사진");
const delId = buckets[0].id;
await s.deleteBucket(delId, conn.id);
ok((await s.listBuckets(conn.id)).length === 1, "soft delete");
ok((await s.restoreBucket(delId, conn.id)) === true, "되돌리기");
ok((await s.listBuckets(conn.id)).length === 2, "되돌린 뒤 목록");
ok((await s.restoreBucket(delId, conn.id)) === false, "두 번은 안 됨");

console.log("[질문·장소·위시]");
await s.upsertAnswer({ connectionId: conn.id, askedOn: "2026-09-22", questionIndex: 3, uid: "현지", text: "답1" });
await s.upsertAnswer({ connectionId: conn.id, askedOn: "2026-09-22", questionIndex: 3, uid: "현지", text: "고친 답" });
ok((await s.listAnswers(conn.id, "2026-09-22")).length === 1, "하루 한 번");
ok((await s.listAnswers(conn.id, "2026-09-22"))[0].text === "고친 답", "덮어쓰기");
ok((await s.listAnsweredDays(conn.id)).length === 0, "혼자 답한 날은 안 보임");
await s.upsertAnswer({ connectionId: conn.id, askedOn: "2026-09-22", questionIndex: 3, uid: "승용", text: "답2" });
const days = await s.listAnsweredDays(conn.id);
ok(days.length === 1 && days[0].answers.length === 2, "둘 다 답한 날");
await s.insertPlace({ connectionId: conn.id, name: "속초", lat: 38.1, lng: 128.6, visitedOn: "2026-08-01", note: null, addedBy: "현지" });
ok((await s.listPlaces(conn.id))[0].lat === 38.1, "장소");
await s.deletePlace((await s.listPlaces(conn.id))[0].id, conn.id);
ok((await s.listPlaces(conn.id)).length === 0, "장소 삭제");
await s.insertWish({ connectionId: conn.id, owner: "현지", title: "헤드폰", link: null, note: null });
const wishes = await s.listWishes(conn.id);
ok(wishes.length === 1, "위시");
await s.deleteWish(wishes[0].id, "승용");
ok((await s.listWishes(conn.id)).length === 1, "남의 위시는 못 지움");
await s.deleteWish(wishes[0].id, "현지");
ok((await s.listWishes(conn.id)).length === 0, "내 위시 삭제");

console.log("[알림]");
await s.notifyPartner(conn, "승용", "승용이 글을 남겼어요", "/diary");
ok((await s.listNotices("현지")).length === 1, "상대에게만");
ok((await s.listNotices("승용")).length === 0, "나에게는 안 옴");
ok((await s.countUnread("현지")) === 1, "안 읽음 수");
await s.markAllRead("현지");
ok((await s.countUnread("현지")) === 0, "읽음 처리");
for (let i = 0; i < 55; i++) await s.notifyPartner(conn, "승용", `알림 ${i}`, "/diary");
const kept = (await pg.query(`select count(*)::int as n from notices where for_uid = '현지'`)).rows[0].n;
ok(kept === 50, "50개로 잘림", kept);

console.log("[사주]");
await s.upsertSajuProfile({ uid: "현지", birthDate: "1996-04-25", birthTime: "10:00", gender: "F", calendar: "solar", lunarInput: null });
let p = await s.getSajuProfile("현지");
ok(p?.birthDate === "1996-04-25" && p?.gender === "F", "프로필 저장");
ok(p?.lunarInput === null, "양력이면 음력 원문 없음");
await s.upsertSajuProfile({ uid: "현지", birthDate: "1997-01-11", birthTime: null, gender: "F", calendar: "lunar", lunarInput: { date: "1996-12-03", leap: false } });
p = await s.getSajuProfile("현지");
ok(p?.birthTime === null && p?.calendar === "lunar" && p?.lunarInput?.date === "1996-12-03", "음력 덮어쓰기");
await s.upsertSajuProfile({ uid: "승용", birthDate: "1991-11-19", birthTime: "03:00", gender: "M", calendar: "solar", lunarInput: null });
ok((await s.listSajuProfiles()).length === 2, "프로필 목록(관리자)");

const t = await s.createSajuThread({ uid: "현지", questionId: "main", title: "사주 상담", partnerUid: "승용", knowledgeVersion: "v1" });
ok(typeof t.id === "number" && t.turns.length === 0, "대화 생성");
ok((await s.findSajuThread("현지", "main"))?.id === t.id, "main 찾기");
ok((await s.findSajuThread("현지", "free")) === null, "free는 안 찾음");
const me = await s.appendSajuTurn(t.id, "현지", { role: "me", text: "기본 풀이 부탁", prompt: "PROMPT", source: null, model: null });
ok(me?.role === "me" && me?.score === null, "내 턴");
ok((await s.appendSajuTurn(t.id, "승용", { role: "me", text: "남의 대화", prompt: null, source: null, model: null })) === null, "남의 대화엔 못 씀");
const reader = await s.appendSajuTurn(t.id, "현지", { role: "reader", text: "신약입니다", prompt: null, source: "copy", model: null });
const full = await s.getSajuThread(t.id, "현지");
ok(full?.turns.length === 2 && full.turns[0].text === "기본 풀이 부탁", "턴 순서");
ok(full?.turns[0].prompt === "PROMPT" && full.turns[1].source === "copy", "턴 필드");
await s.scoreSajuTurn(t.id, reader.id, "현지", 1);
ok((await s.getSajuThread(t.id, "현지"))?.turns[1].score === 1, "점수");
await s.scoreSajuTurn(t.id, reader.id, "승용", -1);
ok((await s.getSajuThread(t.id, "현지"))?.turns[1].score === 1, "남은 점수 못 바꿈");
const t2 = await s.createSajuThread({ uid: "승용", questionId: "free", title: "가게", partnerUid: null, knowledgeVersion: "v1" });
await s.appendSajuTurn(t2.id, "승용", { role: "me", text: "가게 열까요", prompt: "P2", source: null, model: null });
ok((await s.listSajuThreads("현지")).length === 1, "내 대화만");
const admin = await s.listAllSajuThreads();
ok(admin.length === 2 && admin.every((x) => x.turns.length > 0), "관리자는 전부 + 턴 포함");
ok((await s.getSajuThread(t.id, "승용")) === null, "남의 대화 못 봄");
await s.deleteSajuThread(t.id, "승용");
ok((await s.getSajuThread(t.id, "현지")) !== null, "남이 못 지움");
await s.deleteSajuThread(t.id, "현지");
ok((await s.getSajuThread(t.id, "현지")) === null, "내가 지움");
const orphan = (await pg.query(`select count(*)::int as n from saju_turns where thread_id = $1`, [t.id])).rows[0].n;
ok(orphan === 0, "턴도 같이 지워짐", orphan);

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
process.exit(fail ? 1 : 0);
