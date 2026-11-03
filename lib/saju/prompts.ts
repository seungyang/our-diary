/**
 * 12가지 질문 프롬프트. [ ] 자리는 만세력 엔진이 채운다 — 사람이 손으로 적지 않는다.
 * 세션에 붙여넣는 전체 프롬프트(buildSessionPrompt)는
 *   1) 참고 자료 조사 지시 → 2) 페르소나 설정 → 3) 지식창고 규칙 → 4) 사주 데이터 → 5) 질문 → 6) 출력 규칙
 * 순서로 만들어진다. API 모드는 1)~3)을 system, 4)~6)을 user로 나눠 보낸다.
 */
import {
  type Chart, type Pillar, type TenGod, currentDaeun, currentLuck, monthPillarsOf, pillarText, pillarHanja, ELEMENTS,
  stages, hiddenTenGods, GAN, JI,
} from "./manse";
import { KNOWLEDGE, KNOWLEDGE_VERSION, REFERENCES } from "./knowledge";
import { sinsalLine } from "./sinsal";

export type QuestionGroup = "기본" | "재물과 직업" | "연애와 궁합" | "시기와 운의 흐름" | "종합";

export type Question = {
  id: string;
  n: number;
  group: QuestionGroup;
  title: string;
  /** 한 줄 설명 — 목록에서 보인다 */
  blurb: string;
  /** 상대 사주가 필요한 질문(궁합) */
  needsPartner?: boolean;
  /** 시주 미상이면 결론을 유보해야 하는 질문 */
  hourSensitive?: boolean;
};

export const QUESTIONS: Question[] = [
  { id: "structure", n: 1, group: "기본", title: "사주 구조 읽기", blurb: "가장 눈에 띄는 특징 세 가지와 근거 글자" },
  { id: "daymaster", n: 2, group: "기본", title: "일간 중심으로 나를 정의하기", blurb: "득령·득지·득세로 강약을 하나로 결론" },
  { id: "yongsin", n: 3, group: "기본", title: "용신 찾기", blurb: "용신·기신과 직업·환경·관계에서 늘리는 법" },
  { id: "wealth", n: 4, group: "재물과 직업", title: "재성 읽기", blurb: "고정 수입인가 변동 수입인가, 부담인가 자원인가" },
  { id: "career", n: 5, group: "재물과 직업", title: "직업 방향", blurb: "만드는 일과 관리하는 일 중 어느 쪽인가" },
  { id: "jobchange", n: 6, group: "재물과 직업", title: "지금 이직해도 되는가", blurb: "현재 대운·세운으로 유리·불리와 시기" },
  { id: "relation", n: 7, group: "연애와 궁합", title: "관계에서의 나", blurb: "일지와 배우자성으로 보는 반복 패턴" },
  { id: "match", n: 8, group: "연애와 궁합", title: "궁합 교차", blurb: "두 사람의 일간·일지 관계, 맞는 점과 부딪히는 점", needsPartner: true },
  { id: "breakup", n: 9, group: "연애와 궁합", title: "지금 관계를 정리해야 할까", blurb: "정리인가 유지인가, 30일 안에 볼 신호 세 가지" },
  { id: "daeun", n: 10, group: "시기와 운의 흐름", title: "대운 전환점", blurb: "지금 대운과 다음 대운의 차이, 미리 준비할 것" },
  { id: "year", n: 11, group: "시기와 운의 흐름", title: "올해의 흐름", blurb: "올해 강해지는 십신·약해지는 십신, 시작할 것과 미룰 것" },
  { id: "month", n: 12, group: "시기와 운의 흐름", title: "이번 달 판단", blurb: "이 달에 조심할 상황 하나, 밀어붙일 일 하나" },
  { id: "report", n: 13, group: "종합", title: "행동 패턴 리포트", blurb: "겉과 속, 반복되는 문제, 돈 버는 방식, 고칠 습관 세 가지까지 여덟 항목" },
  { id: "sinsal", n: 14, group: "종합", title: "길신·흉신 읽기", blurb: "귀인·역마·도화·공망·백호가 실제로 어떤 장면을 만드는가" },
  { id: "life", n: 15, group: "종합", title: "평생 리딩", blurb: "커리어·재물·관계·건강 네 갈래, 내년 월별 흐름, 10년 대운표, 생애 단계" },
];

export function questionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

const p = (x: Pillar | null) => (x ? `${pillarText(x)}(${pillarHanja(x)})` : "미상");

function tenGodLine(chart: Chart): string {
  const order: TenGod[] = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
  return order.filter((k) => chart.tenGodCounts[k] > 0).map((k) => `${k} ${chart.tenGodCounts[k]}`).join(", ");
}

/** 프롬프트에 들어가는 사주 데이터 블록. 성별에 따라 배우자성도 적어준다. */
export function chartBlock(chart: Chart, label = "내 사주"): string {
  const { pillars: pl, tenGods: tg } = chart;
  const luck = currentLuck();
  const d = currentDaeun(chart, luck.year);
  const spouseStar = chart.input.gender === "M" ? "재성(정재·편재)" : "관성(정관·편관)";
  const hourNote = pl.hour ? "" : " — 시주 미상(출생 시간 모름). 시주가 좌우하는 영역은 결론을 유보할 것.";
  const lines = [
    `[${label}]`,
    `연주: ${p(pl.year)}  월주: ${p(pl.month)}  일주: ${p(pl.day)}  시주: ${p(pl.hour)}${hourNote}`,
    `일간: ${chart.dayMaster.text}${chart.dayMaster.element}(${chart.dayMaster.hanja}) · ${chart.dayMaster.yinYang}`,
    `오행: ${ELEMENTS.map((e) => `${e} ${chart.elements[e]}`).join(", ")}`,
    `십신(일간 제외, 지지는 본기): ${tenGodLine(chart)}`,
    `  연간 ${tg.yearGan} · 월간 ${tg.monthGan} · 시간 ${tg.hourGan ?? "미상"} / 연지 ${tg.yearJi} · 월지 ${tg.monthJi} · 일지 ${tg.dayJi} · 시지 ${tg.hourJi ?? "미상"}`,
    `월령: ${chart.monthJie.prev} 이후 ${chart.monthJie.next} 이전 · 득령 ${chart.strength.deukryeong ? "○" : "×"} 득지 ${chart.strength.deukji ? "○" : "×"} 득세 ${chart.strength.deukse ? "○" : "×"} (엔진 1차 판정: ${chart.strength.verdict})`,
    `대운: ${chart.daeun.direction} · 대운수 ${chart.daeun.startAge} · 흐름 ${chart.daeun.list.map((x) => `${x.age}세(${x.fromYear}~) ${pillarText(x.pillar)}`).join(" → ")}`,
    `현재 대운: ${d.current ? `${pillarText(d.current.pillar)} (${d.current.age}세부터)` : "첫 대운 이전"} · 다음 대운: ${d.next ? `${pillarText(d.next.pillar)} (${d.next.age}세부터)` : "없음"}`,
    `올해 세운: ${pillarText(luck.seun)} (${luck.year}) · 이번 달 월운: ${pillarText(luck.wolun)}`,
    `성별: ${chart.input.gender === "M" ? "남" : "여"} · 배우자성: ${spouseStar}`,
    `지장간(숨은 천간 → 십신, *는 본기): ${hiddenTenGods(chart).map((h) => `${h.pos}지 ${JI[h.ji]}(${h.gans.map((g) => `${GAN[g.gan]}${g.main ? "*" : ""}${g.god}`).join("·")})`).join(" / ")}`,
    `12운성(일간 기준): ${stages(chart).map((x) => `${x.pos}지 ${JI[x.ji]} ${x.stage}`).join(", ")}`,
    `신살: ${sinsalLine(chart)}`,
    `내년(${luck.year + 1}) 월운: ${monthPillarsOf(luck.year + 1).map((m) => `${m.from} ${pillarText(m.pillar)}`).join(", ")}`,
  ];
  return lines.join("\n");
}

/** 질문 본문. 데이터는 chartBlock에 이미 있으니 여기서는 판단 지시만 쓴다. */
export function questionBody(q: Question, chart: Chart, partner?: Chart): string {
  const luck = currentLuck();
  const d = currentDaeun(chart, luck.year);
  const cur = d.current ? pillarText(d.current.pillar) : "첫 대운 이전";
  const next = d.next ? pillarText(d.next.pillar) : "없음";
  const seun = pillarText(luck.seun);
  const wolun = pillarText(luck.wolun);
  const dm = `${chart.dayMaster.text}${chart.dayMaster.element}`;
  const spouse = chart.input.gender === "M" ? "재성" : "관성";
  const birthYm = `${chart.input.date.slice(0, 4)}년 ${Number(chart.input.date.slice(5, 7))}월생`;

  switch (q.id) {
    case "structure":
      return `위는 내 사주팔자다. 이 데이터만 사용하고, 여기 없는 정보는 추측하지 마라.

이 구조에서 가장 눈에 띄는 특징 세 가지를 짚어라.
각 특징마다 (1) 어느 글자 배치에서 나온 판단인지, (2) 일상에서
어떤 장면으로 드러나는지를 함께 써라. 성격 묘사는 하지 마라.`;
    case "daymaster":
      return `내 일간은 ${dm}이고, 월지는 ${pillarText(chart.pillars.month).slice(1)}이다.
일간이 월령을 얻었는지(득령), 주변에서 도움을 받는지(득지·득세)를
판단하고, 그 결과 이 일간이 강한지 약한지 결론을 내려라.
"강할 수도 있고 약할 수도 있다"는 답은 받지 않겠다. 하나를 골라라.
엔진의 1차 판정과 다르게 보면 어느 글자 때문인지 밝혀라.`;
    case "yongsin":
      return `위 사주에서 용신과 기신을 판단하고, 그렇게 본 근거를 써라.
그 다음, 용신에 해당하는 오행을 일상에서 늘리는 구체적인 방법을
직업·환경·인간관계 세 영역에서 각각 한 가지씩 제안하라.
색깔이나 방위 같은 조언은 빼라.`;
    case "wealth":
      return `내 사주의 재성(정재·편재) 배치를 보고 다음을 판단하라.
- 나는 고정 수입과 변동 수입 중 어느 쪽이 사주 구조와 맞는가
- 재성이 일간에게 부담인가 자원인가
- 그 판단의 근거가 되는 글자는 무엇인가
결론을 먼저 쓰고 근거를 뒤에 붙여라.`;
    case "career":
      return `내 사주에서 식상(식신·상관)과 관성(정관·편관)의 균형을 보고,
"만들어내는 일"과 "관리·책임지는 일" 중 어느 쪽이 더 맞는지 판단하라.
구체적인 직군 세 개를 제시하되, 각각 왜 이 사주와 맞는지
십신 근거를 한 줄로 붙여라.`;
    case "jobchange":
      return `내 현재 대운은 ${cur}이고, 올해 세운은 ${seun}이다.
이 조합에서 직장을 옮기는 것이 유리한지 불리한지 판단하고,
불리하다면 언제까지 기다리는 게 나은지 시기를 짚어라.
"본인 선택"이라는 결론은 쓰지 마라.`;
    case "relation":
      return `내 사주에서 배우자 자리(일지)와 ${spouse}의
상태를 보고, 내가 관계에서 어떤 패턴을 반복하기 쉬운지 짚어라.
"좋은 인연을 만난다" 같은 예언은 하지 말고,
내가 반복하는 행동 패턴만 설명하라.`;
    case "match": {
      const me = `일간 ${dm}, 일지 ${pillarText(chart.pillars.day).slice(1)}`;
      const you = partner
        ? `일간 ${partner.dayMaster.text}${partner.dayMaster.element}, 일지 ${pillarText(partner.pillars.day).slice(1)}`
        : "(상대 사주 없음)";
      return `내 사주: [${me}]
상대 사주: [${you}]

두 사주의 일간 관계와 일지 관계를 각각 판단하고,
이 조합에서 잘 맞는 지점 두 개와 부딪히기 쉬운 지점 두 개를 써라.
점수는 매기지 마라. 어떤 상황에서 부딪히는지를 장면으로 설명하라.`;
    }
    case "breakup":
      return `내 사주와 현재 대운 ${cur}, 세운 ${seun}을 놓고,
지금이 관계를 정리하기에 적절한 시기인지 판단하라.
정리든 유지든 하나를 고르고, 그 판단이 어느 글자에서 나왔는지 밝혀라.
그리고 앞으로 30일 안에 관찰할 수 있는 신호 세 가지를 제시하라.`;
    case "daeun":
      return `나는 ${birthYm}이고 현재 ${cur} 대운, 다음 대운은 ${next}다.
지금 대운과 다음 대운의 성격 차이를 설명하고,
전환기에 미리 준비해두면 좋은 것 두 가지를 제시하라.`;
    case "year":
      return `올해 세운은 ${seun}이다. 내 일간 ${dm} 기준으로
올해 강해지는 십신과 약해지는 십신을 정리하고,
세운의 천간·지지가 내 원국 글자와 만나 어떤 상호작용(합·충·형·해)을 하는지 짚어라.
그 결과 올해 무엇을 시작하기 좋고 무엇을 미루는 게 나은지
각각 두 가지씩 쓰고, 조심할 영역(건강·대인관계·직업 중) 하나를 골라라.`;
    case "report":
      return `내 사주 기반으로 다음 여덟 가지를 현실적으로 분석하라. 미화하지 말고 객관적으로 말하라.

1. 기본 성격 구조 — 겉으로 보이는 모습과 실제 내면 성향의 차이. 어느 글자가 겉이고 어느 글자가 속인지.
2. 인간관계에서 반복되는 문제 패턴 — 왜 같은 문제가 반복되는지 원인이 되는 글자까지.
3. 연애 스타일과 잘 맞는 사람 유형, 안 맞는 유형 — 십신으로 유형을 말하고 장면으로 풀어라.
4. 결혼하면 생길 수 있는 현실적인 갈등 포인트.
5. 돈 버는 방식 성향 — 안정형·기복형·타이밍형 중 하나를 고르고 근거를 대라.
6. 사회생활에서 인정받는 방식과 힘들어지는 환경.
7. 앞으로 1~3년 안에 흐름이 좋아지는 시기와 조심해야 할 시기 — 대운·세운으로, 연 단위까지만.
8. 내가 스스로 고쳐야 인생이 편해지는 습관 세 가지.

좋은 말만 하지 말고, 단점이나 현실적으로 힘들어지는 부분도 구체적으로 말하라.
애매하게 말하지 말고 실제 사례처럼 설명하라. 각 항목은 결론 한 문장 + 근거 글자 + 장면 하나. 전체 1200자 안팎.`;
    case "sinsal":
      return `위 데이터의 "신살" 줄에 있는 것만 다뤄라. 없는 신살은 "없다"고 한 줄로 끝내고 지어내지 마라.
있는 신살 각각에 대해 (1) 어느 기둥에 있는지, (2) 그 기둥의 십신과 합쳐 읽으면 일상에서 어떤 장면으로 나타나는지,
(3) 흉신이라면 실제로 무엇을 조심하면 되는지를 한 줄씩 써라.
마지막에 길신이 강한 영역 하나와 가장 조심할 흉신 하나를 골라라. 신살로 십신 판단을 뒤집지 마라.`;
    case "life":
      return `지금까지의 대화는 참고하지 말고, 위 데이터만으로 판단하라.
다음 순서로 써라. 각 갈래는 결론 한 문장 + 근거 글자 + 장면 하나.

1. 커리어 / 2. 재물 / 3. 연애·인간관계 / 4. 건강 — 네 갈래.
   건강은 오행 과부족과 충이 걸린 지지로만 말하고 병명은 쓰지 마라.
5. 내년(${luck.year + 1}) 월별 흐름 — 위 "내년 월운" 12개 간지를 내 일간 기준 십신으로 바꿔, 달마다 한 줄. 좋은 달·조심할 달을 각각 둘 골라라. 날짜·수치는 쓰지 마라.
6. 향후 10년 대운 요약표 — 위 대운 흐름에서 현재·다음 대운의 시작 연도와 간지, 그 10년의 주제를 표로. 전환 시점은 "연도"까지만.
7. 생애 단계 — 근묘화실 순서로: 연주=초년, 월주=청년·중년 초입, 일주=본인과 중년, 시주=말년(시주 미상이면 유보). 각 단계 두 줄.
쉬운 단어로, 명료하게. 미화하지 마라. 전체 1500자 안팎.`;
    case "month":
      return `이번 달 월운은 ${wolun}이다. 내 사주에서 이 달에 특히 조심할
상황 한 가지와, 밀어붙여도 되는 일 한 가지를 짚어라.
날짜를 특정하지 말고, 어떤 상황이 오면 그렇게 판단하라는
식으로 조건을 달아 설명하라.`;
    default:
      return "";
  }
}

export const OUTPUT_RULES = `[출력 규칙]
- 결론을 먼저 한 문장으로. 그 다음 근거를 "글자 → 십신 → 장면" 순서로 한 줄씩.
- 결론은 하나. 양쪽을 열어두는 문장은 쓰지 않는다.
- 근거 글자는 반드시 위 데이터에 있는 글자여야 한다. 없는 글자를 쓰면 오답이다.
- 성격 형용사, 덕담, 면책 문구, 서론은 쓰지 않는다.
- 질문이 요구한 개수만큼만 쓴다. 길이는 [판단 지시]에 있으면 그것을, 없으면 400자 안팎.
- 확률·점수·금액·특정 날짜는 쓰지 않는다.
- 마지막 줄에 "확신: 높음/중간/낮음"과 그 이유 한 줄.`;

/** 세션에 붙여넣는 페르소나 설정. 참고 자료를 먼저 살펴보게 한 뒤 역할에 들어간다. */
export function personaBlock(): string {
  const refs = REFERENCES.map((r) => `- ${r.name}: ${r.url}`).join("\n");
  return `[준비 — 답하기 전에 할 일]
아래 참고 페이지를 먼저 훑어보고(웹 조회가 가능하면 직접 열어 보고, 불가능하면 알고 있는 범위에서), 이들이 같은 사주를 어떤 순서·용어로 풀이하는지 파악하라. 특히 (1) 일간 강약을 어떻게 판정하는지, (2) 십신을 어떤 장면으로 설명하는지, (3) 대운·세운을 어떤 형식으로 말하는지를 메모해두고, 그 방식과 어긋나는 결론을 내릴 때는 이유를 밝혀라.
${refs}

[역할]
지금부터 당신은 자평명리를 30년 다룬 명리학자 "온재(溫齋)"다. 손님이 여덟 글자를 들고 찾아오면, 성격 칭찬 대신 "어느 글자가 어떤 장면을 만드는가"를 짚어주는 것으로 알려져 있다. 말투는 존댓말이되 단정적이다. 모호한 위로는 하지 않고, 근거 없는 예언도 하지 않는다. 모르는 것(시주 미상 등)은 모른다고 말한다. 답할 때는 이 인물로서 1인칭으로 말한다. 다만 역할 설명이나 인사말은 쓰지 않고 바로 판단으로 들어간다.

[지식창고 — 반드시 따를 규칙]
${KNOWLEDGE}`;
}

export type BuiltPrompt = {
  /** API 모드의 system */
  system: string;
  /** API 모드의 user */
  user: string;
  /** 복사 모드에서 통째로 붙여넣는 텍스트 */
  full: string;
  knowledgeVersion: string;
};

export function buildPrompt(q: Question, chart: Chart, partner?: Chart): BuiltPrompt {
  const data = partner ? `${chartBlock(chart, "내 사주")}\n\n${chartBlock(partner, "상대 사주")}` : chartBlock(chart);
  const system = personaBlock();
  const user = `${data}\n\n[질문 ${q.n}. ${q.title}]\n${questionBody(q, chart, partner)}\n\n${OUTPUT_RULES}`;
  return { system, user, full: `${system}\n\n${user}`, knowledgeVersion: KNOWLEDGE_VERSION };
}

/** 사주를 뽑은 직후 세션에 먼저 건네는 프롬프트. 이후 질문들은 이 데이터를 전제로 이어진다. */
export function buildStarterPrompt(chart: Chart, partner?: Chart): BuiltPrompt {
  const data = partner ? `${chartBlock(chart, "내 사주")}\n\n${chartBlock(partner, "상대 사주")}` : chartBlock(chart);
  const system = personaBlock();
  const user = `${data}

[지금 할 일]
위 데이터가 이 대화에서 쓸 유일한 사주다. 다시 계산하거나 고치지 마라.
먼저 규칙 I1의 순서(오행 분포 → 근묘화실 → 십신 → 강약 → 대운)로 이 사주를 한 번 읽고,
"가장 눈에 띄는 특징 세 가지"를 각각 결론 한 문장 + 근거 글자 + 장면 하나로 써라.
그 다음 "이 사주라면 먼저 물어볼 만한 질문" 세 개를 제안하라(성격 묘사 말고 판단이 필요한 질문으로).
이후 내가 질문을 이어가면, 매번 위 데이터를 다시 확인하고 답하라.

${OUTPUT_RULES}`;
  return { system, user, full: `${system}\n\n${user}`, knowledgeVersion: KNOWLEDGE_VERSION };
}

export type Recommendation = { q: Question; reason: string };

/** 사주 구조를 보고 먼저 물어볼 질문 세 개를 고른다. 이유는 화면에 그대로 보인다. */
export function recommendQuestions(chart: Chart, hasPartner: boolean): Recommendation[] {
  const out: Recommendation[] = [];
  const c = chart.tenGodCounts;
  const luck = currentLuck();
  const d = currentDaeun(chart, luck.year);
  const push = (id: string, reason: string) => {
    const q = questionById(id);
    if (q && !out.some((x) => x.q.id === id)) out.push({ q, reason });
  };

  const wealth = c.정재 + c.편재;
  const officer = c.정관 + c.편관;
  const output = c.식신 + c.상관;
  const seal = c.정인 + c.편인;
  const self = c.비견 + c.겁재;

  if (hasPartner) push("match", "둘 다 사주가 있어요. 일간·일지 관계를 교차로 볼 수 있어요");
  if (d.next && d.next.age - d.age <= 2 && d.next.age - d.age >= -1) push("daeun", `${d.next.age}세에 대운이 ${pillarText(d.next.pillar)}로 바뀌어요. 전환기예요`);
  if (chart.strength.verdict !== "중화") push("yongsin", `엔진 판정이 ${chart.strength.verdict}이라 필요한 오행이 분명한 편이에요`);
  if (wealth >= 3) push("wealth", `재성이 ${wealth}개예요. 돈이 자원인지 압박인지 갈라볼 만해요`);
  if (output >= 2 && officer >= 2) push("career", `식상 ${output}·관성 ${officer}로 팽팽해요. 만드는 일과 관리하는 일 중 어느 쪽인지`);
  else if (output >= 3 || officer >= 3) push("career", `${output >= 3 ? `식상이 ${output}개` : `관성이 ${officer}개`}라 일의 방향이 뚜렷한 편이에요`);
  if (self >= 3 && wealth <= 1) push("wealth", `비겁 ${self}개에 재성이 적어요. 돈이 나가는 구조인지 확인해요`);
  if (seal >= 3) push("structure", `인성이 ${seal}개라 생각이 행동을 미루는 구조인지 봐요`);
  push("daymaster", "모든 판단의 출발점이에요. 강약을 하나로 정해 두면 뒤 질문이 쉬워져요");
  push("year", `올해 세운 ${pillarText(luck.seun)}이 내 일간에 어떤 십신으로 오는지`);
  push("relation", "일지와 배우자성으로 관계에서 반복하는 패턴을 봐요");
  return out.slice(0, 3);
}

export type HistoryTurn = { role: "me" | "reader"; text: string };

function historyBlock(history: HistoryTurn[]): string {
  if (!history.length) return "";
  const lines = history.map((h) => `${h.role === "me" ? "손님" : "온재"}: ${h.text.trim()}`);
  return `[지금까지의 문답 — 같은 사주에 대해 이미 오간 대화다. 이 흐름을 이어서 답하라]\n${lines.join("\n\n")}\n\n`;
}

/** 최근 문답만 넣는다 — 긴 답은 앞부분만. 세션 자체가 맥락을 갖고 있어도, 새 세션에서 붙여넣어도 이어지게. */
function recentHistory(history: HistoryTurn[], keep = 8): HistoryTurn[] {
  return history.slice(-keep).map((h) => ({ role: h.role, text: h.text.length > 1500 ? h.text.slice(0, 1500) + " …(줄임)" : h.text }));
}

/**
 * 대화의 한 턴. 사주 데이터 + 최근 문답 + 이번 질문(+ 숨은 판단 지시).
 * 기본 풀이·항목 질문·이어 묻기·직접 묻기가 전부 이 함수 하나로 만들어진다.
 */
export function buildTurnPrompt(
  chart: Chart,
  partner: Chart | undefined,
  history: HistoryTurn[],
  question: string,
  guide?: string,
): BuiltPrompt {
  const data = partner ? `${chartBlock(chart, "내 사주")}\n\n${chartBlock(partner, "상대 사주")}` : chartBlock(chart);
  const system = personaBlock();
  const hist = historyBlock(recentHistory(history));
  const ask = `[손님의 질문]\n${question.trim()}` + (guide ? `\n\n[판단 지시]\n${guide.trim()}` : "");
  const consistency = history.length
    ? "\n\n앞선 답과 모순되면 어느 글자 때문에 판단이 바뀌는지 밝혀라. 글자가 그대로면 결론도 그대로다(규칙 A8)."
    : "";
  const user = `${data}\n\n${hist}${ask}${consistency}\n\n${OUTPUT_RULES}`;
  return { system, user, full: `${system}\n\n${user}`, knowledgeVersion: KNOWLEDGE_VERSION };
}

/** 예전 이름 호환. */
export function buildFollowUpPrompt(chart: Chart, partner: Chart | undefined, history: HistoryTurn[], question: string): BuiltPrompt {
  return buildTurnPrompt(chart, partner, history, question);
}
