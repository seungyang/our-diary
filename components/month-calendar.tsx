"use client";

import { useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { PageHead } from "./page";

/**
 * 달력 탭 — 날마다 누가 썼는지 점 두 색으로.
 * 날짜 고르기와 같은 달력 부품을 쓰니 앱 안의 달력이 한 얼굴이다.
 */

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MonthCalendar({
  days,
  today,
  me,
  partner,
  pens,
}: {
  days: Record<string, string[]>;
  today: string;
  me: string;
  partner: string;
  pens: Record<string, string>;
}) {
  const [y, m] = today.split("-").map(Number);
  const [month, setMonth] = useState(new Date(y, m - 1, 1));
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const wroteDays = Object.keys(days).filter((d) => d.startsWith(monthKey)).length;

  // 이 달력은 읽는 달력이다 — 날짜를 눌러서 갈 곳이 없으므로 버튼으로 두지 않는다.
  // 버튼이면 눌리고 포커스도 잡히는데 아무 일도 안 일어나서 고장 난 것처럼 보인다.
  function DayButton(props: DayButtonProps) {
    const { day, modifiers, className } = props;
    const ymd = toYmd(day.date);
    const who = days[ymd] ?? [];
    return (
      <span className={`${className ?? ""} rdp-day_button--dots rdp-day_button--flat`}>
        <span className={modifiers.today ? "font-semibold" : ""} style={modifiers.today ? { color: pens[me] } : undefined}>
          {day.date.getDate()}
        </span>
        <span className="flex gap-0.5 h-1.5" aria-hidden="true">
          {who.map((uid) => (
            <span key={uid} className="size-1.5 rounded-full" style={{ background: pens[uid] ?? pens[me] }} />
          ))}
        </span>
        {who.length ? <span className="sr-only">{who.length === 2 ? "둘 다 썼어요" : who[0] === me ? "내가 썼어요" : "상대가 썼어요"}</span> : null}
      </span>
    );
  }

  return (
    <div className="space-y-7">
      <PageHead
        title={<span className="tnum">{month.getFullYear()}년 {month.getMonth() + 1}월</span>}
        sub={wroteDays === 0 ? "아직 적은 날이 없어요" : `${wroteDays}일 적었어요`}
      />
      <DayPicker
        mode="single"
        locale={ko}
        month={month}
        onMonthChange={setMonth}
        captionLayout="dropdown"
        startMonth={new Date(2015, 0)}
        endMonth={new Date(y, m - 1)}
        disabled={{ after: new Date(y, m - 1, new Date(today).getDate()) }}
        components={{ DayButton }}
        className="rdp-month-view"
        hideNavigation={false}
      />
      <p className="text-[length:var(--text-sm)] text-neutral flex items-center justify-center gap-[var(--space-lg)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: pens[me] }} /> 나
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full" style={{ background: pens[partner] }} /> {partner}
        </span>
      </p>
    </div>
  );
}
