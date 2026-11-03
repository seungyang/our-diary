// 엔진 vs lunar-javascript(북경시 기준, 보정 없음) 비교 — 골든 데이터 오기 전 1차 점검
import { computeChart, pillarText } from "../lib/saju/manse.ts";
import { Solar } from "lunar-javascript";
import fs from "node:fs";
const { cases } = JSON.parse(fs.readFileSync("lib/saju/golden/cases.json", "utf8"));
const H = { 甲:"갑",乙:"을",丙:"병",丁:"정",戊:"무",己:"기",庚:"경",辛:"신",壬:"임",癸:"계",子:"자",丑:"축",寅:"인",卯:"묘",辰:"진",巳:"사",午:"오",未:"미",申:"신",酉:"유",戌:"술",亥:"해" };
const ko = (s) => [...s].map((c) => H[c] ?? c).join("");
for (const c of cases) {
  const [date, time] = c.birth.split("T");
  const ch = computeChart({ date, time, gender: c.gender });
  const [y, m, d] = date.split("-").map(Number); const [hh, mm] = time.split(":").map(Number);
  const ec = Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar().getEightChar();
  const mine = [ch.pillars.year, ch.pillars.month, ch.pillars.day, ch.pillars.hour].map(pillarText).join(" ");
  const lib = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].map(ko).join(" ");
  console.log(c.id, c.birth, c.gender, "| 엔진:", mine, "| lib:", lib, mine === lib ? "" : "≠", "| dst", ch.timing.dstApplied, "| 대운", ch.daeun.direction, ch.daeun.startAge, "| local", ch.timing.localIso);
}
