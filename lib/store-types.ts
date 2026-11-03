/**
 * 데이터 모양. 목업(store-mock)과 Postgres(store-pg)가 같은 타입을 쓴다.
 * 여기를 바꾸면 두 구현이 같이 바뀌어야 한다.
 */

/** pen = 이름 앞 점 색(lib/pens.ts의 id). 비어 있으면 기본색으로 떨어진다. */
export type User = { id: string; name: string; isAdmin: boolean; pen: string };

export type ConnectionStatus = "pending" | "accepted";

export type Connection = {
  id: number;
  requester: string;
  addressee: string;
  status: ConnectionStatus;
  metOn: string | null;
  createdAt: string;
};

export type Entry = {
  id: number;
  connectionId: number;
  author: string;
  wroteOn: string;
  mood: string | null;
  body: string;
  photoUrl: string | null;
  thumbUrl: string | null;
  createdAt: string;
};

export type Milestone = {
  id: number;
  connectionId: number;
  label: string;
  onDate: string;
  yearly: boolean;
};

export type Bucket = {
  id: number;
  connectionId: number;
  title: string;
  addedBy: string;
  doneOn: string | null; // 이룬 날. null이면 아직.
  photoUrl: string | null;
  thumbUrl: string | null;
  deletedAt: string | null; // 지운 것은 잠깐 남겨둔다 — 되돌리기용
  createdAt: string;
};

/** 오늘의 질문에 대한 답. 둘 다 답해야 서로 보인다. */
export type Answer = {
  id: number;
  connectionId: number;
  askedOn: string; // 질문 날짜
  questionIndex: number;
  uid: string;
  text: string;
  createdAt: string;
};

export type Place = {
  id: number;
  connectionId: number;
  name: string;
  lat: number;
  lng: number;
  visitedOn: string | null;
  note: string | null;
  addedBy: string;
  createdAt: string;
};

export type Wish = {
  id: number;
  connectionId: number;
  owner: string; // 갖고 싶은 사람
  title: string;
  link: string | null;
  note: string | null;
  createdAt: string;
};

export type Notice = {
  id: number;
  connectionId: number;
  forUid: string;
  text: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

/** 사주 입력값. 한 사람에 하나. 만세력은 이 값으로 매번 다시 계산한다(저장하지 않는다). */
export type SajuProfile = {
  uid: string;
  birthDate: string; // YYYY-MM-DD 양력(음력 입력이면 변환된 값)
  birthTime: string | null; // HH:mm, 모르면 null
  gender: "M" | "F";
  /** 입력이 음력이었는지. 화면 표시용. */
  calendar?: "solar" | "lunar";
  /** 음력 입력 원문 "YYYY-MM-DD"(윤달이면 leap true) */
  lunarInput?: { date: string; leap: boolean } | null;
  updatedAt: string;
};

/** 문답 한 턴. me = 내가 물은 것(복사할 프롬프트 포함), reader = 사주 보는 사람의 답. */
export type SajuTurn = {
  id: number;
  role: "me" | "reader";
  text: string;
  /** me 턴: 세션에 붙여넣을 전체 프롬프트 */
  prompt: string | null;
  source: "copy" | "api" | null;
  model: string | null;
  /** reader 턴에 대한 내 판정(+1 맞음 / -1 틀림) */
  score: 1 | -1 | null;
  createdAt: string;
};

/** 질문 하나를 두고 주고받은 문답. 질문마다 스레드 하나. */
export type SajuThread = {
  id: number;
  uid: string;
  questionId: string; // "free"면 직접 쓴 질문
  title: string;
  partnerUid: string | null;
  knowledgeVersion: string;
  turns: SajuTurn[];
  createdAt: string;
  updatedAt: string;
};
