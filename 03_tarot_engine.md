# 03_tarot_engine.md — 타로 풀이 엔진 규칙

> `01_project.md`(플로우·계약)와 `02_tarot_database.md`(카드 데이터)를 기준으로,
> 타로를 단순 카드 설명이 아니라 **질문 → 카드 → 위치 → 조합 → 최종 답변**으로 해석하는 규칙을 정의한다.
> 구현 파일: `tarot/tarot-recommend.js`(§2~3) + `tarot/tarot-engine.js`(§4~10).

---

## 1. 엔진 전체 흐름

```text
사용자 질문 입력
→ 질문 카테고리 분석          analyzeQuestion()      (로컬, API 없음)
→ 추천 스프레드 결정           〃
→ 카드 선택                   사용자 직접 (01 §8) + 선택 완료 시 셔플 배정 (01 §8.4)
→ 카드 위치 의미 적용          buildReading()
→ 카드별 의미 추출             〃  (02 데이터 합성)
→ 카드 간 관계 분석            〃  (조합 규칙 §6)
→ 질문과 연결                  〃  (카테고리 우선순위 §7)
→ 최종 리딩 생성               AI 워커(04) 또는 로컬 폴백 composeFallbackReading()
```

### 핵심 인터페이스 (04·05가 참조할 계약)

```ts
// tarot-recommend.js — 01 §7의 반환 계약을 카테고리 필드로 확장
analyzeQuestion(question: string) => {
  categories: QuestionCategory[],   // 매칭 순 상위 최대 2개, 없으면 ["general"]
  recommended: "tarot3" | "tarot5" | "tarot10",
  reason: string,                   // 추천 문구 (§3)
  spreadVariant: SpreadVariantId,   // 3장 배열 변형 (§4), 5·10장은 고정
  matchedKeywords: string[]
}

// tarot-engine.js — AI 프롬프트와 폴백 리딩이 공유하는 해석 골격
buildReading(input: {
  question: string,
  categories: QuestionCategory[],
  spreadId: "tarot3"|"tarot5"|"tarot10",
  spreadVariant: SpreadVariantId,
  cards: { cardId: string, reversed: boolean }[]   // 위치 순서대로
}) => {
  positions: { label, meaning, card, reversed, interpretation }[],  // §5 합성 결과
  combos: { cardIds: string[], text: string }[],                    // §6 감지 결과
  tone: ReadingTone,                                                // §8
  emphasisCards: string[]                                           // §7 강조 카드 중 실제 등장한 것
}
```

---

## 2. 질문 카테고리 분류

```ts
type QuestionCategory =
  | "love" | "reunion" | "relationship" | "career" | "money"
  | "choice" | "yesno" | "timing" | "general" | "life";
```

### 분류 방식 — 키워드 점수제

- 질문 문자열을 정규화(공백 정리, 소문자화)한 뒤 카테고리별 키워드 매칭 수를 센다.
- 매칭 1개당 1점. **최고점 카테고리부터 상위 최대 2개**를 `categories`로 반환한다 (예: 재회+시기 질문 → `["reunion","timing"]`).
- 동점이면 아래 우선순위로 정렬: `reunion > love > career > money > choice > relationship > life > timing > yesno > general`.
  (구체적 카테고리가 추상적 카테고리를 이긴다 — reunion이 love보다 앞서는 이유)
- 아무것도 매칭되지 않으면 `["general"]`.

### 카테고리별 키워드

| 카테고리 | 키워드 |
|---|---|
| love | 연애, 사랑, 썸, 고백, 마음, 호감, 좋아할까 |
| reunion | 재회, 전남친, 전여친, 헤어진, 다시 만날, 연락 올까 |
| relationship | 상대방, 속마음, 관계, 친구, 가족, 인간관계, 생각 |
| career | 직장, 이직, 회사, 일, 취업, 면접, 사업, 프로젝트 |
| money | 돈, 재물, 수입, 투자, 매출, 금전, 계약 |
| choice | 선택, 결정, 해야 할까, 말까, A와 B, 고민 |
| yesno | 될까, 가능할까, 올까, 맞을까, 괜찮을까 |
| timing | 언제, 시기, 이번 달, 올해, 가까운 미래 |
| life | 인생, 방향, 운명, 장기, 미래, 전체운 |

주의: "연락 올까"처럼 reunion과 yesno 키워드가 겹치는 질문은 두 카테고리 모두 점수를 얻는다. 이 중복은 의도된 동작이다 (해석 시 §7에서 둘 다 반영).

---

## 3. 스프레드 추천 규칙

카테고리 → 기본 추천 매핑에 질문 길이 보정을 더한다.

### 기본 매핑

| 추천 | 조건 카테고리 |
|---|---|
| 3장 `tarot3` | yesno, timing (연락·가능성·오늘/이번 주 흐름) |
| 5장 `tarot5` | love, reunion, relationship, career, money, choice |
| 10장 `tarot10` | life |

`categories`의 1순위 카테고리로 결정한다. `general`이면 5장 (01 부록 A의 기본 추천 상품).

### 길이·복합도 보정

1. 질문 60자 이상 **또는** 서로 다른 카테고리 3개 이상 매칭 → 한 단계 승급 (3장→5장, 5장→10장)
2. life 키워드가 1개라도 있으면 10장에 +1 보정 (긴 고민을 낮은 상품으로 유도하지 않는다 — 01 §7)
3. 질문 15자 미만 + 물음표로 끝남 + 1순위가 yesno/timing → 3장 확정
4. 추천은 강제가 아니다. UI는 추천 상품에 배지·글로우만 표시하고 세 상품 모두 선택 가능 (01 §7)

### 추천 설명 문구

```text
tarot3  : 현재 상황과 가까운 흐름을 빠르게 확인하기 좋은 질문입니다. 3장 리딩을 추천드립니다.
tarot5  : 현재 상황뿐 아니라 장애물, 숨겨진 흐름, 조언까지 함께 보는 것이 좋은 질문입니다. 5장 리딩을 추천드립니다.
tarot10 : 단순한 답보다 전체 구조와 숨겨진 원인, 장기적인 흐름까지 함께 보는 것이 좋은 질문입니다. 10장 켈틱크로스 리딩을 추천드립니다.
```

---

## 4. 스프레드 위치 의미

`tarot/tarot-spreads.js`에 아래 데이터를 그대로 정의한다. 3장은 카테고리에 따라 배열이 변형된다.

### 3장 변형 결정 규칙

```ts
type SpreadVariantId = "past-present-future" | "me-them-outcome" | "problem-advice-outcome" | "now-obstacle-potential";
```

| 변형 | 선택 조건 (1순위 카테고리) |
|---|---|
| me-them-outcome | love, reunion, relationship |
| problem-advice-outcome | choice |
| now-obstacle-potential | yesno |
| past-present-future | 그 외 전부 (기본) |

### 3장 기본 — past-present-future

```ts
[
  { index: 0, label: "과거", meaning: "이 질문에 영향을 준 과거의 흐름" },
  { index: 1, label: "현재", meaning: "현재 상황과 핵심 에너지" },
  { index: 2, label: "미래", meaning: "가까운 미래의 가능성" }
]
```

### 3장 연애/상대방 — me-them-outcome

```ts
[
  { index: 0, label: "나", meaning: "질문자 본인의 마음과 태도" },
  { index: 1, label: "상대", meaning: "상대방의 마음과 태도" },
  { index: 2, label: "결과", meaning: "두 사람 사이의 가능성" }
]
```

### 3장 선택 — problem-advice-outcome

```ts
[
  { index: 0, label: "현재", meaning: "현재 상황" },
  { index: 1, label: "조언", meaning: "지금 필요한 선택 기준" },
  { index: 2, label: "결과", meaning: "선택 후 예상 흐름" }
]
```

### 3장 가능성 — now-obstacle-potential

```ts
[
  { index: 0, label: "현재", meaning: "지금의 상태와 에너지" },
  { index: 1, label: "장애물", meaning: "가능성을 막고 있는 요소" },
  { index: 2, label: "가능성", meaning: "이 흐름이 열어줄 수 있는 결과" }
]
```

### 5장 기본 (고정)

```ts
[
  { index: 0, label: "현재 상황", meaning: "지금 이 질문의 중심 상태" },
  { index: 1, label: "장애물", meaning: "흐름을 막고 있는 요소" },
  { index: 2, label: "숨겨진 흐름", meaning: "겉으로 드러나지 않은 원인이나 감정" },
  { index: 3, label: "조언", meaning: "지금 취하면 좋은 태도와 행동" },
  { index: 4, label: "결과", meaning: "가까운 미래에 나타날 가능성" }
]
```

레이아웃: 중앙(0), 상(1), 하(2), 좌(3), 우(4) — screen3.png 십자 배치.

### 10장 켈틱크로스 (고정)

```ts
[
  { index: 0, label: "현재 상황", meaning: "질문의 중심이 되는 현재 상태" },
  { index: 1, label: "장애물", meaning: "현재 흐름을 가로막는 문제" },
  { index: 2, label: "과거", meaning: "이 문제를 만든 과거의 원인" },
  { index: 3, label: "가까운 미래", meaning: "곧 나타날 변화나 사건" },
  { index: 4, label: "의식", meaning: "질문자가 의식적으로 바라는 것" },
  { index: 5, label: "무의식", meaning: "질문자가 스스로 잘 모르는 내면의 동기" },
  { index: 6, label: "본인의 태도", meaning: "질문자가 이 문제를 대하는 방식" },
  { index: 7, label: "주변 환경", meaning: "타인이나 외부 상황의 영향" },
  { index: 8, label: "희망과 두려움", meaning: "기대와 불안이 함께 작용하는 지점" },
  { index: 9, label: "최종 결과", meaning: "전체 흐름이 향하는 결론" }
]
```

레이아웃: 좌측 십자 6장(0~5) + 우측 세로 스태프 4장(6~9) — code1.html `layout-10` 참고.

---

## 5. 카드 해석 계산 방식

각 위치의 해석은 아래 다섯 요소를 **이 순서로 합성**한다.

```text
① 카드 기본 의미            uprightMeaning (02)
② 정방향/역방향             reversed면 reversedMeaning으로 교체 + "다만 지금은 그 기운이 눌려 있어" 톤
③ 질문 카테고리별 의미       categories[0] → loveMeaning/moneyMeaning/careerMeaning/relationshipMeaning 선택
                            (love·reunion→loveMeaning, career→careerMeaning, money→moneyMeaning,
                             relationship→relationshipMeaning, 건강 질문 감지 시 healthMeaning, 그 외 생략)
④ 스프레드 위치 의미         position.meaning과 결합 — "이 카드가 [위치]에 나온 것은 …"
⑤ 앞뒤 카드와의 관계         §6 조합 규칙에 걸리면 조합 문장을 추가
```

### 합성 예시

```text
질문: 재회 가능성이 있을까요?
위치: 현재 / 카드: 연인 / 카테고리: reunion

해석:
현재 위치의 연인 카드는 두 사람 사이에 아직 감정의 연결이나 선택의 여지가
남아 있음을 의미합니다. 다만 재회 질문에서는 단순히 사랑이 남았다는 뜻보다,
서로가 다시 관계를 선택할 준비가 되었는지를 함께 봐야 합니다.
```

### 위치별 어조 규칙

- **조언 위치**: 카드의 `advice` 필드를 우선 사용하고 명령형이 아닌 권유형으로
- **장애물 위치**: 부정 카드는 그대로, 긍정 카드는 "좋은 것이 오히려 발목을 잡는" 역설로 해석
  (예: 장애물 자리의 태양 = 낙관이 과해서 현실 점검을 놓치고 있음)
- **결과/최종 결과 위치**: 단정하지 않는다. "~한 흐름에 가깝습니다", "~할 가능성이 높아 보입니다"
- **희망과 두려움 위치**: 같은 카드의 양면(기대이자 불안)을 함께 서술

---

## 6. 카드 조합 규칙

카드 조합은 개별 카드 의미보다 우선한다. 뽑힌 카드들에서 아래 그룹 소속을 감지해 흐름을 판정한다.

### 흐름 그룹 (02의 id 기준)

```ts
const FLOW_GROUPS = {
  // 긍정 흐름 — 결과/미래/조언 위치에 나오면 긍정 판정
  positive: ["major-19-sun","major-17-star","major-21-world","major-06-lovers",
             "cups-02","cups-10","wands-04","pentacles-10","major-01-magician","major-07-chariot"],
  // 지연 흐름 — 시간·신중함 필요
  delayed: ["major-09-hermit","major-12-hanged-man","major-14-temperance","pentacles-07","swords-04"],
  // 갈등 흐름 — 갈등·불안·충돌
  conflict: ["major-16-tower","major-15-devil","major-18-moon","swords-03","swords-05","swords-07","wands-05"],
  // 변화 흐름 — 끝과 새 출발, 전환점
  transformational: ["major-13-death","major-10-wheel","major-20-judgement","major-16-tower","major-00-fool"],
  // 현실 안정 흐름 — 안정·성과·책임
  stable: ["major-04-emperor","major-05-hierophant","pentacles-04","pentacles-06",
           "pentacles-09","pentacles-10","pentacles-13-queen","pentacles-14-king"]
};
```

주: 탑(tower)은 conflict와 transformational에 모두 속한다. 두 그룹이 함께 감지되면 "충격을 동반한 전환"으로 서술한다.

### 조합 감지 규칙

1. 뽑힌 카드 중 같은 그룹 소속이 **2장 이상**이면 그 흐름을 리딩의 기조로 채택
2. 여러 그룹이 동시에 감지되면: 결과 위치 카드가 속한 그룹 > 카드 수가 많은 그룹 순으로 우선
3. 인접 위치(3장: 0-1, 1-2 / 5장: 중앙-각 방향 / 10장: 0-1, 3-9)의 카드 쌍이 아래 예시 사전에 있으면 해당 조합 문장을 추가

### 조합 해석 예시 사전 (컴보 사전 — 확장 가능)

```text
컵5 + 연인 + 별      : 과거에는 실망과 후회가 있었지만, 현재 관계의 연결 가능성은 남아 있으며,
                       미래에는 회복과 희망의 흐름이 있다.
죽음 + 바보          : 기존 흐름이 끝나고 새로운 출발을 준비하는 조합이다. 이별이나 퇴사처럼
                       끝으로 보이는 사건이 새로운 시작의 계기가 될 수 있다.
악마 + 달            : 집착, 불안, 오해가 강해질 수 있다. 특히 연애 질문에서는 상대방을 있는
                       그대로 보기보다 불안한 상상으로 해석할 가능성을 경계해야 한다.
태양 + 세계          : 성과, 완성, 공개적인 성공을 의미하는 강한 긍정 조합이다.
은둔자 + 절제        : 빠른 결론보다 시간을 두고 내면을 정리해야 하는 흐름이다.
탑 + 별              : 흔들림 뒤에 회복이 따라오는 조합. 무너진 자리가 오히려 정화의 계기가 된다.
소드3 + 심판         : 아픈 경험이 재평가되어 매듭지어지는 조합. 상처의 의미가 달라진다.
완드8 + 컵2          : 관계의 진전이 빠르게 다가오는 조합. 연락과 만남이 급물살을 탄다.
펜타클5 + 펜타클6    : 어려움 끝에 도움이 도착하는 조합. 손 내밀면 잡아줄 사람이 있다.
```

컴보 사전에 없는 쌍은 keywords 교집합·그룹 판정으로 일반 조합 문장을 생성한다
(예: 둘 다 positive → "두 카드가 같은 방향의 밝은 기운을 밀어주고 있습니다").

---

## 7. 질문 카테고리별 해석 우선순위

카테고리별로 **우선 해석 요소**와 **강조 카드**(등장 시 리딩에서 비중 확대 + `emphasisCards`에 포함)를 정의한다.

### 연애 (love)

- 우선 요소: 감정, 호감, 관계의 균형, 대화 가능성, 상대방 태도
- 강조 카드: 연인, 컵2, 컵6, 컵10, 별, 태양, 악마, 달, 소드3

### 재회 (reunion)

- 우선 요소: 과거 상처, 미련, 연락 가능성, 다시 선택할 가능성, 반복되는 문제
- 강조 카드: 컵5, 컵6, 심판, 연인, 별, 죽음, 소드3, 달

### 직장/이직 (career)

- 우선 요소: 안정성, 성장 가능성, 책임, 갈등, 성과, 이동
- 강조 카드: 황제, 전차, 완드8, 펜타클8, 펜타클10, 세계, 소드10, 탑

### 재물 (money)

- 우선 요소: 수입, 지출, 투자, 안정성, 욕심, 장기 성과
- 강조 카드: 펜타클 에이스, 펜타클6, 펜타클9, 펜타클10, 악마, 펜타클5

### 선택 (choice)

- 우선 요소: 선택 기준, 위험, 기회, 감정과 현실의 균형
- 강조 카드: 정의, 연인, 전차, 매달린 사람, 소드2, 완드2

### 그 외 카테고리

- relationship → love의 요소를 준용하되 연애 감정 대신 신뢰·거리감 중심
- yesno/timing → 결과 위치 카드와 흐름 그룹(§6) 판정에 비중을 두고 §8의 톤으로 답의 방향을 잡는다
- life/general → 메이저 아르카나 등장 비율이 높을수록 "인생 단위의 큰 흐름"으로 서술

---

## 8. 결과 톤 결정 방식 (점수화는 보조로만)

```ts
type ReadingTone = "positive" | "neutral" | "cautious" | "delayed" | "transformational";
```

### 내부 가중치

```ts
// 카드가 속한 흐름 그룹 기준 (§6). 무소속 카드는 0점.
positive: +2
stable:   +1
neutral:   0
delayed:  -1   // 단, 최종 톤 판정에서 delayed 그룹 2장 이상이면 점수와 무관하게 "delayed"
conflict: -2
transformational: special  // 점수에 넣지 않고 별도 플래그
```

### 판정 규칙

1. **결과/최종 결과 위치 카드는 가중치 2배**
2. 역방향 카드는 해당 가중치를 절반으로 (기운이 눌린 상태로 취급)
3. 합산 점수 → 톤: `+3 이상 = positive`, `+1~+2 = neutral(밝은 쪽)`, `0~-1 = neutral(신중한 쪽)`, `-2 이하 = cautious`
4. delayed 그룹 2장 이상 → `delayed` / transformational 플래그 + 점수 0 미만 → `transformational`
5. **사용자에게 점수·확률을 노출하지 않는다.** "확률 87%" 같은 표현 금지. 톤은 문장의 온도로만 반영한다.

톤별 결과 문장 온도 예:
- positive: "지금 흐름을 믿고 움직여도 좋아 보입니다."
- cautious: "가능성이 닫힌 것은 아니지만, 지금은 속도보다 점검이 필요한 흐름입니다."
- delayed: "답이 없는 것이 아니라, 아직 익는 중인 흐름입니다."
- transformational: "지금의 끝은 다음 장의 시작과 붙어 있습니다."

### 오늘의 타로 리드 문장 풀 (02 §10-3에서 참조)

원소별 3종, `seed % 3`으로 선택해 결과 상단에 1문장 배치:

```text
fire  : ["오늘은 움직이는 만큼 열리는 날입니다.","작은 행동이 큰 불씨가 되는 하루입니다.","망설임보다 실행이 어울리는 날입니다."]
water : ["마음의 소리가 유난히 선명한 날입니다.","감정의 결이 하루를 이끄는 날입니다.","공감이 행운을 부르는 하루입니다."]
air   : ["생각이 맑게 정리되는 날입니다.","말과 판단이 힘을 갖는 하루입니다.","한 걸음 물러서면 답이 보이는 날입니다."]
earth : ["기본기가 빛을 발하는 날입니다.","차곡차곡 쌓는 것이 어울리는 하루입니다.","실속을 챙기기 좋은 날입니다."]
```

---

## 9. 최종 리딩 생성 규칙

AI 리딩(04)과 로컬 폴백 모두 아래 8단계 서사를 따르고, 화면에는 01 §9의 11개 섹션으로 매핑된다.

```text
서사 단계                          → 01 §9 결과 화면 섹션
1. 질문의 핵심을 다시 정리          → 4. 질문 요약
2. 현재 흐름을 설명                → 5. 전체 흐름 요약
3. 각 카드가 위치에서 의미하는 것    → 6. 카드별 해석
4. 카드들이 함께 만드는 이야기       → 7. 카드 조합 해석
5. 질문에 대한 직접 답변            → 8. 최종 답변
6. 현실적인 조언                   → 9. 현실적인 조언
7. 주의할 점                       → 10. 주의할 점
8. 다음 행동 가이드                → 11. 다음 행동 가이드
(1~3 섹션: 질문·상품·카드 목록은 엔진 출력이 아닌 메타데이터 렌더)
```

### 로컬 폴백 리딩 조립 (composeFallbackReading — 01 §11.5)

AI 워커 실패 시 아래 규칙으로 `buildReading()` 결과만으로 완결된 리딩을 만든다. 에러 문구는 노출하지 않는다.

1. 질문 요약: 질문 문자열 + 1순위 카테고리 라벨로 정형 문장 생성 ("○○에 대해 물으셨습니다. △△의 흐름을 중심으로 봤습니다.")
2. 전체 흐름 요약: 톤(§8) 문장 + 감지된 흐름 그룹 서술 + 강조 카드 1장 언급
3. 카드별 해석: §5 합성 결과를 위치 순서대로
4. 조합 해석: §6에서 감지된 조합 문장 (없으면 일반 조합 문장 1개)
5. 최종 답변: 결과 위치 카드의 카테고리별 의미 + 톤 온도의 결합
6. 조언: 조언 위치 카드(없는 스프레드면 결과 카드)의 `advice`
7. 주의할 점: 가장 부정적 카드의 `warning`
8. 행동 가이드: 톤별 정형 템플릿 (오늘 1개 / 이번 주 1개 / 이번 달 1개)

모든 문장은 카드 의미의 단순 나열이 아니라 질문 문자열을 최소 2회 이상 자연스럽게 되짚는 하나의 상담문이어야 한다.

---

## 10. 금지 표현과 안전 규칙

AI 프롬프트(04)와 폴백 템플릿 모두에 강제 적용한다.

1. **죽음 카드** — 실제 죽음을 암시하지 말 것. 항상 "끝과 새 시작의 전환"으로만
2. **탑 카드** — 무조건 파국이라고 말하지 말 것. "흔들림 뒤의 재건"을 함께 서술
3. **건강 질문** — 진단·처방처럼 말하지 말 것. 필요시 "전문의 상담" 권유 수준까지만
4. **투자 질문** — 매수/매도 지시처럼 말하지 말 것. 태도와 점검 포인트만
5. **연애 질문** — "무조건 연락 온다"처럼 단정하지 말 것
6. 불안감을 과도하게 자극하지 말 것
7. **결제를 유도하기 위해 공포를 만들지 말 것** (부정 카드 → 추가 상품 유도 연결 금지)
8. 점수·확률의 숫자 노출 금지 (§8-5)
9. 문체는 02 §3 기준 (합니다체, 단정 금지, 평이체)

구현 체크: 폴백 템플릿에는 위 금지 표현이 애초에 존재하지 않게 작성하고, AI 응답에는 후처리 필터(금지 패턴 정규식 — "반드시", "무조건", "100%", "확률 \d+%" 등 감지 시 완곡 표현으로 치환)를 둔다. 상세 구현은 `04_ai_reading.md`.
