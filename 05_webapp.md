# 05_webapp.md — 타로 웹앱 구현 지시서

> `01_project.md`, `02_tarot_database.md`, `03_tarot_engine.md`, `04_ai_reading.md`를 기준으로 실제 타로 웹앱을 구현하기 위한 문서.
> 기존 사주 웹앱의 단일 SPA 구조와 결제·저장 컨벤션을 유지하면서 타로 기능을 추가한다.

---

## 1. 구현 목표

기존 사주 웹앱에 신규 카테고리 `타로`를 추가한다. 타로는 무료 유입 기능과 유료 핵심 기능으로 나뉜다.

```text
오늘의 타로   무료. API 없이 날짜 기반 1장 리딩 제공.
질문형 타로   유료. 질문 입력, 상품 추천, 결제, 직접 카드 선택, AI 리딩 제공.
```

핵심은 사용자가 직접 카드를 고르는 경험이다. 질문형 타로는 결제 후 카드 선택 화면으로 이동하며, 모든 카드를 선택해야 결과를 볼 수 있다.

---

## 2. 필요한 페이지

기존 SPA 라우터 또는 hash/router 유틸에 아래 경로를 추가한다.

```text
/tarot
/tarot/today
/tarot/question
/tarot/recommend
/tarot/payment
/tarot/draw
/tarot/result
/tarot/history
```

### 2.1 경로별 역할

| 경로 | 역할 | API |
|---|---|---|
| `/tarot` | 타로 메인 메뉴 | 없음 |
| `/tarot/today` | 오늘의 타로 9장 후보와 1장 결과 | 없음 |
| `/tarot/question` | 질문 입력 | 없음 |
| `/tarot/recommend` | 질문 분석과 상품 추천 | 없음 |
| `/tarot/payment` | mock 결제 또는 실제 결제 진입 | 결제 연결 시 사용 |
| `/tarot/draw` | 78장 덱에서 카드 직접 선택 | 없음 |
| `/tarot/result` | AI 리딩 결과 생성·표시 | OpenAI 워커 |
| `/tarot/history` | 저장된 유료 리딩 목록 | 로컬/서버 저장 |

---

## 3. 전역 상태

질문형 타로는 결제 왕복과 화면 이탈을 고려해 상태를 저장해야 한다.

```ts
export type TarotFlowState = {
  question: string;
  questionCategory: QuestionCategory;
  recommendedSpreadId: "tarot3" | "tarot5" | "tarot10";
  selectedSpreadId: "tarot3" | "tarot5" | "tarot10";
  spreadName: string;
  spreadDescription: string;
  price: number;
  positions: {
    index: number;
    label: string;
    meaning: string;
  }[];
  selectedCards: {
    positionIndex: number;
    cardId: string;
    orientation: "upright" | "reversed";
  }[];
  paymentStatus: "none" | "pending" | "paid";
  resultMarkdown?: string;
  createdAt?: string;
};
```

### 3.1 저장 키

```ts
const TAROT_FLOW_KEY = "tarot_flow_v1";
const TAROT_HISTORY_KEY = "tarot_history_v1";
const TAROT_DAILY_KEY_PREFIX = "tarot_daily_v1";
```

결제 전후 상태는 `sessionStorage`에 우선 저장하고, 새로고침 복구를 위해 `localStorage`에도 백업한다.

---

## 4. `/tarot` 메인 페이지

컴포넌트: `TarotHome`

두 개의 카드형 메뉴를 보여준다. 기존 앱의 어두운 배경과 골드 포인트를 사용한다.

### 4.1 오늘의 타로 카드

문구:

```text
오늘 나에게 필요한 메시지를 확인해보세요.
9장의 카드 중 한 장을 선택하면 오늘의 운세를 알려드립니다.
```

CTA:

```text
오늘의 타로 보기
```

클릭 시 `/tarot/today`로 이동한다.

### 4.2 질문형 타로 카드

문구:

```text
지금 가장 궁금한 질문을 떠올리고 직접 카드를 뽑아보세요.
질문에 맞는 리딩 방식을 추천해드립니다.
```

CTA:

```text
질문형 타로 시작하기
```

클릭 시 `/tarot/question`으로 이동한다.

---

## 5. `/tarot/today` 오늘의 타로

컴포넌트:

```text
TodayTarot
TodayCardGrid
TodayTarotResult
TarotCard
```

### 5.1 UI

- 제목: `오늘의 타로`
- 설명: `오늘 나에게 필요한 메시지를 떠올리며 9장의 카드 중 한 장을 선택해보세요.`
- 9장 카드 뒷면을 3x3 배열로 표시
- 카드 선택 시 CSS 3D flip 애니메이션
- 선택 후 결과 영역 표시
- 결과 하단에 질문형 타로 전환 CTA 표시

### 5.2 로직

- 78장 카드 중 9장을 선택한다.
- 기본은 날짜 기반 seed를 사용한다.
- 같은 날짜와 같은 사용자에게는 같은 9장이 나온다.
- 사용자가 선택한 카드의 `todayFortune` 데이터를 출력한다.
- OpenAI API를 사용하지 않는다.
- 오늘의 타로는 정방향만 사용한다.

```ts
function getTodaySeed(userId: string, date = new Date()): string {
  return `${date.toISOString().slice(0, 10)}:${userId}`;
}

function getDailyCards(seed: string, allCards: TarotCard[], count = 9): TarotCard[] {
  return seededShuffle(allCards, seed).slice(0, count);
}
```

### 5.3 당일 캐시

```ts
type DailyTarotCache = {
  date: string;
  userId: string;
  cardIds: string[];
  selectedCardId?: string;
  createdAt: string;
};
```

저장 키:

```text
tarot_daily_v1:{userId}:{YYYY-MM-DD}
```

---

## 6. `/tarot/question` 질문 입력

컴포넌트: `QuestionInput`

### 6.1 UI

- 제목: `무엇이 궁금하신가요?`
- 설명: `지금 가장 알고 싶은 질문을 마음속으로 떠올리고 입력해보세요.`
- 질문 입력 textarea
- 예시 질문 버튼
- 다음 버튼
- 10자 미만이면 다음 버튼 비활성화
- 200자 초과 입력 방지

예시 질문:

```text
그 사람은 저를 어떻게 생각하나요?
재회 가능성이 있을까요?
이직해도 괜찮을까요?
올해 재물운은 어떤가요?
지금 이 선택을 해도 될까요?
연락이 올까요?
이 관계는 앞으로 어떻게 될까요?
```

### 6.2 동작

1. 사용자가 질문 입력
2. 다음 버튼 클릭
3. `analyzeQuestion(question)` 실행
4. 결과를 `TarotFlowState`에 저장
5. `/tarot/recommend`로 이동

---

## 7. `/tarot/recommend` 상품 추천

컴포넌트:

```text
ReadingRecommendation
ReadingProductCard
```

질문 분석 결과에 따라 3장, 5장, 10장 중 하나를 추천한다. 추천되지 않은 상품도 선택 가능하다.

### 7.1 상품 목록

```ts
export const TAROT_PRODUCTS = [
  {
    id: "tarot3",
    name: "3장 리딩",
    price: 1500,
    description: "현재 상황과 가까운 흐름을 빠르게 확인합니다."
  },
  {
    id: "tarot5",
    name: "5장 리딩",
    price: 2000,
    description: "현재, 장애물, 숨겨진 흐름, 조언, 결과를 함께 봅니다."
  },
  {
    id: "tarot10",
    name: "10장 켈틱크로스",
    price: 3000,
    description: "복잡한 고민의 내면, 환경, 장기 흐름까지 깊게 봅니다."
  }
];
```

### 7.2 추천 상품 UI

추천 상품에는 아래 스타일을 적용한다.

- 추천 배지
- 강조 테두리
- 밝은 골드 계열 배경
- CTA: `추천 리딩으로 보기`

일반 상품 CTA:

```text
이 리딩 선택하기
```

### 7.3 동작

상품 선택 시:

1. `selectedSpreadId`, `spreadName`, `price` 저장
2. `getSpreadPositions(spreadId, questionCategory)` 실행
3. `/tarot/payment`로 이동

---

## 8. `/tarot/payment` 결제

컴포넌트: `MockPayment`

실제 결제 API가 없다면 mock 결제를 구현한다. 나중에 카카오페이 워커를 붙일 수 있도록 결제 함수를 분리한다.

### 8.1 UI

- 선택 상품명
- 금액
- 질문 요약
- 결제하기 버튼
- 뒤로가기 버튼

### 8.2 mock 결제 흐름

```text
선택 상품 확인
→ 금액 확인
→ 결제하기 버튼
→ mock 결제 성공 처리
→ paymentStatus = "paid"
→ /tarot/draw 이동
```

### 8.3 결제 함수 분리

```ts
export async function requestTarotPayment(state: TarotFlowState): Promise<{
  ok: boolean;
  paymentId?: string;
  redirectUrl?: string;
  error?: string;
}> {
  if (USE_MOCK_PAYMENT) {
    await wait(600);
    return { ok: true, paymentId: `mock_${Date.now()}` };
  }

  return requestKakaoTarotPayment(state);
}
```

실제 결제 연결 시에는 기존 `worker/kakao-payment-worker.js`의 `CATEGORY_PRICE`에 `tarot3`, `tarot5`, `tarot10`을 추가한다.

---

## 9. `/tarot/draw` 카드 선택 화면

컴포넌트:

```text
TarotDrawScreen
SpreadSlots
TarotDeckCarousel
TarotCard
```

이 화면이 질문형 타로의 핵심 경험이다.

### 9.1 상단 UI

- 선택한 스프레드 이름
- 질문 표시
- 카드 슬롯 배열
- 슬롯 아래 위치명 표시
- 선택 진행률 표시

예:

```text
2 / 5장 선택 완료
```

슬롯은 선택 전에는 카드 뒷면 또는 비어 있는 프레임으로 표시한다. 선택 후에는 해당 카드 앞면과 카드명을 표시한다.

### 9.2 하단 덱 UI

- 78장 카드 뒷면 덱
- 아치형 또는 부채꼴 형태
- 좌우 드래그/스와이프 가능
- 중앙 카드 강조
- 중앙 카드 선택 가능
- 선택된 카드는 덱에서 제거하거나 비활성화

### 9.3 선택 동작

```text
카드 덱 드래그
→ 중앙 카드 강조
→ 중앙 카드 터치
→ 상단 다음 슬롯으로 이동
→ 필요한 카드 수만큼 반복
→ 선택 완료 버튼 노출
```

### 9.4 선택 완료 조건

- `selectedCards.length === positions.length`일 때만 선택 완료 버튼을 노출한다.
- 선택 완료 클릭 시 `/tarot/result`로 이동한다.
- 중복 선택은 허용하지 않는다.
- 질문형 타로는 선택 완료 시 30% 확률로 역방향을 배정한다. 단, 오늘의 타로는 역방향을 사용하지 않는다.

```ts
function drawCardFromDeck(deck: TarotCard[], selectedCards: SelectedCard[]): TarotCard[] {
  const selectedIds = new Set(selectedCards.map(card => card.cardId));
  return deck.filter(card => !selectedIds.has(card.id));
}
```

---

## 10. 카드 덱 성능 최적화

78장 이미지를 한 번에 무겁게 렌더링하지 않는다.

권장 방식:

- 실제 데이터는 78장 유지
- 화면에는 현재 index 기준 주변 카드만 렌더링
- 나머지는 가상 처리
- 모바일에서 60fps에 가깝게 동작하도록 transform 기반 애니메이션 사용
- 카드 이미지는 `loading="lazy"` 적용
- 드래그 중에는 layout 변경 속성을 피하고 `transform`, `opacity` 중심으로 처리

### 10.1 가상 렌더링 예시

```ts
function getVisibleDeckWindow(deck: TarotCard[], centerIndex: number, radius = 8) {
  return deck
    .map((card, index) => ({ card, index, offset: index - centerIndex }))
    .filter(item => Math.abs(item.offset) <= radius);
}
```

### 10.2 모바일 제스처

- pointer events를 사용한다.
- 드래그 거리 20px 이상일 때만 카드 이동으로 판정한다.
- 스와이프 속도가 빠르면 2~3장 이동을 허용한다.
- 중앙 카드 탭과 드래그 종료를 구분한다.

---

## 11. `/tarot/result` 결과 화면

컴포넌트: `TarotResult`

### 11.1 상단 UI

- 질문
- 선택한 리딩 상품
- 선택된 카드 전체 앞면 표시
- 카드명과 위치 표시

### 11.2 본문 순서

결과 Markdown은 아래 순서로 표시한다.

```text
질문 요약
전체 흐름 요약
카드별 해석
카드 조합 해석
질문에 대한 최종 답변
현실적인 조언
주의할 점
다음 행동 가이드
```

### 11.3 결과 생성

질문형 타로는 OpenAI API를 사용한다. 실패하면 템플릿 리딩을 출력한다.

```ts
async function createTarotResult(state: TarotFlowState): Promise<string> {
  const input = buildAIReadingInput(state);

  try {
    return await generateAIReading(input);
  } catch {
    return generateTemplateReading(input);
  }
}
```

### 11.4 중복 생성 방지

- `state.resultMarkdown`이 있으면 API를 다시 호출하지 않는다.
- 결과 생성 중 새로고침되면 로딩 복구 화면을 보여준다.
- API 실패 시에도 `generateTemplateReading(input)` 결과를 저장한다.

---

## 12. `/tarot/history`

컴포넌트: `TarotHistory`

유료 리딩 결과를 다시 볼 수 있는 페이지다.

표시 항목:

- 질문
- 리딩 종류
- 날짜
- 선택 카드 요약
- 다시 보기 버튼

### 12.1 저장 데이터 구조

```ts
export type SavedTarotReading = {
  id: string;
  userId?: string;
  question: string;
  spreadId: string;
  spreadName: string;
  price: number;
  selectedCards: {
    cardId: string;
    cardNameKo: string;
    positionLabel: string;
    orientation: "upright" | "reversed";
  }[];
  resultMarkdown: string;
  createdAt: string;
};
```

### 12.2 저장 함수

```ts
export function saveTarotReading(reading: SavedTarotReading): void {
  const saved = JSON.parse(localStorage.getItem(TAROT_HISTORY_KEY) || "[]");
  localStorage.setItem(TAROT_HISTORY_KEY, JSON.stringify([reading, ...saved]));
}
```

서버 저장을 추가할 경우에도 로컬 저장은 즉시 복구용으로 유지한다.

---

## 13. 컴포넌트 구조

아래 컴포넌트를 만든다.

```text
TarotHome
TodayTarot
TodayCardGrid
TodayTarotResult
QuestionInput
ReadingRecommendation
ReadingProductCard
MockPayment
TarotDrawScreen
SpreadSlots
TarotDeckCarousel
TarotCard
TarotResult
TarotHistory
```

### 13.1 컴포넌트 책임

| 컴포넌트 | 책임 |
|---|---|
| `TarotHome` | 타로 메인 메뉴 |
| `TodayTarot` | 오늘의 타로 상태와 캐시 관리 |
| `TodayCardGrid` | 9장 카드 선택 UI |
| `TodayTarotResult` | 오늘의 운세 결과 표시 |
| `QuestionInput` | 질문 입력과 예시 질문 |
| `ReadingRecommendation` | 추천 결과와 상품 목록 |
| `ReadingProductCard` | 개별 상품 카드 |
| `MockPayment` | mock 결제 화면 |
| `TarotDrawScreen` | 카드 선택 전체 화면 |
| `SpreadSlots` | 상단 스프레드 슬롯 |
| `TarotDeckCarousel` | 하단 드래그 덱 |
| `TarotCard` | 카드 앞면/뒷면 공통 렌더 |
| `TarotResult` | 결과 생성과 Markdown 렌더 |
| `TarotHistory` | 저장된 결과 목록 |

---

## 14. 유틸 함수

아래 유틸 함수를 만든다.

```ts
getTodaySeed()
getDailyCards(seed, allCards, count)
analyzeQuestion(question)
recommendSpread(questionCategory)
getSpreadPositions(spreadId, questionCategory)
drawCardFromDeck(deck, selectedCards)
generateTemplateReading(input)
generateAIReading(input)
saveTarotReading(reading)
```

### 14.1 파일 분리 권장

```text
tarot/tarot-cards.js        02 데이터
tarot/tarot-spreads.js      스프레드 위치
tarot/tarot-recommend.js    질문 분석과 추천
tarot/tarot-engine.js       위치별 해석과 폴백 조합
tarot/tarot-ai.js           AI 프롬프트와 API 호출
tarot/tarot-storage.js      상태 저장과 히스토리
tarot/tarot-ui.js           SPA 렌더링 컴포넌트
```

기존 `index.html` 단일 파일 구조를 유지해야 한다면 위 모듈을 같은 파일 내부 섹션으로 배치하되, 함수명과 책임은 그대로 유지한다.

---

## 15. 디자인 요구사항

- 모바일 우선
- 어두운 배경
- 금색 포인트
- 카드 애니메이션
- 신비롭고 고급스러운 느낌
- 버튼은 명확하게
- 결제 상품은 가격과 차이가 잘 보이게
- 결과 화면은 읽기 편하게
- 기존 앱 폰트 스택 유지
- 타로 전용 색은 기존 `--accent-bright`, `--accent`, `--bg`를 우선 사용

### 15.1 타로 전용 변수

```css
:root {
  --tarot-glow: rgba(212, 175, 55, 0.32);
  --tarot-panel: rgba(255, 255, 255, 0.075);
}
```

### 15.2 카드 버튼 접근성

- 카드 뒷면도 `button` 또는 `role="button"`으로 접근 가능해야 한다.
- 선택 가능한 중앙 카드에는 `aria-label`을 제공한다.
- 결과 Markdown 영역은 충분한 줄간격을 사용한다.

---

## 16. 구현 순서

아래 순서대로 구현한다.

```text
1. 라우팅 생성
2. 카드 데이터 연결
3. 오늘의 타로 구현
4. 질문 입력 구현
5. 상품 추천 구현
6. mock 결제 구현
7. 카드 선택 화면 구현
8. 결과 생성 구현
9. 결과 저장 구조 구현
10. 히스토리 페이지 구현
11. 반응형/애니메이션 개선
12. API 연결
```

---

## 17. 반드시 지켜야 할 점

- 오늘의 타로는 API 없이 작동한다.
- 질문형 타로는 결제 후 카드 선택으로 이동한다.
- 카드 선택 경험이 핵심이다.
- 78장 덱은 좌우 드래그 가능해야 한다.
- 중앙 카드가 선택 카드가 되어야 한다.
- 모든 카드를 선택해야 선택 완료 버튼이 나타난다.
- 결과는 카드 의미 나열이 아니라 질문에 대한 리딩이어야 한다.
- API 실패 시에도 결과가 나와야 한다.
- 실제 결제 API 연결이 쉬운 구조여야 한다.
- 결제 완료 전 `/tarot/draw`로 직접 접근하면 `/tarot/payment` 또는 `/tarot/question`으로 되돌린다.
- 결과 재열람 시에는 저장된 Markdown을 사용하고 AI를 다시 호출하지 않는다.

---

## 18. 완료 기준

기능 완료 판단 기준:

- [ ] `/tarot`에서 두 메뉴가 보인다.
- [ ] `/tarot/today`에서 9장 카드가 날짜 기반으로 고정된다.
- [ ] 오늘의 타로 결과가 API 없이 표시된다.
- [ ] 질문 입력 후 추천 상품이 표시된다.
- [ ] 추천 상품과 비추천 상품 모두 선택 가능하다.
- [ ] mock 결제 후 카드 선택 화면으로 이동한다.
- [ ] 78장 덱을 좌우 드래그할 수 있다.
- [ ] 중앙 카드만 선택된다.
- [ ] 선택된 카드는 슬롯에 들어가고 덱에서 제거 또는 비활성화된다.
- [ ] 모든 카드 선택 후 결과 화면으로 이동한다.
- [ ] AI 실패 시에도 템플릿 결과가 표시된다.
- [ ] 결과가 히스토리에 저장되고 다시 볼 수 있다.
- [ ] 모바일 화면에서 텍스트와 카드가 겹치지 않는다.

