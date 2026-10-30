# 타로 카드별 의미 수정

## 변경

- 숫자 단계 × 슈트로 만들던 마이너 56장의 해석을 카드별 정적 데이터로 교체했다.
- 메이저 22장의 기존 정방향 의미를 유지하고, 카드별 역방향·관계·재물·일/학업·행동·주의 해석을 추가했다.
- 무료 오늘 타로, 유료 미리보기, 유료 계산식 기본 풀이와 AI 요청의 기초 의미가 같은 카드 사전을 사용한다.
- 역방향을 일괄적으로 약화/지연으로 설명하거나, 정방향 결과를 무조건 긍정하는 문장을 제거했다.
- 소드 8 역방향에는 제약의 해소와 선택권 회복을 반영했다. 소드 3·9, 컵 8 등도 숫자가 같은 다른 카드와 구분했다.
- 예전 계산식 미리보기는 다시 열 때 선택 카드와 방향을 유지한 채 갱신한다. 이미 저장된 유료 AI 본문과 히스토리는 자동으로 덮어쓰지 않는다.
- 화면의 구성과 카드 이미지 순서, 결제 가격은 변경하지 않았다. 무료 카테고리의 AI 호출을 추가하지 않았다.

## 해석의 기준

Rider–Waite–Smith 계열의 그림 상징을 바탕으로 현대 생활에 맞게 직접 작성했다. 역방향은 원전 문장을 그대로 옮긴 것이 아닌 현대적 상담 해석이다. 공포를 유발하는 사건·질병·사망·외도·임신 등의 확정 예언으로 바꾸지 않는다.

대조 자료:

- [A. E. Waite, The Pictorial Key to the Tarot](https://sacred-texts.com/book/the-pictorial-key-to-the-tarot)
- [Eight of Swords](https://sacred-texts.com/book/the-pictorial-key-to-the-tarot/eight-of-swords)
- [Eight of Cups](https://sacred-texts.com/book/the-pictorial-key-to-the-tarot/eight-of-cups)
- [Five of Swords](https://sacred-texts.com/book/the-pictorial-key-to-the-tarot/five-of-swords)

## 검증

`tools/tarot-meaning-regression.js`:

- 78장 식별자·필수 해석 누락 및 카드별 본문 중복 검사.
- 마이너 56장의 고유 의미에 대한 별도 기대값 검사.
- 78장 × 정/역방향 × 12개 주제 = 1,872개 조합의 화면 본문·AI 입력 의미 일치 검사.
- 문제 카드에 기존 숫자 단계 문장이 남아 있지 않은지 검사.
- 이전 미리보기 갱신 및 저장된 유료 본문 보존 검사.

`tools/free-ai-regression.js`: 무료 7종 및 유료 잠금 미리보기 16경로의 추론·이미지 생성·번역 요청 0건을 검사한다. 유료 양성 대조 요청은 모의 네트워크로만 처리한다.

두 검사를 `npm test`에 포함했다. 신규 2종과 기존 10종, 총 12개 검사 스크립트가 최종 통과했다. 기존 검사에서 발견한 선택 기준 문구와 주제별 첫 장면의 차이도 보완한 뒤 관련 검사를 다시 통과했다. 실제 유료 AI 응답이나 운세의 적중을 보증하는 검사는 아니다. 이번 작업은 로컬 수정이며 배포는 별도다.
