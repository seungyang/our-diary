"use client";

import { useState } from "react";
import { humanDate, today } from "@/lib/date";
import { Input } from "./ui";

/**
 * 날짜는 골라 넣지 않고 적어 넣는다. 숫자만 치면 하이픈이 알아서 들어간다.
 *   19920101 → 1992-01-01
 * 달력을 열어 스무 번 넘기는 것보다, 생일처럼 아는 날짜는 치는 게 빠르다.
 */

function format(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length > 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}

/** 달·일이 실제로 있는 날인지까지 본다. 2월 31일은 없다. */
function isRealDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12) return false;
  return new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;
}

export function DateField({
  name,
  defaultValue = "",
  max,
  required = false,
  allowToday = true,
  id,
}: {
  name: string;
  defaultValue?: string;
  /** 이 날짜보다 뒤는 안 된다(예: 일기는 오늘까지). */
  max?: string;
  required?: boolean;
  allowToday?: boolean;
  id?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const now = today();

  const filled = value.length === 10;
  const valid = isRealDate(value);
  const tooLate = valid && max ? value > max : false;
  const error = filled && !valid ? "그런 날짜는 없어요." : tooLate ? "오늘보다 뒤는 안 돼요." : "";

  return (
    <div>
      <div className="flex items-center gap-[var(--space-xs)]">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(format(e.target.value))}
          required={required}
          inputMode="numeric"
          autoComplete="off"
          placeholder="YYYY-MM-DD"
          aria-invalid={Boolean(error)}
          className="tnum tracking-[0.02em]"
        />
        {allowToday && (!max || now <= max) ? (
          <button
            type="button"
            onClick={() => setValue(now)}
            className="press shrink-0 inline-flex items-center min-h-11 px-3 rounded-[var(--radius-pill)] border border-rule text-[length:var(--text-sm)] text-muted hover:text-ink cursor-pointer whitespace-nowrap"
          >
            오늘
          </button>
        ) : null}
      </div>

      {/* 다 치면 무슨 요일인지 읽어 준다 — 잘못 친 날짜를 여기서 알아챈다. */}
      <p
        className={`mt-[var(--space-2xs)] text-[length:var(--text-sm)] ${error ? "text-danger" : "text-neutral"}`}
        role={error ? "alert" : undefined}
      >
        {error || (valid ? humanDate(value, now) : "숫자만 쳐도 돼요 — 19920101")}
      </p>
    </div>
  );
}
