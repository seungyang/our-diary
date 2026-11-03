"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { ko } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarDays, Dot, Eraser } from "lucide-react";
import { humanDate, today } from "@/lib/date";
import { Popover, PopoverContent, PopoverTrigger } from "./shadcn/popover";
import { inputClass } from "./styles";
import { Button } from "./ui";

/**
 * 날짜 고르기 — 브라우저 기본 창 대신 우리 얼굴로. (Radix Popover + react-day-picker)
 * 상단 년·월은 눌러서 바로 고를 수 있다. 1930년 생일도 스무 번 넘기지 않게.
 * 폼에는 숨은 input(YYYY-MM-DD)으로 들어가서 서버 액션 쪽은 바뀔 게 없다.
 */

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromYmd(s: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DatePicker({
  name,
  defaultValue = "",
  max,
  placeholder = "날짜 고르기",
  clearable = false,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  max?: string;
  placeholder?: string;
  clearable?: boolean;
  onChange?: (ymd: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const now = today();

  function set(next: string) {
    setValue(next);
    onChange?.(next);
    setOpen(false);
  }

  const selected = fromYmd(value);
  const maxDate = max ? fromYmd(max) : undefined;
  const todayAllowed = !max || now <= max;
  const thisYear = Number(now.slice(0, 4));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger asChild>
        <button type="button" className={`${inputClass} flex items-center justify-between gap-2 text-left cursor-pointer`}>
          <span className={value ? "text-ink" : "text-neutral"}>{value ? humanDate(value, now) : placeholder}</span>
          <CalendarDays size={18} strokeWidth={1.75} className="shrink-0 text-neutral" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-auto max-w-[calc(100vw-24px)] rounded-[var(--radius-card)] border-rule bg-paper p-[var(--space-sm)] shadow-[var(--shadow-lift)]"
      >
        <DayPicker
          mode="single"
          locale={ko}
          captionLayout="dropdown"
          startMonth={new Date(1930, 0)}
          endMonth={maxDate ?? new Date(thisYear + 10, 11)}
          selected={selected}
          defaultMonth={selected ?? (maxDate && maxDate < new Date() ? maxDate : new Date())}
          disabled={maxDate ? { after: maxDate } : undefined}
          onSelect={(d) => {
            if (d) set(toYmd(d));
          }}
          showOutsideDays
        />
        <div className="mt-[var(--space-xs)] pt-[var(--space-xs)] border-t border-rule-soft flex items-center justify-between gap-[var(--space-xs)]">
          {clearable ? (
            <Button type="button" variant="quiet" onClick={() => set("")} className="px-4">
              <Eraser size={16} strokeWidth={1.75} aria-hidden="true" />
              비우기
            </Button>
          ) : (
            <span />
          )}
          {todayAllowed ? (
            <Button type="button" onClick={() => set(now)} className="px-4">
              <Dot size={16} strokeWidth={3} aria-hidden="true" />
              오늘
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
