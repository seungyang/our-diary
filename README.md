# 우리의 다이어리

둘이 한 권을 나눠 쓰는 연인 다이어리. Next.js 16 · Tailwind v4 · shadcn/ui(Radix) · react-day-picker · sonner · lucide · Vercel.

**주소**: https://twopens.vercel.app (기본 URL: https://our-diary-eta.vercel.app)

모바일 우선 — 하단 탭 5개(버킷·오늘·질문·앨범·더보기), 모든 탭 타깃 44px 이상. PWA 매니페스트 포함(홈 화면에 추가 가능).

사진: 브라우저에서 긴 변 1800px JPEG(≈300~500KB) + 480px 썸네일로 줄인 뒤 올림(`lib/image-client.ts`). 저장은 Vercel Blob(`our-diary-photos`). 토큰이 없는 로컬에서는 data URL로 메모리에 둔다.
알림: 지금은 앱 안 알림(더보기 탭 점). 푸시 알림은 DB + VAPID 키가 생기면 붙입니다.

## 지금 상태 — 진짜 저장

- Neon Postgres(`neon-pink-drum`)와 Vercel Blob(`our-diary-photos`)이 프로젝트에 붙어 있습니다. 쓴 것은 영구히 남습니다.
- 계정 3개만 들어 있습니다: `현지 / 0917`, `승용 / 0917`, `admin / admin12345`. 펜 색은 차례로 쪽빛·살구·라일락.
- 나머지는 전부 비어 있습니다. 연결도 없으니 로그인하면 `/connect`에서 코드로 서로를 잇는 것부터 시작합니다.
- 계정만 남기고 다시 비우려면 `npx tsx scripts/db-wipe.mjs --yes`.
- 상태를 보려면 `npx tsx scripts/db-counts.mjs`.

## 화면

| 경로 | 무엇 |
| --- | --- |
| `/` | 편지체 랜딩 |
| `/login` | 아이디·비밀번호 |
| `/connect` | 코드 만들기 · 코드 입력하기 (누가 이 앱을 쓰는지는 보여주지 않음) |
| `/diary/bucket` | 같이 할 것(버킷리스트) — 로그인 후 첫 화면. 둘 다 체크 가능, 누가 적었는지 펜 색 |
| `/diary` | 오늘 쓰기 + 날짜별 타임라인 (내 글 고치기/지우기) |
| `/diary/question` | 오늘의 질문 — 날짜로 정해지는 질문 하나에 둘 다 답하면 서로 보임. 지난 질문 모음 |
| `/diary/album` | 일기·이룬 버킷에 붙인 사진 모음 |
| `/diary/places` | 함께 간 곳 — 카카오맵에 펜 색 핀. 카카오 키워드 검색 또는 지도 클릭으로 추가 (`NEXT_PUBLIC_KAKAO_JS_KEY`) |
| `/diary/wish` | 위시리스트 — 각자 갖고 싶은 것. 상대 것은 보기만, 내 것은 추가/삭제 |
| `/diary/more` | 알림(상대가 남긴 일기·버킷·답·핀·위시) + 지도/위시/달력/설정 링크 + 홈 화면 추가 안내 |
| `/diary/calendar` | 월별로 누가 썼는지 점으로 |
| `/diary/settings` | 처음 만난 날 · 기념일 · 연결 관리 · 나가기 |

## 연결 — 6자리 코드

누가 이 앱을 쓰는지 목록으로 보여주지 않는다. 아는 사람끼리 코드를 주고받아 잇는다.

1. 둘 중 한 사람이 `/connect`에서 **코드 만들기** — `H5PWAZ` 같은 6자리가 뜬다(헷갈리는 0·O·1·I를 뺀 31글자, 약 8억 9천만 가지).
2. 그 코드를 상대에게 알려준다. 카톡이든 말로든.
3. 상대가 **코드 입력하기**에 적으면 그 자리에서 이어진다. 코드를 만들어 건넨 것이 곧 승낙이라 따로 수락 화면이 없다.
4. 쓰인 코드는 바로 사라진다 — 한 번만 통한다. 새로 만들면 옛 코드는 그때 못 쓴다.

코드는 `users.invite_code`에 있고(유니크), 만들기·거두기·찾기는 `lib/invite-code.ts`와 store의 `getInviteCode`·`setInviteCode`·`findUserByCode`.

## 로컬 실행

```bash
npm install
npm run dev
```

## 다음 단계

- 푸시 알림(VAPID 키) — 지금은 앱 안 알림만.
- 사주 해석 API 모드 — `ANTHROPIC_API_KEY`를 붙이면 프롬프트 복사 대신 바로 풀이.

## 디자인

`tokens.css`가 유일한 색·폰트·간격 정의입니다. 컨셉은 "두 자루의 펜" v3(첫만남의 온도) — 복숭아빛 도는 흰 종이, 나는 자두색 펜, 상대는 코랄 로즈 펜. shadcn 컴포넌트는 `components/shadcn/`에 있고 색 이름(primary/border/ring…)은 `app/globals.css`에서 우리 토큰으로 매핑됩니다. 화면은 `components/ui.tsx` 래퍼(Button/Input/Textarea/Field…)만 씁니다. 브라우저 기본 컨트롤(날짜 입력 등)은 쓰지 않습니다.

## 사주 풀이 (`/diary/saju`)

- 만세력은 `lib/saju/manse.ts`가 계산한다(절기 시각·서머타임·표준시 이력·30분 보정). LLM은 계산하지 않는다.
- 신살은 `lib/saju/sinsal.ts`, 해석 규칙(지식창고)은 `lib/saju/knowledge.ts`, 15개 질문 프롬프트는 `lib/saju/prompts.ts`.
- 해석 모드: `ANTHROPIC_API_KEY`가 있으면 API(`lib/saju/llm.ts`), 없으면 "프롬프트 복사 → 세션 답 붙여넣기".
- `npm run saju:test` 골든 데이터(`lib/saju/golden/`)와 엔진 비교 · `npm run saju:eval` 해석 품질 루프(`eval/`).

## 데이터 저장소

- 입구는 `lib/store.ts` 하나. `DATABASE_URL`이 있으면 Postgres(`lib/store-pg.ts`), 없으면 목업(`lib/store-mock.ts`)으로 자동으로 갈린다. 화면·액션 코드는 그대로다.
- 타입은 `lib/store-types.ts` 한 곳. 두 구현이 같은 모양을 지킨다.
- 스키마는 `lib/schema.sql`. 여러 번 돌려도 안전하다(create if not exists).
- `npm run db:test` — PGlite(wasm Postgres)에 스키마를 올리고 Postgres 구현 전체를 검증한다(58건).
- `npm run db:setup` — 진짜 DB에 스키마를 올리고 계정 3개를 만든다. `-- --seed`를 붙이면 예시 데이터까지.

- `npx tsx scripts/db-counts.mjs` — 테이블별 행 수와 계정 목록을 본다.

### 붙어 있는 저장소
- Postgres: Neon `neon-pink-drum` — `DATABASE_URL`이 세 환경(Production·Preview·Development)에 들어 있다.
- 사진: Vercel Blob `our-diary-photos`(public) — `BLOB_READ_WRITE_TOKEN`.
- 새 PC나 새로 받은 저장소에서는 `npx vercel env pull .env.local` 후 `npm run db:setup`.
