import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { today } from "@/lib/date";
import { pensFor } from "@/lib/pens-server";
import { BucketList } from "@/components/bucket-list";

export const dynamic = "force-dynamic";

export default async function BucketPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const [buckets, pens] = await Promise.all([store.listBuckets(conn.id), pensFor(session.uid, partner)]);

  return <BucketList buckets={buckets} me={session.uid} today={today()} pens={pens} />;
}
