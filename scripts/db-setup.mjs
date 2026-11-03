// 실제 Postgres(Neon 등)에 스키마를 올리고 계정을 만든다.
// 실행: npm run db:setup          (DATABASE_URL 필요 — .env.local 또는 환경변수)
//       npm run db:setup -- --seed  목업에 있던 예시 데이터까지 넣는다
//
// 여러 번 돌려도 안전하다. 이미 있는 것은 건드리지 않는다.
import fs from "node:fs";
import { query, migrate } from "../lib/db.ts";
import { hashPassword } from "../lib/auth.ts";

if (!process.env.DATABASE_URL) {
  // .env.local에 있으면 읽어 쓴다
  const f = ".env.local";
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 없습니다. Vercel에서 Neon을 연결한 뒤 `npx vercel env pull .env.local` 하세요.");
  process.exit(1);
}

console.log("스키마 적용 중…");
await migrate(fs.readFileSync("lib/schema.sql", "utf8"));
console.log("스키마 완료");

const ACCOUNTS = [
  { id: "현지", pw: "0917", admin: false, pen: "peri" },
  { id: "승용", pw: "0917", admin: false, pen: "peach" },
  { id: "admin", pw: "admin12345", admin: true, pen: "lilac" },
];

for (const a of ACCOUNTS) {
  const rows = await query(`select id from users where id = $1`, [a.id]);
  if (rows.length) { console.log(`계정 ${a.id}: 이미 있음`); continue; }
  await query(
    `insert into users (id, name, password_hash, is_admin, pen) values ($1, $1, $2, $3, $4)`,
    [a.id, await hashPassword(a.pw), a.admin, a.pen],
  );
  console.log(`계정 ${a.id}: 만듦 (펜 ${a.pen})`);
}

if (process.argv.includes("--seed")) {
  const conn = await query(
    `insert into connections (requester, addressee, status, met_on)
     values ('승용', '현지', 'accepted', current_date - 412)
     on conflict do nothing returning id`,
  );
  if (conn.length) {
    const id = conn[0].id;
    await query(
      `insert into entries (connection_id, author, wrote_on, mood, body) values
       ($1, '현지', current_date, '피곤해', '퇴근길에 비가 왔는데 우산을 두고 나왔다.'),
       ($1, '승용', current_date - 1, '좋았어', '점심에 네가 추천한 국수집 갔다. 다음엔 같이 가자.')`,
      [id],
    );
    await query(
      `insert into buckets (connection_id, title, added_by) values
       ($1, '토요일 오전에 바다 보러 가기', '승용'), ($1, '같이 김치 담가보기', '현지'), ($1, '제주도 한 달 살기', '현지')`,
      [id],
    );
    console.log("예시 데이터 넣음");
  } else {
    console.log("연결이 이미 있어 예시 데이터는 건너뜀");
  }
}

const counts = await query(
  `select
     (select count(*) from users)::int as users,
     (select count(*) from connections)::int as connections,
     (select count(*) from saju_threads)::int as threads`,
);
console.log("현재 상태:", counts[0]);
process.exit(0);
