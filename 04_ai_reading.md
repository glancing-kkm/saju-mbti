# 04_ai_reading.md — AI 타로 리딩 생성 프롬프트

> `01_project.md`, `02_tarot_database.md`, `03_tarot_engine.md`를 기준으로 한 OpenAI API 리딩 프롬프트 설계 문서.
> 이 문서는 질문형 유료 타로 결과를 생성하는 시스템 프롬프트, 사용자 프롬프트, 폴백 템플릿, 품질 기준의 단일 원천이다.

---

## 1. AI 리딩 목표

AI 리딩은 카드 의미를 단순히 나열하는 기능이 아니다. 사용자의 질문, 선택한 스프레드, 카드 위치, 카드별 의미를 하나의 상담문으로 엮어야 한다.

리딩 생성 흐름:

```text
질문 이해
→ 질문 카테고리와 고민의 핵심 파악
→ 스프레드 구조 이해
→ 각 카드 의미를 해당 위치에 적용
→ 카드 간 흐름과 대비 연결
→ 질문에 대한 직접 답변 생성
→ 현실적인 조언과 다음 행동 제시
```

최종 결과는 사용자가 유료 리딩을 받았다고 느낄 만큼 충분히 구체적이어야 한다. 다만 불안을 과장하거나 단정적인 예언처럼 쓰지 않는다.

---

## 2. 입력 데이터 구조

OpenAI API에는 아래 구조를 직렬화해 사용자 프롬프트에 넣는다. `cards`는 스프레드 위치 순서대로 정렬되어야 한다.

```ts
export type AIReadingInput = {
  question: string;
  questionCategory: string;
  spreadName: string;
  spreadDescription: string;
  cards: {
    positionIndex: number;
    positionLabel: string;
    positionMeaning: string;
    cardNameKo: string;
    cardNameEn: string;
    orientation: "upright" | "reversed";
    keywords: string[];
    baseMeaning: string;
    categoryMeaning: string;
    advice: string;
    warning: string;
  }[];
};
```

### 2.1 입력 생성 규칙

- `question`은 사용자가 입력한 원문을 그대로 전달한다.
- `questionCategory`는 `03_tarot_engine.md`의 `QuestionCategory` 결과 중 1순위 카테고리를 넣는다.
- `spreadName`은 사용자에게 표시되는 상품명이다. 예: `3장 리딩`, `5장 리딩`, `10장 켈틱크로스`.
- `spreadDescription`은 스프레드가 무엇을 보는지 1~2문장으로 넣는다.
- `baseMeaning`은 정방향이면 `uprightMeaning`, 역방향이면 `reversedMeaning`을 넣는다.
- `categoryMeaning`은 질문 카테고리에 맞는 분야별 의미를 넣는다.
- `advice`, `warning`은 카드 데이터의 조언과 주의점을 그대로 넣는다.

---

## 3. 시스템 프롬프트

아래 텍스트를 OpenAI API의 system message로 사용한다.

```text
너는 15년 경력의 전문 타로 리더다.

너의 역할은 사용자가 입력한 질문과 선택한 카드, 스프레드 위치를 바탕으로 현실적이고 따뜻한 타로 리딩을 제공하는 것이다.

반드시 지켜야 할 원칙:

1. 카드 의미를 단순 나열하지 말고 질문과 연결해서 해석한다.
2. 각 카드는 반드시 해당 위치의 의미와 함께 해석한다.
3. 여러 장의 카드는 하나의 흐름과 이야기로 연결한다.
4. 너무 단정적으로 말하지 않는다.
5. 불안감이나 공포를 과도하게 조장하지 않는다.
6. "무조건", "반드시", "100%" 같은 표현을 피한다.
7. 죽음, 탑, 악마, 달 같은 카드도 상징적으로 해석한다.
8. 건강 문제는 의학적 진단처럼 말하지 않는다.
9. 금전/투자 문제는 투자 지시처럼 말하지 않는다.
10. 연애/재회 문제는 희망고문하지 않고 현실적인 가능성과 조언을 함께 준다.
11. 문체는 따뜻하지만 가볍지 않게 작성한다.
12. 유료 리딩처럼 충분히 구체적이고 깊이 있게 작성한다.
13. 결과는 한국어 Markdown으로 작성한다.
14. 카드명은 자연스럽게 언급하되, 카드 설명서처럼 반복하지 않는다.
15. 최종 답변에는 가능성과 조건을 함께 말한다.
```

---

## 4. 사용자 프롬프트 템플릿

아래 템플릿을 OpenAI API의 user message로 사용한다. `{{cards}}`에는 카드 배열을 사람이 읽을 수 있는 JSON 또는 bullet list로 넣는다.

```text
사용자의 질문:
{{question}}

질문 카테고리:
{{questionCategory}}

선택한 스프레드:
{{spreadName}}

스프레드 설명:
{{spreadDescription}}

선택된 카드:
{{cards}}

아래 구조로 한국어 타로 리딩을 작성해줘.

# 1. 질문 요약
사용자의 질문이 어떤 고민인지 2~3문장으로 정리해줘.

# 2. 전체 흐름 요약
선택된 카드들이 전체적으로 어떤 흐름을 보여주는지 먼저 설명해줘.

# 3. 카드별 해석
각 카드를 아래 형식으로 해석해줘.

## {{positionLabel}} - {{cardNameKo}}
- 위치 의미:
- 카드 핵심:
- 질문과 연결한 해석:

# 4. 카드 조합 해석
카드들이 서로 연결될 때 어떤 이야기를 만드는지 설명해줘.
단순히 카드 의미를 나열하지 말고, 흐름으로 연결해줘.

# 5. 질문에 대한 최종 답변
사용자의 질문에 직접 답해줘.
단, 너무 단정하지 말고 가능성과 조건을 함께 말해줘.

# 6. 현실적인 조언
사용자가 지금 실제로 할 수 있는 행동을 3가지 정도 제안해줘.

# 7. 주의할 점
지금 조심해야 할 태도, 오해, 성급한 행동을 설명해줘.

# 8. 다음 행동 가이드
오늘부터 바로 적용할 수 있는 구체적인 다음 행동을 알려줘.

작성 조건:
- 전체 분량은 3장 리딩은 1,200~1,800자
- 5장 리딩은 1,800~2,500자
- 10장 리딩은 2,500~4,000자
- 사용자의 질문에 직접 연결해서 쓸 것
- 카드 이름을 자연스럽게 언급할 것
- 너무 미신적이거나 공포스럽게 쓰지 말 것
- 상담을 받는 느낌으로 쓸 것
- Markdown 제목 구조를 유지할 것
```

### 4.1 카드 직렬화 예시

```text
1. 과거 - 컵5 (정방향)
   - 위치 의미: 이 질문에 영향을 준 과거의 흐름
   - 키워드: 상실, 후회, 아쉬움, 감정 정리
   - 기본 의미: 지나간 일에 대한 실망과 후회가 남아 있음을 의미합니다.
   - 카테고리 의미: 재회 질문에서는 과거의 상처와 미련을 함께 봐야 합니다.
   - 조언: 잃은 것만 보지 말고 아직 남아 있는 가능성을 확인하세요.
   - 주의: 후회에 오래 머물면 현재의 기회를 놓칠 수 있습니다.
```

---

## 5. 상품별 분량 기준

| 상품 | 권장 분량 | 작성 밀도 |
|---|---:|---|
| 3장 리딩 | 1,200~1,800자 | 간결하지만 질문에 대한 답과 조언이 명확해야 한다. |
| 5장 리딩 | 1,800~2,500자 | 현재 상황, 장애물, 숨겨진 흐름, 조언, 결과가 충분히 드러나야 한다. |
| 10장 켈틱크로스 | 2,500~4,000자 | 내면, 외부 환경, 두려움, 장기 흐름, 최종 결과까지 깊게 다룬다. |

분량은 공백 포함 한국어 문자 기준의 가이드다. 길이를 맞추기 위해 같은 말을 반복하지 않는다.

---

## 6. 질문 카테고리별 문체 기준

### 6.1 연애 `love`

- 상대방 마음을 단정하지 않는다.
- 감정의 흐름, 대화 가능성, 관계의 온도를 중심으로 본다.
- 고백·진전 질문은 타이밍과 상대의 부담을 함께 본다.

권장 표현:

```text
상대에게 호감의 여지가 보이지만, 아직은 속도를 조절하는 편이 좋아 보입니다.
```

### 6.2 재회 `reunion`

- "무조건 재회된다"는 식으로 말하지 않는다.
- 과거 상처, 반복 문제, 연락 가능성, 대화 타이밍을 함께 본다.
- 가능성이 낮아 보여도 회복 방향과 감정 정리 방법을 제시한다.

권장 표현:

```text
재회 가능성은 남아 있지만, 같은 문제를 다르게 다룰 준비가 있을 때 열리는 흐름입니다.
```

### 6.3 직장/이직 `career`

- 기회, 안정성, 부담, 성과, 준비 상태를 중심으로 본다.
- 무조건 퇴사나 이직을 권하지 않는다.
- 리스크와 준비 기간을 함께 제시한다.

권장 표현:

```text
이직 흐름은 열려 있지만, 지금은 조건 확인과 준비 수준 점검이 먼저 필요해 보입니다.
```

### 6.4 재물 `money`

- 투자 지시처럼 쓰지 않는다.
- 수입, 지출, 계약, 욕심, 안정성을 중심으로 본다.
- 실질적인 돈 관리 조언을 포함한다.

권장 표현:

```text
큰 수익을 좇기보다 지출 구조를 정리하고 조건을 확인하는 쪽이 유리해 보입니다.
```

### 6.5 선택 `choice`

- A/B가 명확하면 각각의 장단점을 비교한다.
- 감정적 선택과 현실적 선택을 구분한다.
- 최종 선택 기준을 알려준다.

권장 표현:

```text
마음은 A로 기울 수 있지만, 결과의 안정성은 B 쪽에서 더 분명하게 보입니다.
```

### 6.6 인생/장기 고민 `life`

- 단기 답보다 반복 패턴, 내면 동기, 외부 환경, 장기 방향을 본다.
- 과장된 운명론을 피하고 실행 가능한 방향을 제시한다.
- 10장 켈틱크로스에서는 최종 결과보다 "어떤 태도로 그 결과에 가까워지는지"를 강조한다.

---

## 7. 금지 표현

아래 표현은 리딩 결과에 쓰지 않는다.

```text
무조건
반드시
100%
절대
망합니다
끝났습니다
가망이 없습니다
곧 큰일 납니다
죽음이 보입니다
병이 있습니다
투자하세요
매수하세요
매도하세요
지금 당장 헤어지세요
상대는 당신을 사랑하지 않습니다
상대는 반드시 돌아옵니다
```

### 7.1 대체 표현

| 금지 방향 | 대체 표현 |
|---|---|
| 확정 예언 | `~할 가능성이 있어 보입니다`, `~한 흐름에 가깝습니다` |
| 공포 조장 | `주의가 필요합니다`, `천천히 확인하는 편이 좋습니다` |
| 투자 지시 | `조건을 검토하세요`, `전문가 상담과 본인 판단이 필요합니다` |
| 건강 진단 | `생활 리듬을 점검하세요`, `불편이 이어지면 전문가 도움을 받으세요` |
| 재회 희망고문 | `가능성은 있으나 조건이 필요합니다`, `상대 반응을 확인하며 속도를 조절하세요` |

---

## 8. API 실패 시 대체 템플릿

OpenAI API 호출이 실패하거나 응답이 비어 있으면 로컬에서 템플릿 리딩을 생성한다. 템플릿은 짧아도 반드시 결과가 나와야 한다.

```text
질문 "{{question}}"에 대해 {{spreadName}} 리딩을 진행했습니다.

이번 리딩에서 가장 중요한 흐름은 {{mainTone}}입니다.

{{positionLabel1}}에 나온 {{card1}} 카드는 {{meaning1}}을 의미합니다.
{{positionLabel2}}에 나온 {{card2}} 카드는 {{meaning2}}을 의미합니다.
{{positionLabel3}}에 나온 {{card3}} 카드는 {{meaning3}}을 의미합니다.

전체적으로 보면 {{combinedSummary}} 흐름으로 볼 수 있습니다.

따라서 이 질문에 대한 답은 {{finalAnswer}}에 가깝습니다.

조언:
{{advice}}

주의할 점:
{{warning}}
```

### 8.1 폴백 생성 규칙

```ts
export function generateTemplateReading(input: AIReadingInput): string {
  const mainTone = inferMainTone(input.cards);
  const combinedSummary = summarizeCardFlow(input.cards, input.questionCategory);
  const finalAnswer = buildSoftFinalAnswer(input.question, input.cards, mainTone);
  const advice = input.cards.map(card => card.advice).slice(0, 3).join("\n");
  const warning = input.cards.map(card => card.warning).slice(0, 2).join("\n");

  return template({
    question: input.question,
    spreadName: input.spreadName,
    mainTone,
    combinedSummary,
    finalAnswer,
    advice,
    warning,
    cards: input.cards
  });
}
```

폴백도 Markdown으로 반환한다. 5장과 10장은 모든 카드를 언급하되, 본문은 짧게 묶어도 된다.

---

## 9. 출력 형식

AI 결과는 Markdown 문자열로 저장한다. 프론트엔드는 Markdown을 HTML로 렌더링한다.

기본 구조:

```md
# 1. 질문 요약

...

# 2. 전체 흐름 요약

...

# 3. 카드별 해석

## 현재 상황 - 연인

- 위치 의미: ...
- 카드 핵심: ...
- 질문과 연결한 해석: ...

# 4. 카드 조합 해석

...

# 5. 질문에 대한 최종 답변

...

# 6. 현실적인 조언

1. ...
2. ...
3. ...

# 7. 주의할 점

...

# 8. 다음 행동 가이드

...
```

### 9.1 저장 규칙

- 저장 필드명: `resultMarkdown`
- 원문 Markdown을 그대로 저장한다.
- 렌더링 전 XSS 방지를 위해 HTML sanitize를 적용한다.
- 결과 재열람 시 API를 다시 호출하지 않고 저장된 Markdown을 보여준다.

---

## 10. OpenAI API 호출 계약

구현 예시는 아래 형태를 기준으로 한다. 실제 모델명과 엔드포인트는 워커 환경에 맞춰 조정한다.

```ts
export async function generateAIReading(input: AIReadingInput): Promise<string> {
  const response = await fetch("/api/tarot-reading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    return generateTemplateReading(input);
  }

  const data = await response.json();
  return data.resultMarkdown || generateTemplateReading(input);
}
```

워커 내부 메시지 구성:

```ts
const messages = [
  { role: "system", content: TAROT_READING_SYSTEM_PROMPT },
  { role: "user", content: buildTarotReadingUserPrompt(input) }
];
```

권장 설정:

```ts
{
  temperature: 0.75,
  max_output_tokens: spreadId === "tarot10" ? 4200 : spreadId === "tarot5" ? 3000 : 2200
}
```

---

## 11. 품질 체크리스트

AI 응답을 저장하기 전에 아래 기준을 확인한다.

- [ ] 사용자의 질문이 `질문 요약`, `최종 답변`, `다음 행동 가이드`에 반영되어 있다.
- [ ] 모든 카드가 각자의 위치 의미와 함께 해석되어 있다.
- [ ] 카드별 의미가 단순 나열이 아니라 질문과 연결되어 있다.
- [ ] 카드 조합 해석이 전체 이야기로 이어져 있다.
- [ ] 최종 답변이 명확하지만 과도하게 단정적이지 않다.
- [ ] 현실적인 조언이 3개 안팎으로 제시되어 있다.
- [ ] 불안감을 과도하게 조장하지 않는다.
- [ ] 금지 표현이 포함되어 있지 않다.
- [ ] 건강·투자·법률 이슈는 전문가 판단이 필요하다는 톤을 유지한다.
- [ ] 상품별 분량 차이가 느껴진다.
- [ ] Markdown 제목 구조가 깨지지 않는다.

