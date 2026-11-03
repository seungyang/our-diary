"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MapPin, MapPinPlus, Search } from "lucide-react";
import { addPlace, deletePlace } from "@/lib/actions";
import { searchKakao, type KakaoHit } from "@/lib/kakao";
import type { Place } from "@/lib/store";
import { KakaoMap } from "./kakao-map";
import { Button, ErrorNote, Field, Input, cardClass, quietAction } from "./ui";
import { DateField } from "./date-field";

export function PlacesPanel({
  places,
  me,
  dateLabels,
  pens,
}: {
  places: Place[];
  me: string;
  dateLabels: Record<number, string>;
  pens: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(addPlace, undefined);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<KakaoHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, startSearch] = useTransition();
  const [focus, setFocus] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mapWrap = useRef<HTMLDivElement>(null);

  // 검색 결과나 목록을 누르면 지도가 보이는 자리로 돌아온다.
  function showMap() {
    mapWrap.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPicked(null);
      setName("");
      setQuery("");
      setHits([]);
      setSearched(false);
    }
  }, [state]);

  function search() {
    const q = query.trim();
    if (!q) return;
    startSearch(async () => {
      try {
        setHits(await searchKakao(q));
      } catch {
        setHits([]);
      }
      setSearched(true);
    });
  }

  return (
    <div className="space-y-7">
      <div ref={mapWrap} className="scroll-mt-14">
        <KakaoMap places={places} me={me} pens={pens} picked={picked} focus={focus} onPick={(lat, lng) => setPicked({ lat, lng })} />
      </div>

      <form ref={formRef} action={action} className={`${cardClass} space-y-[var(--space-md)]`}>
        <div className="flex items-center gap-[var(--space-xs)]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            enterKeyHint="search"
            placeholder="장소 찾기 (예: 을지로 국수, 속초 해변)"
          />
          <button
            type="button"
            onClick={search}
            disabled={searching}
            aria-label="찾기"
            className="press inline-flex items-center justify-center size-11 shrink-0 rounded-[var(--radius-pill)] border border-rule text-muted hover:text-ink cursor-pointer"
          >
            <Search size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {searching ? <p className="text-[length:var(--text-sm)] text-neutral">찾는 중</p> : null}
        {searched && !searching && hits.length === 0 ? (
          <p className="text-[length:var(--text-sm)] text-neutral">못 찾았어요. 다른 말로 찾거나 지도를 눌러 자리를 고르세요.</p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="max-h-64 overflow-y-auto divide-y divide-rule-soft rounded-[var(--radius-input)] border border-rule bg-paper">
            {hits.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked({ lat: h.lat, lng: h.lng });
                    setName(h.name);
                    setHits([]);
                    showMap();
                  }}
                  className="press w-full text-left px-3 py-2 min-h-11 flex items-start gap-2 hover:bg-paper-2 cursor-pointer"
                >
                  <MapPin size={16} className="mt-[4px] shrink-0 text-neutral" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-[length:var(--text-sm)] text-ink">{h.name}</span>
                    <span className="block text-[length:var(--text-xs)] text-neutral">{h.address}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-[length:var(--text-sm)] text-neutral">
          {picked ? "자리를 골랐어요. 이름을 확인하고 저장하면 됩니다." : "찾거나, 지도를 눌러 자리를 고르세요."}
        </p>

        <input type="hidden" name="lat" value={picked?.lat ?? ""} />
        <input type="hidden" name="lng" value={picked?.lng ?? ""} />

        <Field label="이름">
          <Input name="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-md)]">
          <Field label="간 날" hint="비워도 돼요">
            <DateField name="visitedOn" />
          </Field>
          <Field label="한 줄">
            <Input name="note" maxLength={80} placeholder="예: 첫 해외여행" />
          </Field>
        </div>

        {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <Button type="submit" full disabled={pending || !picked}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <MapPinPlus size={16} strokeWidth={2} aria-hidden="true" />}
          {pending ? "꽂는 중" : "지도에 꽂기"}
        </Button>
      </form>

      <section>
        <ul className="divide-y divide-rule-soft">
          {places.map((p) => (
            <li key={p.id} className="py-[var(--space-2xs)] flex items-center gap-[var(--space-xs)]">
              <button
                type="button"
                onClick={() => {
                  setFocus({ lat: p.lat, lng: p.lng, key: Date.now() });
                  showMap();
                }}
                aria-label={`${p.name} 지도에서 보기`}
                className="press flex-1 min-w-0 min-h-11 py-[var(--space-xs)] flex items-start gap-[var(--space-sm)] text-left rounded-[var(--radius-input)] hover:bg-paper-2 cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className="mt-[9px] size-2 rounded-full shrink-0"
                  style={{ background: pens[p.addedBy] ?? pens[me] }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[length:var(--text-base)] text-ink">{p.name}</span>
                  <span className="block text-[length:var(--text-sm)] text-neutral tnum">
                    {dateLabels[p.id] ?? ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
              </button>
              <form action={deletePlace}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className={`${quietAction} hover:text-danger`}>지우기</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
