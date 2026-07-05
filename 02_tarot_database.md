# 02_tarot_database.md — 78장 타로 카드 데이터베이스

> `01_project.md`를 기준으로 한 카드 데이터 설계. 이 파일이 실제 서비스의 카드 해석 품질을 결정한다.
> 구현 시 이 문서의 데이터를 그대로 `tarot/tarot-cards.js`로 옮긴다 (타입 주석 제거만 하면 됨).

---

## 1. 설계 목적

78장 전체에 대해 구조화된 데이터를 정의한다. 이 데이터는 아래 기능의 단일 원천(single source)이다.

- 오늘의 타로 (API 없음 — `todayFortune` 필드만으로 완결)
- 질문형 타로 카드별 해석 (위치 의미 × 분야별 의미 합성, → `03_tarot_engine.md`)
- 카드 조합 해석 (keywords·tone 기반)
- 연애/재물/직장/관계/건강 분야별 해석
- AI 리딩 생성 (프롬프트에 카드 데이터 주입, → `04_ai_reading.md`)
- API 실패 시 템플릿 리딩 생성 (분야별 의미 + advice/warning 조합)

## 2. 타입 정의

```ts
export type TarotCard = {
  id: string;                 // 불변 키. "major-00-fool" | "wands-03" | "cups-12-knight"
  nameKo: string;
  nameEn: string;
  arcana: "major" | "minor";
  suit?: "cups" | "wands" | "swords" | "pentacles";
  number?: number | "page" | "knight" | "queen" | "king";
  element?: "fire" | "water" | "air" | "earth";
  keywords: string[];         // 4~5개. 조합 해석·AI 프롬프트에서 사용
  uprightMeaning: string;
  reversedMeaning: string;    // MVP 미사용이어도 필수 (질문형 30% 역방향, 01 §8.4)
  loveMeaning: string;
  moneyMeaning: string;
  careerMeaning: string;
  relationshipMeaning: string;
  healthMeaning: string;
  advice: string;
  warning: string;
  todayFortune: {             // 오늘의 타로 전용 — API 없이 이 텍스트를 그대로 렌더
    overall: string;
    love: string;
    money: string;
    work: string;
    advice: string;
    caution: string;
  };
  imagePrompt: string;        // 장면 묘사만. 최종 프롬프트 = imagePrompt + ", " + TAROT_IMAGE_STYLE
  imageUrl?: string;          // 예약 필드. 채워지면 CSS/SVG 카드 대신 이미지 렌더 (01 §10.4)
};

// 이미지 프롬프트 공통 스타일 (전 카드 공유)
export const TAROT_IMAGE_STYLE =
  "elegant mystical tarot card illustration, dark navy and deep purple background, celestial gold line art, ornate gold frame, fantasy style";

// 엔진에서 쓰는 톤 가중치 (03에서 정의하는 ReadingTone 계산용)
export type CardTone = "positive" | "neutral" | "cautious" | "difficult" | "transformational";
```

## 3. 작성 규칙 (문체 기준)

모든 해석 문구는 아래를 따른다. 데이터 추가·수정 시에도 동일하게 적용한다.

- 공포를 조장하지 않는다. 단정하지 않는다 ("무조건 된다 / 반드시 실패한다" 금지)
- 따뜻하지만 가볍지 않게. 실제 상담처럼 자연스럽게
- 건강 해석은 의학적 진단처럼 쓰지 않는다 (생활 리듬·컨디션 관리 수준)
- 재물 해석은 매수/매도 지시처럼 쓰지 않는다
- 합니다체로 통일. 한자·괄호 병기 최소화 (기존 앱 평이체 기준)
- 길이 가이드: 분야별 의미 각 1문장(40~70자), upright/reversed 1~2문장, todayFortune 각 항목 1문장

## 4. 슈트별 기본 의미

| 슈트 | 원소 | 핵심 | 관련 분야 |
|---|---|---|---|
| Wands 완드 | fire | 열정, 행동, 도전, 성장, 추진력 | 일, 사업, 목표, 시작, 에너지 |
| Cups 컵 | water | 감정, 사랑, 관계, 직관, 마음 | 연애, 재회, 인간관계, 감정 회복 |
| Swords 소드 | air | 생각, 판단, 갈등, 말, 결단 | 고민, 선택, 갈등, 커뮤니케이션 |
| Pentacles 펜타클 | earth | 돈, 현실, 직업, 안정, 성과 | 재물, 직장, 사업, 건강, 실질적 결과 |

코트 카드 공통 결: Page=배움·소식·시작하는 에너지 / Knight=추진·이동·행동 / Queen=내면화된 성숙·보살핌 / King=완성된 통제력·책임.

---

## 5. 메이저 아르카나 22장

```ts
export const MAJOR_ARCANA: TarotCard[] = [
{
  id: "major-00-fool", nameKo: "바보", nameEn: "The Fool", arcana: "major", element: "air",
  keywords: ["새로운 시작", "자유", "모험", "순수함", "가능성"],
  uprightMeaning: "새로운 출발과 가능성을 의미합니다. 아직 확정된 것은 없지만, 열린 마음으로 움직일 때 예상 밖의 기회가 생길 수 있습니다.",
  reversedMeaning: "준비 부족이나 충동적인 선택을 뜻합니다. 계획 없이 움직이면 시행착오가 커질 수 있습니다.",
  loveMeaning: "새로운 만남과 설렘의 가능성이 열리지만, 아직은 가능성을 확인하는 단계에 가깝습니다.",
  moneyMeaning: "새로운 수입 기회나 아이디어가 생길 수 있지만, 검토 없이 움직이는 것은 피해야 합니다.",
  careerMeaning: "새 프로젝트나 이직 생각, 창의적인 도전을 의미합니다. 두려움보다 시도 자체가 중요한 시기입니다.",
  relationshipMeaning: "가볍고 자유로운 소통이 도움이 됩니다. 틀에서 벗어난 대화가 새 흐름을 만듭니다.",
  healthMeaning: "생활 리듬을 새로 정비하기 좋은 때입니다. 몸의 신호를 가볍게 넘기지 마세요.",
  advice: "완벽하게 준비될 때까지 기다리기보다 작은 시도를 시작해보세요.",
  warning: "충동적인 결정, 책임을 생각하지 않은 선택은 주의해야 합니다.",
  todayFortune: {
    overall: "오늘은 새로운 시도를 해보기 좋은 날입니다. 낯선 제안이 의외의 기회가 될 수 있습니다.",
    love: "가볍고 자연스러운 대화가 좋은 흐름을 만듭니다. 무겁게 접근하지 마세요.",
    money: "새로운 아이디어가 떠오를 수 있지만 즉흥적인 지출은 조심하세요.",
    work: "새로운 방식으로 접근하면 막혔던 일이 풀릴 수 있습니다.",
    advice: "오늘은 완벽함보다 시작이 중요합니다.",
    caution: "계획 없는 행동은 실수로 이어질 수 있습니다."
  },
  imagePrompt: "a young traveler at a cliff edge under a golden dawn, small dog, white rose"
},
{
  id: "major-01-magician", nameKo: "마법사", nameEn: "The Magician", arcana: "major", element: "air",
  keywords: ["실행력", "재능", "집중", "창조", "기회 포착"],
  uprightMeaning: "가진 재능과 자원을 실제로 쓸 수 있는 때입니다. 의지를 모으면 원하는 것을 현실로 만들 수 있는 힘이 있습니다.",
  reversedMeaning: "재능이 흩어지거나 말만 앞서는 상태를 뜻합니다. 과장이나 눈속임을 조심해야 합니다.",
  loveMeaning: "마음을 표현하면 통하는 시기입니다. 주도적으로 움직일수록 관계가 진전됩니다.",
  moneyMeaning: "능력을 수입으로 연결할 기회가 보입니다. 가진 자원을 점검하면 길이 열립니다.",
  careerMeaning: "기획·제안·발표처럼 실력을 보여주는 일에서 성과가 나기 좋습니다.",
  relationshipMeaning: "대화를 이끄는 쪽이 되면 관계의 흐름을 원하는 방향으로 만들 수 있습니다.",
  healthMeaning: "컨디션을 스스로 조절할 수 있는 시기입니다. 규칙적인 습관이 힘이 됩니다.",
  advice: "지금 가진 것으로 시작하세요. 도구는 이미 손안에 있습니다.",
  warning: "능력을 부풀리거나 여러 일을 동시에 벌이는 것은 피하세요.",
  todayFortune: {
    overall: "준비해온 것을 보여주기 좋은 날입니다. 집중하면 원하는 결과에 가까워집니다.",
    love: "먼저 표현하는 쪽이 흐름을 가져갑니다.",
    money: "아이디어를 돈으로 연결할 실마리가 보입니다.",
    work: "발표나 제안에서 실력이 돋보일 수 있습니다.",
    advice: "흩어진 에너지를 하나에 모으세요.",
    caution: "말이 앞서면 신뢰를 잃을 수 있습니다."
  },
  imagePrompt: "a robed magician raising a wand, infinity symbol above, four suit tools on a table"
},
{
  id: "major-02-high-priestess", nameKo: "여사제", nameEn: "The High Priestess", arcana: "major", element: "water",
  keywords: ["직관", "비밀", "내면", "기다림", "통찰"],
  uprightMeaning: "겉으로 드러나지 않은 것을 읽어야 하는 때입니다. 성급한 판단보다 직관과 관찰이 답을 줍니다.",
  reversedMeaning: "감이 흐려지거나 비밀이 부담이 되는 상태입니다. 남의 말에 휩쓸리기 쉽습니다.",
  loveMeaning: "상대의 마음이 아직 다 드러나지 않았습니다. 서두르기보다 지켜보는 편이 좋습니다.",
  moneyMeaning: "드러나지 않은 조건이 있을 수 있으니 계약이나 투자는 한 번 더 확인하세요.",
  careerMeaning: "정보를 모으고 때를 기다리는 편이 유리합니다. 조용한 준비가 힘이 됩니다.",
  relationshipMeaning: "말수를 줄이고 들어주는 쪽이 되면 관계의 속사정이 보입니다.",
  healthMeaning: "몸이 보내는 작은 신호에 귀 기울일 때입니다. 휴식이 회복의 핵심입니다.",
  advice: "결정을 미뤄도 됩니다. 지금은 아는 것보다 느끼는 것이 정확합니다.",
  warning: "확인되지 않은 소문이나 추측으로 판단하지 마세요.",
  todayFortune: {
    overall: "조용히 관찰하면 놓치던 것이 보이는 날입니다.",
    love: "상대의 진심은 말보다 행동에서 드러납니다.",
    money: "큰 결정은 미루고 정보를 더 모으세요.",
    work: "나서기보다 흐름을 읽는 편이 유리합니다.",
    advice: "직감이 평소보다 정확한 날입니다.",
    caution: "속단과 소문 전달은 피하세요."
  },
  imagePrompt: "a serene priestess seated between two pillars, crescent moon at her feet, veiled scroll"
},
{
  id: "major-03-empress", nameKo: "여황제", nameEn: "The Empress", arcana: "major", element: "earth",
  keywords: ["풍요", "돌봄", "성장", "결실", "안정감"],
  uprightMeaning: "돌보고 가꾼 것이 자라나는 풍요의 흐름입니다. 관계도 일도 자연스럽게 무르익습니다.",
  reversedMeaning: "과보호나 의존, 자기 돌봄 부족을 뜻합니다. 주기만 하다 지칠 수 있습니다.",
  loveMeaning: "애정이 깊어지고 관계가 안정되는 흐름입니다. 함께 있는 시간이 편안해집니다.",
  moneyMeaning: "꾸준히 가꿔온 것에서 수익이 나기 좋습니다. 풍요롭지만 낭비는 경계하세요.",
  careerMeaning: "키워온 프로젝트가 결실을 보기 시작합니다. 팀을 돌보는 역할이 빛납니다.",
  relationshipMeaning: "너그럽게 품어주는 태도가 관계를 부드럽게 만듭니다.",
  healthMeaning: "잘 먹고 잘 쉬는 기본이 가장 큰 보약이 되는 시기입니다.",
  advice: "조급해하지 않아도 됩니다. 자라는 중인 것을 믿고 돌봐주세요.",
  warning: "남을 챙기느라 자신을 소홀히 하지 마세요.",
  todayFortune: {
    overall: "여유를 가질수록 좋은 것이 들어오는 날입니다.",
    love: "따뜻한 배려가 관계를 한 뼘 깊게 만듭니다.",
    money: "들어오는 흐름은 좋지만 기분에 따른 소비는 조심하세요.",
    work: "혼자 몰아붙이기보다 함께 키우는 방식이 통합니다.",
    advice: "자신에게도 너그러워지세요.",
    caution: "과식·과소비처럼 넘치는 것을 경계하세요."
  },
  imagePrompt: "a crowned empress on a garden throne, wheat field, venus symbol, flowing robe"
},
{
  id: "major-04-emperor", nameKo: "황제", nameEn: "The Emperor", arcana: "major", element: "fire",
  keywords: ["안정", "책임", "구조", "권위", "주도권"],
  uprightMeaning: "질서를 세우고 책임지고 이끌어야 하는 때입니다. 원칙과 체계가 결과를 만듭니다.",
  reversedMeaning: "고집이나 통제 과잉, 혹은 기반이 흔들리는 상태를 뜻합니다.",
  loveMeaning: "관계에서 믿음직한 태도가 중요해집니다. 안정감을 주는 쪽이 주도권을 가집니다.",
  moneyMeaning: "계획적인 관리가 재물을 지킵니다. 원칙 있는 소비와 저축이 힘이 됩니다.",
  careerMeaning: "책임 있는 자리나 역할이 주어질 수 있습니다. 체계를 잡는 일에 강해집니다.",
  relationshipMeaning: "기준을 분명히 하되 강요하지 않으면 존중받습니다.",
  healthMeaning: "규칙적인 생활이 컨디션을 좌우합니다. 무리한 일정 관리가 필요합니다.",
  advice: "감정보다 원칙으로 판단하세요. 지금은 기준이 힘입니다.",
  warning: "내 방식만 옳다는 태도는 갈등을 부릅니다.",
  todayFortune: {
    overall: "기준을 세우고 정리하면 일이 순조로운 날입니다.",
    love: "든든한 모습이 상대에게 신뢰를 줍니다.",
    money: "가계부 정리, 고정지출 점검에 좋은 날입니다.",
    work: "책임지고 나서면 인정받을 수 있습니다.",
    advice: "원칙을 정하면 흔들리지 않습니다.",
    caution: "융통성 없는 태도는 마찰을 만듭니다."
  },
  imagePrompt: "a stern emperor on a stone throne with ram heads, red robe, mountains behind"
},
{
  id: "major-05-hierophant", nameKo: "교황", nameEn: "The Hierophant", arcana: "major", element: "earth",
  keywords: ["전통", "조언", "신뢰", "배움", "정석"],
  uprightMeaning: "검증된 방법과 조언을 따르는 것이 유리한 때입니다. 정석대로 가는 길이 가장 빠릅니다.",
  reversedMeaning: "형식에 갇히거나 관습이 답답해지는 상태입니다. 맞지 않는 틀일 수 있습니다.",
  loveMeaning: "진지하고 공식적인 관계로 나아가는 흐름입니다. 소개나 주변의 축복이 힘이 됩니다.",
  moneyMeaning: "검증된 방식의 저축과 투자가 맞습니다. 편법은 손해로 이어지기 쉽습니다.",
  careerMeaning: "선배나 전문가의 조언이 실질적인 도움이 됩니다. 자격·교육 관련 일에 좋습니다.",
  relationshipMeaning: "예의와 신뢰를 지키는 관계가 오래갑니다. 중재자의 도움도 유효합니다.",
  healthMeaning: "검진이나 전문가 상담처럼 정석적인 관리가 필요한 때입니다.",
  advice: "혼자 고민하지 말고 믿을 만한 사람에게 물어보세요.",
  warning: "남의 기준에 나를 다 맞추면 정작 중요한 것을 놓칩니다.",
  todayFortune: {
    overall: "경험자의 조언이 답을 주는 날입니다.",
    love: "진지한 대화가 관계를 한 단계 올립니다.",
    money: "안전한 선택이 결과적으로 이득입니다.",
    work: "절차를 지키는 것이 가장 빠른 길입니다.",
    advice: "배우는 자세가 기회를 만듭니다.",
    caution: "고정관념이 새 기회를 가릴 수 있습니다."
  },
  imagePrompt: "a robed hierophant blessing two acolytes, crossed keys, temple pillars"
},
{
  id: "major-06-lovers", nameKo: "연인", nameEn: "The Lovers", arcana: "major", element: "air",
  keywords: ["사랑", "선택", "조화", "연결", "가치관"],
  uprightMeaning: "마음이 통하는 연결과 중요한 선택을 의미합니다. 진심을 따르는 선택이 조화를 만듭니다.",
  reversedMeaning: "마음의 어긋남이나 우유부단, 가치관 충돌을 뜻합니다.",
  loveMeaning: "서로에게 끌리는 힘이 강한 시기입니다. 관계가 깊어지거나 중요한 선택 앞에 섭니다.",
  moneyMeaning: "돈 문제에서 둘 중 하나를 골라야 할 수 있습니다. 가치 기준을 먼저 정하세요.",
  careerMeaning: "협업이 잘 풀리는 때이며, 진로에서는 마음이 가는 쪽이 답에 가깝습니다.",
  relationshipMeaning: "솔직한 마음을 나누면 관계가 눈에 띄게 가까워집니다.",
  healthMeaning: "마음 상태가 몸에 그대로 반영됩니다. 감정 관리가 곧 건강 관리입니다.",
  advice: "머리로 계산하지 말고 무엇이 진심인지 먼저 확인하세요.",
  warning: "이도 저도 아닌 태도가 가장 큰 손해를 만듭니다.",
  todayFortune: {
    overall: "마음이 통하는 사람과의 시간이 행운을 부르는 날입니다.",
    love: "고백이나 깊은 대화에 좋은 흐름입니다.",
    money: "함께 결정하면 더 좋은 선택이 나옵니다.",
    work: "파트너십과 협업에서 성과가 납니다.",
    advice: "선택의 기준을 진심에 두세요.",
    caution: "결정을 미루면 흐름이 식습니다."
  },
  imagePrompt: "two lovers beneath a radiant angel, sun above, tree of life and tree of flames"
},
{
  id: "major-07-chariot", nameKo: "전차", nameEn: "The Chariot", arcana: "major", element: "water",
  keywords: ["추진력", "승리", "의지", "속도", "돌파"],
  uprightMeaning: "목표를 향해 밀고 나가면 이기는 흐름입니다. 방향을 정했다면 속도를 내도 좋습니다.",
  reversedMeaning: "방향 상실이나 폭주, 제동이 필요한 상태를 뜻합니다.",
  loveMeaning: "적극적으로 다가가는 쪽이 관계를 진전시킵니다. 밀당보다 직진이 통합니다.",
  moneyMeaning: "목표 금액을 정하면 달성 속도가 붙습니다. 공격적인 지출은 금물입니다.",
  careerMeaning: "경쟁에서 앞서 나가는 시기입니다. 추진하던 일을 밀어붙이기 좋습니다.",
  relationshipMeaning: "주도적으로 약속을 잡고 움직이면 관계가 활기를 얻습니다.",
  healthMeaning: "활동량을 늘리기 좋지만 과속은 부상으로 이어질 수 있습니다.",
  advice: "고민은 끝났습니다. 지금은 실행의 시간입니다.",
  warning: "두 마리 토끼를 쫓으면 방향을 잃습니다.",
  todayFortune: {
    overall: "속도가 붙는 날입니다. 미뤄둔 일을 밀어붙이세요.",
    love: "먼저 움직이는 쪽이 주도권을 가집니다.",
    money: "목표를 정한 지출과 저축 모두 순조롭습니다.",
    work: "경쟁 상황에서 유리한 고지를 차지합니다.",
    advice: "망설임 없이 추진하세요.",
    caution: "서두르다 놓치는 디테일을 조심하세요."
  },
  imagePrompt: "an armored charioteer driving two sphinxes, starry canopy, city walls behind"
},
{
  id: "major-08-strength", nameKo: "힘", nameEn: "Strength", arcana: "major", element: "fire",
  keywords: ["용기", "인내", "부드러운 힘", "자기 조절", "회복력"],
  uprightMeaning: "힘으로 누르는 게 아니라 부드럽게 다스리는 강함입니다. 인내가 상황을 길들입니다.",
  reversedMeaning: "자신감 저하나 감정 조절의 어려움을 뜻합니다. 무리하게 참는 것도 문제입니다.",
  loveMeaning: "조급함을 내려놓으면 관계가 부드럽게 풀립니다. 포용이 애정을 키웁니다.",
  moneyMeaning: "욕심을 다스리는 것이 곧 수익입니다. 버티는 힘이 필요한 시기입니다.",
  careerMeaning: "까다로운 일이나 사람을 다루는 능력이 빛납니다. 감정 노동에 지치지 않게 하세요.",
  relationshipMeaning: "부드러운 태도가 강한 상대도 움직입니다. 정면충돌은 피하세요.",
  healthMeaning: "꾸준한 관리가 체력을 회복시킵니다. 급격한 변화보다 지속이 중요합니다.",
  advice: "이기려 하지 말고 다독이세요. 그게 진짜 힘입니다.",
  warning: "화를 억누르기만 하면 나중에 크게 터집니다.",
  todayFortune: {
    overall: "차분함이 무기가 되는 날입니다.",
    love: "여유 있는 태도가 매력으로 다가갑니다.",
    money: "충동을 이기면 지갑이 지켜집니다.",
    work: "어려운 상대도 부드럽게 대하면 풀립니다.",
    advice: "감정의 고삐를 쥐는 쪽이 이깁니다.",
    caution: "무리한 참기는 스트레스가 됩니다."
  },
  imagePrompt: "a gentle woman calmly closing a lion's mouth, infinity symbol, flower garland"
},
{
  id: "major-09-hermit", nameKo: "은둔자", nameEn: "The Hermit", arcana: "major", element: "earth",
  keywords: ["성찰", "고독", "탐구", "내면의 답", "휴식"],
  uprightMeaning: "혼자만의 시간에서 답을 찾는 때입니다. 밖이 아니라 안을 들여다봐야 합니다.",
  reversedMeaning: "지나친 고립이나 답을 회피하는 상태를 뜻합니다.",
  loveMeaning: "잠시 거리를 두고 마음을 정리할 필요가 있습니다. 서두르면 오히려 멀어집니다.",
  moneyMeaning: "소비를 줄이고 재정 상태를 점검하기 좋은 시기입니다.",
  careerMeaning: "혼자 파고드는 공부나 연구에서 성과가 납니다. 조용한 준비 기간입니다.",
  relationshipMeaning: "모임보다 소수와의 깊은 대화가 도움이 됩니다.",
  healthMeaning: "휴식이 최고의 처방입니다. 몸과 마음 모두 재충전이 필요합니다.",
  advice: "잠시 멈추는 것도 전진입니다. 혼자 생각할 시간을 가지세요.",
  warning: "고립이 길어지면 시야가 좁아집니다. 필요한 도움은 청하세요.",
  todayFortune: {
    overall: "혼자만의 시간이 답을 주는 날입니다.",
    love: "잠깐의 거리가 오히려 애틋함을 만듭니다.",
    money: "지출을 점검하고 새는 돈을 찾기 좋습니다.",
    work: "집중이 필요한 일을 혼자 처리하기 좋습니다.",
    advice: "내면의 목소리를 들어보세요.",
    caution: "연락 두절이 오해를 만들 수 있습니다."
  },
  imagePrompt: "an old hermit on a snowy peak holding a glowing lantern with a star inside"
},
{
  id: "major-10-wheel", nameKo: "운명의 수레바퀴", nameEn: "Wheel of Fortune", arcana: "major", element: "fire",
  keywords: ["전환점", "운의 흐름", "변화", "타이밍", "순환"],
  uprightMeaning: "흐름이 바뀌는 전환점입니다. 좋은 운이 돌아오는 때이니 기회를 놓치지 마세요.",
  reversedMeaning: "흐름이 잠시 어긋나거나 같은 패턴이 반복되는 상태입니다.",
  loveMeaning: "우연한 계기가 관계를 크게 바꿉니다. 운명 같은 만남의 흐름도 있습니다.",
  moneyMeaning: "예상 밖의 수입이나 지출 변화가 생길 수 있습니다. 흐름을 타되 과신은 금물입니다.",
  careerMeaning: "상황이 빠르게 재편됩니다. 변화의 방향에 몸을 맞추는 쪽이 유리합니다.",
  relationshipMeaning: "새 인연이 들어오고 옛 인연과의 고리가 다시 움직일 수 있습니다.",
  healthMeaning: "컨디션의 기복이 있는 시기입니다. 리듬 관리가 중요합니다.",
  advice: "지금 온 기회는 지나가면 다시 오기까지 시간이 걸립니다. 잡으세요.",
  warning: "좋은 흐름이 영원할 거라 방심하지 마세요.",
  todayFortune: {
    overall: "흐름이 바뀌는 날입니다. 우연을 흘려보내지 마세요.",
    love: "뜻밖의 만남이나 연락이 반가운 변화를 만듭니다.",
    money: "작은 행운이 있지만 요행에 기대진 마세요.",
    work: "변화의 신호를 빨리 읽는 쪽이 유리합니다.",
    advice: "타이밍이 실력만큼 중요한 날입니다.",
    caution: "지나간 것에 미련 두면 새 기회를 놓칩니다."
  },
  imagePrompt: "a great golden wheel turning in clouds, sphinx on top, alchemical symbols"
},
{
  id: "major-11-justice", nameKo: "정의", nameEn: "Justice", arcana: "major", element: "air",
  keywords: ["균형", "공정", "책임", "결정", "인과"],
  uprightMeaning: "뿌린 대로 거두는 시기입니다. 공정한 판단과 명확한 결정이 필요한 때입니다.",
  reversedMeaning: "불공정하다는 느낌, 책임 회피, 판단 유보 상태를 뜻합니다.",
  loveMeaning: "관계의 균형을 점검할 때입니다. 한쪽만 애쓰는 구조라면 조정이 필요합니다.",
  moneyMeaning: "계약·정산·세금처럼 서류가 얽힌 일은 꼼꼼히 확인해야 합니다.",
  careerMeaning: "성과가 공정하게 평가받는 흐름입니다. 원칙대로 처리하는 것이 안전합니다.",
  relationshipMeaning: "주고받음이 한쪽으로 기울지 않았는지 돌아보면 답이 보입니다.",
  healthMeaning: "일과 휴식의 균형이 무너지지 않았는지 점검하세요.",
  advice: "감정을 빼고 사실만 놓고 판단해보세요.",
  warning: "당장의 이익 때문에 공정함을 버리면 나중에 돌아옵니다.",
  todayFortune: {
    overall: "정직함이 가장 유리한 전략이 되는 날입니다.",
    love: "관계의 밸런스를 맞추는 대화가 필요합니다.",
    money: "계산은 정확하게, 약속은 명확하게 하세요.",
    work: "객관적인 근거가 설득력을 만듭니다.",
    advice: "치우치지 않는 시선이 답을 줍니다.",
    caution: "편 가르기에 휘말리지 마세요."
  },
  imagePrompt: "a crowned figure holding balanced scales and an upright sword between pillars"
},
{
  id: "major-12-hanged-man", nameKo: "매달린 사람", nameEn: "The Hanged Man", arcana: "major", element: "water",
  keywords: ["관점 전환", "정지", "내려놓음", "기다림", "희생"],
  uprightMeaning: "잠시 멈춰서 다른 각도로 봐야 하는 때입니다. 지금의 정지는 손해가 아니라 준비입니다.",
  reversedMeaning: "의미 없는 버티기나 헛된 희생, 미루기만 하는 상태를 뜻합니다.",
  loveMeaning: "관계가 잠시 제자리걸음처럼 보여도 관점을 바꾸면 다른 면이 보입니다.",
  moneyMeaning: "지금은 큰돈을 움직일 때가 아닙니다. 관망이 수익입니다.",
  careerMeaning: "일이 지연될 수 있지만 그 사이 더 나은 방법이 보이기도 합니다.",
  relationshipMeaning: "상대의 입장에 서보면 풀리지 않던 문제의 답이 보입니다.",
  healthMeaning: "무리한 강행보다 쉬어가는 것이 회복을 앞당깁니다.",
  advice: "억지로 밀지 말고 흐름이 바뀔 때까지 관점을 바꿔보세요.",
  warning: "기다림이 습관적 회피가 되지 않게 하세요.",
  todayFortune: {
    overall: "서두르지 않는 것이 이득인 날입니다.",
    love: "상대의 입장에서 보면 오해가 풀립니다.",
    money: "결제와 투자는 하루 미루는 편이 낫습니다.",
    work: "막힌 일은 접근 방식을 뒤집어보세요.",
    advice: "다르게 보면 다른 답이 나옵니다.",
    caution: "조급함이 판단을 흐립니다."
  },
  imagePrompt: "a serene figure hanging upside down from a living tree, golden halo around his head"
},
{
  id: "major-13-death", nameKo: "죽음", nameEn: "Death", arcana: "major", element: "water",
  keywords: ["끝과 시작", "전환", "정리", "변화", "재탄생"],
  uprightMeaning: "한 흐름이 끝나고 새 흐름이 시작되는 큰 전환을 뜻합니다. 끝은 실패가 아니라 다음 장의 문입니다.",
  reversedMeaning: "끝내야 할 것을 붙잡고 있는 상태입니다. 정리를 미룰수록 소모가 커집니다.",
  loveMeaning: "관계의 한 단계가 끝나고 새 국면으로 넘어갑니다. 정리 후에 더 맞는 흐름이 옵니다.",
  moneyMeaning: "수입 구조나 소비 습관을 갈아엎기 좋은 시기입니다.",
  careerMeaning: "부서 이동·이직·프로젝트 종료처럼 챕터가 바뀌는 흐름입니다.",
  relationshipMeaning: "맞지 않는 관계를 정리하면 새 인연의 자리가 생깁니다.",
  healthMeaning: "나쁜 습관과 끊어내기 좋은 때입니다. 생활을 리셋해보세요.",
  advice: "끝나가는 것을 붙잡기보다 다음을 준비하세요.",
  warning: "변화를 거부할수록 전환이 더 힘들어집니다.",
  todayFortune: {
    overall: "정리와 마무리에 좋은 날입니다. 비워야 채워집니다.",
    love: "관계의 매듭을 짓는 대화가 필요할 수 있습니다.",
    money: "안 쓰는 구독·지출을 끊기 좋은 날입니다.",
    work: "끝낼 일을 끝내야 새 일이 들어옵니다.",
    advice: "미련보다 다음 장을 보세요.",
    caution: "감정적인 이별 선언이나 사표는 금물입니다."
  },
  imagePrompt: "a skeletal knight on a white horse at dawn, white rose banner, rising sun on horizon"
},
{
  id: "major-14-temperance", nameKo: "절제", nameEn: "Temperance", arcana: "major", element: "fire",
  keywords: ["조화", "중용", "회복", "조율", "인내"],
  uprightMeaning: "속도와 감정을 조절하며 균형을 찾는 흐름입니다. 서로 다른 것을 섞어 더 나은 것을 만듭니다.",
  reversedMeaning: "과함과 부족을 오가는 불균형 상태를 뜻합니다.",
  loveMeaning: "서두르지 않고 온도를 맞춰가면 관계가 안정적으로 깊어집니다.",
  moneyMeaning: "수입과 지출의 균형을 잡는 것이 최우선입니다. 중간 지점이 답입니다.",
  careerMeaning: "조율자 역할이 빛나는 시기입니다. 협의와 절충으로 성과를 만드세요.",
  relationshipMeaning: "한 발씩 양보하면 오래가는 관계가 됩니다.",
  healthMeaning: "회복의 흐름입니다. 규칙적인 생활이 그 속도를 높입니다.",
  advice: "극단을 피하고 중간에서 답을 찾으세요.",
  warning: "한 번에 다 얻으려는 조급함이 균형을 깹니다.",
  todayFortune: {
    overall: "무리하지 않는 페이스가 최선의 결과를 만드는 날입니다.",
    love: "감정의 온도를 상대와 맞춰가세요.",
    money: "적당히 쓰고 적당히 아끼는 균형이 좋습니다.",
    work: "중재와 협의가 필요한 일에 강한 날입니다.",
    advice: "천천히 가도 방향이 맞으면 됩니다.",
    caution: "과음·과로처럼 도를 넘는 것을 조심하세요."
  },
  imagePrompt: "an angel pouring water between two cups, one foot on land one in water, iris flowers"
},
{
  id: "major-15-devil", nameKo: "악마", nameEn: "The Devil", arcana: "major", element: "earth",
  keywords: ["집착", "유혹", "속박", "욕망", "중독"],
  uprightMeaning: "무언가에 묶여 있는 상태를 비추는 카드입니다. 집착과 유혹의 정체를 직시해야 풀립니다.",
  reversedMeaning: "속박에서 벗어나기 시작하는 해방의 신호이기도 합니다.",
  loveMeaning: "강한 끌림이 있지만 집착이나 소유욕으로 변하지 않는지 살펴야 합니다.",
  moneyMeaning: "한탕의 유혹이나 충동 소비를 특히 조심해야 하는 시기입니다.",
  careerMeaning: "조건에 얽매여 원치 않는 일을 계속할 수 있습니다. 무엇이 나를 묶는지 보세요.",
  relationshipMeaning: "의존적인 관계 패턴이 반복되지 않는지 점검이 필요합니다.",
  healthMeaning: "야식·과음·밤샘처럼 알면서 반복하는 습관이 문제의 핵심입니다.",
  advice: "끊고 싶은 것이 있다면 지금이 직시할 때입니다.",
  warning: "달콤한 제안일수록 조건을 두 번 확인하세요.",
  todayFortune: {
    overall: "유혹이 많은 날입니다. 알면서 하는 실수를 조심하세요.",
    love: "질투와 집착은 관계를 조이기만 합니다.",
    money: "지금 사고 싶은 그것, 내일도 필요하다면 그때 사세요.",
    work: "쉬운 길의 뒤에 붙은 조건을 확인하세요.",
    advice: "묶인 줄은 생각보다 느슨합니다. 놓으면 풀립니다.",
    caution: "늦은 밤의 결정은 후회로 이어지기 쉽습니다."
  },
  imagePrompt: "a horned figure above two loosely chained people, inverted torch, dark cavern"
},
{
  id: "major-16-tower", nameKo: "탑", nameEn: "The Tower", arcana: "major", element: "fire",
  keywords: ["급변", "붕괴와 재건", "충격", "각성", "리셋"],
  uprightMeaning: "예상 못 한 변화로 기존 구조가 흔들리는 때입니다. 무너지는 것은 애초에 불안정했던 것들입니다.",
  reversedMeaning: "무너질 것을 억지로 붙잡는 상태, 혹은 변화를 겨우 피해 가는 흐름입니다.",
  loveMeaning: "관계의 숨겨진 문제가 드러날 수 있습니다. 충격 후에 더 솔직한 관계가 가능해집니다.",
  moneyMeaning: "갑작스러운 지출에 대비가 필요합니다. 위험한 돈 약속은 피하세요.",
  careerMeaning: "조직 개편이나 계획 변경 같은 급변이 있을 수 있습니다. 유연함이 생존력입니다.",
  relationshipMeaning: "쌓아둔 말이 한 번에 터질 수 있으니 미리 조금씩 푸는 것이 좋습니다.",
  healthMeaning: "몸이 보내는 경고 신호를 무시하지 마세요. 조기 대응이 최선입니다.",
  advice: "흔들림 자체보다, 흔들린 뒤 무엇을 다시 세울지에 집중하세요.",
  warning: "무너진 자리에 똑같은 구조를 다시 짓지 마세요.",
  todayFortune: {
    overall: "계획이 틀어질 수 있는 날입니다. 플랜B가 있으면 흔들리지 않습니다.",
    love: "숨겨온 말이 드러날 수 있습니다. 먼저 솔직해지세요.",
    money: "예상 밖 지출에 대비해 여유분을 남겨두세요.",
    work: "갑작스런 변경에 유연하게 대응하는 사람이 돋보입니다.",
    advice: "무너진 것은 다시 지으면 됩니다.",
    caution: "충격적인 소식에 즉각 반응하지 말고 하루 묵히세요."
  },
  imagePrompt: "lightning striking a tall tower, golden crown falling, figures leaping into night sky"
},
{
  id: "major-17-star", nameKo: "별", nameEn: "The Star", arcana: "major", element: "air",
  keywords: ["희망", "회복", "치유", "믿음", "영감"],
  uprightMeaning: "어려움 뒤에 찾아오는 희망과 회복의 흐름입니다. 다시 믿어볼 힘이 생기는 때입니다.",
  reversedMeaning: "희망을 잃거나 자신감이 꺼진 상태입니다. 회복이 늦어질 뿐 길은 있습니다.",
  loveMeaning: "상처가 아물고 새 희망이 생기는 흐름입니다. 순수한 마음이 통합니다.",
  moneyMeaning: "당장의 큰 수익보다 장기적인 희망이 보이는 시기입니다. 꾸준함이 답입니다.",
  careerMeaning: "방향에 대한 확신이 다시 생깁니다. 비전을 그리는 일에 좋습니다.",
  relationshipMeaning: "진심을 보여주면 관계가 맑게 회복됩니다.",
  healthMeaning: "회복세가 뚜렷해지는 흐름입니다. 희망적인 마음이 몸도 살립니다.",
  advice: "지금의 작은 희망을 과소평가하지 마세요. 그게 씨앗입니다.",
  warning: "막연한 낙관만으로 실행을 미루지 마세요.",
  todayFortune: {
    overall: "마음이 맑아지고 희망이 보이는 날입니다.",
    love: "솔직하고 순수한 표현이 마음을 움직입니다.",
    money: "장기 목표를 세우기 좋은 날입니다.",
    work: "창의적인 영감이 떠오르기 좋습니다.",
    advice: "믿는 방향으로 한 걸음만 옮겨보세요.",
    caution: "꿈만 꾸다 마감을 놓치지 마세요."
  },
  imagePrompt: "a woman pouring water under a large radiant star and seven small stars, calm pool"
},
{
  id: "major-18-moon", nameKo: "달", nameEn: "The Moon", arcana: "major", element: "water",
  keywords: ["불안", "모호함", "직감", "환상", "드러나지 않은 것"],
  uprightMeaning: "안개 속을 걷는 듯 모호한 시기입니다. 불안의 대부분은 실체보다 상상이 만든 것입니다.",
  reversedMeaning: "혼란이 걷히고 진실이 드러나기 시작하는 흐름입니다.",
  loveMeaning: "상대의 마음이 잘 안 보여 불안해지기 쉽습니다. 확인되지 않은 상상을 키우지 마세요.",
  moneyMeaning: "불투명한 제안이나 뜬소문에 따른 결정은 위험합니다.",
  careerMeaning: "정보가 부족한 상태입니다. 확실해질 때까지 큰 결정은 보류하세요.",
  relationshipMeaning: "오해가 생기기 쉬운 때입니다. 직접 물어보는 것이 가장 빠릅니다.",
  healthMeaning: "수면과 정서 관리가 특히 중요한 시기입니다.",
  advice: "불안할 땐 사실과 상상을 종이에 나눠 적어보세요.",
  warning: "밤에 커지는 걱정은 아침에 다시 판단하세요.",
  todayFortune: {
    overall: "보이는 게 전부가 아닌 날입니다. 판단을 서두르지 마세요.",
    love: "불안한 상상 대신 담백한 확인이 낫습니다.",
    money: "솔깃한 정보일수록 출처를 확인하세요.",
    work: "애매한 지시는 반드시 되물어 명확히 하세요.",
    advice: "직감은 참고하되 사실로 확인하세요.",
    caution: "루머와 뒷말에 휘말리지 마세요."
  },
  imagePrompt: "a full moon with a face over a winding path, howling wolf and dog, crayfish in water"
},
{
  id: "major-19-sun", nameKo: "태양", nameEn: "The Sun", arcana: "major", element: "fire",
  keywords: ["성공", "기쁨", "활력", "명료함", "인정"],
  uprightMeaning: "구름이 걷히고 모든 것이 선명해지는 최고의 긍정 흐름입니다. 노력의 결과가 밝게 드러납니다.",
  reversedMeaning: "성과가 잠시 가려지거나 자신감이 과해지는 상태입니다. 본질은 여전히 긍정적입니다.",
  loveMeaning: "관계가 밝고 따뜻해지는 시기입니다. 함께 있으면 즐거운 에너지가 커집니다.",
  moneyMeaning: "재물운이 밝습니다. 노력한 만큼 눈에 보이는 결과가 들어옵니다.",
  careerMeaning: "성과가 공개적으로 인정받는 흐름입니다. 자신 있게 드러내도 좋습니다.",
  relationshipMeaning: "밝은 에너지가 사람을 모읍니다. 화해에도 좋은 때입니다.",
  healthMeaning: "활력이 넘치는 시기입니다. 햇볕과 가벼운 운동이 컨디션을 끌어올립니다.",
  advice: "숨기지 말고 드러내세요. 지금은 보여줄수록 좋습니다.",
  warning: "잘될 때일수록 기본을 지키세요. 자만이 유일한 함정입니다.",
  todayFortune: {
    overall: "일도 관계도 환하게 풀리는 기분 좋은 날입니다.",
    love: "함께 웃을 수 있는 시간을 만드세요. 관계가 깊어집니다.",
    money: "기대했던 돈 소식이 들려올 수 있습니다.",
    work: "성과를 어필하기 가장 좋은 날입니다.",
    advice: "긍정의 기운을 아낌없이 나누세요.",
    caution: "들뜬 기분에 약속을 남발하지 마세요."
  },
  imagePrompt: "a joyful child on a white horse under a radiant sun, sunflowers over a garden wall"
},
{
  id: "major-20-judgement", nameKo: "심판", nameEn: "Judgement", arcana: "major", element: "fire",
  keywords: ["부활", "재평가", "부름", "결산", "두 번째 기회"],
  uprightMeaning: "지난 일을 결산하고 다시 일어서는 부활의 흐름입니다. 미뤄둔 결단의 때가 왔습니다.",
  reversedMeaning: "과거의 후회에 붙잡혀 부름에 응하지 못하는 상태입니다.",
  loveMeaning: "지난 관계의 의미가 재평가되는 때입니다. 재회의 신호가 오기도 합니다.",
  moneyMeaning: "묵은 돈 문제가 정리되고 새 판을 짤 수 있는 시기입니다.",
  careerMeaning: "재도전·복귀·평가의 결과가 나오는 흐름입니다. 과거 경력이 힘이 됩니다.",
  relationshipMeaning: "오래된 오해를 풀 기회가 옵니다. 연락이 닿으면 응답하세요.",
  healthMeaning: "생활 습관을 총점검하고 새로 시작하기 좋은 때입니다.",
  advice: "지난 일에서 배운 것을 들고 다시 일어서세요.",
  warning: "과거를 반복 재생하는 후회는 이제 내려놓으세요.",
  todayFortune: {
    overall: "미뤄둔 결정을 내리기 좋은 날입니다. 부름에 응하세요.",
    love: "과거의 인연에서 소식이 올 수 있습니다.",
    money: "밀린 정산과 청구를 정리하면 마음이 가벼워집니다.",
    work: "재도전하는 일에 좋은 결과가 따릅니다.",
    advice: "두 번째 기회는 준비된 사람에게 옵니다.",
    caution: "지난 실수를 곱씹느라 오늘을 놓치지 마세요."
  },
  imagePrompt: "an angel blowing a golden trumpet from clouds, figures rising from below with open arms"
},
{
  id: "major-21-world", nameKo: "세계", nameEn: "The World", arcana: "major", element: "earth",
  keywords: ["완성", "성취", "통합", "여정의 끝", "새 무대"],
  uprightMeaning: "긴 여정이 완성되는 성취의 카드입니다. 한 사이클이 아름답게 닫히고 더 큰 무대가 열립니다.",
  reversedMeaning: "마무리 직전의 지연, 마지막 한 조각이 비어 있는 상태입니다.",
  loveMeaning: "관계가 완성 단계에 이르는 흐름입니다. 결실을 맺는 약속에 좋습니다.",
  moneyMeaning: "장기 목표가 달성되는 시기입니다. 노력의 총합이 결과로 돌아옵니다.",
  careerMeaning: "프로젝트의 성공적 완수, 승진, 더 넓은 무대로의 진출을 의미합니다.",
  relationshipMeaning: "관계망이 넓어지고 인정받는 위치에 서게 됩니다.",
  healthMeaning: "몸과 마음의 균형이 잡히는 안정기입니다. 유지가 관건입니다.",
  advice: "완성을 자축하되, 다음 여정의 첫 계획도 함께 세우세요.",
  warning: "마무리를 대충 하면 성취가 미완으로 남습니다.",
  todayFortune: {
    overall: "매듭짓기에 최고의 날입니다. 끝낸 만큼 커집니다.",
    love: "관계가 한 단계 완성되는 흐름입니다.",
    money: "장기 계획의 결실이 보이기 시작합니다.",
    work: "마무리 완성도가 평판을 만듭니다.",
    advice: "끝까지 해낸 자신을 인정해주세요.",
    caution: "성취 뒤의 공허함에 휩쓸리지 마세요. 다음 목표를 두세요."
  },
  imagePrompt: "a dancing figure within a great laurel wreath, four creatures in corners, cosmic sky"
}
];
```

---

## 6. 마이너 아르카나 — 완드 (Wands · fire)

```ts
export const WANDS: TarotCard[] = [
{
  id: "wands-01-ace", nameKo: "완드 에이스", nameEn: "Ace of Wands", arcana: "minor", suit: "wands", number: 1, element: "fire",
  keywords: ["점화", "새 기회", "의욕", "창조적 시작"],
  uprightMeaning: "열정에 불이 붙는 시작의 카드입니다. 하고 싶다는 마음 자체가 지금의 가장 큰 자원입니다.",
  reversedMeaning: "의욕이 꺾이거나 시작이 미뤄지는 상태입니다.",
  loveMeaning: "강한 끌림과 뜨거운 시작의 기운이 있습니다.",
  moneyMeaning: "새로운 수입원의 씨앗이 보입니다. 아이디어를 굴려보세요.",
  careerMeaning: "새 프로젝트나 사업 아이템에 착수하기 좋은 때입니다.",
  relationshipMeaning: "먼저 제안하는 쪽이 관계의 활력을 만듭니다.",
  healthMeaning: "에너지가 올라오는 시기이니 운동을 시작하기 좋습니다.",
  advice: "불씨가 살아있을 때 움직이세요.",
  warning: "3일 만에 식는 열정이 되지 않게 페이스를 조절하세요.",
  todayFortune: {
    overall: "의욕이 샘솟는 날입니다. 시작하기에 좋습니다.",
    love: "설레는 신호가 감지되면 놓치지 마세요.",
    money: "새 수입 아이디어를 메모해두세요.",
    work: "미뤄둔 기획을 꺼내기 좋은 날입니다.",
    advice: "생각났을 때 바로 첫 발을 떼세요.",
    caution: "벌려만 놓고 못 거두는 일을 조심하세요."
  },
  imagePrompt: "a radiant hand emerging from clouds holding a sprouting wooden wand"
},
{
  id: "wands-02", nameKo: "완드 2", nameEn: "Two of Wands", arcana: "minor", suit: "wands", number: 2, element: "fire",
  keywords: ["계획", "전망", "선택의 기로", "더 큰 세계"],
  uprightMeaning: "성 위에서 세계를 내려다보듯 다음 행보를 계획하는 카드입니다. 안주와 확장 사이의 선택입니다.",
  reversedMeaning: "계획만 하다 기회를 놓치거나 좁은 시야에 갇힌 상태입니다.",
  loveMeaning: "관계의 다음 단계를 그려보는 시기입니다. 방향 정리가 필요합니다.",
  moneyMeaning: "장기 재정 계획을 세우기 좋은 때입니다.",
  careerMeaning: "더 큰 무대를 볼지 현재에 머물지 선택의 기로에 섭니다.",
  relationshipMeaning: "관계의 판을 넓힐지 좁힐지 정리하면 편해집니다.",
  healthMeaning: "긴 호흡의 건강 계획이 필요한 시기입니다.",
  advice: "지도를 그렸다면 다음은 출발 날짜를 정하세요.",
  warning: "계획 세우기가 실행의 회피가 되지 않게 하세요.",
  todayFortune: {
    overall: "큰 그림을 그리기 좋은 날입니다.",
    love: "관계의 미래를 진지하게 그려보게 됩니다.",
    money: "장기 플랜을 정리하면 불안이 줄어듭니다.",
    work: "확장이냐 안정이냐, 기준을 세워보세요.",
    advice: "시야를 한 단계 넓혀보세요.",
    caution: "우유부단하면 둘 다 놓칩니다."
  },
  imagePrompt: "a figure on castle battlements holding a globe, gazing at distant sea"
},
{
  id: "wands-03", nameKo: "완드 3", nameEn: "Three of Wands", arcana: "minor", suit: "wands", number: 3, element: "fire",
  keywords: ["확장", "진행", "기다림의 결실", "협력"],
  uprightMeaning: "띄운 배가 돌아오기를 기다리는 카드입니다. 벌여둔 일이 순항 중이며 확장의 신호가 옵니다.",
  reversedMeaning: "진행이 더디거나 기대보다 작은 결과가 오는 상태입니다.",
  loveMeaning: "관계가 안정적으로 진전되는 중입니다. 믿고 기다려도 좋습니다.",
  moneyMeaning: "투자하거나 뿌려둔 것의 첫 수익이 보이기 시작합니다.",
  careerMeaning: "진행 중인 일이 확장 국면에 들어섭니다. 협력 제안도 옵니다.",
  relationshipMeaning: "먼저 내민 손이 좋은 응답으로 돌아옵니다.",
  healthMeaning: "꾸준히 해온 관리의 효과가 나타나기 시작합니다.",
  advice: "지금 페이스를 유지하면서 다음 확장을 준비하세요.",
  warning: "다 된 일로 여기고 손을 놓지 마세요.",
  todayFortune: {
    overall: "기다리던 진척 소식이 오기 좋은 날입니다.",
    love: "꾸준한 관심이 결실로 이어지고 있습니다.",
    money: "뿌린 씨앗의 첫 결과를 확인해보세요.",
    work: "협력 제안이나 확장 기회가 보입니다.",
    advice: "믿고 지켜보되 다음 수를 준비하세요.",
    caution: "중간 점검 없는 방치는 금물입니다."
  },
  imagePrompt: "a merchant overlooking ships at sea from a cliff, three tall wands planted"
},
{
  id: "wands-04", nameKo: "완드 4", nameEn: "Four of Wands", arcana: "minor", suit: "wands", number: 4, element: "fire",
  keywords: ["축하", "안정", "보금자리", "화합"],
  uprightMeaning: "노력의 중간 결실을 축하하는 카드입니다. 안정된 기반 위에서 기쁨을 나누는 때입니다.",
  reversedMeaning: "축하가 미뤄지거나 기반이 아직 덜 다져진 상태입니다.",
  loveMeaning: "관계가 안정기에 들어섭니다. 함께하는 자리·약속에 좋은 흐름입니다.",
  moneyMeaning: "주거나 기반과 관련된 지출·수입에 좋은 시기입니다.",
  careerMeaning: "중간 성과를 인정받고 팀 분위기도 좋아집니다.",
  relationshipMeaning: "모임과 축하 자리가 관계를 단단하게 만듭니다.",
  healthMeaning: "안정된 생활 리듬이 컨디션을 지켜줍니다.",
  advice: "작은 성취도 제대로 축하하세요. 다음 동력이 됩니다.",
  warning: "안정에 취해 다음 단계를 잊지 마세요.",
  todayFortune: {
    overall: "편안하고 화목한 기운이 도는 날입니다.",
    love: "함께 보내는 시간이 관계를 안정시킵니다.",
    money: "집·생활 기반에 쓰는 돈은 아깝지 않습니다.",
    work: "팀워크가 잘 맞아 일이 수월합니다.",
    advice: "고마운 사람에게 마음을 표현하세요.",
    caution: "느슨해진 틈에 마감을 놓치지 마세요."
  },
  imagePrompt: "a flower garland strung between four wands, celebrating figures before a castle"
},
{
  id: "wands-05", nameKo: "완드 5", nameEn: "Five of Wands", arcana: "minor", suit: "wands", number: 5, element: "fire",
  keywords: ["경쟁", "의견 충돌", "마찰", "활기 있는 갈등"],
  uprightMeaning: "여럿의 의견이 부딪히는 경쟁 상황입니다. 소모전 같지만 서로를 단련시키는 마찰이기도 합니다.",
  reversedMeaning: "갈등 회피로 문제가 안으로 곪거나, 반대로 갈등이 정리되는 상태입니다.",
  loveMeaning: "사소한 다툼이나 경쟁자가 있을 수 있습니다. 기 싸움보다 본심을 보세요.",
  moneyMeaning: "돈 문제로 의견이 갈리기 쉽습니다. 규칙을 먼저 정하세요.",
  careerMeaning: "경쟁이 치열해지는 시기입니다. 정면 승부보다 차별화가 답입니다.",
  relationshipMeaning: "말이 엇갈리기 쉬운 때입니다. 정리해서 말하는 습관이 필요합니다.",
  healthMeaning: "스트레스로 에너지가 새기 쉽습니다. 발산할 출구를 만드세요.",
  advice: "이기는 것보다 얻는 것에 집중하세요.",
  warning: "모든 싸움에 참전할 필요는 없습니다.",
  todayFortune: {
    overall: "의견 충돌이 생기기 쉬운 날입니다. 한 템포 쉬고 말하세요.",
    love: "사소한 걸로 다투기 쉬우니 승부욕을 내려놓으세요.",
    money: "더치페이·정산 문제는 미리 명확히 하세요.",
    work: "회의에서 목소리가 커질 수 있습니다. 근거로 말하세요.",
    advice: "경쟁을 성장의 자극으로만 쓰세요.",
    caution: "감정싸움으로 번지면 모두가 집니다."
  },
  imagePrompt: "five youths clashing wooden staves in playful combat under open sky"
},
{
  id: "wands-06", nameKo: "완드 6", nameEn: "Six of Wands", arcana: "minor", suit: "wands", number: 6, element: "fire",
  keywords: ["승리", "인정", "성과 공개", "자신감"],
  uprightMeaning: "노력이 공개적으로 인정받는 승리의 카드입니다. 지지와 박수가 따라옵니다.",
  reversedMeaning: "인정이 늦어지거나 성과를 알아주지 않는 서운함이 있는 상태입니다.",
  loveMeaning: "자신감 있는 모습이 매력으로 작동합니다. 관계에서 좋은 소식이 옵니다.",
  moneyMeaning: "성과급·보상처럼 노력의 대가가 들어오는 흐름입니다.",
  careerMeaning: "승진·수주·합격 같은 공개적인 성과가 기대됩니다.",
  relationshipMeaning: "주변의 지지를 받는 시기입니다. 겸손이 그 지지를 오래가게 합니다.",
  healthMeaning: "자신감이 컨디션을 끌어올립니다. 다만 축하 자리 과음은 주의하세요.",
  advice: "성과를 당당히 알리되 함께한 사람들을 챙기세요.",
  warning: "박수에 취하면 다음 목표가 흐려집니다.",
  todayFortune: {
    overall: "인정받는 일이 생기기 좋은 날입니다.",
    love: "당당한 모습이 상대의 마음을 끕니다.",
    money: "보상이나 좋은 소식이 들어올 수 있습니다.",
    work: "성과를 공유하면 평판이 올라갑니다.",
    advice: "공을 나누면 지지가 두 배가 됩니다.",
    caution: "자랑이 길어지면 시기를 삽니다."
  },
  imagePrompt: "a laurel-crowned rider on horseback in a victory parade, raised wand with wreath"
},
{
  id: "wands-07", nameKo: "완드 7", nameEn: "Seven of Wands", arcana: "minor", suit: "wands", number: 7, element: "fire",
  keywords: ["방어", "버티기", "우위 지키기", "소신"],
  uprightMeaning: "높은 자리를 지키기 위해 버티는 카드입니다. 도전이 몰려와도 유리한 위치는 당신에게 있습니다.",
  reversedMeaning: "지쳐서 방어선이 흔들리거나 혼자 다 막으려는 상태입니다.",
  loveMeaning: "관계를 지키기 위한 노력이 필요한 시기입니다. 소신 있게 마음을 지키세요.",
  moneyMeaning: "지금 가진 것을 지키는 것이 우선입니다. 무리한 확장은 보류하세요.",
  careerMeaning: "성과를 노리는 견제가 들어올 수 있습니다. 실력으로 증명하면 됩니다.",
  relationshipMeaning: "휘둘리지 않는 태도가 오히려 존중을 만듭니다.",
  healthMeaning: "버티는 체력전이 이어지니 회복 시간을 확보하세요.",
  advice: "다 상대하지 말고 지킬 것의 우선순위를 정하세요.",
  warning: "혼자 다 막으려다 지칩니다. 도움을 요청하세요.",
  todayFortune: {
    overall: "지켜야 할 것이 분명해지는 날입니다.",
    love: "흔들기에 흔들리지 않는 진심이 이깁니다.",
    money: "지출 방어가 오늘의 재테크입니다.",
    work: "내 성과에 대한 도전은 실력으로 답하세요.",
    advice: "소신을 지키되 유연하게 대응하세요.",
    caution: "모든 지적에 일일이 맞서지 마세요."
  },
  imagePrompt: "a determined figure on a hilltop defending with a staff against six rising staves"
},
{
  id: "wands-08", nameKo: "완드 8", nameEn: "Eight of Wands", arcana: "minor", suit: "wands", number: 8, element: "fire",
  keywords: ["가속", "소식", "빠른 전개", "이동"],
  uprightMeaning: "일이 갑자기 빨라지는 카드입니다. 기다리던 소식과 진전이 한꺼번에 몰려옵니다.",
  reversedMeaning: "지연·취소, 혹은 너무 급해서 놓치는 것이 생기는 상태입니다.",
  loveMeaning: "연락과 만남의 속도가 빨라집니다. 급물살을 타는 관계도 있습니다.",
  moneyMeaning: "돈의 흐름이 빨라집니다. 입금도 지출도 순식간이니 기록하세요.",
  careerMeaning: "업무 속도전이 벌어집니다. 빠른 회신이 기회를 잡습니다.",
  relationshipMeaning: "연락이 몰리는 시기입니다. 우선순위로 답하세요.",
  healthMeaning: "바쁠수록 끼니와 수면의 기본을 지키세요.",
  advice: "흐름이 빠를 땐 방향만 확인하고 올라타세요.",
  warning: "속도에 취해 확인 절차를 건너뛰지 마세요.",
  todayFortune: {
    overall: "일이 빠르게 풀리는 날입니다. 기다리던 연락이 옵니다.",
    love: "답장이 빨라지고 만남이 성사되기 좋습니다.",
    money: "빠른 결정이 필요하지만 금액은 재확인하세요.",
    work: "밀린 일을 몰아치기 좋은 날입니다.",
    advice: "지금의 속도를 즐기며 올라타세요.",
    caution: "급한 마음에 오타·실수를 조심하세요."
  },
  imagePrompt: "eight wands flying swiftly through clear sky over a river landscape"
},
{
  id: "wands-09", nameKo: "완드 9", nameEn: "Nine of Wands", arcana: "minor", suit: "wands", number: 9, element: "fire",
  keywords: ["마지막 고비", "경계", "지구력", "상처 입은 버팀"],
  uprightMeaning: "지쳤지만 거의 다 온 마지막 고비의 카드입니다. 한 번만 더 버티면 끝이 보입니다.",
  reversedMeaning: "번아웃 직전이거나 경계심이 과해 기회까지 막는 상태입니다.",
  loveMeaning: "지난 상처로 방어적이 되기 쉽습니다. 모든 사람이 같지는 않습니다.",
  moneyMeaning: "긴 지출 터널의 끝이 보입니다. 조금만 더 아끼면 됩니다.",
  careerMeaning: "프로젝트 막바지의 고비입니다. 마지막 검토가 승부처입니다.",
  relationshipMeaning: "경계심을 조금 낮추면 도와줄 사람이 보입니다.",
  healthMeaning: "피로 누적이 한계에 가깝습니다. 회복을 일정에 넣으세요.",
  advice: "여기까지 온 것 자체가 증거입니다. 한 걸음만 더 가세요.",
  warning: "다 왔을 때 방심하면 지금까지가 아까워집니다.",
  todayFortune: {
    overall: "고비의 날이지만 넘기면 한숨 돌릴 수 있습니다.",
    love: "지레 방어막을 치면 진심이 못 들어옵니다.",
    money: "마지막 유혹만 참으면 목표 달성입니다.",
    work: "마무리 검토에 힘을 남겨두세요.",
    advice: "쉬는 것도 전략입니다. 잠깐 숨을 고르세요.",
    caution: "예민해진 말투가 오해를 살 수 있습니다."
  },
  imagePrompt: "a bandaged weary guard leaning on a staff before a fence of eight wands"
},
{
  id: "wands-10", nameKo: "완드 10", nameEn: "Ten of Wands", arcana: "minor", suit: "wands", number: 10, element: "fire",
  keywords: ["과부하", "책임 과다", "짊어진 짐", "완주 직전"],
  uprightMeaning: "너무 많은 짐을 혼자 지고 가는 카드입니다. 성실함이 과로가 되기 직전입니다.",
  reversedMeaning: "짐을 내려놓기 시작하거나, 반대로 한계를 넘긴 상태입니다.",
  loveMeaning: "관계의 책임을 혼자 다 지려 하고 있진 않은지 돌아보세요.",
  moneyMeaning: "부담이 큰 지출 구조입니다. 고정비 다이어트가 필요합니다.",
  careerMeaning: "업무가 몰려 과부하 상태입니다. 위임과 거절이 능력입니다.",
  relationshipMeaning: "부탁을 다 들어주다 정작 내 일을 놓칠 수 있습니다.",
  healthMeaning: "어깨·허리 등 과로 신호를 무시하지 마세요.",
  advice: "내려놓을 짐부터 정하세요. 다 지고 갈 필요 없습니다.",
  warning: "'나만 할 수 있어'가 과로의 시작입니다.",
  todayFortune: {
    overall: "할 일이 몰리는 날입니다. 우선순위가 생존 전략입니다.",
    love: "혼자 애쓰지 말고 마음의 짐을 나누세요.",
    money: "떠안은 부담을 점검하고 줄일 것을 찾으세요.",
    work: "위임할 일은 위임하세요. 다 짊어지면 무너집니다.",
    advice: "'아니요'라고 말할 용기가 필요합니다.",
    caution: "과로 신호를 무시하면 내일이 무너집니다."
  },
  imagePrompt: "a bent figure carrying ten heavy wands toward a distant town"
},
{
  id: "wands-11-page", nameKo: "완드 시종", nameEn: "Page of Wands", arcana: "minor", suit: "wands", number: "page", element: "fire",
  keywords: ["호기심", "탐색", "설레는 소식", "가능성의 발견"],
  uprightMeaning: "새로운 것에 눈이 반짝이는 탐색의 카드입니다. 설레는 소식이나 아이디어가 도착합니다.",
  reversedMeaning: "산만함, 금방 식는 관심, 미덥지 못한 소식을 뜻합니다.",
  loveMeaning: "풋풋한 호감이나 설레는 연락이 시작될 수 있습니다.",
  moneyMeaning: "새 수입 아이디어를 가볍게 실험해보기 좋은 때입니다.",
  careerMeaning: "새 분야를 배우거나 탐색하는 데 좋은 흐름입니다.",
  relationshipMeaning: "호기심 어린 질문이 대화의 문을 엽니다.",
  healthMeaning: "새 운동이나 취미가 활력이 됩니다.",
  advice: "궁금하면 일단 찔러보세요. 가볍게 시작해도 됩니다.",
  warning: "이것저것 벌리기만 하면 남는 게 없습니다.",
  todayFortune: {
    overall: "호기심이 기회를 물어오는 날입니다.",
    love: "가벼운 안부 연락이 좋은 시작이 됩니다.",
    money: "재미있어 보이는 것의 수익성을 조사해보세요.",
    work: "새로운 툴이나 방법을 배워보기 좋습니다.",
    advice: "설레는 쪽으로 몸을 기울여보세요.",
    caution: "약속만 늘어놓고 못 지키지 않게 하세요."
  },
  imagePrompt: "a young page in bright tunic examining a sprouting staff in a desert"
},
{
  id: "wands-12-knight", nameKo: "완드 기사", nameEn: "Knight of Wands", arcana: "minor", suit: "wands", number: "knight", element: "fire",
  keywords: ["돌진", "모험", "열정적 행동", "성급함"],
  uprightMeaning: "생각보다 몸이 먼저 나가는 돌진의 카드입니다. 추진력은 최고지만 방향 점검이 필요합니다.",
  reversedMeaning: "무모함, 중도 이탈, 공회전하는 열정을 뜻합니다.",
  loveMeaning: "불같이 다가오는 상대나 급진전하는 관계를 뜻합니다. 속도 조절이 관건입니다.",
  moneyMeaning: "공격적인 투자 욕구가 올라옵니다. 상한선을 먼저 정하세요.",
  careerMeaning: "치고 나가기 좋은 때이지만 마무리 계획도 세워두세요.",
  relationshipMeaning: "화끈한 추진이 분위기를 살리지만 독주는 금물입니다.",
  healthMeaning: "격한 활동은 준비운동이 필수입니다.",
  advice: "달리세요. 단, 어디로 달리는지는 알고 달리세요.",
  warning: "시작의 흥분이 끝까지 가지 않는 게 이 카드의 약점입니다.",
  todayFortune: {
    overall: "추진력이 폭발하는 날입니다. 방향만 확인하세요.",
    love: "적극적인 어필이 통하는 날입니다.",
    money: "지르고 싶은 충동, 금액 상한을 정하고 움직이세요.",
    work: "밀어붙이기 좋지만 뒷수습 계획도 같이 세우세요.",
    advice: "열정에 계획 한 스푼만 더하세요.",
    caution: "욱하는 말이 일을 키울 수 있습니다."
  },
  imagePrompt: "a fiery knight on a rearing horse charging across desert, flame-like plume"
},
{
  id: "wands-13-queen", nameKo: "완드 여왕", nameEn: "Queen of Wands", arcana: "minor", suit: "wands", number: "queen", element: "fire",
  keywords: ["자신감", "매력", "주도성", "당당한 온기"],
  uprightMeaning: "당당하고 따뜻한 카리스마의 카드입니다. 자기다움이 사람을 끌어당깁니다.",
  reversedMeaning: "질투, 자신감 저하, 관심을 강요하는 태도를 뜻합니다.",
  loveMeaning: "자신감 있는 모습이 가장 큰 매력이 되는 시기입니다.",
  moneyMeaning: "자기 브랜드나 재능으로 수익을 만들 수 있는 흐름입니다.",
  careerMeaning: "분위기를 이끄는 리더십이 빛납니다. 주목받는 자리를 피하지 마세요.",
  relationshipMeaning: "밝은 에너지가 모임의 중심을 만듭니다.",
  healthMeaning: "활력이 좋은 시기이니 그 기세로 루틴을 만들어두세요.",
  advice: "남과 비교하지 마세요. 당신다움이 무기입니다.",
  warning: "인정 욕구가 과하면 매력이 부담이 됩니다.",
  todayFortune: {
    overall: "존재감이 빛나는 날입니다. 당당하게 나서세요.",
    love: "꾸미지 않은 자신감이 상대를 끌어당깁니다.",
    money: "내 재능의 값어치를 낮춰 부르지 마세요.",
    work: "회의든 모임이든 주도하는 역할이 어울립니다.",
    advice: "따뜻함과 당당함을 함께 쓰세요.",
    caution: "다른 사람의 무대까지 뺏지는 마세요."
  },
  imagePrompt: "a confident queen on a sunflower throne with a black cat at her feet"
},
{
  id: "wands-14-king", nameKo: "완드 왕", nameEn: "King of Wands", arcana: "minor", suit: "wands", number: "king", element: "fire",
  keywords: ["비전", "리더십", "기업가 정신", "결단력"],
  uprightMeaning: "비전을 제시하고 판을 이끄는 리더의 카드입니다. 큰 그림과 결단이 성과를 만듭니다.",
  reversedMeaning: "독선, 과욕, 권위적인 태도를 뜻합니다.",
  loveMeaning: "믿음직하고 주도적인 태도가 관계의 안정감을 만듭니다.",
  moneyMeaning: "굵직한 재정 결정을 내리기 좋은 시기입니다. 크게 보고 판단하세요.",
  careerMeaning: "총괄·책임자 역할이 어울리는 흐름입니다. 사업 확장에도 좋습니다.",
  relationshipMeaning: "방향을 제시하되 각자의 몫을 존중하면 따르는 사람이 늘어납니다.",
  healthMeaning: "바쁜 일정 속 컨디션 관리가 리더십의 일부입니다.",
  advice: "작은 일은 맡기고 큰 방향에 에너지를 쓰세요.",
  warning: "모두가 내 속도로 뛸 수는 없습니다. 기다림도 리더십입니다.",
  todayFortune: {
    overall: "결단력이 돋보이는 날입니다. 큰 방향을 정하세요.",
    love: "리드하는 모습이 든든하게 느껴지는 날입니다.",
    money: "장기적 안목의 결정에 유리한 흐름입니다.",
    work: "책임 있는 결정이 신뢰를 쌓습니다.",
    advice: "비전을 말로 공유하면 힘이 배가 됩니다.",
    caution: "밀어붙이기만 하면 마음이 떠납니다."
  },
  imagePrompt: "a bold king on a throne carved with lions and salamanders, holding a flowering staff"
}
];
```

---

## 7. 마이너 아르카나 — 컵 (Cups · water)

```ts
export const CUPS: TarotCard[] = [
{
  id: "cups-01-ace", nameKo: "컵 에이스", nameEn: "Ace of Cups", arcana: "minor", suit: "cups", number: 1, element: "water",
  keywords: ["감정의 시작", "호감", "마음이 열림", "치유"],
  uprightMeaning: "마음의 잔이 새로 채워지는 카드입니다. 사랑·호감·용서 같은 감정이 샘솟기 시작합니다.",
  reversedMeaning: "감정이 막히거나 마음을 열기 어려운 상태입니다.",
  loveMeaning: "새로운 사랑이 시작되거나 식었던 마음이 다시 차오릅니다.",
  moneyMeaning: "좋아하는 일에서 돈의 물꼬가 트일 수 있습니다.",
  careerMeaning: "마음이 가는 일을 시작하면 몰입이 따라옵니다.",
  relationshipMeaning: "먼저 마음을 열면 상대도 열립니다.",
  healthMeaning: "정서적 안정이 몸의 회복을 돕는 시기입니다.",
  advice: "느껴지는 감정을 밀어내지 말고 받아들여보세요.",
  warning: "감정이 넘친다고 다 쏟아내면 상대가 부담스러워합니다.",
  todayFortune: {
    overall: "마음이 열리고 감성이 풍부해지는 날입니다.",
    love: "고백과 화해, 둘 다에 좋은 기운입니다.",
    money: "좋아하는 것에 쓰는 돈이 행복을 줍니다. 적당히만.",
    work: "마음이 통하는 동료와의 협업이 잘 풀립니다.",
    advice: "감정을 솔직하게 표현해보세요.",
    caution: "기분에 젖어 중요한 판단을 미루지 마세요."
  },
  imagePrompt: "a radiant hand offering an overflowing golden chalice, dove descending, lotus pond"
},
{
  id: "cups-02", nameKo: "컵 2", nameEn: "Two of Cups", arcana: "minor", suit: "cups", number: 2, element: "water",
  keywords: ["상호 호감", "연결", "파트너십", "화해"],
  uprightMeaning: "두 마음이 마주 보고 잔을 나누는 카드입니다. 서로를 향한 호감과 신뢰가 균형을 이룹니다.",
  reversedMeaning: "마음의 온도 차, 어긋난 기대, 균형이 깨진 관계를 뜻합니다.",
  loveMeaning: "서로 호감이 확인되는 시기입니다. 관계 진전의 청신호입니다.",
  moneyMeaning: "동업이나 공동 재정에 좋은 흐름입니다. 조건은 문서로 남기세요.",
  careerMeaning: "일대일 협업과 파트너십에서 성과가 납니다.",
  relationshipMeaning: "화해와 재연결에 최적의 흐름입니다.",
  healthMeaning: "함께하는 운동이나 산책이 효과적입니다.",
  advice: "관계는 거울입니다. 받고 싶은 만큼 먼저 주세요.",
  warning: "한쪽만 기우는 잔은 오래가지 못합니다.",
  todayFortune: {
    overall: "마음이 통하는 사람과 좋은 합이 만들어지는 날입니다.",
    love: "서로의 호감이 확인되는 순간이 옵니다.",
    money: "돈 약속은 반반 원칙이 깔끔합니다.",
    work: "둘이서 하는 일이 특히 잘 풀립니다.",
    advice: "마음을 확인하고 싶다면 오늘 물어보세요.",
    caution: "기대만큼 오지 않는다고 서운해하지 마세요."
  },
  imagePrompt: "a man and woman exchanging cups beneath a winged lion caduceus"
},
{
  id: "cups-03", nameKo: "컵 3", nameEn: "Three of Cups", arcana: "minor", suit: "cups", number: 3, element: "water",
  keywords: ["우정", "축하", "모임", "함께하는 기쁨"],
  uprightMeaning: "친구들과 잔을 들어 축하하는 카드입니다. 함께 나누는 기쁨이 두 배가 되는 때입니다.",
  reversedMeaning: "모임 피로, 겉도는 어울림, 과한 유흥을 뜻합니다.",
  loveMeaning: "지인 모임에서 인연이 시작될 수 있습니다. 소개팅 운도 좋습니다.",
  moneyMeaning: "모임 지출이 늘어나는 시기입니다. 즐기되 예산을 정하세요.",
  careerMeaning: "팀의 성과를 함께 축하할 일이 생깁니다. 네트워킹에 좋습니다.",
  relationshipMeaning: "오랜만의 모임이 관계에 활기를 되찾아줍니다.",
  healthMeaning: "즐거운 자리가 늘수록 과음·과식 관리가 필요합니다.",
  advice: "기쁨은 나눌수록 커집니다. 축하 자리를 피하지 마세요.",
  warning: "어울림에 밀려 정작 할 일을 미루지 마세요.",
  todayFortune: {
    overall: "사람들과 어울리는 자리에 행운이 있는 날입니다.",
    love: "모임 속에서 뜻밖의 호감이 싹틀 수 있습니다.",
    money: "회비·모임비 지출은 미리 상한을 정하세요.",
    work: "동료와의 가벼운 자리가 협업의 윤활유가 됩니다.",
    advice: "초대가 오면 응하세요. 좋은 소식이 따라옵니다.",
    caution: "과음과 뒷담화는 오늘의 지뢰입니다."
  },
  imagePrompt: "three friends dancing in a circle raising cups, harvest fruits at their feet"
},
{
  id: "cups-04", nameKo: "컵 4", nameEn: "Four of Cups", arcana: "minor", suit: "cups", number: 4, element: "water",
  keywords: ["권태", "무관심", "기회 간과", "내면 침잠"],
  uprightMeaning: "눈앞의 잔에 흥미를 잃은 권태의 카드입니다. 그 사이 내밀어진 새 잔을 못 보고 있을 수 있습니다.",
  reversedMeaning: "권태에서 벗어나 다시 움직이기 시작하는 상태입니다.",
  loveMeaning: "관계가 심드렁하게 느껴질 수 있습니다. 익숙함 속의 소중함을 다시 보세요.",
  moneyMeaning: "무기력하게 놓치는 기회가 없는지 점검해보세요.",
  careerMeaning: "일이 재미없게 느껴지는 시기입니다. 작은 변화가 환기를 만듭니다.",
  relationshipMeaning: "시큰둥한 반응이 상대에게 상처가 될 수 있습니다.",
  healthMeaning: "의욕 저하가 몸의 신호일 수 있으니 휴식과 환기가 필요합니다.",
  advice: "고개를 들어보세요. 놓치고 있는 제안이 있습니다.",
  warning: "지루함을 이유로 소중한 것을 방치하지 마세요.",
  todayFortune: {
    overall: "심드렁해지기 쉬운 날입니다. 작은 환기가 필요합니다.",
    love: "익숙한 상대의 새로운 면을 찾아보세요.",
    money: "지나치는 제안 속에 실속이 숨어 있을 수 있습니다.",
    work: "루틴을 살짝 바꾸면 능률이 돌아옵니다.",
    advice: "제3의 시선으로 오늘을 바라보세요.",
    caution: "무표정과 무반응이 오해를 만듭니다."
  },
  imagePrompt: "a figure sitting under a tree arms crossed, three cups before him, a fourth offered from a cloud"
},
{
  id: "cups-05", nameKo: "컵 5", nameEn: "Five of Cups", arcana: "minor", suit: "cups", number: 5, element: "water",
  keywords: ["상실", "후회", "남은 것", "애도"],
  uprightMeaning: "엎어진 세 잔을 바라보는 상실의 카드입니다. 그러나 등 뒤에는 아직 두 잔이 서 있습니다.",
  reversedMeaning: "슬픔에서 회복되어 남은 것을 보기 시작하는 상태입니다.",
  loveMeaning: "지난 관계의 후회가 남아 있습니다. 잃은 것보다 남은 마음을 보세요.",
  moneyMeaning: "손실이 있었더라도 전부는 아닙니다. 남은 자원으로 재정비하세요.",
  careerMeaning: "실패의 경험이 다음 성공의 데이터가 되는 시기입니다.",
  relationshipMeaning: "서운함에 매몰되면 곁에 있는 사람을 놓칩니다.",
  healthMeaning: "마음의 회복이 몸의 회복보다 먼저입니다. 애도할 시간을 주세요.",
  advice: "충분히 슬퍼한 뒤, 몸을 돌려 남은 두 잔을 확인하세요.",
  warning: "지난 일을 곱씹는 시간이 길어지면 현재까지 젖습니다.",
  todayFortune: {
    overall: "아쉬움이 남는 날일 수 있지만 잃은 게 전부는 아닙니다.",
    love: "과거와 비교하는 말은 오늘 금지어입니다.",
    money: "손해 본 것에 매이지 말고 남은 예산으로 계획하세요.",
    work: "실수했다면 복기 한 번, 자책은 금지입니다.",
    advice: "남아 있는 것들의 목록을 적어보세요.",
    caution: "우울한 기분으로 저녁 약속을 망치지 마세요."
  },
  imagePrompt: "a cloaked mourner before three spilled cups, two upright cups behind, distant bridge"
},
{
  id: "cups-06", nameKo: "컵 6", nameEn: "Six of Cups", arcana: "minor", suit: "cups", number: 6, element: "water",
  keywords: ["추억", "순수함", "옛 인연", "그리움"],
  uprightMeaning: "어린 시절처럼 순수한 마음이 오가는 추억의 카드입니다. 과거로부터 따뜻한 것이 돌아옵니다.",
  reversedMeaning: "과거에 갇혀 현재를 못 사는 상태를 뜻합니다.",
  loveMeaning: "옛 인연의 소식이나 첫사랑 같은 순수한 감정이 찾아옵니다.",
  moneyMeaning: "과거에 해둔 것에서 수익이 돌아올 수 있습니다.",
  careerMeaning: "예전 동료나 거래처와의 재연결이 기회가 됩니다.",
  relationshipMeaning: "추억을 나누는 대화가 관계를 부드럽게 만듭니다.",
  healthMeaning: "몸이 기억하는 좋은 습관을 되살려보세요.",
  advice: "그리운 사람이 있다면 먼저 안부를 물어보세요.",
  warning: "추억 보정에 속아 같은 실수를 반복하지 마세요.",
  todayFortune: {
    overall: "그리운 것들이 마음을 두드리는 날입니다.",
    love: "옛 인연의 연락, 혹은 순수한 설렘이 찾아옵니다.",
    money: "과거의 투자나 부탁이 되돌아올 수 있습니다.",
    work: "예전 방식에 힌트가 있습니다. 기록을 뒤져보세요.",
    advice: "따뜻한 기억에서 오늘의 힘을 꺼내 쓰세요.",
    caution: "과거 미화에 빠져 현재를 놓치지 마세요."
  },
  imagePrompt: "a child giving a cup of flowers to another in an old village courtyard"
},
{
  id: "cups-07", nameKo: "컵 7", nameEn: "Seven of Cups", arcana: "minor", suit: "cups", number: 7, element: "water",
  keywords: ["환상", "선택지 과다", "몽상", "우선순위"],
  uprightMeaning: "구름 위에 뜬 일곱 개의 잔처럼 선택지는 많지만 손에 잡히는 건 없는 상태입니다. 환상과 현실을 가려야 합니다.",
  reversedMeaning: "안개가 걷히고 선택이 명확해지기 시작하는 상태입니다.",
  loveMeaning: "이상형의 환상이 현실의 상대를 가리고 있지 않은지 보세요.",
  moneyMeaning: "달콤한 투자 이야기일수록 실체를 확인해야 합니다.",
  careerMeaning: "하고 싶은 게 많을 때일수록 하나를 골라 파야 합니다.",
  relationshipMeaning: "모두에게 좋은 사람이려다 아무에게도 못 미칩니다.",
  healthMeaning: "이런저런 건강법보다 기본 수칙 하나를 지키는 게 낫습니다.",
  advice: "선택지를 세 개로 줄이고, 다시 하나로 줄이세요.",
  warning: "상상 속 성공은 통장에 찍히지 않습니다.",
  todayFortune: {
    overall: "생각이 많아지는 날입니다. 하나만 골라 실행하세요.",
    love: "재고 따지다 진짜 마음을 놓칠 수 있습니다.",
    money: "혹하는 이야기의 이면을 확인하세요.",
    work: "멀티태스킹보다 한 가지 완성이 낫습니다.",
    advice: "적어보면 허상과 실속이 구분됩니다.",
    caution: "몽상으로 시간을 흘려보내지 마세요."
  },
  imagePrompt: "a silhouetted figure facing seven cups floating in clouds filled with visions"
},
{
  id: "cups-08", nameKo: "컵 8", nameEn: "Eight of Cups", arcana: "minor", suit: "cups", number: 8, element: "water",
  keywords: ["떠남", "정리", "더 깊은 것을 찾아서", "전환"],
  uprightMeaning: "쌓아둔 잔을 뒤로하고 떠나는 카드입니다. 채워지지 않는 것을 인정하고 더 깊은 의미를 찾아 나섭니다.",
  reversedMeaning: "떠나야 할지 남아야 할지 결정을 미루는 상태입니다.",
  loveMeaning: "마음이 채워지지 않는 관계라면 정리를 고민하게 됩니다.",
  moneyMeaning: "수익보다 소모가 큰 구조에서 손을 떼기 좋은 때입니다.",
  careerMeaning: "더 의미 있는 일을 찾아 이동을 준비하는 흐름입니다.",
  relationshipMeaning: "에너지를 뺏는 관계와 거리를 둬도 괜찮습니다.",
  healthMeaning: "몸을 위해 환경 자체를 바꾸는 것도 방법입니다.",
  advice: "미련이 남아도, 알고 있잖아요. 갈 때가 됐다는 걸.",
  warning: "도망과 떠남은 다릅니다. 이유를 분명히 하세요.",
  todayFortune: {
    overall: "정리하고 떠나보내기 좋은 날입니다.",
    love: "관계의 방향을 솔직하게 돌아보게 됩니다.",
    money: "밑 빠진 지출 항목을 오늘 끊으세요.",
    work: "의미 없는 일에서 손을 떼면 여유가 생깁니다.",
    advice: "비운 자리에 새것이 들어옵니다.",
    caution: "충동적인 잠수나 퇴사 선언은 금물입니다."
  },
  imagePrompt: "a traveler walking away from eight stacked cups toward moonlit mountains"
},
{
  id: "cups-09", nameKo: "컵 9", nameEn: "Nine of Cups", arcana: "minor", suit: "cups", number: 9, element: "water",
  keywords: ["만족", "소원 성취", "풍족", "자기만족"],
  uprightMeaning: "소원이 이뤄지는 만족의 카드입니다. 바라던 것이 손에 들어오는 기분 좋은 흐름입니다.",
  reversedMeaning: "겉만 번지르르한 만족이나 과시욕을 뜻합니다.",
  loveMeaning: "바라던 관계의 모습이 이뤄져 가는 만족스러운 시기입니다.",
  moneyMeaning: "원하던 소비나 수입이 실현되는 기분 좋은 흐름입니다.",
  careerMeaning: "목표하던 성과가 달성되는 시기입니다. 자축해도 좋습니다.",
  relationshipMeaning: "여유로운 마음이 관계를 너그럽게 만듭니다.",
  healthMeaning: "컨디션이 좋은 시기이니 즐거움의 과식만 조심하세요.",
  advice: "이뤄진 것을 충분히 누리세요. 감사가 다음 소원을 부릅니다.",
  warning: "만족이 자만이 되면 발전이 멈춥니다.",
  todayFortune: {
    overall: "바라던 일이 이뤄지기 좋은 날입니다.",
    love: "원하던 답을 들을 수 있는 흐름입니다.",
    money: "갖고 싶던 것을 좋은 조건에 만날 수 있습니다.",
    work: "목표 달성의 기쁨을 맛보기 좋은 날입니다.",
    advice: "감사한 것 세 가지를 떠올려보세요. 운이 더 붙습니다.",
    caution: "자기만족에 취해 주변을 잊지 마세요."
  },
  imagePrompt: "a satisfied figure seated with arms crossed before nine cups arranged in an arc"
},
{
  id: "cups-10", nameKo: "컵 10", nameEn: "Ten of Cups", arcana: "minor", suit: "cups", number: 10, element: "water",
  keywords: ["행복한 완성", "가정의 화합", "정서적 충만", "무지개"],
  uprightMeaning: "무지개 아래 가족이 함께 웃는 정서적 완성의 카드입니다. 마음이 온전히 충만해지는 행복입니다.",
  reversedMeaning: "이상적인 그림과 현실의 간극, 가족 간 불협화음을 뜻합니다.",
  loveMeaning: "결실을 향해 가는 사랑입니다. 함께하는 미래가 그려집니다.",
  moneyMeaning: "가족과 관련된 지출이 만족을 줍니다. 든든한 재정 안정감도 있습니다.",
  careerMeaning: "일과 삶의 균형이 맞아 들어가는 시기입니다.",
  relationshipMeaning: "가족·가까운 사람들과의 화합이 최고의 자산이 됩니다.",
  healthMeaning: "정서적 안정이 최고의 보약인 시기입니다.",
  advice: "행복은 미루는 게 아닙니다. 오늘 함께 있는 사람과 나누세요.",
  warning: "완벽한 그림을 강요하면 진짜 행복이 숨습니다.",
  todayFortune: {
    overall: "마음이 충만해지는 따뜻한 날입니다.",
    love: "함께하는 미래 이야기가 자연스러워집니다.",
    money: "가족을 위한 지출이 큰 만족으로 돌아옵니다.",
    work: "일찍 마치고 소중한 사람에게 가세요.",
    advice: "지금 곁에 있는 사람들이 정답입니다.",
    caution: "SNS 속 남의 행복과 비교하지 마세요."
  },
  imagePrompt: "a joyful family under a rainbow of ten cups, cozy cottage and river"
},
{
  id: "cups-11-page", nameKo: "컵 시종", nameEn: "Page of Cups", arcana: "minor", suit: "cups", number: "page", element: "water",
  keywords: ["감성적 소식", "순수한 호감", "상상력", "감정의 새싹"],
  uprightMeaning: "잔 속의 물고기처럼 뜻밖의 감성적 소식이 도착하는 카드입니다. 순수한 마음의 시작입니다.",
  reversedMeaning: "감정 기복, 유치한 토라짐, 현실감 없는 몽상을 뜻합니다.",
  loveMeaning: "풋풋한 고백이나 호감의 신호가 옵니다. 순수하게 받아들여보세요.",
  moneyMeaning: "창의적인 아이디어가 작은 수익의 씨앗이 됩니다.",
  careerMeaning: "감성과 상상력을 쓰는 일에서 재능이 드러납니다.",
  relationshipMeaning: "솔직하고 순수한 표현이 관계의 문을 엽니다.",
  healthMeaning: "감정 표현이 스트레스 해소의 핵심입니다.",
  advice: "마음이 말하는 것을 유치하다고 무시하지 마세요.",
  warning: "기분에 따라 말이 바뀌면 신뢰를 잃습니다.",
  todayFortune: {
    overall: "뜻밖의 반가운 소식이 오는 날입니다.",
    love: "서툴러도 진심 어린 표현이 통합니다.",
    money: "기발한 아이디어를 기록해두세요. 나중에 돈이 됩니다.",
    work: "감성적 접근이 딱딱한 문제를 풀어줍니다.",
    advice: "동심으로 돌아가 보면 답이 보입니다.",
    caution: "감정 기복을 그대로 드러내지 마세요."
  },
  imagePrompt: "a young page in flowery tunic gazing at a fish peeking from a golden cup, seaside"
},
{
  id: "cups-12-knight", nameKo: "컵 기사", nameEn: "Knight of Cups", arcana: "minor", suit: "cups", number: "knight", element: "water",
  keywords: ["로맨틱한 제안", "이상주의", "감성적 접근", "매혹"],
  uprightMeaning: "잔을 들고 다가오는 낭만의 기사입니다. 마음을 담은 제안이나 초대가 도착합니다.",
  reversedMeaning: "말뿐인 낭만, 비현실적 약속, 우유부단함을 뜻합니다.",
  loveMeaning: "로맨틱한 제안이나 이벤트의 흐름이 있습니다. 표현이 사랑을 키웁니다.",
  moneyMeaning: "감성에 이끌린 소비가 늘 수 있으니 예산 안에서 즐기세요.",
  careerMeaning: "제안서·프레젠테이션처럼 마음을 움직이는 일에 강해집니다.",
  relationshipMeaning: "정중하고 다정한 태도가 관계의 온도를 올립니다.",
  healthMeaning: "감성 충전이 곧 에너지 충전입니다. 예술·음악이 약이 됩니다.",
  advice: "마음을 전할 거라면 형식도 아름답게 갖춰보세요.",
  warning: "낭만적인 말에는 실행이 따라야 신뢰가 됩니다.",
  todayFortune: {
    overall: "낭만적인 기운이 흐르는 날입니다.",
    love: "데이트 신청이나 이벤트에 최적의 타이밍입니다.",
    money: "분위기에 취한 지출은 내일의 한숨이 됩니다.",
    work: "마음을 움직이는 제안이 성사됩니다.",
    advice: "진심에 정성을 더해 전달하세요.",
    caution: "지키지 못할 약속은 하지 마세요."
  },
  imagePrompt: "a graceful knight on a calm white horse offering a golden cup, winged helmet"
},
{
  id: "cups-13-queen", nameKo: "컵 여왕", nameEn: "Queen of Cups", arcana: "minor", suit: "cups", number: "queen", element: "water",
  keywords: ["공감", "직관", "따뜻한 배려", "정서적 성숙"],
  uprightMeaning: "마음을 깊이 읽어주는 공감의 여왕입니다. 다정한 직관이 사람을 치유합니다.",
  reversedMeaning: "감정 과몰입, 정서적 소진, 예민함을 뜻합니다.",
  loveMeaning: "깊이 공감해주는 태도가 관계를 안정시킵니다. 보살핌의 사랑입니다.",
  moneyMeaning: "직관이 좋은 시기이지만 돈 결정엔 근거를 더하세요.",
  careerMeaning: "상담·케어·소통이 필요한 일에서 진가가 드러납니다.",
  relationshipMeaning: "들어주는 것만으로 상대의 마음을 얻습니다.",
  healthMeaning: "남 돌보느라 내 마음이 마르지 않게 채워주세요.",
  advice: "공감하되 상대의 감정에 빠져 함께 가라앉지는 마세요.",
  warning: "모두의 감정 쓰레기통이 되지 않게 경계를 지키세요.",
  todayFortune: {
    overall: "마음을 나누는 대화가 복이 되는 날입니다.",
    love: "따뜻한 경청이 어떤 이벤트보다 강력합니다.",
    money: "감정적 소비 대신 마음을 채우는 시간을 쓰세요.",
    work: "동료의 고민을 들어주면 신뢰가 쌓입니다.",
    advice: "오늘의 직감은 꽤 정확합니다. 메모해두세요.",
    caution: "남의 감정에 젖어 내 일정을 놓치지 마세요."
  },
  imagePrompt: "a gentle queen on a shell throne by the sea holding an ornate closed chalice"
},
{
  id: "cups-14-king", nameKo: "컵 왕", nameEn: "King of Cups", arcana: "minor", suit: "cups", number: "king", element: "water",
  keywords: ["감정의 성숙", "안정된 포용", "지혜로운 중재", "평정심"],
  uprightMeaning: "출렁이는 바다 위에서도 평온한 감정의 왕입니다. 성숙한 포용력이 주변을 안정시킵니다.",
  reversedMeaning: "감정 억압, 속을 알 수 없는 태도, 감정적 조종을 뜻합니다.",
  loveMeaning: "듬직하고 안정적인 사랑의 흐름입니다. 감정을 성숙하게 다루게 됩니다.",
  moneyMeaning: "일희일비하지 않는 운용이 수익을 지킵니다.",
  careerMeaning: "갈등 중재와 위기 관리에서 리더십이 빛납니다.",
  relationshipMeaning: "흔들리지 않는 태도가 주변의 기댈 곳이 됩니다.",
  healthMeaning: "감정 관리가 곧 건강 관리인 시기입니다.",
  advice: "파도에 반응하지 말고 물결 아래의 깊이를 유지하세요.",
  warning: "괜찮은 척이 길어지면 마음에 골병이 듭니다.",
  todayFortune: {
    overall: "평정심이 최고의 무기가 되는 날입니다.",
    love: "차분한 진심이 상대에게 안정감을 줍니다.",
    money: "시장이 흔들려도 원칙을 지키면 됩니다.",
    work: "감정 섞인 상황일수록 당신의 침착함이 돋보입니다.",
    advice: "속마음을 신뢰하는 사람에게는 열어 보이세요.",
    caution: "무던한 척하다 서운함이 쌓이지 않게 하세요."
  },
  imagePrompt: "a composed king on a throne floating amid waves, holding cup and scepter, ship behind"
}
];
```

---

## 8. 마이너 아르카나 — 소드 (Swords · air)

```ts
export const SWORDS: TarotCard[] = [
{
  id: "swords-01-ace", nameKo: "소드 에이스", nameEn: "Ace of Swords", arcana: "minor", suit: "swords", number: 1, element: "air",
  keywords: ["명료함", "진실", "결단의 시작", "돌파구"],
  uprightMeaning: "안개를 가르는 검처럼 상황이 명확해지는 카드입니다. 진실과 결단이 돌파구를 만듭니다.",
  reversedMeaning: "판단 흐림, 혼란, 잘못된 정보에 의한 결정을 뜻합니다.",
  loveMeaning: "관계의 진실이 또렷해지는 시기입니다. 명확한 대화가 필요합니다.",
  moneyMeaning: "숫자를 정확히 보면 답이 나옵니다. 애매한 조건은 걷어내세요.",
  careerMeaning: "핵심을 꿰뚫는 판단으로 국면을 전환할 수 있습니다.",
  relationshipMeaning: "돌려 말하지 않는 정직함이 관계를 정리해줍니다.",
  healthMeaning: "원인을 정확히 파악하는 것이 회복의 시작입니다.",
  advice: "복잡할수록 본질 한 줄로 정리해보세요.",
  warning: "직설이 지나치면 칼끝이 사람을 다치게 합니다.",
  todayFortune: {
    overall: "머리가 맑고 판단이 서는 날입니다.",
    love: "애매했던 관계에 명확한 답이 보입니다.",
    money: "계약서·조건은 오늘 검토하면 허점이 잘 보입니다.",
    work: "핵심을 짚는 한마디가 회의를 정리합니다.",
    advice: "결단은 오늘, 실행은 계획대로.",
    caution: "정확함이 차가움으로 전해지지 않게 하세요."
  },
  imagePrompt: "a radiant hand from clouds gripping an upright sword crowned with a golden wreath"
},
{
  id: "swords-02", nameKo: "소드 2", nameEn: "Two of Swords", arcana: "minor", suit: "swords", number: 2, element: "air",
  keywords: ["교착", "회피된 선택", "균형", "눈가리개"],
  uprightMeaning: "눈을 가린 채 두 검의 균형을 잡는 카드입니다. 결정을 미루며 유지되는 아슬한 평화입니다.",
  reversedMeaning: "교착이 풀리거나, 더는 미룰 수 없는 상황을 뜻합니다.",
  loveMeaning: "마음을 정하지 못해 관계가 제자리인 상태입니다.",
  moneyMeaning: "결정을 미루는 동안에도 비용은 나갑니다. 기한을 정하세요.",
  careerMeaning: "둘 사이 균형 잡기에 지쳐 있습니다. 판단 기준을 세울 때입니다.",
  relationshipMeaning: "중립을 지키는 것도 때로는 상처를 줍니다.",
  healthMeaning: "긴장을 안고 버티는 상태입니다. 어깨와 목의 힘을 푸세요.",
  advice: "눈가리개를 벗으세요. 이미 마음은 알고 있습니다.",
  warning: "미루는 것도 결국 하나의 선택입니다. 대가가 있습니다.",
  todayFortune: {
    overall: "결정을 미루고 싶은 날이지만 기한은 정해두세요.",
    love: "애매한 태도가 상대를 지치게 할 수 있습니다.",
    money: "보류 중인 결제·해지 건을 오늘 매듭지으세요.",
    work: "양쪽 눈치보다 원칙 하나가 낫습니다.",
    advice: "동전을 던져보세요. 떨어지는 순간 원하는 면이 보입니다.",
    caution: "우유부단이 신뢰를 갉아먹습니다."
  },
  imagePrompt: "a blindfolded woman seated by the sea balancing two crossed swords, crescent moon"
},
{
  id: "swords-03", nameKo: "소드 3", nameEn: "Three of Swords", arcana: "minor", suit: "swords", number: 3, element: "air",
  keywords: ["상심", "이별", "아픈 진실", "통증의 직면"],
  uprightMeaning: "심장에 꽂힌 세 자루의 검, 마음 아픈 진실의 카드입니다. 아프지만 정확히 아는 것이 회복의 시작입니다.",
  reversedMeaning: "상처가 아물기 시작하거나, 아픔을 외면하는 상태입니다.",
  loveMeaning: "서운함이나 이별의 아픔이 있을 수 있습니다. 아픔을 인정해야 지나갑니다.",
  moneyMeaning: "손실을 확인하는 아픈 순간이지만 정확한 손절이 재기를 만듭니다.",
  careerMeaning: "쓴소리나 실망스러운 결과가 있어도 데이터로 받아들이세요.",
  relationshipMeaning: "말로 받은 상처가 남습니다. 같은 방식으로 되갚지 마세요.",
  healthMeaning: "스트레스가 가슴 답답함으로 올 수 있습니다. 털어놓을 곳을 만드세요.",
  advice: "아픈 걸 아프다고 인정하는 것이 회복의 첫 단계입니다.",
  warning: "상처받은 마음으로 내리는 결정은 대부분 후회가 됩니다.",
  todayFortune: {
    overall: "마음이 쓰릴 수 있는 날입니다. 무리하지 마세요.",
    love: "서운한 말이 오갈 수 있으니 말을 아끼세요.",
    money: "손실 확인은 빠를수록 상처가 작습니다.",
    work: "비판은 아프지만 성장의 재료로만 취하세요.",
    advice: "오늘의 아픔은 오늘까지만. 내일로 가져가지 마세요.",
    caution: "감정이 격할 때 보내는 메시지는 반드시 후회합니다."
  },
  imagePrompt: "a red heart pierced by three swords under storm clouds and rain"
},
{
  id: "swords-04", nameKo: "소드 4", nameEn: "Four of Swords", arcana: "minor", suit: "swords", number: 4, element: "air",
  keywords: ["휴식", "회복", "재정비", "전략적 멈춤"],
  uprightMeaning: "전투 사이의 휴식을 뜻하는 카드입니다. 멈춤은 후퇴가 아니라 다음 라운드의 준비입니다.",
  reversedMeaning: "쉬어야 하는데 못 쉬는 상태, 혹은 회복이 끝나가는 신호입니다.",
  loveMeaning: "관계에 잠시 숨 고르기가 필요합니다. 냉각기가 아니라 회복기입니다.",
  moneyMeaning: "공격적 운용을 멈추고 현금을 쉬게 하기 좋은 때입니다.",
  careerMeaning: "재충전이 최고의 업무 전략인 시기입니다. 휴가를 계획하세요.",
  relationshipMeaning: "약속을 줄이고 에너지를 아끼는 것이 관계에도 좋습니다.",
  healthMeaning: "몸이 쉬라고 말하고 있습니다. 수면부터 챙기세요.",
  advice: "잘 쉬는 것도 실력입니다. 죄책감 없이 쉬세요.",
  warning: "휴식 없이 달리면 몸이 강제로 멈추게 만듭니다.",
  todayFortune: {
    overall: "재충전이 필요한 날입니다. 일정을 비워보세요.",
    love: "각자의 시간이 관계를 오히려 살립니다.",
    money: "오늘은 지갑도 쉬는 날로 정하세요.",
    work: "밀어붙이기보다 정비하는 날로 쓰세요.",
    advice: "10분의 낮잠이 오후를 바꿉니다.",
    caution: "휴식이 무기력으로 늘어지지 않게 하세요."
  },
  imagePrompt: "a knight lying in repose on a tomb in a quiet chapel, three swords on the wall"
},
{
  id: "swords-05", nameKo: "소드 5", nameEn: "Five of Swords", arcana: "minor", suit: "swords", number: 5, element: "air",
  keywords: ["상처뿐인 승리", "갈등의 소모", "자존심 싸움", "이겨도 지는 게임"],
  uprightMeaning: "이겼지만 모두가 다친 싸움의 카드입니다. 자존심 대결의 끝에는 승자가 없습니다.",
  reversedMeaning: "소모전을 끝내고 화해나 철수를 택하는 상태입니다.",
  loveMeaning: "말싸움에서 이기고 마음을 잃을 수 있습니다. 이기려 들지 마세요.",
  moneyMeaning: "무리한 경쟁 입찰이나 치킨게임은 남는 게 없습니다.",
  careerMeaning: "사내 정치나 신경전에 말리지 않는 것이 상책입니다.",
  relationshipMeaning: "말꼬리 잡는 논쟁은 관계만 갉아먹습니다.",
  healthMeaning: "갈등 스트레스가 몸을 먼저 칩니다. 거리를 두세요.",
  advice: "이 싸움에서 이기면 무엇이 남는지 먼저 계산하세요.",
  warning: "마지막 한마디를 이기려다 전부를 잃습니다.",
  todayFortune: {
    overall: "신경전에 휘말리기 쉬운 날입니다. 한 발 물러서세요.",
    love: "'내가 맞다'보다 '우리가 좋다'를 택하세요.",
    money: "경쟁심에 지르는 소비는 후회를 남깁니다.",
    work: "논쟁의 승리보다 일의 진척이 중요합니다.",
    advice: "져주는 것이 이기는 날입니다.",
    caution: "빈정거림 한마디가 큰 싸움이 됩니다."
  },
  imagePrompt: "a smirking figure gathering swords while two defeated men walk away under jagged clouds"
},
{
  id: "swords-06", nameKo: "소드 6", nameEn: "Six of Swords", arcana: "minor", suit: "swords", number: 6, element: "air",
  keywords: ["이동", "회복으로의 전환", "벗어남", "잔잔한 물로"],
  uprightMeaning: "거친 물을 떠나 잔잔한 곳으로 건너가는 카드입니다. 힘든 시기에서 서서히 벗어나는 이동입니다.",
  reversedMeaning: "과거의 짐을 안고 가는 이동, 미뤄지는 출발을 뜻합니다.",
  loveMeaning: "갈등의 파고가 잦아들고 관계가 잔잔해지는 흐름입니다.",
  moneyMeaning: "어려운 구간을 통과 중입니다. 무리 없는 이동이 답입니다.",
  careerMeaning: "이직·이동·전환이 순조롭게 진행되는 시기입니다.",
  relationshipMeaning: "환경을 바꾸면 관계의 공기도 바뀝니다.",
  healthMeaning: "회복 곡선에 올라탔습니다. 페이스를 유지하세요.",
  advice: "다 나아진 다음이 아니라, 나아지는 방향으로 지금 움직이세요.",
  warning: "떠나온 곳을 자꾸 돌아보면 배가 흔들립니다.",
  todayFortune: {
    overall: "어제보다 잔잔한 하루가 됩니다. 흐름을 타세요.",
    love: "다툼 후라면 오늘이 회복의 물길입니다.",
    money: "큰 욕심 없이 안정을 택하면 무난합니다.",
    work: "이동·출장·전환 업무가 순조롭습니다.",
    advice: "짐은 가볍게, 방향은 분명하게.",
    caution: "지난 일 얘기를 다시 꺼내지 마세요."
  },
  imagePrompt: "a ferryman rowing a cloaked woman and child across calm water, six swords in the boat"
},
{
  id: "swords-07", nameKo: "소드 7", nameEn: "Seven of Swords", arcana: "minor", suit: "swords", number: 7, element: "air",
  keywords: ["전략", "은밀함", "회피", "솔직하지 못함"],
  uprightMeaning: "정면 대결 대신 검을 안고 빠져나가는 카드입니다. 전략적 우회일 수도, 정직하지 못한 회피일 수도 있습니다.",
  reversedMeaning: "숨긴 것이 드러나거나 정직하게 돌아서는 상태입니다.",
  loveMeaning: "숨기는 것이 있는 관계는 오래 못 갑니다. 투명함이 필요합니다.",
  moneyMeaning: "너무 좋은 조건 뒤에는 숨은 비용이 있는지 확인하세요.",
  careerMeaning: "정보전이 벌어지는 시기입니다. 내 패는 아껴서 보여주세요.",
  relationshipMeaning: "뒤에서 오가는 말에 휘말리지 않게 처신을 조심하세요.",
  healthMeaning: "증상을 숨기고 버티는 것이 가장 나쁜 전략입니다.",
  advice: "우회하더라도 거짓말은 하지 마세요. 그 차이가 평판을 가릅니다.",
  warning: "잔꾀는 언젠가 이자가 붙어 돌아옵니다.",
  todayFortune: {
    overall: "말과 정보를 아끼는 것이 유리한 날입니다.",
    love: "비밀 연락이나 숨김수는 반드시 티가 납니다.",
    money: "솔깃한 뒷거래 제안은 거절이 답입니다.",
    work: "계획은 완성 후에 공개하는 편이 안전합니다.",
    advice: "정직을 지키되 전부를 보여줄 필요는 없습니다.",
    caution: "남의 것을 슬쩍 가져다 쓰면 크게 되돌아옵니다."
  },
  imagePrompt: "a sly figure tiptoeing from a camp carrying five swords, two left behind"
},
{
  id: "swords-08", nameKo: "소드 8", nameEn: "Eight of Swords", arcana: "minor", suit: "swords", number: 8, element: "air",
  keywords: ["자기 제한", "갇힌 느낌", "무력감", "생각의 감옥"],
  uprightMeaning: "검에 둘러싸여 묶인 듯 보이지만, 자세히 보면 발은 자유로운 카드입니다. 감옥은 대부분 생각이 지은 것입니다.",
  reversedMeaning: "속박에서 벗어나기 시작하는 해방의 신호입니다.",
  loveMeaning: "'어차피 안 될 거야'라는 생각이 관계의 진짜 장벽입니다.",
  moneyMeaning: "돈이 없어서가 아니라 방법을 안 찾아서일 수 있습니다.",
  careerMeaning: "선택지가 없다고 느낄 때일수록 밖의 시선을 빌리세요.",
  relationshipMeaning: "혼자 단정 짓지 말고 물어보면 의외로 쉽게 풀립니다.",
  healthMeaning: "무력감은 몸을 움직이면 절반은 걷힙니다.",
  advice: "눈가리개에 손을 대보세요. 묶여 있지 않다는 걸 알게 됩니다.",
  warning: "'할 수 없어'를 반복하면 정말 할 수 없게 됩니다.",
  todayFortune: {
    overall: "답답하게 느껴지는 날이지만 출구는 생각보다 가깝습니다.",
    love: "지레짐작으로 포기하지 마세요. 확인이 먼저입니다.",
    money: "막막할 땐 지출 내역부터 눈으로 보세요. 길이 보입니다.",
    work: "혼자 끙끙대지 말고 도움을 청하세요.",
    advice: "'만약 할 수 있다면?'으로 질문을 바꿔보세요.",
    caution: "부정적인 혼잣말이 하루를 묶습니다."
  },
  imagePrompt: "a blindfolded bound woman standing among eight swords on marshy ground, castle behind"
},
{
  id: "swords-09", nameKo: "소드 9", nameEn: "Nine of Swords", arcana: "minor", suit: "swords", number: 9, element: "air",
  keywords: ["불안", "걱정", "불면", "밤의 상념"],
  uprightMeaning: "한밤중 걱정에 잠 못 드는 카드입니다. 걱정의 대부분은 벽에 걸린 검처럼 실제로 떨어지지 않습니다.",
  reversedMeaning: "불안의 실체를 마주하고 회복이 시작되는 상태입니다.",
  loveMeaning: "혼자 키운 걱정이 관계를 어둡게 봅니다. 확인하면 절반은 사라집니다.",
  moneyMeaning: "돈 걱정은 종이에 적는 순간 관리 가능한 숫자가 됩니다.",
  careerMeaning: "최악의 시나리오 상상이 실행력을 갉아먹고 있습니다.",
  relationshipMeaning: "걱정을 나누면 절반이 되고, 숨기면 배가 됩니다.",
  healthMeaning: "수면의 질부터 회복하세요. 불안 관리의 시작입니다.",
  advice: "걱정을 다 적고, 오늘 해결할 수 있는 한 줄에만 동그라미 치세요.",
  warning: "새벽의 생각을 믿지 마세요. 아침에 다시 보면 다릅니다.",
  todayFortune: {
    overall: "걱정이 부풀기 쉬운 날입니다. 사실만 보세요.",
    love: "읽씹의 이유는 대부분 당신 생각과 다릅니다.",
    money: "막연한 불안 대신 잔고를 직접 확인하세요.",
    work: "걱정할 시간에 첫 단추 하나를 끼우세요.",
    advice: "몸을 움직이면 생각의 소용돌이가 멈춥니다.",
    caution: "밤늦은 검색과 상상은 불안만 키웁니다."
  },
  imagePrompt: "a figure sitting up in bed face in hands at night, nine swords on the dark wall"
},
{
  id: "swords-10", nameKo: "소드 10", nameEn: "Ten of Swords", arcana: "minor", suit: "swords", number: 10, element: "air",
  keywords: ["바닥", "끝", "고통의 종료", "새벽 직전"],
  uprightMeaning: "더 내려갈 곳 없는 바닥의 카드입니다. 그러나 등 뒤 수평선엔 이미 해가 뜨고 있습니다. 끝은 곧 끝났다는 뜻입니다.",
  reversedMeaning: "최악을 지나 회복이 시작되는 상태입니다.",
  loveMeaning: "한 관계의 완전한 종결일 수 있습니다. 끝나야 새로 시작됩니다.",
  moneyMeaning: "손실의 마지막 국면입니다. 여기서부터는 회복의 방향입니다.",
  careerMeaning: "프로젝트나 조직 생활의 한 챕터가 완전히 닫힙니다.",
  relationshipMeaning: "배신감이 들 수 있지만 남 탓에 머물면 회복이 늦어집니다.",
  healthMeaning: "번아웃의 바닥이라면, 지금부터는 회복만 남았습니다.",
  advice: "바닥의 좋은 점은 딛고 일어설 단단함이 있다는 것입니다.",
  warning: "끝난 일을 되살리려 에너지를 쓰지 마세요.",
  todayFortune: {
    overall: "힘든 매듭이 지어지는 날입니다. 내일부터는 오르막입니다.",
    love: "끝난 마음을 붙잡기보다 자신을 돌보세요.",
    money: "정리할 손실은 오늘 정리하고 새 판을 짜세요.",
    work: "실패의 원인을 기록하면 그것이 자산이 됩니다.",
    advice: "오늘의 끝맺음이 내일의 시작입니다.",
    caution: "자기 비하는 회복의 가장 큰 적입니다."
  },
  imagePrompt: "a fallen figure with ten swords in his back, golden dawn breaking over dark sea"
},
{
  id: "swords-11-page", nameKo: "소드 시종", nameEn: "Page of Swords", arcana: "minor", suit: "swords", number: "page", element: "air",
  keywords: ["관찰", "정보 수집", "경계", "지적 호기심"],
  uprightMeaning: "검을 세우고 사방을 살피는 정찰의 카드입니다. 정보와 관찰이 무기가 되는 때입니다.",
  reversedMeaning: "뒷조사, 말실수, 설익은 정보의 전달을 뜻합니다.",
  loveMeaning: "상대를 알아가는 관찰의 시기입니다. 취조가 되지 않게 하세요.",
  moneyMeaning: "정보 수집이 수익의 기초가 됩니다. 발품과 검색을 아끼지 마세요.",
  careerMeaning: "조사·분석·모니터링 업무에서 능력이 드러납니다.",
  relationshipMeaning: "듣고 관찰한 것을 함부로 옮기지 않는 것이 신뢰를 만듭니다.",
  healthMeaning: "몸 상태를 기록하고 관찰하면 패턴이 보입니다.",
  advice: "묻고, 듣고, 적으세요. 지금 모은 정보가 곧 힘이 됩니다.",
  warning: "확인 안 된 정보를 옮기는 순간 신뢰가 깎입니다.",
  todayFortune: {
    overall: "정보가 힘이 되는 날입니다. 안테나를 세우세요.",
    love: "상대의 말 속 숨은 신호를 잘 읽게 됩니다.",
    money: "가격 비교와 조건 검색이 돈을 아껴줍니다.",
    work: "회의록과 데이터가 당신을 지켜줍니다.",
    advice: "질문을 잘하는 사람이 오늘의 승자입니다.",
    caution: "말을 옮기다 구설에 오를 수 있습니다."
  },
  imagePrompt: "an alert young page holding a sword upright on a windy hill, birds and clouds racing"
},
{
  id: "swords-12-knight", nameKo: "소드 기사", nameEn: "Knight of Swords", arcana: "minor", suit: "swords", number: "knight", element: "air",
  keywords: ["돌진", "직설", "빠른 판단", "성급한 결론"],
  uprightMeaning: "생각이 서자마자 돌진하는 카드입니다. 스피드와 논리가 강점이지만 브레이크가 없습니다.",
  reversedMeaning: "무모한 언행, 방향 없는 공격성, 번복을 뜻합니다.",
  loveMeaning: "직진 어필이 통할 수 있지만 상대의 속도도 살펴주세요.",
  moneyMeaning: "빠른 결정이 필요한 기회가 오지만 계산은 두 번 하세요.",
  careerMeaning: "추진력으로 밀어붙이기 좋은 때, 단 독주는 견제를 부릅니다.",
  relationshipMeaning: "옳은 말도 속도와 온도를 조절해 전하세요.",
  healthMeaning: "급하게 움직이다 다치기 쉬운 날들입니다.",
  advice: "출발 전에 딱 10초, 방향만 확인하세요.",
  warning: "말이 검이 되어 먼저 도착하지 않게 하세요.",
  todayFortune: {
    overall: "속도전에 강한 날입니다. 방향 확인 후 돌진하세요.",
    love: "밀어붙이는 고백보다 타이밍 좋은 한마디가 낫습니다.",
    money: "빠른 손이 기회를 잡지만 오타 하나가 손실이 됩니다.",
    work: "치고 나가되 팀과 공유는 잊지 마세요.",
    advice: "논리에 배려를 한 스푼 얹으세요.",
    caution: "욱해서 보낸 메시지는 회수가 안 됩니다."
  },
  imagePrompt: "a charging knight with raised sword on a galloping horse against stormy sky"
},
{
  id: "swords-13-queen", nameKo: "소드 여왕", nameEn: "Queen of Swords", arcana: "minor", suit: "swords", number: "queen", element: "air",
  keywords: ["냉철함", "독립", "명확한 소통", "경험에서 온 지혜"],
  uprightMeaning: "감정에 휘둘리지 않는 명료한 지성의 여왕입니다. 겪어낸 경험이 판단의 근거가 됩니다.",
  reversedMeaning: "차가움이 지나쳐 고립되거나 비판적이기만 한 상태입니다.",
  loveMeaning: "솔직하고 성숙한 대화가 관계의 기준을 세웁니다.",
  moneyMeaning: "감정을 배제한 냉정한 판단이 돈을 지킵니다.",
  careerMeaning: "명확한 기준과 피드백으로 존중받는 시기입니다.",
  relationshipMeaning: "경계선을 분명히 하는 것이 오히려 관계를 편하게 합니다.",
  healthMeaning: "검진 결과 같은 객관적 데이터를 기준으로 관리하세요.",
  advice: "예의 있는 단호함, 그것이 오늘의 정답입니다.",
  warning: "논리로 이기고 온기로 지는 일이 없게 하세요.",
  todayFortune: {
    overall: "이성적인 판단이 빛나는 날입니다.",
    love: "돌려 말하기보다 담백한 솔직함이 통합니다.",
    money: "정에 이끌린 지출 부탁은 기준으로 거르세요.",
    work: "명확한 커뮤니케이션이 혼선을 정리합니다.",
    advice: "'아니요'를 우아하게 말하는 연습을 하세요.",
    caution: "바른말도 쌓이면 잔소리로 들립니다."
  },
  imagePrompt: "a stern graceful queen on a cloud-carved throne, raised sword, extended open hand"
},
{
  id: "swords-14-king", nameKo: "소드 왕", nameEn: "King of Swords", arcana: "minor", suit: "swords", number: "king", element: "air",
  keywords: ["판단력", "원칙", "권위", "전략적 지성"],
  uprightMeaning: "법과 원칙으로 다스리는 지성의 왕입니다. 공정한 판단과 전략이 질서를 만듭니다.",
  reversedMeaning: "융통성 없는 원칙주의, 권위적 강요, 지적 오만을 뜻합니다.",
  loveMeaning: "감정보다 신뢰와 존중이 기반이 되는 관계의 흐름입니다.",
  moneyMeaning: "원칙 있는 포트폴리오와 규칙적 관리가 힘을 발휘합니다.",
  careerMeaning: "판단과 결정의 자리에서 능력이 검증되는 시기입니다.",
  relationshipMeaning: "공과 사를 구분하는 태도가 존경을 만듭니다.",
  healthMeaning: "전문가의 진단과 원칙적인 관리가 답입니다.",
  advice: "기준을 세우고 예외를 최소화하세요. 그게 공정입니다.",
  warning: "원칙이 사람 위에 서면 마음이 떠납니다.",
  todayFortune: {
    overall: "판단력이 예리해지는 날입니다. 중요한 결정에 좋습니다.",
    love: "신뢰를 주는 언행이 마음을 얻습니다.",
    money: "규칙 기반의 결정이 최선의 수익을 만듭니다.",
    work: "어려운 판정을 내려야 한다면 오늘이 적기입니다.",
    advice: "머리로 정하고 가슴으로 전하세요.",
    caution: "지적이 습관이 되면 곁에 사람이 줄어듭니다."
  },
  imagePrompt: "an authoritative king enthroned with upright sword, butterflies carved on throne, clear sky"
}
];
```

---

## 9. 마이너 아르카나 — 펜타클 (Pentacles · earth)

```ts
export const PENTACLES: TarotCard[] = [
{
  id: "pentacles-01-ace", nameKo: "펜타클 에이스", nameEn: "Ace of Pentacles", arcana: "minor", suit: "pentacles", number: 1, element: "earth",
  keywords: ["실질적 기회", "수입의 씨앗", "안정의 시작", "현실화"],
  uprightMeaning: "손에 잡히는 기회가 주어지는 카드입니다. 돈·직장·건강 같은 현실 영역에 좋은 씨앗이 심어집니다.",
  reversedMeaning: "기회를 놓치거나 계획이 현실성을 잃은 상태입니다.",
  loveMeaning: "안정적으로 시작되는 관계, 현실적인 조건도 잘 맞는 흐름입니다.",
  moneyMeaning: "새 수입원·계약·제안이 들어오는 좋은 시기입니다.",
  careerMeaning: "실질적인 기회가 옵니다. 조건을 확인하고 잡으세요.",
  relationshipMeaning: "도움이 오가는 실속 있는 인연이 생깁니다.",
  healthMeaning: "몸 관리를 시작하기에 최적의 타이밍입니다.",
  advice: "기회가 왔을 때 현실적인 첫 발을 내디디세요.",
  warning: "씨앗은 심어야 자랍니다. 통장에 두기만 하면 그대로입니다.",
  todayFortune: {
    overall: "실속 있는 기회가 들어오는 날입니다.",
    love: "믿음직한 만남의 신호가 있습니다.",
    money: "부수입이나 좋은 제안의 문이 열립니다.",
    work: "구체적인 성과로 이어질 일을 시작하세요.",
    advice: "손에 잡히는 것부터 챙기세요.",
    caution: "너무 재기만 하다 기회가 지나갑니다."
  },
  imagePrompt: "a radiant hand from clouds holding a large golden pentacle over a garden path"
},
{
  id: "pentacles-02", nameKo: "펜타클 2", nameEn: "Two of Pentacles", arcana: "minor", suit: "pentacles", number: 2, element: "earth",
  keywords: ["균형 잡기", "저글링", "유연한 관리", "우선순위"],
  uprightMeaning: "두 개의 동전을 저글링하듯 여러 일을 굴리는 카드입니다. 유연함이 있다면 다 굴러갑니다.",
  reversedMeaning: "균형이 무너져 하나를 떨어뜨리기 직전인 상태입니다.",
  loveMeaning: "일과 사랑 사이의 균형 조절이 관건인 시기입니다.",
  moneyMeaning: "수입과 지출이 출렁입니다. 현금 흐름 관리가 핵심입니다.",
  careerMeaning: "여러 업무를 동시에 굴려야 합니다. 우선순위가 생명입니다.",
  relationshipMeaning: "여러 관계 사이의 시간 배분이 필요합니다.",
  healthMeaning: "바쁠수록 기본 리듬이 무너지지 않게 하세요.",
  advice: "다 잘하려 말고, 떨어뜨리면 안 되는 것부터 정하세요.",
  warning: "저글링이 길어지면 반드시 하나는 떨어집니다.",
  todayFortune: {
    overall: "멀티태스킹의 날입니다. 우선순위가 무기입니다.",
    love: "바빠도 연락의 온도는 유지하세요.",
    money: "이체·납부 일정이 겹치니 달력을 확인하세요.",
    work: "일정 조율 능력이 돋보이는 날입니다.",
    advice: "완벽보다 균형을 목표로 하세요.",
    caution: "약속을 겹치기로 잡는 실수를 조심하세요."
  },
  imagePrompt: "a dancing figure juggling two pentacles linked by an infinity ribbon, ships on waves behind"
},
{
  id: "pentacles-03", nameKo: "펜타클 3", nameEn: "Three of Pentacles", arcana: "minor", suit: "pentacles", number: 3, element: "earth",
  keywords: ["협업", "실력 인정", "기초 공사", "장인 정신"],
  uprightMeaning: "성당을 함께 짓는 장인의 카드입니다. 실력이 인정받고 협업의 기초가 다져집니다.",
  reversedMeaning: "손발이 안 맞는 협업, 성의 없는 작업을 뜻합니다.",
  loveMeaning: "함께 무언가를 만들어가며 깊어지는 관계입니다.",
  moneyMeaning: "실력이 돈으로 연결되기 시작하는 단계입니다.",
  careerMeaning: "전문성을 인정받는 흐름입니다. 협업에서 성과가 납니다.",
  relationshipMeaning: "각자의 역할을 존중하면 팀이 단단해집니다.",
  healthMeaning: "전문가와 함께하는 관리가 효과를 높입니다.",
  advice: "혼자 완벽하기보다 함께 완성하세요.",
  warning: "기초를 대충 하면 나중에 전부 다시 해야 합니다.",
  todayFortune: {
    overall: "실력을 보여줄 기회가 오는 날입니다.",
    love: "공동의 목표가 두 사람을 가깝게 만듭니다.",
    money: "기술과 경험이 수입의 근거가 됩니다.",
    work: "협업 요청이 오면 기회로 받아들이세요.",
    advice: "디테일에 정성을 들이면 반드시 알아봅니다.",
    caution: "'대충 이 정도면'이 평판을 깎습니다."
  },
  imagePrompt: "a young mason on a bench carving in a cathedral, monk and architect reviewing plans"
},
{
  id: "pentacles-04", nameKo: "펜타클 4", nameEn: "Four of Pentacles", arcana: "minor", suit: "pentacles", number: 4, element: "earth",
  keywords: ["소유", "지키기", "안정 집착", "움켜쥠"],
  uprightMeaning: "동전을 꼭 껴안은 카드입니다. 지키는 힘은 좋지만, 움켜쥔 손으로는 새것을 잡을 수 없습니다.",
  reversedMeaning: "손을 펴기 시작하거나, 반대로 낭비로 기우는 상태입니다.",
  loveMeaning: "상대를 붙잡으려는 마음이 관계를 조일 수 있습니다.",
  moneyMeaning: "저축과 방어에 강한 시기입니다. 다만 지나친 인색은 기회비용입니다.",
  careerMeaning: "현상 유지 전략이 통하지만 성장은 멈출 수 있습니다.",
  relationshipMeaning: "내 것만 챙기는 인상을 주지 않게 나눔도 보여주세요.",
  healthMeaning: "긴장을 움켜쥔 몸입니다. 이완이 필요합니다.",
  advice: "지킬 것과 흘려보낼 것을 구분하세요.",
  warning: "잃을까 두려워 아무것도 안 하는 것이 가장 큰 손실입니다.",
  todayFortune: {
    overall: "지키는 데 강한 날입니다. 방어적 선택이 유리합니다.",
    love: "집착은 사랑이 아니라 불안의 표현입니다.",
    money: "저축엔 좋은 날, 인색엔 나쁜 날입니다.",
    work: "내 성과와 자료는 확실히 챙겨두세요.",
    advice: "쥔 손에 힘을 조금만 빼보세요.",
    caution: "밥값 계산에서 야박해지지 마세요."
  },
  imagePrompt: "a crowned figure clutching a pentacle to his chest, two underfoot, city skyline behind"
},
{
  id: "pentacles-05", nameKo: "펜타클 5", nameEn: "Five of Pentacles", arcana: "minor", suit: "pentacles", number: 5, element: "earth",
  keywords: ["궁핍", "소외감", "어려운 시기", "도움의 문"],
  uprightMeaning: "눈보라 속을 걷는 어려움의 카드입니다. 그러나 등 뒤의 창문엔 불이 켜져 있습니다. 도움은 가까이 있습니다.",
  reversedMeaning: "어려움의 끝, 회복과 지원이 시작되는 상태입니다.",
  loveMeaning: "외롭다고 느껴져도 함께 견디면 관계가 단단해집니다.",
  moneyMeaning: "지출을 조이고 지원 제도를 알아보세요. 견디는 시기입니다.",
  careerMeaning: "일이 풀리지 않아도 자신의 가치를 의심하지 마세요.",
  relationshipMeaning: "힘들 때 손을 내미는 것은 약함이 아니라 지혜입니다.",
  healthMeaning: "무리하게 버티지 말고 몸의 SOS에 응답하세요.",
  advice: "혼자 견디지 마세요. 도움의 문은 생각보다 가까이 있습니다.",
  warning: "자존심 때문에 열린 문을 지나치지 마세요.",
  todayFortune: {
    overall: "움츠러들기 쉬운 날이지만 도움의 손길이 가까이 있습니다.",
    love: "힘든 티를 내는 것도 친밀함의 표현입니다.",
    money: "고정비를 점검하고 아낄 곳을 찾으세요.",
    work: "막힐 땐 동료에게 물어보세요. 의외로 금방 풀립니다.",
    advice: "도움을 청하는 용기가 오늘의 열쇠입니다.",
    caution: "비교와 자격지심이 마음을 더 춥게 만듭니다."
  },
  imagePrompt: "two ragged figures walking through snow past a glowing stained glass window of five pentacles"
},
{
  id: "pentacles-06", nameKo: "펜타클 6", nameEn: "Six of Pentacles", arcana: "minor", suit: "pentacles", number: 6, element: "earth",
  keywords: ["나눔", "주고받음", "거래의 균형", "도움"],
  uprightMeaning: "저울을 들고 나누는 카드입니다. 주고받음의 균형이 맞을 때 관계도 재물도 순환합니다.",
  reversedMeaning: "일방적인 퍼주기, 조건 달린 호의, 갚기 어려운 빚을 뜻합니다.",
  loveMeaning: "주는 만큼 받고 있는지, 받는 만큼 주고 있는지 살펴보세요.",
  moneyMeaning: "들어오고 나가는 균형이 좋은 시기입니다. 나눔이 복이 됩니다.",
  careerMeaning: "도움을 주고받는 네트워크가 성과를 만듭니다.",
  relationshipMeaning: "베푼 것은 돌아옵니다. 다만 대가를 바라면 관계가 상합니다.",
  healthMeaning: "에너지의 수입과 지출도 균형이 필요합니다.",
  advice: "여유가 있다면 나누고, 필요하면 받는 것도 당당하게.",
  warning: "호의가 계속되면 권리인 줄 아는 관계는 정리 대상입니다.",
  todayFortune: {
    overall: "주고받음이 활발한 날입니다. 순환이 복을 부릅니다.",
    love: "작은 선물이나 호의가 큰 마음으로 돌아옵니다.",
    money: "빌려준 돈 소식이나 뜻밖의 보답이 있을 수 있습니다.",
    work: "도와준 일이 평판이 되어 돌아옵니다.",
    advice: "받았으면 표현하고, 주었으면 잊으세요.",
    caution: "부탁을 다 들어주다 내 몫이 사라집니다."
  },
  imagePrompt: "a wealthy merchant weighing coins on scales, giving alms to two kneeling figures"
},
{
  id: "pentacles-07", nameKo: "펜타클 7", nameEn: "Seven of Pentacles", arcana: "minor", suit: "pentacles", number: 7, element: "earth",
  keywords: ["점검", "기다림", "투자 평가", "성장 확인"],
  uprightMeaning: "가꾼 덩굴을 바라보며 평가하는 카드입니다. 수확 전 마지막 점검과 기다림의 시간입니다.",
  reversedMeaning: "조급함에 설익은 수확을 하거나, 헛수고로 느끼는 상태입니다.",
  loveMeaning: "관계의 성장을 점검하는 시기입니다. 조급해하지 마세요.",
  moneyMeaning: "투자의 중간 평가 시점입니다. 유지·확대·철수를 냉정히 판단하세요.",
  careerMeaning: "지금까지의 방식이 유효한지 돌아보기 좋은 때입니다.",
  relationshipMeaning: "공들인 관계가 무르익는 중입니다. 재촉하지 마세요.",
  healthMeaning: "관리의 효과가 나타나기 직전입니다. 지속하세요.",
  advice: "멈춰서 점검하는 것도 성장의 일부입니다.",
  warning: "결과가 늦다고 뿌리째 뽑아 확인하지 마세요.",
  todayFortune: {
    overall: "중간 점검에 좋은 날입니다. 방향을 확인하세요.",
    love: "관계의 온도를 차분히 돌아보게 됩니다.",
    money: "투자·적금 현황을 리뷰하기 좋은 날입니다.",
    work: "프로세스를 점검하면 개선점이 보입니다.",
    advice: "익을 때까지 기다리는 것도 실력입니다.",
    caution: "조급함이 다 된 농사를 망칩니다."
  },
  imagePrompt: "a farmer leaning on a hoe gazing at a vine heavy with seven pentacles"
},
{
  id: "pentacles-08", nameKo: "펜타클 8", nameEn: "Eight of Pentacles", arcana: "minor", suit: "pentacles", number: 8, element: "earth",
  keywords: ["숙련", "성실한 노력", "디테일", "장인의 길"],
  uprightMeaning: "묵묵히 동전을 새기는 장인의 카드입니다. 반복과 정진이 실력을 완성해갑니다.",
  reversedMeaning: "영혼 없는 반복, 완벽주의의 함정을 뜻합니다.",
  loveMeaning: "꾸준한 정성이 마음을 얻습니다. 화려함보다 성실함입니다.",
  moneyMeaning: "기술과 노동의 대가가 착실히 쌓이는 시기입니다.",
  careerMeaning: "실력을 갈고닦기 최적의 시기입니다. 배움에 투자하세요.",
  relationshipMeaning: "약속을 지키는 성실함이 신뢰의 바탕이 됩니다.",
  healthMeaning: "매일의 작은 루틴이 큰 차이를 만듭니다.",
  advice: "오늘 한 번 더 반복하는 사람이 결국 이깁니다.",
  warning: "일에 파묻혀 사람과 삶을 잊지 마세요.",
  todayFortune: {
    overall: "묵묵히 쌓는 하루가 미래의 밑천이 되는 날입니다.",
    love: "화려한 말보다 꾸준한 행동이 감동을 줍니다.",
    money: "기술·자격에 쓰는 돈은 아깝지 않습니다.",
    work: "디테일의 완성도가 실력을 증명합니다.",
    advice: "한 가지를 어제보다 조금 더 잘해보세요.",
    caution: "완벽주의로 마감을 넘기지 마세요."
  },
  imagePrompt: "a focused craftsman chiseling pentacles on a bench, finished coins displayed on a post"
},
{
  id: "pentacles-09", nameKo: "펜타클 9", nameEn: "Nine of Pentacles", arcana: "minor", suit: "pentacles", number: 9, element: "earth",
  keywords: ["자립", "풍요", "자기 보상", "우아한 여유"],
  uprightMeaning: "스스로 가꾼 정원에서 여유를 누리는 카드입니다. 혼자 힘으로 이룬 풍요와 품격입니다.",
  reversedMeaning: "과시 소비, 겉만 풍요로운 상태, 자립의 흔들림을 뜻합니다.",
  loveMeaning: "혼자서도 충분히 빛나는 사람에게 좋은 인연이 다가옵니다.",
  moneyMeaning: "노력의 결실을 누릴 자격이 있는 시기입니다. 자신에게 보상하세요.",
  careerMeaning: "독립적인 성과가 인정받습니다. 혼자 하는 일에 강합니다.",
  relationshipMeaning: "의존하지 않는 관계가 서로를 편하게 합니다.",
  healthMeaning: "자기 관리의 결과가 몸에 나타나는 시기입니다.",
  advice: "이룬 것을 스스로 인정하고 품위 있게 누리세요.",
  warning: "여유를 증명하려는 소비는 여유를 갉아먹습니다.",
  todayFortune: {
    overall: "혼자만의 여유가 달콤한 날입니다.",
    love: "자기 삶이 충실한 모습이 가장 매력적입니다.",
    money: "열심히 산 자신에게 적정선의 보상을 주세요.",
    work: "독립적으로 처리한 일이 좋은 평가를 받습니다.",
    advice: "나를 위한 시간을 당당하게 확보하세요.",
    caution: "보여주기용 지출은 공허함만 남깁니다."
  },
  imagePrompt: "an elegant woman in a vineyard garden with a hooded falcon, nine pentacles among vines"
},
{
  id: "pentacles-10", nameKo: "펜타클 10", nameEn: "Ten of Pentacles", arcana: "minor", suit: "pentacles", number: 10, element: "earth",
  keywords: ["유산", "가족의 안정", "장기 성과", "부의 완성"],
  uprightMeaning: "삼대가 함께하는 풍요의 카드입니다. 오래 쌓아온 것이 대를 잇는 안정으로 완성됩니다.",
  reversedMeaning: "가족 간 돈 문제, 안정의 균열, 단기적 시야를 뜻합니다.",
  loveMeaning: "가족이 되는 흐름의 사랑입니다. 안정과 결실이 보입니다.",
  moneyMeaning: "부동산·상속·장기 자산처럼 큰 단위의 재물운이 움직입니다.",
  careerMeaning: "조직의 기반이 되는 위치, 장기 근속의 결실을 뜻합니다.",
  relationshipMeaning: "가족·집안과 얽힌 일은 원칙과 배려를 함께 쓰세요.",
  healthMeaning: "집안 내력의 관리 포인트를 알아두면 좋습니다.",
  advice: "오늘의 결정을 10년 뒤 시점에서 바라보세요.",
  warning: "눈앞의 이익으로 오래 쌓은 신뢰를 팔지 마세요.",
  todayFortune: {
    overall: "든든한 기반이 느껴지는 안정의 날입니다.",
    love: "가족에게 소개하거나 미래를 논하기 좋은 흐름입니다.",
    money: "장기 자산 계획을 세우기 최적의 날입니다.",
    work: "안정적인 조직·거래처와의 일이 잘 풀립니다.",
    advice: "오래갈 것에 시간과 돈을 쓰세요.",
    caution: "가족 간 돈 얘기는 문서로 명확히 하세요."
  },
  imagePrompt: "an elderly patriarch with dogs watching a family under an ornate archway, ten pentacles pattern"
},
{
  id: "pentacles-11-page", nameKo: "펜타클 시종", nameEn: "Page of Pentacles", arcana: "minor", suit: "pentacles", number: "page", element: "earth",
  keywords: ["배움", "실용적 기회", "성실한 시작", "공부운"],
  uprightMeaning: "동전을 골똘히 들여다보는 학생의 카드입니다. 배움과 실용적인 기회가 미래의 자산이 됩니다.",
  reversedMeaning: "배움의 정체, 미루는 습관, 흐지부지되는 계획을 뜻합니다.",
  loveMeaning: "천천히 알아가는 신중한 시작이 어울리는 시기입니다.",
  moneyMeaning: "재테크 공부를 시작하기 좋은 때입니다. 아는 만큼 모입니다.",
  careerMeaning: "자격증·교육·인턴처럼 미래를 위한 준비에 좋습니다.",
  relationshipMeaning: "배울 점이 있는 사람과의 만남이 성장을 만듭니다.",
  healthMeaning: "몸에 대해 공부하고 기록하는 습관이 큰 자산이 됩니다.",
  advice: "지금 배우는 것이 3년 뒤 수입이 됩니다.",
  warning: "계획만 세우고 시작을 미루는 패턴을 끊으세요.",
  todayFortune: {
    overall: "배움에 최적화된 날입니다. 습득이 빠릅니다.",
    love: "진중한 관심 표현이 좋은 인상을 남깁니다.",
    money: "경제 기사 하나, 강의 하나가 미래의 밑천입니다.",
    work: "새 기술 습득이 순조로운 날입니다.",
    advice: "메모하고 복습하세요. 오늘 배운 게 오래갑니다.",
    caution: "'내일부터'는 오늘의 적입니다."
  },
  imagePrompt: "a studious young page in a green field holding up a golden pentacle with both hands"
},
{
  id: "pentacles-12-knight", nameKo: "펜타클 기사", nameEn: "Knight of Pentacles", arcana: "minor", suit: "pentacles", number: "knight", element: "earth",
  keywords: ["꾸준함", "근면", "신중한 전진", "느리지만 확실"],
  uprightMeaning: "멈춘 듯 보여도 반드시 도착하는 기사의 카드입니다. 성실과 꾸준함이 가장 빠른 길임을 보여줍니다.",
  reversedMeaning: "지루한 정체, 변화 거부, 관성적인 반복을 뜻합니다.",
  loveMeaning: "느리지만 진심인 사람, 오래가는 관계의 흐름입니다.",
  moneyMeaning: "적립식·장기 투자처럼 꾸준한 방식이 승리합니다.",
  careerMeaning: "묵묵한 수행이 신뢰를 쌓아 기회로 돌아옵니다.",
  relationshipMeaning: "말보다 행동으로 증명하는 신뢰가 만들어집니다.",
  healthMeaning: "격하지 않아도 매일 하는 운동이 답입니다.",
  advice: "속도를 의심하지 마세요. 방향이 맞으면 도착합니다.",
  warning: "성실이 고집이 되면 변화의 기회를 놓칩니다.",
  todayFortune: {
    overall: "묵묵히 해내는 것이 돋보이는 날입니다.",
    love: "화려한 이벤트보다 변함없는 태도가 신뢰를 줍니다.",
    money: "자동이체 저축 설정처럼 시스템을 만들기 좋습니다.",
    work: "루틴 업무의 완성도가 평가로 이어집니다.",
    advice: "어제 한 것을 오늘도 하세요. 그게 실력입니다.",
    caution: "느린 것과 미루는 것을 혼동하지 마세요."
  },
  imagePrompt: "a steadfast knight on a heavy standing draft horse in a plowed field, holding a pentacle"
},
{
  id: "pentacles-13-queen", nameKo: "펜타클 여왕", nameEn: "Queen of Pentacles", arcana: "minor", suit: "pentacles", number: "queen", element: "earth",
  keywords: ["실속", "보살핌", "현실적 풍요", "안살림의 힘"],
  uprightMeaning: "풍요로운 정원의 여왕입니다. 현실적인 살림 능력과 따뜻한 보살핌이 조화를 이룹니다.",
  reversedMeaning: "일과 돌봄 사이의 과부하, 물질 중심의 시야를 뜻합니다.",
  loveMeaning: "편안하고 실속 있는 사랑, 함께 있으면 안정되는 관계입니다.",
  moneyMeaning: "알뜰한 관리로 자산을 불리는 시기입니다. 살림의 고수가 됩니다.",
  careerMeaning: "실무와 관리 능력이 조직의 신뢰를 얻습니다.",
  relationshipMeaning: "챙겨주는 마음이 관계의 구심점이 됩니다.",
  healthMeaning: "먹는 것과 쉬는 것, 기본을 챙기는 것이 최고의 관리입니다.",
  advice: "현실을 돌보는 손이 곧 사랑의 언어입니다.",
  warning: "모두를 챙기다 자신의 통장과 체력이 비지 않게 하세요.",
  todayFortune: {
    overall: "실속을 챙기는 감각이 빛나는 날입니다.",
    love: "밥 한 끼 잘 챙겨주는 것이 최고의 표현입니다.",
    money: "가성비를 보는 눈이 정확한 날입니다. 장보기에 좋습니다.",
    work: "안살림 같은 궂은일이 결국 인정받습니다.",
    advice: "나를 챙기는 것도 살림의 일부입니다.",
    caution: "퍼주기만 하는 소비 습관을 점검하세요."
  },
  imagePrompt: "a nurturing queen on a garden throne holding a pentacle, rabbit nearby, roses overhead"
},
{
  id: "pentacles-14-king", nameKo: "펜타클 왕", nameEn: "King of Pentacles", arcana: "minor", suit: "pentacles", number: "king", element: "earth",
  keywords: ["성공", "재정적 안정", "신뢰", "부의 왕"],
  uprightMeaning: "포도 넝쿨 옥좌에 앉은 부의 왕입니다. 쌓아온 신뢰와 자산이 흔들리지 않는 기반이 됩니다.",
  reversedMeaning: "물질 집착, 완고함, 겉치레 성공을 뜻합니다.",
  loveMeaning: "든든하고 안정적인 사랑, 책임지는 관계의 흐름입니다.",
  moneyMeaning: "자산 운용의 절정기입니다. 큰 결정도 무게 있게 해낼 수 있습니다.",
  careerMeaning: "사업·경영·총괄의 자리에서 성과가 완성됩니다.",
  relationshipMeaning: "믿고 맡길 수 있는 사람이라는 평판이 힘이 됩니다.",
  healthMeaning: "안정 속에서 몸을 돌보는 여유를 가지세요.",
  advice: "쌓은 것을 지키면서 다음 세대를 위한 그림도 그리세요.",
  warning: "돈으로 다 해결하려는 순간 사람이 떠납니다.",
  todayFortune: {
    overall: "무게감 있는 결정에 어울리는 날입니다.",
    love: "든든한 어른의 매력이 통하는 날입니다.",
    money: "굵직한 재정 결정을 내리기에 좋은 흐름입니다.",
    work: "책임지는 자세가 큰 신뢰로 돌아옵니다.",
    advice: "여유가 있다면 베푸세요. 격이 올라갑니다.",
    caution: "돈 자랑은 오늘의 금기입니다."
  },
  imagePrompt: "a prosperous king on a throne carved with bulls, grapevine robe, castle and golden city behind"
}
];

// 전체 덱
export const ALL_CARDS: TarotCard[] = [
  ...MAJOR_ARCANA, ...WANDS, ...CUPS, ...SWORDS, ...PENTACLES
]; // 총 78장
```

---

## 10. 오늘의 타로에서 사용하는 방식

`01_project.md` §4를 구현하는 데이터 소비 규칙이다. **API를 쓰지 않는다.**

1. **후보 9장 선정**: `seed = hash(YYYY-MM-DD + userId)` 기반 셔플에서 상위 9장. 같은 날 같은 사용자는 항상 같은 후보를 본다.
2. **선택과 렌더**: 사용자가 1장을 고르면 그 카드의 `todayFortune` 6개 필드를 결과 화면 항목(전체운/연애운/재물운/일·직장운/조언/주의할 점)에 그대로 렌더한다. 카드명은 `nameKo — nameEn` 형식.
3. **변주(단조로움 방지)**: 결과 상단 리드 문장 1개를 시드 기반으로 원소별 문장 풀(fire/water/air/earth × 3종)에서 선택해 붙인다. 문장 풀은 `03_tarot_engine.md`에서 정의.
4. **캐시**: 결과는 `tarot_daily_v1:{userId}:{date}`에 저장하고 재진입 시 그대로 복원한다.
5. 오늘의 타로는 **정방향만** 사용하므로 `reversedMeaning`을 읽지 않는다.

## 11. 향후 이미지 연결 방식

- 초기 버전: 카드 앞면은 CSS/SVG 구성 (`01_project.md` §10.4). `imageUrl`은 비워둔다.
- 이미지 도입 시: `imagePrompt + ", " + TAROT_IMAGE_STYLE`로 생성한 일러스트를 `assets/tarot/{id}.webp`로 저장하고 `imageUrl`에 경로를 기입한다.
- 렌더 규칙: `imageUrl`이 있으면 이미지 카드 + 하단 글래스 오버레이(가독성), 없으면 기존 CSS 구성. **필드 유무만으로 분기**하므로 점진적 교체(메이저 22장 먼저 등)가 가능하다.
- 로딩: `loading="lazy"` + 카드 뒷면을 placeholder로 사용.

## 12. 데이터 확장 규칙

1. **id는 불변이다.** 결과 저장·캐시·이미지 파일명이 모두 id를 참조하므로 절대 바꾸지 않는다.
2. 새 필드는 **optional로만** 추가한다 (기존 저장 데이터와의 호환).
3. 문구 수정은 이 데이터 파일에서만 한다. UI·엔진에 해석 문자열을 하드코딩하지 않는다.
4. 문체는 §3 기준을 따른다. 수정 시에도 단정·공포 표현 금지.
5. i18n: 카드 텍스트는 기존 앱의 API 번역 파이프라인 대상으로 취급한다 (`nameEn`은 번역하지 않음). 정적 UI 라벨만 `STATIC_I18N` 등록.
6. 덱 검증: 빌드 시 `ALL_CARDS.length === 78`, id 중복 없음, 필수 필드 누락 없음을 콘솔 체크하는 간단한 검증 함수를 `tarot-cards.js` 말미에 포함한다.

```ts
export function validateDeck(cards: TarotCard[]): string[] {
  const errors: string[] = [];
  if (cards.length !== 78) errors.push(`카드 수 ${cards.length} ≠ 78`);
  const ids = new Set<string>();
  for (const c of cards) {
    if (ids.has(c.id)) errors.push(`중복 id: ${c.id}`);
    ids.add(c.id);
    for (const k of ["nameKo","uprightMeaning","reversedMeaning","loveMeaning","moneyMeaning",
                     "careerMeaning","relationshipMeaning","healthMeaning","advice","warning"] as const) {
      if (!c[k]) errors.push(`${c.id}: ${k} 누락`);
    }
    if (!c.todayFortune || Object.values(c.todayFortune).some(v => !v)) errors.push(`${c.id}: todayFortune 불완전`);
  }
  return errors;
}
```
