import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { today } from "@/lib/date";
import { pensFor } from "@/lib/pens-server";
import { MonthCalendar } from "@/components/month-calendar";
import { SubBar } from "@/components/sub-bar";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  // 날짜 → 그날 쓴 사람들. 최근 500개면 두 사람이 매일 써도 8개월치다.
  const entries = await store.listEntries(conn.id, 500);
  const days: Record<string, string[]> = {};
  for (const e of entries) {
    const pen = e.author;
    const list = (days[e.wroteOn] ??= []);
    if (!list.includes(pen)) list.push(pen);
  }

  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const pens = await pensFor(session.uid, partner);

  return (
    <>
      <SubBar title="달력" />
      <MonthCalendar days={days} today={today()} me={session.uid} partner={partner} pens={pens} />
    </>
  );
}
