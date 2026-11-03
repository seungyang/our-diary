// 계정만 남기고 나머지 데이터를 전부 지운다.
// 실행: npx tsx scripts/db-wipe.mjs --yes
//
// users는 건드리지 않는다(연결 코드만 거둔다). connections를 지우면
// 일기·버킷·답·핀·위시·알림은 on delete cascade로 같이 사라진다.
import fs from "node:fs";
import { query } from "../lib/db.ts";

if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 없습니다.");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error("되돌릴 수 없습니다. 정말 지우려면 --yes 를 붙이세요.");
  process.exit(1);
}

await query(`delete from connections`); // 딸린 기록은 cascade로 함께 사라진다
await query(`delete from saju_threads`);
await query(`delete from saju_profiles`);
await query(`update users set invite_code = null`);

const tables = [
  "users", "connections", "entries", "milestones", "buckets", "answers",
  "places", "wishes", "notices", "saju_profiles", "saju_threads", "saju_turns",
];
const parts = tables.map((t) => `(select count(*) from ${t})::int as ${t}`).join(", ");
console.log("지운 뒤:", (await query(`select ${parts}`))[0]);
process.exit(0);
