import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { DiaryTabs } from "@/components/diary-nav";
import { Page, TopBar } from "@/components/page";
import { ThemeScope } from "@/components/theme-scope";

export default async function DiaryLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/login");

  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const [unread, me, you] = await Promise.all([
    store.countUnread(session.uid),
    store.getUser(session.uid),
    store.getUser(partner),
  ]);

  return (
    <ThemeScope mine={me?.pen} theirs={you?.pen} className="min-h-dvh">
      <TopBar title={`${session.uid} · ${partner}`} href="/diary/bucket" />
      <Page>{children}</Page>
      <DiaryTabs unread={unread} />
    </ThemeScope>
  );
}
