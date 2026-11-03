import {
  type Chart, type Pillar, ELEMENTS, GAN_HANJA, JI_HANJA, GAN, JI, ganElement, jiElement, pillarText, currentDaeun, currentLuck,
} from "@/lib/saju/manse";
import { SectionHead } from "./page";
import { computeSinsal } from "@/lib/saju/sinsal";
import { stages } from "@/lib/saju/manse";

/* 만세력 결과를 보여주는 서버 컴포넌트. 색은 펜 두 가지 안에서만 — 오행 다섯 색을 새로 만들지 않는다. */

const ELEMENT_KO: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

function Cell({ gan, ji, tenGan, tenJi }: { gan: number; ji: number; tenGan: string | null; tenJi: string }) {
  return (
    <div className="flex flex-col items-center py-[var(--space-sm)] gap-[var(--space-xs)]">
      <span className={`text-[length:var(--text-sm)] ${tenGan ? "text-muted" : "text-pen-a font-medium"}`}>{tenGan ?? "나"}</span>
      <div className="flex flex-col items-center">
        <span className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] leading-none text-ink">{GAN_HANJA[gan]}</span>
        <span className="mt-1 text-[length:var(--text-sm)] text-muted">{GAN[gan]}{ganElement(gan)}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] leading-none text-ink">{JI_HANJA[ji]}</span>
        <span className="mt-1 text-[length:var(--text-sm)] text-muted">{JI[ji]}{jiElement(ji)}</span>
      </div>
      <span className="text-[length:var(--text-sm)] text-muted">{tenJi}</span>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-[var(--space-sm)] min-h-[11rem] gap-[var(--space-2xs)]">
      <span className="text-[length:var(--text-sm)] text-neutral">시간 몰라요</span>
      <span className="text-[length:var(--text-xs)] text-neutral">시주 없이 봐요</span>
    </div>
  );
}

export function PillarTable({ chart }: { chart: Chart }) {
  const { pillars: pl, tenGods: tg } = chart;
  // 만세력 관례대로 오른쪽이 연주, 왼쪽이 시주. 읽는 순서는 오른쪽부터.
  const cols: Array<{ label: string; p: Pillar | null; tenGan: string | null; tenJi: string | null }> = [
    { label: "시", p: pl.hour, tenGan: tg.hourGan, tenJi: tg.hourJi },
    { label: "일", p: pl.day, tenGan: null, tenJi: tg.dayJi },
    { label: "월", p: pl.month, tenGan: tg.monthGan, tenJi: tg.monthJi },
    { label: "연", p: pl.year, tenGan: tg.yearGan, tenJi: tg.yearJi },
  ];
  return (
    <div className="rounded-[var(--radius-card)] bg-paper-2 border border-rule-soft overflow-hidden">
      <div className="grid grid-cols-4 divide-x divide-rule-soft">
        {cols.map((c) => (
          <div key={c.label} className={`min-w-0 ${c.p ? "" : "bg-paper-3/40"}`}>
            <div className="text-center text-[length:var(--text-sm)] text-ink pt-[var(--space-sm)]">
              {c.label}주
            </div>
            {c.p ? <Cell gan={c.p.gan} ji={c.p.ji} tenGan={c.tenGan} tenJi={c.tenJi ?? ""} /> : <Empty />}
          </div>
        ))}
      </div>
      <p className="px-[var(--space-sm)] py-[var(--space-xs)] border-t border-rule-soft text-[length:var(--text-xs)] text-neutral">
        오른쪽 연주부터 읽어요. 위 글자가 천간, 아래 글자가 지지. 작은 글씨는 나(일간) 기준 십신.
      </p>
    </div>
  );
}

export function ElementBars({ chart }: { chart: Chart }) {
  const total = Object.values(chart.elements).reduce((a, b) => a + b, 0) || 1;
  return (
    <ul className="space-y-[var(--space-xs)]">
      {ELEMENTS.map((e) => {
        const n = chart.elements[e];
        const mine = e === chart.dayMaster.element;
        return (
          <li key={e} className="flex items-center gap-[var(--space-sm)] text-[length:var(--text-base)]">
            <span className={`w-12 shrink-0 ${mine ? "text-pen-a font-medium" : "text-muted"}`}>{e} {ELEMENT_KO[e]}</span>
            <span className="flex-1 h-2 rounded-[var(--radius-pill)] bg-paper-3 overflow-hidden" aria-hidden="true">
              <span className={`block h-full ${mine ? "bg-pen-a" : "bg-neutral/60"}`} style={{ width: `${(n / total) * 100}%` }} />
            </span>
            <span className="w-5 text-right tnum text-ink">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Summary({ chart }: { chart: Chart }) {
  const luck = currentLuck();
  const d = currentDaeun(chart, luck.year);
  const s = chart.strength;
  const mark = (b: boolean) => (b ? "○" : "×");
  const rows: Array<[string, string]> = [
    ["일간", `${chart.dayMaster.text}${chart.dayMaster.element} (${chart.dayMaster.hanja}) · ${chart.dayMaster.yinYang}`],
    ["강약", `${s.verdict}`],
    ["근거", `득령 ${mark(s.deukryeong)} · 득지 ${mark(s.deukji)} · 득세 ${mark(s.deukse)}`],
    ["대운", `${chart.daeun.direction} · ${chart.daeun.startAge}세부터`],
    ["지금", d.current ? `${pillarText(d.current.pillar)} 대운 (${d.current.age}세~)` : "첫 대운 이전"],
    ["다음", d.next ? `${pillarText(d.next.pillar)} 대운 (${d.next.age}세~)` : "없음"],
    ["올해", `세운 ${pillarText(luck.seun)}`],
    ["이달", `월운 ${pillarText(luck.wolun)}`],
  ];
  return (
    <dl className="divide-y divide-rule-soft">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[3rem_1fr] gap-[var(--space-sm)] py-[var(--space-xs)] text-[length:var(--text-base)]">
          <dt className="text-neutral">{k}</dt>
          <dd className="text-ink tnum">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DaeunStrip({ chart }: { chart: Chart }) {
  const luck = currentLuck();
  const d = currentDaeun(chart, luck.year);
  return (
    <section>
      <SectionHead>대운 흐름</SectionHead>
      <ol className="grid grid-cols-4 sm:grid-cols-8 gap-[var(--space-xs)]">
        {chart.daeun.list.slice(0, 8).map((x) => {
          const now = d.current?.age === x.age;
          return (
            <li
              key={x.age}
              className={`min-w-0 rounded-[var(--radius-input)] border px-1 py-[var(--space-xs)] text-center ${
                now ? "border-pen-a bg-pen-a-wash" : "border-rule-soft bg-paper-2"
              }`}
              aria-current={now ? "true" : undefined}
            >
              <div className="text-[length:var(--text-sm)] text-neutral tnum">{x.age}세</div>
              <div className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] text-ink">{pillarText(x.pillar)}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function TimingNote({ chart }: { chart: Chart }) {
  const t = chart.timing;
  const bits = [
    t.dstApplied ? "서머타임 1시간 뺌" : null,
    t.standardOffsetMin === 510 ? "당시 표준시 UTC+8:30" : "서울 경도 30분 보정",
    chart.input.time === null ? "시주 미상" : null,
  ].filter(Boolean);
  return (
    <p className="text-[length:var(--text-sm)] text-neutral">
      {bits.join(" · ")} · 계산에 쓴 시각 {t.localIso.replace("T", " ")}
    </p>
  );
}

export function SinsalList({ chart }: { chart: Chart }) {
  const items = computeSinsal(chart);
  return (
    <section className="space-y-[var(--space-sm)]">
      <SectionHead>12운성</SectionHead>
      <p className="text-[length:var(--text-base)] text-ink tnum">
        {stages(chart).map((x) => `${x.pos}지 ${JI[x.ji]} ${x.stage}`).join(" · ")}
      </p>
      <SectionHead>신살</SectionHead>
      {items.length === 0 ? (
        <p className="text-[length:var(--text-sm)] text-neutral">해당하는 신살이 없어요.</p>
      ) : (
        <ul className="divide-y divide-rule-soft">
          {items.map((s) => (
            <li key={s.name} className="py-[var(--space-xs)] flex gap-[var(--space-sm)] text-[length:var(--text-base)]">
              <span className={`w-20 shrink-0 ${s.kind === "길신" ? "text-pen-a" : s.kind === "흉신" ? "text-pen-b" : "text-muted"}`}>{s.name}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-ink">{s.where.join(", ")}</span>
                <span className="block text-[length:var(--text-sm)] text-neutral">{s.note}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
