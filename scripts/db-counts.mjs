// 모든 테이블의 행 수와 계정 목록을 보여준다. 읽기만 한다.
// 실행: npx tsx scripts/db-counts.mjs
import fs from "node:fs";
import { query } from "../lib/db.ts";

if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const tables = [
  "users", "connections", "entries", "milestones", "buckets", "answers",
  "places", "wishes", "notices", "saju_profiles", "saju_threads", "saju_turns",
];
const parts = tables.map((t) => `(select count(*) from ${t})::int as ${t}`).join(", ");
console.log("행 수:", (await query(`select ${parts}`))[0]);
console.log("계정:", await query(`select id, is_admin, pen from users order by id`));
process.exit(0);
