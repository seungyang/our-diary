import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { humanDate, today } from "@/lib/date";
import { pensFor } from "@/lib/pens-server";
import { PlacesPanel } from "@/components/places-panel";
import { PageHead } from "@/components/page";
import { SubBar } from "@/components/sub-bar";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const [places, pens] = await Promise.all([store.listPlaces(conn.id), pensFor(session.uid, partner)]);
  const now = today();
  const dateLabels = Object.fromEntries(places.map((p) => [p.id, p.visitedOn ? humanDate(p.visitedOn, now) : "날짜 없음"]));

  return (
    <>
      <SubBar title="함께 간 곳" />
      <PageHead title="함께 간 곳" sub={places.length === 0 ? "아직 핀이 없어요" : `${places.length}곳`} />
      <PlacesPanel places={places} me={session.uid} dateLabels={dateLabels} pens={pens} />
    </>
  );
}
