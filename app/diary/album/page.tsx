import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import * as store from "@/lib/store";
import { humanDate, today } from "@/lib/date";
import { pensFor } from "@/lib/pens-server";
import { PageHead } from "@/components/page";
import { EmptyState, LinkButton } from "@/components/ui";
import { AlbumGrid, type AlbumPhoto } from "@/components/album-grid";

export const dynamic = "force-dynamic";

export default async function AlbumPage() {
  const session = await readSession();
  if (!session) redirect("/login");
  const conn = await store.activeConnection(session.uid);
  if (!conn) redirect("/connect");

  const partner = conn.requester === session.uid ? conn.addressee : conn.requester;
  const [entries, buckets, pens] = await Promise.all([
    store.listEntries(conn.id, 500),
    store.listBuckets(conn.id),
    pensFor(session.uid, partner),
  ]);
  const now = today();

  // 격자에는 작은 사진, 확대에는 원본. 둘 다 들고 간다.
  const photos: AlbumPhoto[] = [
    ...entries
      .filter((e) => e.photoUrl)
      .map((e) => ({
        key: `e${e.id}`,
        thumb: e.thumbUrl ?? (e.photoUrl as string),
        url: e.photoUrl as string,
        alt: `${e.author}의 사진`,
        caption: e.body,
        on: e.wroteOn,
        by: e.author,
        penColor: pens[e.author],
        label: humanDate(e.wroteOn, now),
        sortKey: e.wroteOn,
      })),
    ...buckets
      .filter((b) => b.photoUrl)
      .map((b) => {
        const on = b.doneOn ?? b.createdAt.slice(0, 10);
        return {
          key: `b${b.id}`,
          thumb: b.thumbUrl ?? (b.photoUrl as string),
          url: b.photoUrl as string,
          alt: b.title,
          caption: b.title,
          on,
          by: b.addedBy,
          penColor: pens[b.addedBy],
          label: humanDate(on, now),
          sortKey: on,
        };
      }),
  ].sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return (
    <>
      <PageHead
        title="앨범"
        sub={photos.length === 0 ? "아직 사진이 없어요" : `${photos.length}장 · 눌러서 크게 봐요`}
      />

      {photos.length === 0 ? (
        <EmptyState title="아직 사진이 없어요" body="오늘 일기에 사진을 붙이거나, 이룬 버킷에 사진을 붙이면 여기 모여요.">
          <LinkButton href="/diary" variant="quiet">오늘 적으러 가기</LinkButton>
        </EmptyState>
      ) : (
        <AlbumGrid photos={photos} />
      )}
    </>
  );
}
