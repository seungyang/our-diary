/** 이 파일은 store.ts를 통해서만 쓰인다. server-only 가드는 store.ts가 들고 있다. */
import { query, one } from "./db";
import { verifyPassword } from "./auth";
import type {
  User, Connection, Entry, Milestone, Bucket, Answer, Place, Wish, Notice,
  SajuProfile, SajuThread, SajuTurn,
} from "./store-types";

/**
 * Postgres 구현. store-mock과 같은 함수·같은 반환 모양을 지킨다.
 * 시각은 전부 ISO 문자열로 돌려준다(목업과 맞추려고). 날짜(date)는 YYYY-MM-DD.
 */

/** timestamptz → ISO 문자열 */
const ts = (col: string, as: string) =>
  `to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "${as}"`;
const tsNullable = (col: string, as: string) =>
  `case when ${col} is null then null else ${ts(col, as).split(" as ")[0]} end as "${as}"`;

/* ─────────────────────────── 사용자 ─────────────────────────── */

export async function authenticate(id: string, password: string): Promise<User | null> {
  const row = await one<{ id: string; name: string; isAdmin: boolean; pen: string; hash: string }>(
    `select id, name, is_admin as "isAdmin", pen, password_hash as hash from users where id = $1`,
    [id.trim()],
  );
  if (!row) return null;
  if (!(await verifyPassword(password, row.hash))) return null;
  return { id: row.id, name: row.name, isAdmin: row.isAdmin, pen: row.pen };
}

export async function getUser(id: string): Promise<User | null> {
  return one<User>(`select id, name, is_admin as "isAdmin", pen from users where id = $1`, [id]);
}

export async function listUsers(): Promise<User[]> {
  return (await query(`select id, name, is_admin as "isAdmin", pen from users order by id`)) as unknown as User[];
}

/** 내 펜 색 바꾸기. */
export async function setPen(uid: string, pen: string): Promise<void> {
  await query(`update users set pen = $2 where id = $1`, [uid, pen]);
}

/* ── 연결 코드 ── */

export async function getInviteCode(uid: string): Promise<string | null> {
  const row = await one<{ code: string | null }>(`select invite_code as code from users where id = $1`, [uid]);
  return row?.code ?? null;
}

/** 새 코드를 건다. 이미 쓰이는 코드면 false — 부르는 쪽이 다시 뽑는다. */
export async function setInviteCode(uid: string, code: string | null): Promise<boolean> {
  if (code === null) {
    await query(`update users set invite_code = null where id = $1`, [uid]);
    return true;
  }
  const rows = await query(
    `update users set invite_code = $2
     where id = $1 and not exists (select 1 from users where invite_code = $2 and id <> $1)
     returning id`,
    [uid, code],
  );
  return rows.length > 0;
}

export async function findUserByCode(code: string): Promise<User | null> {
  return one<User>(
    `select id, name, is_admin as "isAdmin", pen from users where invite_code = $1`,
    [code],
  );
}

/* ─────────────────────────── 연결 ─────────────────────────── */

const CONN_COLS = `id, requester, addressee, status, met_on::text as "metOn", ${ts("created_at", "createdAt")}`;

export async function listConnectionsFor(uid: string): Promise<Connection[]> {
  return (await query(
    `select ${CONN_COLS} from connections where requester = $1 or addressee = $1 order by created_at desc`,
    [uid],
  )) as unknown as Connection[];
}

export async function getConnection(id: number): Promise<Connection | null> {
  return one<Connection>(`select ${CONN_COLS} from connections where id = $1`, [id]);
}

export async function activeConnection(uid: string): Promise<Connection | null> {
  return one<Connection>(
    `select ${CONN_COLS} from connections
     where (requester = $1 or addressee = $1) and status = 'accepted'
     order by created_at desc limit 1`,
    [uid],
  );
}

export async function requestConnection(from: string, to: string): Promise<{ error?: string }> {
  if (from === to) return { error: "자기 자신에게는 보낼 수 없어요." };
  if (!(await getUser(to))) return { error: "없는 사람이에요." };
  const exists = await one<{ status: string }>(
    `select status from connections
     where (requester = $1 and addressee = $2) or (requester = $2 and addressee = $1)`,
    [from, to],
  );
  if (exists) {
    return {
      error: exists.status === "accepted" ? "이미 연결돼 있어요." : "이미 보낸 요청이 있어요. 상대가 수락하면 연결됩니다.",
    };
  }
  await query(`insert into connections (requester, addressee, status) values ($1, $2, 'pending')`, [from, to]);
  return {};
}

export async function acceptConnection(id: number, uid: string): Promise<void> {
  await query(`update connections set status = 'accepted' where id = $1 and addressee = $2 and status = 'pending'`, [id, uid]);
}

export async function removeConnection(id: number, uid: string): Promise<void> {
  await query(`delete from connections where id = $1 and (requester = $2 or addressee = $2)`, [id, uid]);
}

export async function setMetOn(connectionId: number, metOn: string | null): Promise<void> {
  await query(`update connections set met_on = $2 where id = $1`, [connectionId, metOn]);
}

/* ─────────────────────────── 기록 ─────────────────────────── */

const ENTRY_COLS = `id, connection_id as "connectionId", author, wrote_on::text as "wroteOn", mood, body,
  photo_url as "photoUrl", thumb_url as "thumbUrl", ${ts("created_at", "createdAt")}`;

export async function listEntries(connectionId: number, limit = 60): Promise<Entry[]> {
  return (await query(
    `select ${ENTRY_COLS} from entries where connection_id = $1 order by wrote_on desc, id desc limit $2`,
    [connectionId, limit],
  )) as unknown as Entry[];
}

export async function listEntriesInMonth(connectionId: number, month: string): Promise<Entry[]> {
  return (await query(
    `select ${ENTRY_COLS} from entries
     where connection_id = $1 and to_char(wrote_on, 'YYYY-MM') = $2
     order by wrote_on, id`,
    [connectionId, month],
  )) as unknown as Entry[];
}

export async function insertEntry(data: Omit<Entry, "id" | "createdAt">): Promise<Entry> {
  const row = await one<Entry>(
    `insert into entries (connection_id, author, wrote_on, mood, body, photo_url, thumb_url)
     values ($1, $2, $3, $4, $5, $6, $7) returning ${ENTRY_COLS}`,
    [data.connectionId, data.author, data.wroteOn, data.mood, data.body, data.photoUrl, data.thumbUrl],
  );
  return row!;
}

export async function updateEntry(
  id: number,
  author: string,
  patch: Partial<Pick<Entry, "body" | "mood" | "photoUrl" | "thumbUrl">>,
): Promise<void> {
  const map: Record<string, string> = { body: "body", mood: "mood", photoUrl: "photo_url", thumbUrl: "thumb_url" };
  const sets: string[] = [];
  const vals: unknown[] = [id, author];
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      vals.push((patch as Record<string, unknown>)[k]);
      sets.push(`${col} = $${vals.length}`);
    }
  }
  if (!sets.length) return;
  await query(`update entries set ${sets.join(", ")} where id = $1 and author = $2`, vals);
}

export async function deleteEntry(id: number, author: string): Promise<void> {
  await query(`delete from entries where id = $1 and author = $2`, [id, author]);
}

/* ─────────────────────────── 기념일 ─────────────────────────── */

const MS_COLS = `id, connection_id as "connectionId", label, on_date::text as "onDate", yearly`;

export async function listMilestones(connectionId: number): Promise<Milestone[]> {
  return (await query(`select ${MS_COLS} from milestones where connection_id = $1 order by on_date`, [connectionId])) as unknown as Milestone[];
}

export async function insertMilestone(data: Omit<Milestone, "id">): Promise<void> {
  await query(`insert into milestones (connection_id, label, on_date, yearly) values ($1, $2, $3, $4)`, [
    data.connectionId, data.label, data.onDate, data.yearly,
  ]);
}

export async function deleteMilestone(id: number, connectionId: number): Promise<void> {
  await query(`delete from milestones where id = $1 and connection_id = $2`, [id, connectionId]);
}

/* ─────────────────────────── 버킷리스트 ─────────────────────────── */

const BUCKET_COLS = `id, connection_id as "connectionId", title, added_by as "addedBy", done_on::text as "doneOn",
  photo_url as "photoUrl", thumb_url as "thumbUrl", ${tsNullable("deleted_at", "deletedAt")}, ${ts("created_at", "createdAt")}`;

export async function listBuckets(connectionId: number): Promise<Bucket[]> {
  // 아직 안 한 것이 위(최근 적은 순), 이룬 것이 아래(최근 이룬 순).
  return (await query(
    `select ${BUCKET_COLS} from buckets
     where connection_id = $1 and deleted_at is null
     order by (done_on is not null), done_on desc nulls last, created_at desc, id desc`,
    [connectionId],
  )) as unknown as Bucket[];
}

export async function insertBucket(
  data: Omit<Bucket, "id" | "createdAt" | "doneOn" | "photoUrl" | "thumbUrl" | "deletedAt">,
): Promise<void> {
  await query(`insert into buckets (connection_id, title, added_by) values ($1, $2, $3)`, [
    data.connectionId, data.title, data.addedBy,
  ]);
}

export async function setBucketPhoto(id: number, connectionId: number, photoUrl: string | null, thumbUrl: string | null): Promise<void> {
  await query(`update buckets set photo_url = $3, thumb_url = $4 where id = $1 and connection_id = $2`, [id, connectionId, photoUrl, thumbUrl]);
}

export async function setBucketDone(id: number, connectionId: number, doneOn: string | null): Promise<void> {
  await query(`update buckets set done_on = $3 where id = $1 and connection_id = $2`, [id, connectionId, doneOn]);
}

export async function deleteBucket(id: number, connectionId: number): Promise<void> {
  await query(`update buckets set deleted_at = now() where id = $1 and connection_id = $2`, [id, connectionId]);
  // 하루 지난 휴지통은 비운다
  await query(`delete from buckets where deleted_at is not null and deleted_at < now() - interval '1 day'`);
}

export async function restoreBucket(id: number, connectionId: number): Promise<boolean> {
  const rows = await query(
    `update buckets set deleted_at = null where id = $1 and connection_id = $2 and deleted_at is not null returning id`,
    [id, connectionId],
  );
  return rows.length > 0;
}

/* ─────────────────────────── 오늘의 질문 ─────────────────────────── */

const ANSWER_COLS = `id, connection_id as "connectionId", asked_on::text as "askedOn",
  question_index as "questionIndex", uid, text, ${ts("created_at", "createdAt")}`;

export async function listAnswers(connectionId: number, askedOn: string): Promise<Answer[]> {
  return (await query(`select ${ANSWER_COLS} from answers where connection_id = $1 and asked_on = $2 order by id`, [connectionId, askedOn])) as unknown as Answer[];
}

export async function listAnsweredDays(
  connectionId: number,
  limit = 30,
): Promise<{ askedOn: string; questionIndex: number; answers: Answer[] }[]> {
  // 둘 다 답한 날만.
  const rows = (await query(
    `select ${ANSWER_COLS} from answers
     where connection_id = $1
       and asked_on in (
         select asked_on from answers where connection_id = $1 group by asked_on having count(*) >= 2
         order by asked_on desc limit $2
       )
     order by asked_on desc, id`,
    [connectionId, limit],
  )) as unknown as Answer[];
  const byDay = new Map<string, Answer[]>();
  for (const a of rows) byDay.set(a.askedOn, [...(byDay.get(a.askedOn) ?? []), a]);
  return [...byDay.entries()].map(([askedOn, answers]) => ({ askedOn, questionIndex: answers[0].questionIndex, answers }));
}

export async function upsertAnswer(data: Omit<Answer, "id" | "createdAt">): Promise<void> {
  await query(
    `insert into answers (connection_id, asked_on, question_index, uid, text)
     values ($1, $2, $3, $4, $5)
     on conflict (connection_id, asked_on, uid) do update set text = excluded.text`,
    [data.connectionId, data.askedOn, data.questionIndex, data.uid, data.text],
  );
}

/* ─────────────────────────── 함께 간 곳 ─────────────────────────── */

const PLACE_COLS = `id, connection_id as "connectionId", name, lat, lng, visited_on::text as "visitedOn",
  note, added_by as "addedBy", ${ts("created_at", "createdAt")}`;

export async function listPlaces(connectionId: number): Promise<Place[]> {
  return (await query(
    `select ${PLACE_COLS} from places where connection_id = $1 order by coalesce(visited_on, created_at::date) desc, id desc`,
    [connectionId],
  )) as unknown as Place[];
}

export async function insertPlace(data: Omit<Place, "id" | "createdAt">): Promise<void> {
  await query(`insert into places (connection_id, name, lat, lng, visited_on, note, added_by) values ($1,$2,$3,$4,$5,$6,$7)`, [
    data.connectionId, data.name, data.lat, data.lng, data.visitedOn, data.note, data.addedBy,
  ]);
}

export async function deletePlace(id: number, connectionId: number): Promise<void> {
  await query(`delete from places where id = $1 and connection_id = $2`, [id, connectionId]);
}

/* ─────────────────────────── 위시리스트 ─────────────────────────── */

const WISH_COLS = `id, connection_id as "connectionId", owner, title, link, note, ${ts("created_at", "createdAt")}`;

export async function listWishes(connectionId: number): Promise<Wish[]> {
  return (await query(`select ${WISH_COLS} from wishes where connection_id = $1 order by created_at desc, id desc`, [connectionId])) as unknown as Wish[];
}

export async function insertWish(data: Omit<Wish, "id" | "createdAt">): Promise<void> {
  await query(`insert into wishes (connection_id, owner, title, link, note) values ($1,$2,$3,$4,$5)`, [
    data.connectionId, data.owner, data.title, data.link, data.note,
  ]);
}

export async function deleteWish(id: number, owner: string): Promise<void> {
  await query(`delete from wishes where id = $1 and owner = $2`, [id, owner]);
}

/* ─────────────────────────── 알림 ─────────────────────────── */

const NOTICE_COLS = `id, connection_id as "connectionId", for_uid as "forUid", text, href,
  ${ts("created_at", "createdAt")}, ${tsNullable("read_at", "readAt")}`;

export async function notifyPartner(conn: Connection, actor: string, text: string, href: string): Promise<void> {
  const forUid = conn.requester === actor ? conn.addressee : conn.requester;
  await query(`insert into notices (connection_id, for_uid, text, href) values ($1,$2,$3,$4)`, [conn.id, forUid, text, href]);
  // 한 사람당 최근 50개만 남긴다.
  await query(
    `delete from notices where for_uid = $1 and id not in (
       select id from notices where for_uid = $1 order by created_at desc, id desc limit 50
     )`,
    [forUid],
  );
}

export async function listNotices(forUid: string, limit = 30): Promise<Notice[]> {
  return (await query(`select ${NOTICE_COLS} from notices where for_uid = $1 order by created_at desc, id desc limit $2`, [forUid, limit])) as unknown as Notice[];
}

export async function countUnread(forUid: string): Promise<number> {
  const row = await one<{ n: string }>(`select count(*)::text as n from notices where for_uid = $1 and read_at is null`, [forUid]);
  return Number(row?.n ?? 0);
}

export async function markAllRead(forUid: string): Promise<void> {
  await query(`update notices set read_at = now() where for_uid = $1 and read_at is null`, [forUid]);
}

/* ─────────────────────────── 사주 ─────────────────────────── */

const PROFILE_COLS = `uid, birth_date::text as "birthDate", birth_time as "birthTime", gender, calendar,
  lunar_date::text as "lunarDate", lunar_leap as "lunarLeap", ${ts("updated_at", "updatedAt")}`;

type ProfileRow = Omit<SajuProfile, "lunarInput"> & { lunarDate: string | null; lunarLeap: boolean };

function toProfile(r: ProfileRow): SajuProfile {
  return {
    uid: r.uid, birthDate: r.birthDate, birthTime: r.birthTime, gender: r.gender,
    calendar: r.calendar, updatedAt: r.updatedAt,
    lunarInput: r.lunarDate ? { date: r.lunarDate, leap: r.lunarLeap } : null,
  };
}

export async function getSajuProfile(uid: string): Promise<SajuProfile | null> {
  const r = await one<ProfileRow>(`select ${PROFILE_COLS} from saju_profiles where uid = $1`, [uid]);
  return r ? toProfile(r) : null;
}

export async function upsertSajuProfile(data: Omit<SajuProfile, "updatedAt">): Promise<void> {
  await query(
    `insert into saju_profiles (uid, birth_date, birth_time, gender, calendar, lunar_date, lunar_leap, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())
     on conflict (uid) do update set
       birth_date = excluded.birth_date, birth_time = excluded.birth_time, gender = excluded.gender,
       calendar = excluded.calendar, lunar_date = excluded.lunar_date, lunar_leap = excluded.lunar_leap,
       updated_at = now()`,
    [data.uid, data.birthDate, data.birthTime, data.gender, data.calendar ?? "solar", data.lunarInput?.date ?? null, data.lunarInput?.leap ?? false],
  );
}

export async function listSajuProfiles(): Promise<SajuProfile[]> {
  const rows = (await query(`select ${PROFILE_COLS} from saju_profiles order by uid`)) as unknown as ProfileRow[];
  return rows.map(toProfile);
}

const THREAD_COLS = `id, uid, question_id as "questionId", title, partner_uid as "partnerUid",
  knowledge_version as "knowledgeVersion", ${ts("created_at", "createdAt")}, ${ts("updated_at", "updatedAt")}`;
const TURN_COLS = `id, thread_id as "threadId", role, text, prompt, source, model, score, ${ts("created_at", "createdAt")}`;

type ThreadRow = Omit<SajuThread, "turns">;

/** 스레드에 턴을 붙여 준다. 목록이 길면 한 번에 가져와 나눠 담는다. */
async function withTurns(rows: ThreadRow[]): Promise<SajuThread[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const turns = (await query(
    `select ${TURN_COLS} from saju_turns where thread_id = any($1::bigint[]) order by thread_id, id`,
    [ids],
  )) as unknown as Array<SajuTurn & { threadId: number }>;
  const byThread = new Map<number, SajuTurn[]>();
  for (const t of turns) {
    const { threadId, ...turn } = t;
    byThread.set(Number(threadId), [...(byThread.get(Number(threadId)) ?? []), turn as SajuTurn]);
  }
  return rows.map((r) => ({ ...r, id: Number(r.id), turns: byThread.get(Number(r.id)) ?? [] }));
}

export async function listSajuThreads(uid: string): Promise<SajuThread[]> {
  const rows = (await query(`select ${THREAD_COLS} from saju_threads where uid = $1 order by updated_at desc`, [uid])) as unknown as ThreadRow[];
  return withTurns(rows);
}

export async function listAllSajuThreads(): Promise<SajuThread[]> {
  const rows = (await query(`select ${THREAD_COLS} from saju_threads order by updated_at desc limit 200`)) as unknown as ThreadRow[];
  return withTurns(rows);
}

export async function getSajuThread(id: number, uid: string): Promise<SajuThread | null> {
  const row = await one<ThreadRow>(`select ${THREAD_COLS} from saju_threads where id = $1 and uid = $2`, [id, uid]);
  if (!row) return null;
  return (await withTurns([row]))[0];
}

export async function findSajuThread(uid: string, questionId: string): Promise<SajuThread | null> {
  if (questionId === "free") return null;
  const row = await one<ThreadRow>(`select ${THREAD_COLS} from saju_threads where uid = $1 and question_id = $2`, [uid, questionId]);
  if (!row) return null;
  return (await withTurns([row]))[0];
}

export async function createSajuThread(data: Omit<SajuThread, "id" | "turns" | "createdAt" | "updatedAt">): Promise<SajuThread> {
  const row = await one<ThreadRow>(
    `insert into saju_threads (uid, question_id, title, partner_uid, knowledge_version)
     values ($1,$2,$3,$4,$5) returning ${THREAD_COLS}`,
    [data.uid, data.questionId, data.title, data.partnerUid, data.knowledgeVersion],
  );
  return { ...row!, id: Number(row!.id), turns: [] };
}

export async function appendSajuTurn(
  threadId: number,
  uid: string,
  turn: Omit<SajuTurn, "id" | "createdAt" | "score">,
): Promise<SajuTurn | null> {
  const owns = await one<{ id: number }>(`select id from saju_threads where id = $1 and uid = $2`, [threadId, uid]);
  if (!owns) return null;
  const row = await one<SajuTurn>(
    `insert into saju_turns (thread_id, role, text, prompt, source, model)
     values ($1,$2,$3,$4,$5,$6) returning ${TURN_COLS}`,
    [threadId, turn.role, turn.text, turn.prompt, turn.source, turn.model],
  );
  await query(`update saju_threads set updated_at = now() where id = $1`, [threadId]);
  return row ? { ...row, id: Number(row.id) } : null;
}

export async function scoreSajuTurn(threadId: number, turnId: number, uid: string, score: 1 | -1 | null): Promise<void> {
  await query(
    `update saju_turns set score = $4
     where id = $2 and thread_id = $1 and exists (select 1 from saju_threads t where t.id = $1 and t.uid = $3)`,
    [threadId, turnId, uid, score],
  );
}

export async function deleteSajuThread(threadId: number, uid: string): Promise<void> {
  await query(`delete from saju_threads where id = $1 and uid = $2`, [threadId, uid]);
}
