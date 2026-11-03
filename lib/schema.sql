-- 우리의 다이어리 — Postgres 스키마.
-- 목업(store-mock)과 같은 모양이다. 새로 만들 때만 돌리면 되고, 여러 번 돌려도 안전하다.

create table if not exists users (
  id            text primary key,
  name          text not null,
  password_hash text not null,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists connections (
  id         bigserial primary key,
  requester  text not null references users(id) on delete cascade,
  addressee  text not null references users(id) on delete cascade,
  status     text not null check (status in ('pending', 'accepted')),
  met_on     date,
  created_at timestamptz not null default now()
);
-- 두 사람 사이의 연결은 하나. 방향이 반대인 중복도 막는다.
create unique index if not exists connections_pair
  on connections (least(requester, addressee), greatest(requester, addressee));

create table if not exists entries (
  id            bigserial primary key,
  connection_id bigint not null references connections(id) on delete cascade,
  author        text not null references users(id) on delete cascade,
  wrote_on      date not null,
  mood          text,
  body          text not null,
  photo_url     text,
  thumb_url     text,
  created_at    timestamptz not null default now()
);
create index if not exists entries_conn_date on entries (connection_id, wrote_on desc, id desc);

create table if not exists milestones (
  id            bigserial primary key,
  connection_id bigint not null references connections(id) on delete cascade,
  label         text not null,
  on_date       date not null,
  yearly        boolean not null default false
);
create index if not exists milestones_conn on milestones (connection_id, on_date);

create table if not exists buckets (
  id            bigserial primary key,
  connection_id bigint not null references connections(id) on delete cascade,
  title         text not null,
  added_by      text not null references users(id) on delete cascade,
  done_on       date,
  photo_url     text,
  thumb_url     text,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists buckets_conn on buckets (connection_id, deleted_at);

create table if not exists answers (
  id             bigserial primary key,
  connection_id  bigint not null references connections(id) on delete cascade,
  asked_on       date not null,
  question_index int not null,
  uid            text not null references users(id) on delete cascade,
  text           text not null,
  created_at     timestamptz not null default now()
);
-- 한 사람은 하루에 한 번만 답한다. 고치면 덮어쓴다.
create unique index if not exists answers_one_per_day on answers (connection_id, asked_on, uid);

create table if not exists places (
  id            bigserial primary key,
  connection_id bigint not null references connections(id) on delete cascade,
  name          text not null,
  lat           double precision not null,
  lng           double precision not null,
  visited_on    date,
  note          text,
  added_by      text not null references users(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists places_conn on places (connection_id);

create table if not exists wishes (
  id            bigserial primary key,
  connection_id bigint not null references connections(id) on delete cascade,
  owner         text not null references users(id) on delete cascade,
  title         text not null,
  link          text,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists wishes_conn on wishes (connection_id, created_at desc);

create table if not exists notices (
  id            bigserial primary key,
  connection_id bigint not null references connections(id) on delete cascade,
  for_uid       text not null references users(id) on delete cascade,
  text          text not null,
  href          text not null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists notices_for on notices (for_uid, created_at desc);

-- ── 사주 ──

create table if not exists saju_profiles (
  uid         text primary key references users(id) on delete cascade,
  birth_date  date not null,           -- 양력(음력 입력이면 변환된 값)
  birth_time  text,                    -- "HH:mm", 모르면 null
  gender      text not null check (gender in ('M', 'F')),
  calendar    text not null default 'solar' check (calendar in ('solar', 'lunar')),
  lunar_date  date,                    -- 음력 입력 원문
  lunar_leap  boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists saju_threads (
  id                bigserial primary key,
  uid               text not null references users(id) on delete cascade,
  question_id       text not null,     -- 'main' 또는 'free'
  title             text not null,
  partner_uid       text references users(id) on delete set null,
  knowledge_version text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists saju_threads_uid on saju_threads (uid, updated_at desc);
-- 한 사람의 'main' 대화는 하나.
create unique index if not exists saju_threads_main
  on saju_threads (uid, question_id) where question_id <> 'free';

create table if not exists saju_turns (
  id         bigserial primary key,
  thread_id  bigint not null references saju_threads(id) on delete cascade,
  role       text not null check (role in ('me', 'reader')),
  text       text not null,
  prompt     text,
  source     text check (source in ('copy', 'api')),
  model      text,
  score      smallint check (score in (-1, 1)),
  created_at timestamptz not null default now()
);
create index if not exists saju_turns_thread on saju_turns (thread_id, id);

-- 펜 색(이름 앞 점). 나중에 추가된 컬럼이라 alter로 둔다.
alter table users add column if not exists pen text not null default 'peri';

-- 연결 코드. 상대에게 알려주는 6자리 비밀코드 — 쓰고 나면 지운다.
alter table users add column if not exists invite_code text;
create unique index if not exists users_invite_code on users (invite_code);
