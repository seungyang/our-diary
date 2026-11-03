import "server-only";
import type {
  User, Connection, Entry, Milestone, Bucket, Answer, Place, Wish, Notice,
  SajuProfile, SajuThread, SajuTurn,
} from "./store-types";

/**
 * 데이터 계층.
 * 지금은 목업(인메모리)입니다. 서버리스에서는 인스턴스가 바뀌면 초기 데이터로 돌아갑니다.
 * DATABASE_URL이 생기면 같은 인터페이스로 Postgres 구현을 붙입니다.
 */

/* ─────────────────────────── 목업 데이터 ─────────────────────────── */

type MockDb = {
  users: Map<string, User & { password: string; code: string | null }>;
  connections: Connection[];
  entries: Entry[];
  milestones: Milestone[];
  buckets: Bucket[];
  answers: Answer[];
  places: Place[];
  wishes: Wish[];
  notices: Notice[];
  sajuProfiles: SajuProfile[];
  sajuThreads: SajuThread[];
  seq: number;
};

function ymd(daysAgo: number): string {
  const d = new Date(Date.now() + 9 * 3600_000 - daysAgo * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function seed(): MockDb {
  const users = new Map<string, User & { password: string; code: string | null }>([
    ["현지", { id: "현지", name: "현지", isAdmin: false, pen: "peri", password: "0917", code: null }],
    ["승용", { id: "승용", name: "승용", isAdmin: false, pen: "peach", password: "0917", code: null }],
    ["admin", { id: "admin", name: "admin", isAdmin: true, pen: "lilac", password: "admin12345", code: null }],
  ]);

  const connections: Connection[] = [
    {
      id: 1,
      requester: "승용",
      addressee: "현지",
      status: "accepted",
      metOn: ymd(412),
      createdAt: new Date(Date.now() - 400 * 86_400_000).toISOString(),
    },
    {
      id: 2,
      requester: "admin",
      addressee: "현지",
      status: "pending",
      metOn: null,
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ];

  const entries: Entry[] = [
    {
      id: 1,
      connectionId: 1,
      author: "현지",
      wroteOn: ymd(0),
      mood: "피곤해",
      body: "퇴근길에 비가 왔는데 우산을 두고 나왔다. 편의점 우산 사서 들어옴. 오늘은 일찍 잘래.",
      photoUrl: null,
      thumbUrl: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      connectionId: 1,
      author: "승용",
      wroteOn: ymd(1),
      mood: "좋았어",
      body: "점심에 네가 추천한 국수집 갔다. 진짜 맛있더라. 다음엔 같이 가자.",
      photoUrl: null,
      thumbUrl: null,
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      id: 3,
      connectionId: 1,
      author: "현지",
      wroteOn: ymd(1),
      mood: "그냥그래",
      body: "회의가 세 개. 저녁은 대충 김밥. 내일은 좀 나을 것 같아.",
      photoUrl: null,
      thumbUrl: null,
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      id: 4,
      connectionId: 1,
      author: "승용",
      wroteOn: ymd(3),
      mood: "설렜어",
      body: "주말 계획 세우다가 시간 다 감. 토요일 오전에 바다 어때.",
      photoUrl: null,
      thumbUrl: null,
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
    {
      id: 5,
      connectionId: 1,
      author: "현지",
      wroteOn: ymd(6),
      mood: "고마워",
      body: "아플 때 죽 사다 준 거. 말은 안 했는데 여기다 적어둔다.",
      photoUrl: null,
      thumbUrl: null,
      createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    },
  ];

  const milestones: Milestone[] = [
    { id: 1, connectionId: 1, label: "처음 만난 날", onDate: ymd(412), yearly: true },
    { id: 2, connectionId: 1, label: "현지 생일", onDate: `${ymd(0).slice(0, 4)}-11-02`, yearly: true },
  ];

  const buckets: Bucket[] = [
    { id: 1, connectionId: 1, title: "토요일 오전에 바다 보러 가기", addedBy: "승용", doneOn: null, photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    { id: 2, connectionId: 1, title: "같이 김치 담가보기", addedBy: "현지", doneOn: null, photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date(Date.now() - 20 * 86_400_000).toISOString() },
    { id: 3, connectionId: 1, title: "제주도 한 달 살기", addedBy: "현지", doneOn: null, photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date(Date.now() - 90 * 86_400_000).toISOString() },
    { id: 4, connectionId: 1, title: "네가 추천한 국수집 같이 가기", addedBy: "승용", doneOn: null, photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date(Date.now() - 86_400_000).toISOString() },
    { id: 5, connectionId: 1, title: "첫 해외여행 — 오사카", addedBy: "승용", doneOn: ymd(140), photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date(Date.now() - 200 * 86_400_000).toISOString() },
    { id: 6, connectionId: 1, title: "서로 부모님께 인사드리기", addedBy: "현지", doneOn: ymd(60), photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date(Date.now() - 300 * 86_400_000).toISOString() },
  ];

  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

  const answers: Answer[] = [
    { id: 1, connectionId: 1, askedOn: ymd(1), questionIndex: 0, uid: "현지", text: "네가 우산 없다고 뛰어와서 같이 씌워줬을 때.", createdAt: iso(1) },
    { id: 2, connectionId: 1, askedOn: ymd(1), questionIndex: 0, uid: "승용", text: "국수집에서 네가 내 국물까지 다 마셨을 때.", createdAt: iso(1) },
    { id: 3, connectionId: 1, askedOn: ymd(2), questionIndex: 0, uid: "승용", text: "아직 답 안 한 척.", createdAt: iso(2) },
  ];

  const places: Place[] = [
    { id: 1, connectionId: 1, name: "오사카 도톤보리", lat: 34.6687, lng: 135.5013, visitedOn: ymd(140), note: "첫 해외여행", addedBy: "승용", createdAt: iso(140) },
    { id: 2, connectionId: 1, name: "속초 해변", lat: 38.1906, lng: 128.6014, visitedOn: ymd(60), note: null, addedBy: "현지", createdAt: iso(60) },
    { id: 3, connectionId: 1, name: "을지로 국수집", lat: 37.5663, lng: 126.9911, visitedOn: ymd(1), note: "네가 추천한 데", addedBy: "승용", createdAt: iso(1) },
  ];

  const wishes: Wish[] = [
    { id: 1, connectionId: 1, owner: "현지", title: "무선 헤드폰", link: null, note: "베이지색이면 더 좋고", createdAt: iso(30) },
    { id: 2, connectionId: 1, owner: "현지", title: "필름 카메라 한 롤", link: null, note: null, createdAt: iso(10) },
    { id: 3, connectionId: 1, owner: "승용", title: "러닝화", link: null, note: "270", createdAt: iso(20) },
  ];

  const notices: Notice[] = [
    { id: 1, connectionId: 1, forUid: "현지", text: "승용이 오늘의 질문에 답했어요", href: "/diary/question", createdAt: iso(0.1), readAt: null },
    { id: 2, connectionId: 1, forUid: "현지", text: "승용이 '토요일 오전에 바다 보러 가기'를 적었어요", href: "/diary/bucket", createdAt: iso(3), readAt: null },
    { id: 3, connectionId: 1, forUid: "승용", text: "현지가 오늘 일기를 남겼어요", href: "/diary", createdAt: iso(0.2), readAt: null },
  ];

  return { users, connections, entries, milestones, buckets, answers, places, wishes, notices, sajuProfiles: [], sajuThreads: [], seq: 100 };
}

const g = globalThis as unknown as { __mockDb?: MockDb };
const db: MockDb = g.__mockDb ?? (g.__mockDb = seed());


/* ─────────────────────────── 사용자 ─────────────────────────── */

/** 비밀번호·연결 코드는 밖으로 내보내지 않는다. */
function publicUser(u: User & { password: string; code: string | null }): User {
  return { id: u.id, name: u.name, isAdmin: u.isAdmin, pen: u.pen };
}

export async function authenticate(id: string, password: string): Promise<User | null> {
  const u = db.users.get(id.trim());
  if (!u || u.password !== password) return null;
  return publicUser(u);
}

export async function getUser(id: string): Promise<User | null> {
  const u = db.users.get(id);
  return u ? publicUser(u) : null;
}

export async function listUsers(): Promise<User[]> {
  return [...db.users.values()].map(publicUser);
}

/** 내 펜 색 바꾸기. */
export async function setPen(uid: string, pen: string): Promise<void> {
  const u = db.users.get(uid);
  if (u) u.pen = pen;
}

/* ── 연결 코드 ── */

export async function getInviteCode(uid: string): Promise<string | null> {
  return db.users.get(uid)?.code ?? null;
}

/** 새 코드를 건다. 이미 쓰이는 코드면 false — 부르는 쪽이 다시 뽑는다. */
export async function setInviteCode(uid: string, code: string | null): Promise<boolean> {
  const u = db.users.get(uid);
  if (!u) return false;
  if (code !== null && [...db.users.values()].some((x) => x.id !== uid && x.code === code)) return false;
  u.code = code;
  return true;
}

export async function findUserByCode(code: string): Promise<User | null> {
  const u = [...db.users.values()].find((x) => x.code === code);
  return u ? publicUser(u) : null;
}

/* ─────────────────────────── 연결 ─────────────────────────── */

export async function listConnectionsFor(uid: string): Promise<Connection[]> {
  return db.connections
    .filter((c) => c.requester === uid || c.addressee === uid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getConnection(id: number): Promise<Connection | null> {
  return db.connections.find((c) => c.id === id) ?? null;
}

/** 지금 함께 쓰고 있는 상대. 수락된 연결 중 가장 최근 것. */
export async function activeConnection(uid: string): Promise<Connection | null> {
  const mine = await listConnectionsFor(uid);
  return mine.find((c) => c.status === "accepted") ?? null;
}

export async function requestConnection(from: string, to: string): Promise<{ error?: string }> {
  if (from === to) return { error: "자기 자신에게는 보낼 수 없어요." };
  if (!db.users.has(to)) return { error: "없는 사람이에요." };
  const exists = db.connections.find(
    (c) =>
      (c.requester === from && c.addressee === to) ||
      (c.requester === to && c.addressee === from),
  );
  if (exists) {
    return {
      error:
        exists.status === "accepted"
          ? "이미 연결돼 있어요."
          : "이미 보낸 요청이 있어요. 상대가 수락하면 연결됩니다.",
    };
  }
  db.connections.push({
    id: ++db.seq,
    requester: from,
    addressee: to,
    status: "pending",
    metOn: null,
    createdAt: new Date().toISOString(),
  });
  return {};
}

export async function acceptConnection(id: number, uid: string): Promise<void> {
  const c = db.connections.find((x) => x.id === id);
  if (c && c.addressee === uid && c.status === "pending") c.status = "accepted";
}

/** 거절과 끊기는 같다 — 연결을 지운다. 기록은 그대로 둔다. */
export async function removeConnection(id: number, uid: string): Promise<void> {
  const i = db.connections.findIndex(
    (x) => x.id === id && (x.addressee === uid || x.requester === uid),
  );
  if (i >= 0) db.connections.splice(i, 1);
}

export async function setMetOn(connectionId: number, metOn: string | null): Promise<void> {
  const c = db.connections.find((x) => x.id === connectionId);
  if (c) c.metOn = metOn;
}

/* ─────────────────────────── 기록 ─────────────────────────── */

export async function listEntries(connectionId: number, limit = 60): Promise<Entry[]> {
  return db.entries
    .filter((e) => e.connectionId === connectionId)
    .sort((a, b) => b.wroteOn.localeCompare(a.wroteOn) || b.id - a.id)
    .slice(0, limit);
}

export async function listEntriesInMonth(connectionId: number, month: string): Promise<Entry[]> {
  return db.entries
    .filter((e) => e.connectionId === connectionId && e.wroteOn.startsWith(month))
    .sort((a, b) => a.wroteOn.localeCompare(b.wroteOn) || a.id - b.id);
}

export async function insertEntry(
  data: Omit<Entry, "id" | "createdAt">,
): Promise<Entry> {
  const entry: Entry = { ...data, id: ++db.seq, createdAt: new Date().toISOString() };
  db.entries.push(entry);
  return entry;
}

export async function updateEntry(
  id: number,
  author: string,
  patch: Partial<Pick<Entry, "body" | "mood" | "photoUrl" | "thumbUrl">>,
): Promise<void> {
  const e = db.entries.find((x) => x.id === id && x.author === author);
  if (e) Object.assign(e, patch);
}

export async function deleteEntry(id: number, author: string): Promise<void> {
  const i = db.entries.findIndex((x) => x.id === id && x.author === author);
  if (i >= 0) db.entries.splice(i, 1);
}

/* ─────────────────────────── 기념일 ─────────────────────────── */

export async function listMilestones(connectionId: number): Promise<Milestone[]> {
  return db.milestones
    .filter((m) => m.connectionId === connectionId)
    .sort((a, b) => a.onDate.localeCompare(b.onDate));
}

export async function insertMilestone(data: Omit<Milestone, "id">): Promise<void> {
  db.milestones.push({ ...data, id: ++db.seq });
}

export async function deleteMilestone(id: number, connectionId: number): Promise<void> {
  const i = db.milestones.findIndex((m) => m.id === id && m.connectionId === connectionId);
  if (i >= 0) db.milestones.splice(i, 1);
}

/* ─────────────────────────── 버킷리스트 ─────────────────────────── */

export async function listBuckets(connectionId: number): Promise<Bucket[]> {
  // 아직 안 한 것은 방금 적은 게 위, 이룬 것은 최근에 이룬 순. 지운 것은 빼고.
  return db.buckets
    .filter((b) => b.connectionId === connectionId && !b.deletedAt)
    .sort((a, b) => {
      if (!a.doneOn && !b.doneOn) return b.createdAt.localeCompare(a.createdAt);
      if (a.doneOn && b.doneOn) return b.doneOn.localeCompare(a.doneOn) || b.id - a.id;
      return a.doneOn ? 1 : -1;
    });
}

export async function insertBucket(data: Omit<Bucket, "id" | "createdAt" | "doneOn" | "photoUrl" | "thumbUrl" | "deletedAt">): Promise<void> {
  db.buckets.push({ ...data, id: ++db.seq, doneOn: null, photoUrl: null, thumbUrl: null, deletedAt: null, createdAt: new Date().toISOString() });
}

export async function setBucketPhoto(id: number, connectionId: number, photoUrl: string | null, thumbUrl: string | null): Promise<void> {
  const b = db.buckets.find((x) => x.id === id && x.connectionId === connectionId);
  if (b) {
    b.photoUrl = photoUrl;
    b.thumbUrl = thumbUrl;
  }
}

/** 둘 중 누구든 체크할 수 있다 — 같이 이룬 거니까. */
export async function setBucketDone(id: number, connectionId: number, doneOn: string | null): Promise<void> {
  const b = db.buckets.find((x) => x.id === id && x.connectionId === connectionId);
  if (b) b.doneOn = doneOn;
}

/** 바로 지우지 않고 표시만 한다. 5초 안에 되돌릴 수 있게. */
export async function deleteBucket(id: number, connectionId: number): Promise<void> {
  const b = db.buckets.find((x) => x.id === id && x.connectionId === connectionId);
  if (b) b.deletedAt = new Date().toISOString();
  // 하루 지난 휴지통은 비운다
  const cutoff = Date.now() - 86_400_000;
  for (let i = db.buckets.length - 1; i >= 0; i--) {
    const d = db.buckets[i].deletedAt;
    if (d && Date.parse(d) < cutoff) db.buckets.splice(i, 1);
  }
}

export async function restoreBucket(id: number, connectionId: number): Promise<boolean> {
  const b = db.buckets.find((x) => x.id === id && x.connectionId === connectionId);
  if (!b || !b.deletedAt) return false;
  b.deletedAt = null;
  return true;
}

/* ─────────────────────────── 오늘의 질문 ─────────────────────────── */

export async function listAnswers(connectionId: number, askedOn: string): Promise<Answer[]> {
  return db.answers.filter((a) => a.connectionId === connectionId && a.askedOn === askedOn);
}

/** 둘 다 답한 날만 — 지난 질문 목록용. 최근 순. */
export async function listAnsweredDays(
  connectionId: number,
  limit = 30,
): Promise<{ askedOn: string; questionIndex: number; answers: Answer[] }[]> {
  const byDay = new Map<string, Answer[]>();
  for (const a of db.answers) {
    if (a.connectionId !== connectionId) continue;
    byDay.set(a.askedOn, [...(byDay.get(a.askedOn) ?? []), a]);
  }
  return [...byDay.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([askedOn, list]) => ({ askedOn, questionIndex: list[0].questionIndex, answers: list }));
}

export async function upsertAnswer(data: Omit<Answer, "id" | "createdAt">): Promise<void> {
  const existing = db.answers.find(
    (a) => a.connectionId === data.connectionId && a.askedOn === data.askedOn && a.uid === data.uid,
  );
  if (existing) existing.text = data.text;
  else db.answers.push({ ...data, id: ++db.seq, createdAt: new Date().toISOString() });
}

/* ─────────────────────────── 함께 간 곳 ─────────────────────────── */

export async function listPlaces(connectionId: number): Promise<Place[]> {
  return db.places
    .filter((p) => p.connectionId === connectionId)
    .sort((a, b) => (b.visitedOn ?? b.createdAt).localeCompare(a.visitedOn ?? a.createdAt));
}

export async function insertPlace(data: Omit<Place, "id" | "createdAt">): Promise<void> {
  db.places.push({ ...data, id: ++db.seq, createdAt: new Date().toISOString() });
}

export async function deletePlace(id: number, connectionId: number): Promise<void> {
  const i = db.places.findIndex((p) => p.id === id && p.connectionId === connectionId);
  if (i >= 0) db.places.splice(i, 1);
}

/* ─────────────────────────── 위시리스트 ─────────────────────────── */

export async function listWishes(connectionId: number): Promise<Wish[]> {
  return db.wishes
    .filter((w) => w.connectionId === connectionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function insertWish(data: Omit<Wish, "id" | "createdAt">): Promise<void> {
  db.wishes.push({ ...data, id: ++db.seq, createdAt: new Date().toISOString() });
}

/** 자기 것만 지운다. */
export async function deleteWish(id: number, owner: string): Promise<void> {
  const i = db.wishes.findIndex((w) => w.id === id && w.owner === owner);
  if (i >= 0) db.wishes.splice(i, 1);
}

/* ─────────────────────────── 알림 ─────────────────────────── */

/** 상대에게 알림 하나. 내가 한 일은 나한테 알리지 않는다. */
export async function notifyPartner(conn: Connection, actor: string, text: string, href: string): Promise<void> {
  const forUid = conn.requester === actor ? conn.addressee : conn.requester;
  db.notices.push({
    id: ++db.seq, connectionId: conn.id, forUid, text, href,
    createdAt: new Date().toISOString(), readAt: null,
  });
  // 너무 쌓이지 않게 — 한 사람당 최근 50개만
  const mine = db.notices.filter((n) => n.forUid === forUid).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const old of mine.slice(50)) {
    const i = db.notices.indexOf(old);
    if (i >= 0) db.notices.splice(i, 1);
  }
}

export async function listNotices(forUid: string, limit = 30): Promise<Notice[]> {
  return db.notices
    .filter((n) => n.forUid === forUid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function countUnread(forUid: string): Promise<number> {
  return db.notices.filter((n) => n.forUid === forUid && !n.readAt).length;
}

export async function markAllRead(forUid: string): Promise<void> {
  const now = new Date().toISOString();
  for (const n of db.notices) if (n.forUid === forUid && !n.readAt) n.readAt = now;
}

/* ─────────────────────────── 사주 ─────────────────────────── */

export async function getSajuProfile(uid: string): Promise<SajuProfile | null> {
  return db.sajuProfiles.find((p) => p.uid === uid) ?? null;
}

export async function upsertSajuProfile(data: Omit<SajuProfile, "updatedAt">): Promise<void> {
  const now = new Date().toISOString();
  const i = db.sajuProfiles.findIndex((p) => p.uid === data.uid);
  if (i >= 0) db.sajuProfiles[i] = { ...data, updatedAt: now };
  else db.sajuProfiles.push({ ...data, updatedAt: now });
}

export async function listSajuProfiles(): Promise<SajuProfile[]> {
  return [...db.sajuProfiles];
}

export async function listSajuThreads(uid: string): Promise<SajuThread[]> {
  return db.sajuThreads.filter((t) => t.uid === uid).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** 관리자용 — 모든 사람의 문답. */
export async function listAllSajuThreads(): Promise<SajuThread[]> {
  return [...db.sajuThreads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSajuThread(id: number, uid: string): Promise<SajuThread | null> {
  return db.sajuThreads.find((t) => t.id === id && t.uid === uid) ?? null;
}

/** 질문(questionId)당 스레드 하나. free는 여러 개. */
export async function findSajuThread(uid: string, questionId: string): Promise<SajuThread | null> {
  if (questionId === "free") return null;
  return db.sajuThreads.find((t) => t.uid === uid && t.questionId === questionId) ?? null;
}

export async function createSajuThread(
  data: Omit<SajuThread, "id" | "turns" | "createdAt" | "updatedAt">,
): Promise<SajuThread> {
  const now = new Date().toISOString();
  const t: SajuThread = { ...data, id: ++db.seq, turns: [], createdAt: now, updatedAt: now };
  db.sajuThreads.push(t);
  return t;
}

export async function appendSajuTurn(
  threadId: number,
  uid: string,
  turn: Omit<SajuTurn, "id" | "createdAt" | "score">,
): Promise<SajuTurn | null> {
  const t = db.sajuThreads.find((x) => x.id === threadId && x.uid === uid);
  if (!t) return null;
  const now = new Date().toISOString();
  const nt: SajuTurn = { ...turn, id: ++db.seq, score: null, createdAt: now };
  t.turns.push(nt);
  t.updatedAt = now;
  return nt;
}

export async function scoreSajuTurn(threadId: number, turnId: number, uid: string, score: 1 | -1 | null): Promise<void> {
  const t = db.sajuThreads.find((x) => x.id === threadId && x.uid === uid);
  const turn = t?.turns.find((x) => x.id === turnId);
  if (turn) turn.score = score;
}

export async function deleteSajuThread(threadId: number, uid: string): Promise<void> {
  const i = db.sajuThreads.findIndex((x) => x.id === threadId && x.uid === uid);
  if (i >= 0) db.sajuThreads.splice(i, 1);
}
