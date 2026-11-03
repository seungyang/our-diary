"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * 토스트는 하단 탭 위에, 우리 종이·잉크 색으로. 테마는 시스템 설정을 따른다.
 * (shadcn 기본판은 next-themes를 요구하는데, 우리는 CSS 변수로 다크를 처리하므로 뺐다.)
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      position="bottom-center"
      offset={{ bottom: 76 }}
      mobileOffset={{ bottom: 76 }}
      duration={5000}
      closeButton={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "w-full max-w-[28rem] flex items-center gap-3 rounded-[var(--radius-card)] border border-rule bg-paper-3 text-ink pl-4 pr-1.5 py-1.5 shadow-[var(--shadow-lift)] font-[family-name:var(--font-body)]",
          title: "text-[length:var(--text-sm)] text-ink flex-1 min-w-0 truncate",
          description: "text-[length:var(--text-xs)] text-neutral",
          actionButton:
            "press ml-auto shrink-0 inline-flex items-center min-h-11 px-3 rounded-[var(--radius-pill)] text-[length:var(--text-sm)] font-medium text-pen-a cursor-pointer",
          cancelButton: "press shrink-0 inline-flex items-center min-h-11 px-3 text-[length:var(--text-sm)] text-neutral cursor-pointer",
        },
      }}
      {...props}
    />
  );
}
