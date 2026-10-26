// ── 프리미엄 PDF 리포트 — 14개 주제 템플릿에 맞춰 풀이를 채워 A4 보고서로 만든다 ──
// 풀이 결제와 별도 상품(pdf-<카테고리>)이다. index.html의 downloadReportPdf()가 결제를 확인한 뒤 이 파일을 불러 쓴다.
// 구성: 표지 → 차례 → 기본 정보 → 한눈에 보기 → 템플릿의 장(도표 + 소제목 풀이) → 종합 정리 → 상세 풀이(화면 풀이 전문).
// 소제목 풀이와 표 칸은 AI가 쓰고(report-tpl), 실패한 칸은 화면 풀이 문장으로 채운다. 이름은 AI에 보내지 않는다.
(function(){
'use strict';
const RP_BRAND='천지인 사주';
const RP_W=794,RP_H=1123,RP_MAX_CHARS=58000;
const RP_VERSION='v1',RP_SAFE=26;

// ── 템플릿 스펙 ──
// 장(page): ey 눈썹 글(없으면 '번호 / 영문 제목'), t 제목, sub 고정 부제(없으면 AI), vis 도표, h 소제목
const STEPS={child:['관찰하기','물어보기','환경 조정','다시 보기'],name:['뜻 정리','후보 비교','사용 확인','최종 선택'],children:['생각 나누기','생활 준비','정보 확인','계획 조정'],reunion:['관계 경과','현재 의사','대화 여부','나의 선택'],study:['개념 이해','적용 연습','점검과 복습','마무리'],health:['기록하기','부담 확인','습관 조정','유지하기'],life:['성장','독립','확장','전환']};
const GL_DEFAULT=['타고난 방식','지금의 변화','실천할 방향'];
const NOTE_DEFAULT='전통적 해석을 자기이해와 선택의 참고로 읽어요. 실제 경험과 지금의 여건을 함께 살피고, 태어난 시간을 모르면 그 범위를 따로 알려 드려요.';
const SPECS={
  life:{name:'인생총운',file:'인생총운',en:'LIFETIME READING',kicker:'나의 사주',sub:'타고난 기질부터 인생의 전환기까지 읽는 평생 보고서',accent:'#7f8d6d',
    info:['현재 관심사','삶의 주요 변화'],glanceQ:'내 삶을 관통하는 강점과 성장의 과제는 무엇일까요?',
    pages:[
      {ey:'LIFE READING MAP',t:'인생의 주요 영역',sub:'인생 전반의 주제를 한 장으로 연결해요.',vis:'radar',h:['먼저 읽어볼 영역','삶의 균형을 잡는 조건']},
      {no:1,t:'사주의 기본 구조',vis:'pillars',h:['일간과 태어난 계절','오행과 십성의 특징','전체 명식에서 중요한 연결']},
      {no:2,t:'성격과 재능',vis:'sliders:persona',h:['겉으로 보이는 모습과 내면','판단과 실행의 방식','강점이 발휘되는 환경']},
      {no:3,t:'인생의 시기별 흐름',vis:'steps:life',h:['성장과 독립의 과정','삶의 확장과 책임','후반부의 가치와 생활']},
      {ey:'LIFE CHAPTERS 1',t:'성장과 독립의 흐름',sub:'@early',vis:'theme:sprout',h:['초년의 환경과 기질','청년기의 선택과 독립','경험을 통해 형성하는 기준']},
      {ey:'LIFE CHAPTERS 2',t:'삶의 확장과 후반부',sub:'@late',vis:'theme:book',h:['중년기의 역할과 책임','후반부에 중요해지는 가치','오래 유지할 삶의 기반']},
      {no:4,t:'대운과 전환기',vis:'line:daeun',h:['현재 대운의 주요 주제','이전 시기와 달라지는 점','전환기에 준비할 일']},
      {ey:'LONG TERM FLOW',t:'장기 흐름과 준비',sub:'시기의 변화와 생활의 준비를 함께 정리해요.',vis:'line:years6',h:['기회를 활용하는 조건','기반을 다지는 선택','다음 시기를 위한 준비']},
      {no:5,t:'연애와 가족의 흐름',vis:'situ',h:['사랑을 주고받는 방식','공동생활에서 중요한 조건','가족과 개인 생활의 균형']},
      {no:6,t:'재물과 직업의 흐름',vis:'check',h:['수입을 만드는 역량','지출과 관리의 습관','경력을 쌓아가는 방향']},
      {no:7,t:'관계와 생활의 균형',h:['도움을 주고받는 관계','에너지를 쓰고 회복하는 방식','환경 변화에 적응하는 방법']}]},
  newyear:{name:'신년운세',file:'신년운세',en:'YEAR AHEAD',kicker:'다가오는 한 해',sub:'한 해의 큰 방향과 월별 선택을 정리하는 연간 보고서',accent:'#a48b55',
    info:['운세 대상 연도','올해의 주요 계획'],glanceQ:'@nyq',
    pages:[
      {ey:'01 / YEAR AND NATAL CHART',t:'올해의 기운과 내 사주',sub:'@nysub',vis:'pillars',h:['세운과 원국의 관계','현재 대운과 겹치는 주제']},
      {ey:'02 / YEARLY RHYTHM',t:'한 해의 리듬',sub:'한 해의 주요 변화와 선택의 기준을 정리해요.',vis:'line:nyMonths',h:['확장과 기회의 흐름','정리와 조절의 흐름','한 해를 운영할 기준']},
      {ey:'03 / FOUR SEASONS',t:'분기별 흐름',sub:'네 구간으로 나누어 한 해의 리듬을 읽어요.',vis:'quarters',h:[]},
      {ey:'04 / MONTH BY MONTH',t:'1월부터 3월까지',sub:'월별 운세를 실제 일정과 생활 속 선택에 연결해요.',vis:'months:1',h:[]},
      {ey:'04 / MONTH BY MONTH',t:'4월부터 6월까지',sub:'월별 운세를 실제 일정과 생활 속 선택에 연결해요.',vis:'months:4',h:[]},
      {ey:'04 / MONTH BY MONTH',t:'7월부터 9월까지',sub:'월별 운세를 실제 일정과 생활 속 선택에 연결해요.',vis:'months:7',h:[]},
      {ey:'04 / MONTH BY MONTH',t:'10월부터 12월까지',sub:'월별 운세를 실제 일정과 생활 속 선택에 연결해요.',vis:'months:10',h:[]},
      {ey:'05 / YEAR IN PRACTICE',t:'주제별 올해의 운세',sub:'올해의 과제를 생활의 언어로 정리해요.',h:['관계와 가족의 변화','재물과 직업의 과제','학습과 생활 균형']},
      {ey:'05 / YEAR IN PRACTICE',t:'올해의 결정과 실행',sub:'올해의 과제를 생활의 언어로 정리해요.',h:['새로 시작할 일','꾸준히 유지할 일','연말에 돌아볼 기준']}]},
  gunghap:{name:'궁합',file:'궁합',en:'TWO PEOPLE ONE RELATIONSHIP',kicker:'두 사람의',sub:'두 사람의 차이와 보완점을 함께 읽는 관계 보고서',accent:'#9f7e83',
    info:['관계의 형태','관계 기간과 현재 상황'],pair:true,glanceQ:'우리의 공통점과 차이는 어떤 관계를 만들어갈까요?',glance:['공통점과 보완점','조율할 차이','함께 나눌 대화'],
    pages:[
      {no:1,t:'두 사람의 명식 비교',vis:'pillarsAB',h:['각자의 일간과 기질','오행의 공통점과 차이','서로를 보완하는 조건']},
      {no:2,t:'감정과 소통의 궁합',vis:'theme:couple',h:['애정 표현의 차이','감정을 확인하는 대화','갈등이 시작되는 상황']},
      {no:3,t:'생활과 가치관의 궁합',vis:'pair',h:['돈과 소비의 기준','일과 개인 시간의 배분','가족과의 거리 조절']},
      {no:4,t:'관계의 시기별 흐름',vis:'line:pairYears',h:['각자의 변화가 겹치는 때','관계의 속도를 맞추는 방법','함께 준비할 선택']},
      {no:5,t:'갈등을 조정하는 방식',vis:'situ',h:['반복되는 반응의 차이','서로 부탁할 수 있는 행동','갈등 후 관계를 회복하는 방법']},
      {no:6,t:'두 사람이 나눌 대화',vis:'talk',h:['함께 지킬 약속','기대를 확인할 질문','서로의 선택을 존중하는 기준']},
      {no:7,t:'함께 살아갈 때의 과제',h:['책임과 역할의 배분','환경 변화에 대한 대응','관계를 오래 유지할 생활 습관']}]},
  name:{name:'이름풀이 · 작명',file:'이름풀이',en:'NAME MEANING AND NAMING',kicker:'이름에 담는 의미',sub:'기존 이름의 의미와 후보 이름을 비교하는 이름 보고서',accent:'#9b8164',
    info:['요청 구분','현재 이름과 정확한 한자','작명 선호와 조건'],note:'정확한 한자와 획수·성명학 기준을 함께 확인해요. 후보의 뜻과 발음은 실제로 부를 때의 느낌과 함께 살펴요.',glanceQ:'이름에 담고 싶은 뜻과 부르기 좋은 소리는 무엇일까요?',glance:['이름에 담고 싶은 뜻','비교할 후보의 특징','선택 전 확인 사항'],
    pages:[
      {no:1,t:'이름풀이의 기준',vis:'pillars',h:['적용하는 성명학 체계','획수와 오행의 산정 기준','한글 이름의 해석 범위']},
      {no:2,t:'기존 이름의 뜻과 소리',vis:'nameBoxes',h:['각 글자의 정확한 의미','이름 전체의 의미 연결','발음과 전달되는 인상']},
      {no:3,t:'사주와 이름의 관계',vis:'steps:name',h:['확인된 명식의 주요 특징','이름과 연결해 읽는 관점','해석 기준의 범위와 차이']},
      {no:4,t:'후보 이름 비교',vis:'candidates',h:['뜻과 발음의 조화','사주와 연결한 해석','일상에서 부르기 쉬운 정도']},
      {no:5,t:'후보별 상세 풀이',vis:'situ',h:['후보 1의 의미와 특징','후보 2의 의미와 특징','후보 3의 의미와 특징']},
      {no:6,t:'선택 전 확인 사항',vis:'nameCheck',h:['정확한 글자와 뜻 확인','본인과 가족의 선호','공식 사용 관련 확인 사항']},
      {no:7,t:'최종 의견과 선택',h:['우선 검토할 후보와 이유','남은 확인 사항','본인이 중요하게 생각할 기준']}]},
  ziwei:{name:'자미두수',file:'자미두수',en:'ZI WEI DOU SHU',kicker:'별과 삶의 흐름',sub:'명반의 궁과 별을 연결해 읽는 별자리 명반 보고서',accent:'#7c7399',
    info:['음력 및 윤달 정보','명반 산출 및 해석 기준','명궁 · 신궁 · 오행국'],note:'음력 생일과 태어난 시로 12궁을 세우고 14개 주성을 배치했어요. 태어난 시간을 모르면 궁의 위치가 달라질 수 있어요.',glanceQ:'나의 명반에서 궁과 별은 어떤 삶의 주제를 보여줄까요?',glance:['명반의 주요 특징','먼저 읽을 궁','현재 시기의 주제'],
    pages:[
      {ey:'01 / NATAL PALACE CHART',t:'나의 자미두수 명반',sub:'음력 생일과 태어난 시로 배치한 12궁과 14주성이에요.',vis:'zwChart',h:[]},
      {no:2,t:'명궁과 신궁',vis:'zwTheme',h:['명궁의 주요 별과 특징','신궁이 위치한 궁의 의미','명반을 관통하는 핵심 주제']},
      {no:3,t:'주성과 보조성',vis:'zwStars',h:['주요 별의 배치','궁 안에서 함께 보는 요소','별의 조합을 해석하는 기준']},
      {no:4,t:'사화의 연결',vis:'zwSihua',h:['화록과 화권의 작용','화과와 화기의 작용','적용한 사화표와 해석 범위']},
      {no:5,t:'관계와 가족의 궁',h:['부부궁과 친밀한 관계','부모궁과 가족의 기대','자녀궁과 관계의 관점']},
      {no:6,t:'일과 재물의 궁',h:['관록궁과 사회적 역할','재백궁과 돈의 태도','전택궁과 생활 기반']},
      {no:7,t:'생활과 외부 환경의 궁',h:['복덕궁과 내면의 생활','천이궁과 환경 변화','교우궁과 함께하는 사람']},
      {no:8,t:'대한과 유년의 흐름',vis:'zwDecades',h:['현재 대한의 주요 주제','대상 유년의 변화','전환기에 준비할 일']},
      {ey:'PALACE INDEX',t:'12궁 풀이 요약',sub:'각 궁의 해석을 한 장에서 찾아볼 수 있게 정리했어요.',vis:'zwIndex',h:[]}]},
  'topic-love':{name:'연애운',file:'연애운',en:'LOVE AND CONNECTION',kicker:'나의 사랑',sub:'매력과 만남의 방식에서 관계의 성장까지 읽는 보고서',accent:'#b68081',
    info:['현재 관계 상황','연애에서 궁금한 점'],glanceQ:'나는 어떤 사랑에 편안해지고 어떤 만남에서 성장할까요?',
    pages:[
      {no:1,t:'나의 연애 기질',vis:'pillars',h:['호감을 느끼는 조건','사랑을 표현하는 방식','관계가 깊어지는 속도']},
      {no:2,t:'매력과 인연의 환경',vis:'theme:couple',h:['자연스럽게 드러나는 매력','편안한 만남의 환경','새로운 인연을 넓히는 행동']},
      {no:3,t:'잘 맞는 상대의 조건',vis:'sliders:love',h:['가치관과 생활의 조화','정서적 안정에 필요한 대화','장기적인 관계의 조건']},
      {no:4,t:'시기별 관계 흐름',vis:'line:years',h:['관심과 만남의 변화','관계를 진전시키는 조건','속도를 조절할 때']},
      {no:5,t:'연애에서 반복되는 과제',vis:'situ',h:['기대와 실제의 차이','갈등에 반응하는 습관','자기 기준을 지키는 방법']},
      {no:6,t:'현재 상황에 따른 풀이',vis:'check',h:['비연애일 때의 준비','연애 중에 확인할 대화','관계의 방향을 정하는 기준']},
      {no:7,t:'사랑을 위한 실천',h:['나의 감정을 확인하기','상대의 의사를 묻기','편안한 경계를 만들기']}]},
  'topic-money':{name:'재물운',file:'재물운',en:'MONEY AND RESOURCES',kicker:'돈과 나의 흐름',sub:'수입과 소비의 습관을 시기별 흐름과 연결하는 보고서',accent:'#9e8c55',
    info:['현재 수입 및 업무 형태','재물 관련 관심사'],note:'특정 상품이나 투자를 권하지 않아요. 큰 결정은 실제 수입·비용 자료와 전문가의 확인을 함께 보세요.',glanceQ:'돈을 만들고 지키는 나의 강점은 무엇일까요?',
    pages:[
      {no:1,t:'재물에 대한 기본 성향',vis:'pillars',h:['돈에 부여하는 의미','수입을 만드는 강점','성과와 안정 사이의 기준']},
      {no:2,t:'수입과 일의 연결',vis:'theme:coins',h:['역량이 수입으로 이어지는 조건','직장과 독립 업무의 차이','협업과 고객 관계의 역할']},
      {no:3,t:'소비와 관리의 패턴',vis:'sliders:money',h:['지출이 늘어나는 상황','관계와 감정이 소비에 미치는 영향','지속 가능한 관리 습관']},
      {no:4,t:'시기별 재물 흐름',vis:'line:years',h:['활동과 기회가 늘어나는 때','지출과 책임을 점검할 때','장기적으로 쌓을 기반']},
      {no:5,t:'사업과 협업의 조건',vis:'situ',h:['운영과 실행의 강점','동업에서 합의할 사항','계약과 역할을 확인하는 기준']},
      {no:6,t:'재물 선택의 판단 기준',vis:'check',h:['확인할 수입과 비용','감당 가능한 부담의 범위','결정 전에 검토할 현실 정보']},
      {no:7,t:'실천과 점검',h:['지출 기준 정리','현금 흐름 기록','정기적으로 돌아볼 항목']}]},
  'topic-career':{name:'직업운',file:'직업운',en:'CAREER AND WORK',kicker:'일과 나의 방향',sub:'업무 적성과 경력의 방향을 함께 설계하는 보고서',accent:'#658783',
    info:['현재 직무와 경력 단계','앞으로의 관심 방향'],glanceQ:'내 강점은 어떤 일과 환경에서 성과로 이어질까요?',
    pages:[
      {no:1,t:'일에서 중요하게 여기는 것',vis:'pillars',h:['안정과 자율성의 기준','전문성과 성취의 방식','일을 지속하게 하는 동기']},
      {no:2,t:'잘 맞는 업무와 역할',vis:'theme:laptop',h:['분석과 실행의 강점','표현과 협업의 방식','관리와 책임을 맡는 조건']},
      {no:3,t:'조직과 환경의 적합성',vis:'sliders:career',h:['의사결정과 평가 방식','업무 속도와 자율성','관계와 소통의 환경']},
      {no:4,t:'경력의 시기별 변화',vis:'line:years',h:['역할을 넓히는 흐름','전환을 준비하는 흐름','기반을 다지는 흐름']},
      {no:5,t:'이직과 독립의 준비',vis:'situ',h:['현재 경험에서 가져갈 역량','새 환경에서 확인할 조건','전환의 비용과 생활 기반']},
      {no:6,t:'경력 개발 계획',vis:'check',h:['지금 보완할 기술과 지식','경험을 보여줄 결과물','도움을 받을 사람과 경로']},
      {no:7,t:'일과 생활의 균형',h:['성과와 부담을 점검하기','지속 가능한 일의 범위','장기적으로 남길 전문성']}]},
  'topic-marriage':{name:'결혼운',file:'결혼운',en:'MARRIAGE AND SHARED LIFE',kicker:'함께하는 삶',sub:'배우자 관계와 공동생활의 조건을 살펴보는 보고서',accent:'#a58b67',
    info:['현재 혼인 및 관계 상황','공동생활의 관심사'],glanceQ:'함께 살아가는 삶에서 나에게 중요한 조건은 무엇일까요?',
    pages:[
      {no:1,t:'결혼과 관계의 기본 성향',vis:'pillars',h:['동반자에게 기대하는 것','애정과 책임을 표현하는 방식','공동생활에 필요한 개인 시간']},
      {no:2,t:'배우자 관계의 조건',vis:'theme:house',h:['성격과 가치관의 조화','대화와 의사결정의 방식','상호 존중이 필요한 부분']},
      {no:3,t:'돈과 생활의 합의',vis:'sliders:marriage',h:['공동 지출과 개인 지출','집안일과 돌봄의 배분','주거와 일의 균형']},
      {no:4,t:'시기별 결혼 주제',vis:'line:years',h:['관계의 진전과 생활 변화','결혼 준비에 필요한 여건','기혼자의 역할 변화']},
      {no:5,t:'양가와 가족의 경계',vis:'situ',h:['가족의 기대를 조율하기','함께 결정할 일 구분하기','부부의 생활 기준 만들기']},
      {no:6,t:'결혼 전후의 대화',vis:'talk',h:['서로 원하는 생활 확인','자녀 계획과 선택의 존중','갈등을 다루는 약속']},
      {no:7,t:'오래 함께하기 위한 습관',h:['생활 변화를 점검하는 시간','개인의 성장을 응원하는 방법','신뢰를 유지하는 행동']}]},
  'topic-reunion':{name:'재회운',file:'재회운',en:'RECONNECTION AND CHOICE',kicker:'다시 생각하는 관계',sub:'관계의 경과와 현재의 선택을 차분히 살펴보는 보고서',accent:'#838a9c',
    info:['이별 또는 거리 두기 시점','현재 연락 상태','다시 생각하는 이유'],note:'상대의 생각이나 재회 여부를 확정하지 않아요. 확인된 관계 상황과 상대가 표현한 뜻을 바탕으로 선택지를 살펴요.',glanceQ:'이 관계를 다시 생각할 때 무엇을 먼저 확인해야 할까요?',glance:['확인된 현재 상황','내가 선택할 수 있는 일','존중해야 할 경계'],
    pages:[
      {no:1,t:'관계의 경과 정리',vis:'pillars',h:['좋았던 경험과 반복된 갈등','확인된 이별의 이유','현재의 상황과 나의 감정']},
      {no:2,t:'관계 패턴의 이해',vis:'theme:nodes',h:['가까워지고 멀어지는 방식','기대와 표현의 차이','변화가 필요한 행동']},
      {no:3,t:'현재의 선택지',vis:'steps:reunion',h:['대화를 고려할 때','시간과 거리를 둘 때','관계를 정리하는 선택']},
      {no:4,t:'시기와 감정의 변화',vis:'line:years',h:['나의 생활과 감정의 흐름','선택을 서두르지 않을 기준','다시 대화하기 위한 준비']},
      {no:5,t:'대화를 준비한다면',vis:'situ',h:['대화의 목적 정리','서로의 의사를 확인하는 질문','거절과 무응답을 존중하는 방법']},
      {no:6,t:'관계를 다시 시작한다면',vis:'talk',h:['달라져야 할 행동','확인할 생활과 관계의 조건','같은 갈등을 줄이는 약속']},
      {no:7,t:'나의 생활을 회복하는 계획',h:['일상과 관계의 균형','나를 지지하는 사람과 활동','앞으로의 선택 기준']}]},
  'topic-study':{name:'학업 · 시험운',file:'학업시험운',en:'STUDY AND EXAM',kicker:'배움과 준비',sub:'학습 성향과 시험 준비의 실행을 연결하는 보고서',accent:'#6c83a0',
    info:['학업 또는 시험 목표','시험 및 목표 일정','현재 준비 상황'],glanceQ:'나는 어떤 방식으로 배우고 준비할 때 집중할 수 있을까요?',
    pages:[
      {no:1,t:'나의 학습 성향',vis:'pillars',h:['정보를 이해하는 방식','기억과 복습의 습관','집중에 도움이 되는 환경']},
      {no:2,t:'과목과 공부 방법',vis:'theme:book',h:['강점이 드러나는 학습 과제','어려움을 느끼는 조건','설명과 문제 풀이의 균형']},
      {no:3,t:'시험 상황의 반응',vis:'steps:study',h:['시간 압박과 긴장','실수와 피드백을 다루는 방법','시험 전후의 생활 리듬']},
      {no:4,t:'준비 일정과 흐름',vis:'line:months6',h:['기본 개념을 쌓는 구간','적용과 연습을 늘리는 구간','마무리와 컨디션 점검']},
      {no:5,t:'학습 환경의 조정',vis:'situ',h:['공부 시간과 쉬는 시간','도움을 요청할 부분','디지털 환경과 방해 요소']},
      {no:6,t:'주간 학습 계획',vis:'week:study',h:['이번 주의 핵심 목표','복습과 연습의 배치','학습 뒤 확인할 결과']},
      {no:7,t:'결과를 다음 준비로 연결하기',h:['확인된 성취와 어려움','바꿀 공부 방식','다음 목표의 준비']}]},
  'topic-child':{name:'우리 아이 사주',file:'우리아이사주',en:'UNDERSTANDING YOUR CHILD',kicker:'아이를 이해하는 시간',sub:'아이의 기질을 관찰과 양육의 언어로 풀어내는 보고서',accent:'#8a9d70',
    info:['아이의 현재 연령','보호자와 양육 환경','관찰된 관심과 어려움'],note:'아이의 실제 행동과 자라는 단계에 맞춰 읽어요. 능력과 진로를 정해 두지 않고, 관찰과 양육 환경의 참고로 써 주세요.',glanceQ:'우리 아이가 편안하게 자라고 배우는 조건은 무엇일까요?',glance:['관찰된 강점','편안해지는 환경','양육에서 시도할 행동'],
    pages:[
      {no:1,t:'아이의 기질과 반응',vis:'pillars',h:['새로운 환경에 적응하는 방식','감정을 표현하는 모습','활동과 휴식의 균형']},
      {no:2,t:'강점과 관심을 발견하기',vis:'theme:house',h:['자연스럽게 즐기는 활동','호기심이 이어지는 조건','시도와 실패를 격려하는 방법']},
      {no:3,t:'학습과 놀이의 환경',vis:'steps:child',h:['설명과 경험을 받아들이는 방식','집중과 쉬는 시간의 배치','결과보다 과정을 관찰하기']},
      {no:4,t:'성장 단계의 변화',vis:'line:years',h:['현재 생활 단계에서의 과제','새 환경에 적응하는 준비','아이의 속도를 존중하는 기준']},
      {no:5,t:'부모와 아이의 소통',vis:'situ',h:['아이의 감정을 확인하기','선택과 규칙을 설명하기','보호자의 기대를 조정하기']},
      {no:6,t:'친구와 사회적 관계',vis:'childObs',h:['함께 노는 방식','갈등에서 필요한 도움','안전하고 편안한 경계']},
      {no:7,t:'양육 관찰과 실천',h:['이번 주에 관찰할 상황','아이에게 물어볼 질문','양육 환경에서 바꿀 한 가지']}]},
  'topic-children':{name:'자녀(임신)운',file:'자녀임신운',en:'PARENTHOOD AND FAMILY PLANNING',kicker:'가족을 생각하는 시간',sub:'자녀에 대한 가치관과 가족의 준비를 함께 살펴보는 보고서',accent:'#ae8b86',
    info:['현재 가족과 계획 상황','자녀 계획에 대한 생각','함께 검토할 생활 여건'],note:'임신 가능성이나 태아의 성별은 판단하지 않아요. 자녀와의 인연이 무르익는 흐름과 생활 준비를 중심으로 썼어요.',glanceQ:'자녀와 가족의 미래를 생각할 때 어떤 준비가 필요할까요?',glance:['가족에 대한 생각','함께 준비할 생활','먼저 확인할 정보'],
    pages:[
      {no:1,t:'자녀와 양육에 대한 가치관',vis:'pillars',h:['아이와 관계 맺는 방식','보호와 자율성의 균형','부모 역할에 대한 기대']},
      {no:2,t:'가족 계획과 대화',vis:'theme:house',h:['각자가 바라는 생활','서로의 선택을 확인하는 질문','기대와 부담을 나누기']},
      {no:3,t:'생활 기반의 준비',vis:'steps:children',h:['일과 돌봄 시간의 조정','경제적 준비와 지원 환경','도움을 요청할 수 있는 관계']},
      {no:4,t:'가족 변화의 흐름',vis:'line:years',h:['생활의 역할이 달라지는 때','변화를 준비하는 우선순위','계획을 유연하게 조정하는 기준']},
      {no:5,t:'부모가 되는 과정의 관계',vis:'situ',h:['배우자와 역할을 나누기','가족의 기대와 경계','개인의 생활과 회복 시간']},
      {no:6,t:'준비 사항과 확인 기록',vis:'prep',h:['상담에서 확인할 질문','생활과 일정의 준비','확인한 정보와 다음 행동']},
      {no:7,t:'나에게 맞는 가족의 모습',h:['선택을 존중하는 기준','현재의 생활을 지키는 방법','앞으로의 대화와 준비']}]},
  'topic-health':{name:'건강운',file:'건강운',en:'HEALTH AND DAILY BALANCE',kicker:'나의 생활과 균형',sub:'생활 리듬과 회복 습관을 정리하는 균형 보고서',accent:'#71917d',
    info:['현재 생활 리듬','생활 관리의 관심사'],note:'이 보고서의 건강 내용은 생활 관리의 참고예요. 질병의 진단과 치료는 의료진의 평가를 기준으로 해 주세요.',glanceQ:'나의 생활에서 에너지를 쓰고 회복하는 방식은 어떨까요?',
    pages:[
      {no:1,t:'생활 리듬의 특징',vis:'pillars',h:['활동과 휴식의 배분','일정이 바쁠 때의 습관','꾸준함을 유지하는 조건']},
      {no:2,t:'스트레스와 회복의 패턴',vis:'theme:plant',h:['부담이 커지는 환경','감정과 생활 변화의 연결','회복에 도움이 되는 조건']},
      {no:3,t:'지속 가능한 생활 습관',vis:'steps:health',h:['수면과 식사 리듬의 기록','활동과 휴식의 조정','무리한 계획을 줄이는 방법']},
      {no:4,t:'시기별 생활 관리',vis:'line:years',h:['일과 책임이 늘어날 때','환경이 바뀌는 시기','생활 계획을 다시 점검할 때']},
      {no:5,t:'관계와 환경의 균형',vis:'situ',h:['도움을 요청하는 방법','개인 시간을 확보하는 기준','생활 동선과 공간의 조정']},
      {no:6,t:'주간 생활 기록',vis:'week:health',h:['기록할 습관과 느낌','이번 주의 작은 변화','꾸준히 유지할 기준']},
      {no:7,t:'실천과 점검',h:['계속할 습관','줄일 부담','필요한 도움과 확인 사항']}]}
};
const SLIDERS={
  persona:[['에너지','내향적','외향적',v=>v.E],['판단','감성적','이성적',v=>v.L],['관계','협조적','독립적',v=>v.I],['행동','안정 추구','변화 추구',v=>v.A]],
  love:[['표현','차분한 표현','적극적 표현',v=>v.E],['속도','천천히 확인','빠르게 확인',v=>v.A],['관계','개인 시간','함께하는 시간',v=>100-v.I],['대화','공감 중심','해결 중심',v=>v.L]],
  money:[['수입','안정 선호','변화 선호',v=>v.A],['소비','계획 중심','상황 중심',v=>100-v.L],['관리','장기 관점','단기 관점',v=>Math.round((v.A+v.E)/2)],['협업','독립 선호','협력 선호',v=>100-v.I]],
  career:[['업무','전문성 중심','역할 확장',v=>v.E],['환경','규칙 선호','자율 선호',v=>v.I],['관계','독립 업무','협업 업무',v=>Math.round((100-v.I+v.E)/2)],['성과','과정 중시','결과 중시',v=>v.A]],
  marriage:[['감정 표현','담담한 표현','풍부한 표현',v=>v.E],['결정 속도','신중한 결정','빠른 결정',v=>v.A],['개인 시간','함께하는 시간','혼자만의 시간',v=>v.I],['생활 규칙','유연한 생활','규칙적인 생활',v=>v.L]]
};
const PAIR_ROWS=[['감정 표현',v=>v.E],['결정 속도',v=>v.A],['개인 시간',v=>v.I],['생활 규칙',v=>v.L]];
const ZW_ORDER=['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','노복궁','관록궁','전택궁','복덕궁','부모궁'];
const ZW_SHOW=n=>n==='노복궁'?'교우궁':n;
// 연간 사화표 — 생년 천간별 [화록, 화권, 화과, 화기] (경년 화기는 천동 기준)
const ZW_SIHUA=[['염정','파군','무곡','태양'],['천기','천량','자미','태음'],['천동','천기','문창','염정'],['태음','천동','천기','거문'],['탐랑','태음','우필','천기'],['무곡','탐랑','천량','문곡'],['태양','무곡','태음','천동'],['거문','태양','문곡','문창'],['천량','자미','좌보','무곡'],['파군','거문','태음','탐랑']];
const SOLAR_TERMS=['소한','입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설'];
const OH_TINT=['#dbe7dc','#efdad6','#ece3c4','#e8e6e0','#d9e3ea'];
const OH_WORD=['목','화','토','금','수'];

// ── 공통 유틸 ──
const esc=s=>storyEsc(String(s==null?'':s));
const txt=s=>lv4Text(esc(s));
const clean=s=>String(s||'').replace(/[​⁠]/g,'').replace(/ /g,' ').replace(/\s+/g,' ').trim();
const pad2=n=>String(n).padStart(2,'0');
const tint=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;};
const josa=(w,a,b)=>{const c=String(w||'').charCodeAt(String(w||'').length-1);return c>=0xac00&&c<=0xd7a3&&(c-0xac00)%28?a:b;};

// ── 데이터 모으기 ──
function rpReadingHTML(cat,saju,meta){
  if(cat==='life')return renderSajuPaid(saju,meta.sy,meta.sm,meta.sd,meta.hour,meta.min);
  if(cat==='newyear')return renderNewyearFortune(saju,(meta.nyExtra&&meta.nyExtra.y)||new Date().getFullYear());
  if(cat==='gunghap')return renderGunghapPaid(saju,meta.gnExtra);
  if(cat==='name')return renderNamePaid(saju,meta.nmExtra);
  return renderExtraPaid(cat,saju,meta);
}
// 화면 풀이를 섹션별 문단으로 — 캐릭터 말풍선·버튼·요약 카드는 빼고, 받아 둔 심층 해석은 반영한다
function rpReadingSections(html){
  const box=document.createElement('div');box.innerHTML=html;
  box.querySelectorAll('[data-deep]').forEach(el=>{try{const d=deepCached(el.getAttribute('data-deep'));if(d)deepApply(el,d);}catch(e){}});
  box.querySelectorAll('script,style,button,svg,img,.lc-scene,.lc-bubble,.lv4-toc,.summary-card,.chat-card,.next-actions,.pdf-cta,.lk-note,.lk-bar,.lv4-actions,.lv4-tags,.lv4-gauge,.lc-orbs,.lc-pcard-img,.character-portrait,.ai-reading-status,[data-ai-reading]:not(.ai-ready)').forEach(e=>e.remove());
  const out=[];
  box.querySelectorAll('.lv4-sec').forEach(sec=>{
    const head=sec.querySelector('.lv4-sec-head h2');const title=clean(head&&head.textContent);
    const blocks=[];const seen=new Set();
    sec.querySelectorAll('h3,h4,p,li,.lv4-row,dl>div').forEach(el=>{
      if(el.closest('.lv4-sec-head'))return;
      if([...seen].some(x=>x.contains(el)))return;
      let t='';
      if(el.matches('.lv4-row')){const h=el.querySelector('.lv4-row-head');const ht=clean(h&&h.textContent);const rest=clean(el.textContent).replace(ht,'').trim();t=ht&&rest?`${ht} — ${rest}`:clean(el.textContent);seen.add(el);}
      else if(el.matches('dl>div')){const dt=el.querySelector('dt'),dd=el.querySelector('dd');t=dt&&dd?`${clean(dt.textContent)} — ${clean(dd.textContent)}`:clean(el.textContent);seen.add(el);}
      else if(el.matches('li')){if(el.querySelector('p'))return;t=clean(el.textContent);seen.add(el);}
      else{if(el.closest('li,.lv4-row,dl'))return;t=clean(el.textContent);}
      if(!t||t.length<2)return;
      if(/^(h3|h4)$/i.test(el.tagName)){if(t.length<=40)blocks.push({h:t});return;}
      if(t.length<12)return;
      blocks.push({p:t});
    });
    if(title&&blocks.some(b=>b.p))out.push({title,blocks});
  });
  return out;
}
function rpPersona(saju){
  const h=lcPersonaBars(saju),vals=[...h.matchAll(/<span>(\d+)%<\/span><span>(\d+)%<\/span>/g)].map(m=>Number(m[2]));
  const [E,L,I,A]=vals.length>=4?vals:[50,50,50,50];return {E,L,I,A};
}
function rpPartner(gn){
  if(!gn)return null;
  let sy=gn.gy,sm=gn.gm,sd=gn.gd;
  if(gn.cal==='lunar'){const s=l2s(gn.gy,gn.gm,gn.gd,!!gn.leap);sy=s.y;sm=s.m;sd=s.d;}
  let gh=gn.gh,gmin=gn.gmin||0;
  if(gh>=0&&gn.cityKey){const tso=getTrueSolarOffsetMin(gn.cityKey);if(tso){let t=gh*60+gmin+Math.round(tso);while(t<0)t+=1440;while(t>=1440)t-=1440;gh=Math.floor(t/60);gmin=t%60;}}
  const saju=calcSaju(sy,sm,sd,gh,gmin);
  return {saju,meta:{sy,sm,sd,hour:gh,min:gmin,gender:gn.gender,cityKey:gn.cityKey,marital:''},gn};
}
function rpCollect(cat){
  const saju=_saju,meta={...(_meta||{}),gender:(_meta&&_meta.gender)||gender};
  const y0=new Date().getFullYear();
  const tmCache={};const tm=k=>{if(!(k in tmCache)){try{tmCache[k]=buildTopicModel('topic-'+k,saju,meta);}catch(e){tmCache[k]=null;}}return tmCache[k];};
  const topicKey=/^topic-/.test(cat)?cat.slice(6):({life:'career',newyear:'money',gunghap:'marriage',name:'career',ziwei:'career'})[cat];
  const base=tm(topicKey)||tm('love');
  const html=rpReadingHTML(cat,saju,meta);
  const d={cat,saju,meta,y0,tm,base,html,sections:rpReadingSections(html),persona:rpPersona(saju)};
  d.age=base?base.age:(y0-meta.sy+1);
  d.daeuns=((base&&base.dq&&base.dq.daeuns)||[]).filter(x=>x.age<=85).map(x=>({...x,score:lcEraScore(saju,x)}));
  d.curDaeun=base&&base.cur;
  if(cat==='newyear'){d.ny=buildNewyearV3Model(saju,(meta.nyExtra&&meta.nyExtra.y)||y0,meta);d.nyYear=d.ny.y||((meta.nyExtra&&meta.nyExtra.y)||y0);}
  if(cat==='gunghap'){d.partner=rpPartner(meta.gnExtra);if(d.partner){d.gh=calcGunghap(saju,d.partner.saju,meta.gender,d.partner.meta.gender);d.persona2=rpPersona(d.partner.saju);try{d.tm2=buildTopicModel('topic-marriage',d.partner.saju,d.partner.meta);}catch(e){d.tm2=null;}}}
  if(cat==='ziwei'){d.zw=buildZiweiChart(saju,meta);}
  if(cat==='name'){d.cands=rpNameCands(d.sections);}
  return d;
}
function rpNameCands(sections){
  const sec=sections.find(s=>s.blocks.some(b=>b.p&&/^1\.\s/.test(b.p)));const out=[];
  if(!sec)return out;
  const bs=sec.blocks.filter(b=>b.p);
  bs.forEach((b,i)=>{const m=/^(\d)\.\s*(\S+)\s*\(([^)]+)\)\s*(.*)$/.exec(b.p);if(!m||out.length>=3)return;
    let rest=m[4];if(!rest&&bs[i+1])rest=bs[i+1].p;
    const meaning=[...rest.matchAll(/(\S)\(([^,)]+),\s*(\d+)획\)/g)].map(x=>`${x[1]}(${x[2]})`).join(' · ');
    const good=(/좋은 숫자 (\d\/\d)/.exec(rest)||[])[1];const why=(/(.{0,40}기운[^.]*)\./.exec(rest)||[])[1]||'';
    out.push({name:m[2],han:m[3],meaning,good:good?`좋은 숫자 ${good}`:'',why:clean(why)});});
  return out;
}

// ── 계산 결과 요약 (AI 근거) ──
function rpFacts(d){
  const f=[],s=d.saju,ds=s.dp.stem;
  const pl=[['연',s.yp],['월',s.mp],['일',s.dp],['시',s.hp]].map(([l,p])=>p?`${l}주 ${STEMKO[p.stem]}${BRCHKO[p.branch]}`:`${l}주 모름`).join(', ');
  f.push(`사주팔자: ${pl}. 현재 ${d.age}세.`);
  if(d.daeuns.length)f.push('대운(10년 흐름) 점수: '+d.daeuns.map(x=>`${x.age}~${x.age+9}세 ${STEMKO[x.stem]}${BRCHKO[x.branch]} ${x.score}점${d.curDaeun&&x.age===d.curDaeun.age?'(지금)':''}`).join(', ')+'.');
  const t=d.base;
  if(t){
    f.push(`${t.info.label} 해마다 점수: `+t.years.slice(0,10).map(x=>`${x.year}년 ${x.score}`).join(', ')+'.');
    f.push(`좋은 해: ${t.bestYears.map(x=>x.year+'년').join(', ')} / 살필 해: ${t.careYears.map(x=>x.year+'년').join(', ')}.`);
    f.push(`다가오는 12개월 중 좋은 달: ${t.bestMonths.map(x=>`${x.year}년 ${x.month}월`).join(', ')} / 살필 달: ${t.careMonths.map(x=>`${x.year}년 ${x.month}월`).join(', ')}.`);
    if(t.golden&&t.golden.length)f.push('황금기: '+t.golden.map(g=>`${g.label} ${g.range}`).join(', ')+'.');
  }
  if(d.cat==='life'){f.push('영역별 앞으로 10년 평균: '+rpRadar(d).map(([l,v])=>`${l} ${v}`).join(', ')+'.');}
  if(d.ny){const m=d.ny;f.push(`${d.nyYear}년 ${m.info.gz}년 종합 ${m.info.score}점. 가장 결정적인 달 ${m.decisive}월.`);f.push('달마다 점수(종합/재물/연애/일/건강): '+m.months.map(x=>`${x.month}월 ${x.sc.total}/${x.sc.wealth}/${x.sc.love}/${x.sc.career}/${x.sc.health}`).join(', ')+'.');}
  if(d.partner){const p=d.partner.saju,g=d.gh;f.push(`상대 사주: ${[p.yp,p.mp,p.dp,p.hp].map((x,i)=>x?`${'연월일시'[i]}주 ${STEMKO[x.stem]}${BRCHKO[x.branch]}`:`${'연월일시'[i]}주 모름`).join(', ')}. 상대 ${d.y0-d.partner.meta.sy+1}세.`);if(g)f.push(`궁합 ${g.score}점(${g.grade}). 다섯 기운 ${g.ohScore}, 서로 대하는 기운 ${g.tgScore}, 배우자 자리 ${g.brScore}, 균형 ${g.balScore}.`);}
  if(d.zw){const z=d.zw;f.push('자미두수 12궁: '+z.palaces.map(p=>`${ZW_SHOW(p.name)} ${p.stars.join('·')||'빈 방'}`).join(', ')+`. 신궁은 ${ZW_SHOW(z.shenPalace.name)}. 지금 대한 ${z.curDecade.from}~${z.curDecade.to}세 ${ZW_SHOW(z.curDecade.palace.name)}.`);f.push('사화(생년 천간): '+rpSihua(d).map(r=>`${r[0]} ${r[1]}${r[2]?'('+r[2]+')':''}`).join(', ')+'.');}
  if(d.cands&&d.cands.length)f.push('추천 이름 후보: '+d.cands.map((c,i)=>`${i+1}. ${c.han.slice(1)} ${c.meaning} ${c.good}`).join(' / ')+'.');
  return f.join('\n').slice(0,2400);
}

// ── 도표 데이터 ──
function rpRadar(d){
  const avg=k=>{const t=d.tm(k);return t&&t.years.length?Math.round(t.years.reduce((a,x)=>a+x.score,0)/t.years.length):0;};
  return [['연애',avg('love')],['재물',avg('money')],['결혼',avg('marriage')],['직업',avg('career')],['건강',avg('health')],['학업',avg('study')],['자녀',avg('children')]].filter(x=>x[1]);
}
function rpLine(d,kind){
  if(kind==='daeun'){const ds=d.daeuns,ci=Math.max(0,ds.findIndex(x=>d.curDaeun&&x.age===d.curDaeun.age)),st=Math.max(0,Math.min(ci-1,ds.length-6));return {pts:ds.slice(st,st+6).map(x=>({l:`${x.age}세`,v:x.score,cur:x===ds[ci]})),cap:'대운(10년 흐름)이 바뀔 때마다의 흐름 점수'};}
  if(kind==='years6'){const ks=['love','money','career','health'].map(k=>d.tm(k)).filter(Boolean);const pts=[];for(let i=0;i<6;i++){const ys=ks.map(t=>t.years[i]).filter(Boolean);if(ys.length)pts.push({l:`${ys[0].year}년`,v:Math.round(ys.reduce((a,x)=>a+x.score,0)/ys.length),cur:i===0});}return {pts,cap:'연애·재물·직업·건강을 합친 해마다의 종합 점수'};}
  if(kind==='nyMonths'){return {pts:d.ny.months.map(x=>({l:`${x.month}월`,v:x.sc.total,cur:x.month===d.ny.decisive})),cap:`${d.nyYear}년 달마다의 종합 점수`};}
  if(kind==='months6'){return {pts:d.base.months.slice(0,6).map((x,i)=>({l:`${x.month}월`,v:x.score,cur:i===0})),cap:'다가오는 6개월의 학업 흐름 점수'};}
  if(kind==='pairYears'){const a=d.tm('marriage'),b=d.tm2;const pts=[];for(let i=0;i<6;i++){const x=a&&a.years[i],z=b&&b.years[i];if(x)pts.push({l:`${x.year}년`,v:z?Math.round((x.score+z.score)/2):x.score,cur:i===0});}return {pts,cap:'두 사람의 결혼·관계 흐름을 합친 해마다의 점수'};}
  const t=d.base;return {pts:t.years.slice(0,6).map((x,i)=>({l:`${x.year}년`,v:x.score,cur:i===0})),cap:`${t.info.stat} 흐름의 해마다 점수`};
}
function rpSihua(d){
  const z=d.zw,row=ZW_SIHUA[z.yStem]||ZW_SIHUA[0],lab=['화록','화권','화과','화기'];
  return row.map((star,i)=>{const p=z.palaces.find(x=>x.stars.includes(star));return [lab[i],star,p?ZW_SHOW(p.name):''];});
}

// ── 문장 묶음 (AI가 못 채운 칸의 대안) ──
function rpPool(d){
  const pool=[];d.sections.forEach(s=>s.blocks.forEach(b=>{if(b.p&&b.p.length>=30&&!/ — /.test(b.p.slice(0,24)))pool.push({t:b.p,sec:s.title,used:false});}));
  return pool;
}
function rpGrams(s){const t=String(s).replace(/[^가-힣]/g,'');const g=new Set();for(let i=0;i<t.length-1;i++)g.add(t.slice(i,i+2));return g;}
function rpPick(pool,query,n){
  const q=rpGrams(query);const score=x=>{let c=0;rpGrams(x.sec+' '+x.t.slice(0,80)).forEach(g=>{if(q.has(g))c++;});return c-(x.used?100:0);};
  const ranked=pool.map(x=>[score(x),x]).sort((a,b)=>b[0]-a[0]).slice(0,n).map(r=>r[1]);
  ranked.forEach(x=>x.used=true);return ranked.map(x=>x.t);
}
function rpSents(pool){const out=[];pool.forEach(x=>String(x.t).split(/(?<=[.!?요])\s+/).forEach(s=>{s=rpUnquote(s);if(s.length>=10&&!/["“”'‘’]/.test(s))out.push({t:s,sec:x.sec,used:false});}));return out;}
function rpUnquote(s){return clean(s).replace(/^["“”'‘’「」]+|["“”'‘’「」]+$/g,'').trim();}
function rpShort(pool,query,max,sents){
  sents=(sents||rpSents(pool)).filter(x=>x.t.length<=max);
  const r=rpPick(sents,query,1)[0];
  if(r)return r;
  const first=(pool[0]&&pool[0].t)||'';return first.slice(0,max).replace(/\s\S*$/,'');
}

// ── 장 설계와 AI 요청 단위 ──
function rpPlan(spec,d){
  const pages=spec.pages.map((pg,i)=>({...pg,pi:i,ey:pg.ey||`${pad2(pg.no)} / ${spec.en}`}));
  const units=[];
  const add=(group,u)=>units.push({...u,group});
  // 표지·한눈에 보기
  add('head',{fields:[['intro','이 보고서를 소개하는 한 문장(이 사람의 핵심을 담아)',44],['gq','풀이 전체의 핵심을 담은 한 문장',46],['gk1','중심 주제(명사구)',12],['gk2','살릴 강점(명사구)',12],['gk3','우선할 행동(동사구)',14],...(spec.glance||GL_DEFAULT).map((l,i)=>[`gi${i+1}`,`'${l}'을 두세 문장으로`,150])]});
  pages.forEach(pg=>{
    const f=[];
    if(!pg.sub)f.push([`p${pg.pi}sub`,`'${pg.t}' 장을 한 줄로 요약하는 질문이나 문장`,40]);
    const v=pg.vis||'';
    if(/^theme/.test(v)||v==='zwTheme'){f.push([`p${pg.pi}core`,`'${pg.t}'의 핵심 문장`,36]);if(v!=='zwTheme'){f.push([`p${pg.pi}kw1`,'핵심 키워드 하나',8],[`p${pg.pi}kw2`,'다른 핵심 키워드 하나',8]);}}
    if(v==='situ')for(let r=0;r<2;r++)f.push([`p${pg.pi}s${r}a`,`'${pg.t}'에서 실제로 나타날 수 있는 구체적인 상황`,40],[`p${pg.pi}s${r}b`,'그 상황에서 확인할 판단 기준',44]);
    if(v==='check')['우선 과제','필요한 준비','도움을 받을 곳'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l} — 지금 확인할 점`,30],[`p${pg.pi}c${r}b`,`${l} — 다음 행동`,30]));
    if(v==='talk')['생활과 기대','관계의 속도','경계와 약속'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l} — 본인의 생각(사주 성향에 근거)`,30],[`p${pg.pi}c${r}b`,`${l} — 함께 확인할 질문`,32]));
    if(v==='childObs')['새로운 활동','놀이와 학습','감정과 관계'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l}에서 아이에게 보일 수 있는 반응`,30],[`p${pg.pi}c${r}b`,`${l}에서 바꿔 볼 환경`,30]));
    if(v==='prep')['시간과 돌봄','일과 생활','지원 환경','상담 질문'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l} — 지금 확인할 점`,30],[`p${pg.pi}c${r}b`,`${l} — 다음 행동`,30]));
    if(v==='nameCheck')['정확한 글자','발음과 사용성','본인의 선호','공식 사용'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l} — 후보별로 확인할 내용`,44]));
    if(v==='candidates')for(let k=0;k<3;k++)f.push([`p${pg.pi}cand${k}`,`후보 ${k+1}에 대한 짧은 검토 의견`,26]);
    if(v==='zwStars')['명궁의 주성','신궁의 주성','마주 보는 천이궁'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l} 배치에 대한 해석 메모`,34]));
    if(v==='zwSihua')['화록','화권','화과','화기'].forEach((l,r)=>f.push([`p${pg.pi}c${r}a`,`${l}이 붙은 별과 궁에 대한 해석 메모`,34]));
    if(v==='zwIndex')ZW_ORDER.forEach((n,r)=>f.push([`p${pg.pi}z${r}`,`${ZW_SHOW(n)}의 풀이 핵심`,22]));
    if(v==='quarters')for(let q=1;q<=4;q++)f.push([`q${q}a`,`${q}분기 핵심 주제(명사구)`,16],[`q${q}b`,`${q}분기의 변화와 준비할 일`,140]);
    if(/^months:/.test(v)){const st=Number(v.split(':')[1]);for(let m=st;m<st+3;m++)f.push([`m${m}a`,`${m}월의 핵심 주제(명사구)`,16],[`m${m}b`,`${m}월 전체 흐름과 일·돈·관계의 변화`,110],[`m${m}c`,`${m}월에 먼저 실행할 일과 조절할 부분`,90]);}
    add(pg.pi,{page:pg,heads:pg.h.map((h,k)=>({id:`p${pg.pi}h${k}`,chapter:pg.t,title:h,hint:rpHint(pg,d)})),fields:f});
  });
  add('tail',{fields:[['sq','풀이를 생활에 연결하는 마무리 한 문장',46],['si1','계속 살릴 강점 — 실천할 내용과 이유',120],['si2','새롭게 조정할 부분 — 실천할 내용과 이유',120],['si3','지금 시작할 행동 — 실천할 내용과 이유',120],['send','앞으로의 나에게 — 보고서를 마무리하는 글(4~5문장)',360]]});
  // 요청 단위로 묶기 — 한 번에 너무 많이 시키면 답이 짧아지거나 끊기므로 소제목 5개, 필드 18개까지
  const groups=[];let cur=null;
  const split=[];units.forEach(u=>{if(u.fields.length<=18){split.push(u);return;}for(let i=0;i<u.fields.length;i+=18)split.push({...u,heads:i?[]:u.heads,fields:u.fields.slice(i,i+18)});});
  split.forEach(u=>{const hn=(u.heads||[]).length,fn=u.fields.length;if(!cur||cur.heads.length+hn>5||cur.fields.length+fn>18){cur={heads:[],fields:[]};groups.push(cur);}cur.heads.push(...(u.heads||[]));cur.fields.push(...u.fields);});
  return {pages,groups};
}
function rpHint(pg,d){
  const v=pg.vis||'';
  try{
    if(/^line:/.test(v)){const L=rpLine(d,v.split(':')[1]);return `도표(${L.cap}): `+L.pts.map(p=>`${p.l} ${p.v}`).join(', ');}
    if(v==='radar')return '영역별 점수: '+rpRadar(d).map(([l,x])=>`${l} ${x}`).join(', ');
    if(/^sliders:/.test(v)){const sl=SLIDERS[v.split(':')[1]];return '성향 막대: '+sl.map(([k,a,b,fn])=>`${k} ${a} ${100-fn(d.persona)} : ${b} ${fn(d.persona)}`).join(', ');}
    if(v==='pair'&&d.persona2)return '두 사람 성향(본인/상대): '+PAIR_ROWS.map(([k,fn])=>`${k} ${fn(d.persona)}/${fn(d.persona2)}`).join(', ');
    if(pg.sub==='@early'||pg.sub==='@late')return rpLifeRange(d,pg.sub);
  }catch(e){}
  return '';
}
function rpLifeRange(d,which){
  const ds=d.daeuns;if(!ds.length)return '';
  const part=which==='@early'?ds.filter(x=>x.age<36):ds.filter(x=>x.age>=36);
  return part.length?`${part[0].age}세부터 ${part[part.length-1].age+9}세까지의 대운 구간`:'';
}

async function rpAI(spec,d,plan,onProgress,opts){
  opts=opts||{};
  const scope=(typeof unlockScopeOf==='function'?unlockScopeOf(d.cat):'')||'';
  const readingText=d.sections.map(s=>`[${s.title}] `+s.blocks.map(b=>b.p||b.h).join(' ')).join('\n').slice(0,17000);
  const told=Object.entries(d.info||{}).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(' / ');
  const facts=(told?`상담자가 직접 알려 준 상황(최우선으로 반영): ${told}\n`:'')+rpFacts(d);let done=0;
  const infoKey=told?'|'+rpHash(told):'';
  const one=async(g,i)=>{
    const key=`${d.cat}|${scope}|${i}|${RP_VERSION}${infoKey}`;
    try{
      const c=aiReadingCacheGet('report-tpl',key,'ko');const parsed=c&&rpParse(c.text);if(parsed)return parsed;
      const payload=buildAIReadingPayload('report-tpl',{source:'paid-report'});if(!payload)return null;
      payload.sajuContext.detailedReading=readingText;
      if(told)payload.sajuContext.situation=told.slice(0,300);
      Object.assign(payload.meta,{reportName:spec.name.replace(/\s/g,''),facts,sections:g.heads.map(h=>({id:h.id,chapter:h.chapter,title:h.title,hint:h.hint})),fields:g.fields.map(([id,ask,max])=>({id,ask,max}))});
      let resp,data,text='',out=null;
      for(let k=0;k<2&&!rpEnough(out,g);k++){
        ({resp,data}=await fetchJsonWithRetry((opts.endpoint||WORKER_URL).replace(/\/$/,'')+'/reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},2));
        if(resp&&resp.status===403)break;
        const t=resp&&resp.ok&&data?String(data.text||'').trim():'',o=rpParse(t);
        if(o&&(!out||rpScore(o)>rpScore(out))){out=o;text=t;}
      }
      if(opts.debug)(window.__rpRaw=window.__rpRaw||[]).push(text);
      if(opts.debug)console.log('[report-ai]',i,resp&&resp.status,data&&data.provider,(data&&data.usage&&data.usage.output_tokens),data&&data.truncated,text.length,!!out,out?((out.sections||[]).length+'s/'+Object.keys(out.fields||{}).length+'f'):String(text).slice(-200),out&&(out.sections||[]).length<g.heads.length?String(text):'');
      if(out)aiReadingCacheSet('report-tpl',key,text,'ko',true);
      return out;
    }catch(e){return null;}
    finally{done++;if(onProgress)onProgress(done,plan.groups.length);}
  };
  const res=await Promise.all(plan.groups.map(one));
  const secs={},fields={};
  res.forEach(r=>{if(!r)return;(r.sections||[]).forEach(s=>{if(s&&s.id&&Array.isArray(s.paragraphs))secs[s.id]=s.paragraphs.map(clean).filter(x=>x.length>=10).slice(0,4);});Object.entries(r.fields||{}).forEach(([k,v])=>{const t=clean(v);if(t)fields[k]=t;});});
  return {secs,fields,okGroups:res.filter(Boolean).length};
}
// JSON이 중간에 끊겨도 온전한 섹션·필드는 살린다
function rpParse(text){
  const s=String(text||'').replace(/\\'/g,"'"),a=s.indexOf('{'),b=s.lastIndexOf('}');
  if(a>=0&&b>a){try{const o=JSON.parse(s.slice(a,b+1));if(o&&(Array.isArray(o.sections)||o.fields)){if(Array.isArray(o.fields))o.fields=Object.fromEntries(o.fields.filter(f=>f&&f.id).map(f=>[f.id,f.text||'']));return o;}}catch(e){}}
  const out={sections:[],fields:{}},str='"((?:[^"\\\\]|\\\\.)*)"';
  for(const m of s.matchAll(new RegExp('\\{\\s*"id"\\s*:\\s*"([^"]+)"\\s*,\\s*"paragraphs"\\s*:\\s*\\[((?:\\s*'+str+'\\s*,?)+)(?:\\]|(?=\\}))','g'))){
    const ps=[...m[2].matchAll(new RegExp(str,'g'))].map(x=>{try{return JSON.parse('"'+x[1]+'"');}catch(e){return x[1];}});
    out.sections.push({id:m[1],paragraphs:ps});
  }
  for(const m of s.matchAll(new RegExp('\\{\\s*"id"\\s*:\\s*"([A-Za-z0-9_]+)"\\s*,\\s*"text"\\s*:\\s*'+str,'g'))){try{out.fields[m[1]]=JSON.parse('"'+m[2]+'"');}catch(e){out.fields[m[1]]=m[2];}}
  const fi=s.indexOf('"fields"');
  if(fi>=0)for(const m of s.slice(fi).matchAll(new RegExp('"([A-Za-z0-9_]+)"\\s*:\\s*'+str+'\\s*[,}]','g'))){if(m[1]==='id'||m[1]==='text'||out.fields[m[1]])continue;try{out.fields[m[1]]=JSON.parse('"'+m[2]+'"');}catch(e){out.fields[m[1]]=m[2];}}
  return out.sections.length||Object.keys(out.fields).length?out:null;
}
function rpScore(o){return o?(o.sections||[]).length*4+Object.keys(o.fields||{}).length:0;}
function rpEnough(o,g){if(!o)return false;const ids=new Set((o.sections||[]).filter(x=>x&&Array.isArray(x.paragraphs)&&x.paragraphs.length>=2).map(x=>x.id));const f=o.fields||{};return g.heads.every(h=>ids.has(h.id))&&g.fields.filter(([id])=>!f[id]).length<=Math.floor(g.fields.length/4);}

// AI가 못 채운 짧은 칸 — 계산된 성향·강점·시기로 채운다
function rpDetFields(d){
  const t=d.base||{},ch=t.character||{},st=t.strengths||{},fp=t.fingerprint||{},o={};
  const first=s=>rpUnquote(String(s||'').replace(/<[^>]+>/g,'').split(/(?<=[.!?요])\s+/)[0]||'');
  if(ch.nickname)o.gq=`${ch.nickname}, ${ch.subtitle||'본인만의 분위기'}의 사람이에요`;
  if(st.keyword)o.gk1=st.keyword;
  if(st.strengths&&st.strengths[0])o.gk2=st.strengths[0].replace(/\s*\(.*\)$/,'');
  const bm=t.bestMonths&&t.bestMonths[0];if(bm)o.gk3=`${bm.year}년 ${bm.month}월에 움직이기`;
  if(fp.hook)o.intro=first(fp.hook);
  if(st.cautions&&st.cautions[0])o.si2=`${st.cautions[0]} — 이 부분은 속도를 한 박자 늦추면 좋아요.`;
  if(st.strengths&&st.strengths[0])o.si1=`${st.strengths[0]} — 본인이 가장 자연스럽게 힘을 내는 방식이라 계속 살려 주세요.`;
  if(bm)o.si3=`${bm.year}년 ${bm.month}월을 첫 실행의 달로 정하고, 그 전에 준비할 일 한 가지를 오늘 적어 두세요.`;
  return o;
}
// 비어 있는 칸은 화면 풀이 문장으로 채운다
function rpFill(plan,ai,d){
  const pool=rpPool(d),sents=rpSents(pool),secs={...ai.secs},fields={};
  Object.entries(ai.fields).forEach(([k,v])=>{fields[k]=rpUnquote(v);});
  const det=rpDetFields(d);
  plan.groups.forEach(g=>{
    g.heads.forEach(h=>{if(!secs[h.id]||secs[h.id].length<2){const got=rpPick(pool,`${h.chapter} ${h.title}`,3);secs[h.id]=(secs[h.id]||[]).concat(got).slice(0,3);}});
    g.fields.forEach(([id,ask,max])=>{if(!fields[id]){const pre=det[id];const all=sents.filter(x=>x.t.length<=max&&!x.used);fields[id]=pre&&pre.length<=max*1.5?pre:rpShort(pool,ask,max,all);}else if(fields[id].length>max*1.6){fields[id]=fields[id].slice(0,Math.round(max*1.5)).replace(/\s\S*$/,'');}});
  });
  return {secs,fields};
}

// ── 그리기 ──
const RP_CSS=`
.rp-host{position:fixed;left:-20000px;top:0;width:${RP_W}px;pointer-events:none}
.rp-page{position:relative;box-sizing:border-box;width:${RP_W}px;height:${RP_H}px;padding:76px 80px 52px;background:#faf8f3;color:#5f6a62;display:flex;flex-direction:column;overflow:hidden;font-family:'Nanum Gothic','Apple SD Gothic Neo','Malgun Gothic',sans-serif;letter-spacing:0;word-break:keep-all;overflow-wrap:break-word}
.rp-page *{box-sizing:border-box}
.rp-page .reading-ending{white-space:nowrap}
.rp-serif{font-family:'Nanum Myeongjo','AppleMyungjo','Batang',serif}
.rp-top{display:flex;justify-content:space-between;font-size:10px;color:#7d867f;margin-bottom:34px}
.rp-tab{position:absolute;right:0;top:218px;width:10px;height:60px;background:var(--ac)}
.rp-ey{font-size:10.5px;color:var(--ac);letter-spacing:.05em;margin:0 0 12px}
.rp-title{font-family:'Nanum Myeongjo','AppleMyungjo',serif;font-weight:400;font-size:33px;line-height:1.25;color:#252c2b;letter-spacing:.08em;margin:0 0 10px}
.rp-sub{font-size:12px;color:#7d867f;margin:0 0 26px;line-height:1.6}
.rp-body{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.rp-foot{display:flex;justify-content:space-between;align-items:flex-end;padding-top:12px;font-size:9.5px;color:#7d867f}
.rp-foot b{font-family:'Nanum Myeongjo',serif;font-weight:400;font-size:16px;color:var(--ac)}
.rp-h{font-size:16.5px;font-weight:800;color:#252c2b;margin:20px 0 9px;line-height:1.4}
.rp-p{text-align:justify;text-align-last:left;text-justify:inter-character;word-break:normal;line-break:strict;word-spacing:0;letter-spacing:0;font-size:13.4px;line-height:1.86;color:#5f6a62;margin:0 0 9px}
.rp-cap{font-size:10.5px;color:#7d867f;text-align:center;margin:8px 0 6px}
.rp-tbl{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px}
.rp-tbl th{background:#e9e6dc;color:#252c2b;font-weight:800;text-align:left;padding:10px 12px;font-size:12px}
.rp-tbl td{padding:10px 12px;color:#4d5650;border-bottom:1px solid #ebe7dc;line-height:1.55;vertical-align:top}
.rp-tbl tr:nth-child(even) td{background:#f3f1ea}
.rp-tbl td.k{color:#252c2b;font-weight:700;white-space:nowrap}
.rp-pil{display:grid;grid-template-columns:86px repeat(4,1fr);gap:7px;align-items:center;margin:4px 0 10px}
.rp-pil .hd{background:#e9e6dc;text-align:center;font-weight:800;font-size:12px;color:#252c2b;padding:10px 0}
.rp-pil .lb{text-align:center;font-size:12px;color:#252c2b}
.rp-pil .cell{height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;color:#252c2b;line-height:1.1}
.rp-pil .cell small{font-size:10px;color:#5f6a62;margin-top:3px}
.rp-pil .tgc{text-align:center;font-size:11px;color:#4d5650;padding:6px 0;border-bottom:1px solid #ebe7dc}
.rp-sl{margin:6px 0 4px}
.rp-sl .row{display:grid;grid-template-columns:72px 1fr;gap:10px;margin:0 0 20px}
.rp-sl .k{color:var(--ac);font-size:12px;padding-top:2px}
.rp-sl .ends{display:flex;justify-content:space-between;font-size:11.5px;color:#252c2b;margin-bottom:7px}
.rp-sl .track{position:relative;height:9px;background:#e6e4da;border-radius:5px}
.rp-sl .fill{position:absolute;left:0;top:0;bottom:0;background:${'var(--ac2)'};border-radius:5px}
.rp-sl .knob{position:absolute;top:50%;width:15px;height:15px;margin:-7.5px 0 0 -7.5px;border-radius:50%;background:#fff;border:2px solid var(--ac)}
.rp-pair .row{display:grid;grid-template-columns:96px 1fr 18px;gap:10px;align-items:center;margin:0 0 14px;font-size:12px;color:#252c2b}
.rp-pair .rbars{display:flex;flex-direction:column;gap:5px}
.rp-pair .bar{height:7px;background:#e6e4da;border-radius:4px;position:relative}
.rp-pair .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--ac2)}
.rp-pair .bar.b i{background:#c9a08f}
.rp-pair .ab{font-size:9.5px;color:#7d867f;line-height:12px}
.rp-legend{display:flex;gap:16px;justify-content:center;font-size:10.5px;color:#5f6a62;margin:2px 0 4px}
.rp-legend i{display:inline-block;width:14px;height:6px;border-radius:3px;margin-right:5px;vertical-align:middle}
.rp-steps{display:flex;align-items:flex-start;justify-content:space-between;margin:10px 18px 6px}
.rp-steps .st{display:flex;flex-direction:column;align-items:center;gap:10px;width:90px}
.rp-steps .c{width:56px;height:56px;border-radius:50%;background:var(--ac3);border:1.5px solid var(--ac2);display:flex;align-items:center;justify-content:center;font-family:'Nanum Myeongjo',serif;font-size:17px;color:var(--ac)}
.rp-steps .l{font-size:11.5px;color:#252c2b;text-align:center}
.rp-steps .ar{margin-top:20px;color:#b9bdb3;font-size:16px}
.rp-theme{position:relative;height:150px;border-radius:2px;background:var(--ac3);overflow:hidden;margin:2px 0 8px;padding:20px 24px}
.rp-theme small{display:block;font-size:9.5px;color:var(--ac);letter-spacing:.06em;margin-bottom:10px}
.rp-theme .core{font-family:'Nanum Myeongjo',serif;font-size:19px;color:#252c2b;max-width:390px;line-height:1.45}
.rp-theme .kw{font-size:11px;color:#5f6a62;margin-top:10px}
.rp-theme .cap{font-size:10px;color:#7d867f;margin-top:4px}
.rp-theme svg{position:absolute;right:0;bottom:0}
.rp-quote{font-family:'Nanum Myeongjo',serif;font-size:24px;line-height:1.6;color:#252c2b;margin:6px 0 30px;letter-spacing:.02em}
.rp-keys{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin:0 0 30px}
.rp-keys div{border-top:1px solid #ddd9cc;padding-top:14px}
.rp-keys b{display:block;font-size:12px;color:#252c2b;font-weight:800;margin-bottom:10px}
.rp-keys span{font-family:'Nanum Myeongjo',serif;font-size:17px;color:#252c2b;line-height:1.4}
.rp-num{display:grid;grid-template-columns:54px 1fr;gap:6px;padding:16px 0;border-bottom:1px solid #e3dfd3}
.rp-num em{font-style:normal;font-family:'Nanum Myeongjo',serif;font-size:24px;color:var(--ac);line-height:1}
.rp-num b{display:block;font-size:14px;color:#252c2b;font-weight:800;margin-bottom:7px}
.rp-num p{margin:0;font-size:13px;line-height:1.75;color:#5f6a62}
.rp-q{border-left:2px solid var(--ac2);padding:2px 0 2px 16px;margin:0 0 18px}
.rp-q b{display:block;font-size:11px;color:var(--ac);margin-bottom:6px}
.rp-q .t{font-size:14.5px;font-weight:800;color:#252c2b;margin-bottom:6px}
.rp-q p{margin:0 0 4px;font-size:12.6px;line-height:1.7;color:#5f6a62}
.rp-toc{list-style:none;margin:6px 0 0;padding:0}
.rp-toc li{display:flex;align-items:baseline;gap:10px;padding:11px 0;border-bottom:1px solid #e6e2d6;font-size:13.5px;color:#252c2b}
.rp-toc li span{flex:1}
.rp-toc li b{font-family:'Nanum Myeongjo',serif;font-weight:400;font-size:15px;color:var(--ac)}
.rp-zw{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,128px);border:1px solid #ddd9cc;margin:4px 0 6px}
.rp-zw .zc{border:1px solid #e6e2d6;padding:8px 9px;font-size:10.5px;line-height:1.5;color:#4d5650;background:#fffdf8}
.rp-zw .zc b{display:block;font-size:11.5px;color:#252c2b;margin-bottom:3px}
.rp-zw .zc .st{color:#252c2b;font-weight:700}
.rp-zw .zc .dc{color:var(--ac);font-size:10px}
.rp-zw .zc.me{background:var(--ac3)}
.rp-zw .zct{grid-column:2/4;grid-row:2/4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--ac3);text-align:center;font-size:11px;color:#5f6a62}
.rp-zw .zct h4{margin:0;font-family:'Nanum Myeongjo',serif;font-weight:400;font-size:20px;color:#252c2b}
.rp-names{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:2px 0 14px}
.rp-names div{background:#efece2;text-align:center;padding:18px 6px}
.rp-names b{display:block;font-family:'Nanum Myeongjo',serif;font-weight:400;font-size:30px;color:#252c2b}
.rp-names small{font-size:11px;color:#5f6a62}
.rp-week{width:100%;border-collapse:collapse;font-size:11.5px;margin:4px 0 6px}
.rp-week th{font-weight:700;color:#252c2b;padding:6px 0;text-align:center}
.rp-week td{padding:6px 4px;text-align:center;color:#4d5650}
.rp-week td.k{text-align:left;white-space:nowrap;color:#252c2b}
.rp-week td span{display:inline-block;width:20px;height:20px;border:1.4px solid #cfcabc;border-radius:3px}
.rp-week.plan td{border:1px solid #e6e2d6;height:44px;font-size:10px;color:#9aa198}
.rp-week.plan th{background:var(--ac3)}
.rp-cover{padding:80px 80px 60px}
.rp-cover .brand{font-size:10.5px;color:#7d867f}
.rp-cover .brand em{font-style:normal;color:var(--ac)}
.rp-cover .emb{position:absolute;right:92px;top:150px}
.rp-cover .ey{font-size:9.5px;color:var(--ac);letter-spacing:.05em;margin:150px 0 26px}
.rp-cover .kick{font-family:'Nanum Myeongjo',serif;font-size:27px;color:#25403c;margin:0 0 30px;letter-spacing:.06em}
.rp-cover h1{font-family:'Nanum Myeongjo',serif;font-weight:400;font-size:60px;color:#25403c;margin:0 0 64px;letter-spacing:.1em;line-height:1.15}
.rp-cover .lead{font-family:'Nanum Myeongjo',serif;font-size:16.5px;color:#707a71;letter-spacing:.06em;margin:0 0 30px}
.rp-cover .intro{font-size:12.5px;color:#5f6a62;line-height:1.7;max-width:560px}
.rp-cover .who{position:absolute;left:80px;right:80px;bottom:80px;border-top:1px solid #e3dfd3;padding-top:30px}
.rp-cover .who b{display:block;font-size:17px;color:#25403c;margin-bottom:12px;font-weight:700}
.rp-cover .who span{font-size:11px;color:#707a71}
.rp-cover .who em{display:block;font-style:normal;font-size:9.5px;color:var(--ac);margin-top:36px;letter-spacing:.05em}
.rp-svgchart text{font-family:'Nanum Gothic',sans-serif}
.rp-ask{position:fixed;inset:0;z-index:310;display:flex;align-items:flex-end;justify-content:center;background:rgba(8,12,10,.55);padding:16px}
@media (min-width:640px){.rp-ask{align-items:center}}
.rp-ask-box{position:relative;width:100%;max-width:480px;max-height:88vh;overflow:auto;background:var(--card,#fff);color:var(--text,#243b33);border-radius:18px;padding:22px 20px 18px;box-shadow:0 18px 40px rgba(0,0,0,.25)}
.rp-ask-box h3{margin:0 0 6px;font-size:1.15rem;color:var(--accent,#245c47)}
.rp-ask-box>p{margin:0 0 16px;font-size:.88rem;line-height:1.6;color:var(--sub,#526259)}
.rp-ask-f{margin:0 0 16px}
.rp-ask-f b{display:block;font-size:.92rem;margin-bottom:8px}
.rp-ask-chips{display:flex;flex-wrap:wrap;gap:8px}
.rp-ask-chip{min-height:40px;padding:8px 14px;border-radius:999px;border:1px solid var(--border,#dcdcd2);background:var(--bg,#f7f7f2);color:var(--text,#243b33);font:inherit;font-size:.88rem;cursor:pointer}
.rp-ask-chip.on{background:var(--accent,#245c47);border-color:var(--accent,#245c47);color:var(--on-accent,#fff)}
.rp-ask-input{display:block;width:100%;box-sizing:border-box;margin-top:8px;min-height:44px;padding:10px 12px;border-radius:12px;border:1px solid var(--border,#dcdcd2);background:var(--bg,#f7f7f2);color:var(--text,#243b33);font:inherit;font-size:16px}
.rp-ask-act{display:flex;gap:10px;margin-top:6px}
.rp-ask-act button{flex:1;min-height:48px;border-radius:12px;font:inherit;font-size:.95rem;cursor:pointer}
.rp-ask-skip{border:1px solid var(--border,#dcdcd2);background:transparent;color:var(--sub,#526259)}
.rp-ask-go{border:0;background:var(--accent,#245c47);color:var(--on-accent,#fff)}
.rp-ask-x{position:absolute;top:10px;right:10px;width:40px;height:40px;border:0;background:none;font-size:1.5rem;color:var(--muted,#67756d);cursor:pointer}
`;
function rpStyle(){if(document.getElementById('rpStyle'))return;const st=document.createElement('style');st.id='rpStyle';st.textContent=RP_CSS;document.head.appendChild(st);}
async function rpFonts(){
  if(!document.getElementById('rpFontLink')){const l=document.createElement('link');l.id='rpFontLink';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700&display=swap';document.head.appendChild(l);await new Promise(r=>{l.onload=r;l.onerror=r;setTimeout(r,5000);});}
}
async function rpFontsReady(){try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,9000))]);}catch(e){}}

function rpEmblem(ac){
  const dots=[[56,8],[128,14],[170,70],[154,140],[90,172],[22,146],[100,0]].slice(0,6);
  return `<svg class="emb" width="180" height="180" viewBox="0 0 180 180"><circle cx="90" cy="90" r="86" fill="none" stroke="#d8d5ca"/><circle cx="90" cy="90" r="66" fill="none" stroke="#d8d5ca"/><line x1="29" y1="29" x2="151" y2="151" stroke="#d8d5ca"/><line x1="151" y1="29" x2="29" y2="151" stroke="#d8d5ca"/>${dots.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="3.2" fill="${i%2?ac:'#8b8f80'}"/>`).join('')}</svg>`;
}
function rpIllust(kind,ac){
  const a2=tint(ac,.55),a3=tint(ac,.25),hill=`<path d="M0 150 Q70 96 150 128 T300 116 L300 150 Z" fill="${tint(ac,.18)}"/><circle cx="210" cy="52" r="34" fill="${tint(ac,.14)}"/>`;
  const art={
    couple:`<circle cx="180" cy="66" r="13" fill="none" stroke="${ac}" stroke-width="2"/><path d="M160 122 Q160 88 180 86 Q200 88 200 122" fill="#fff" stroke="${ac}" stroke-width="2"/><circle cx="232" cy="66" r="13" fill="none" stroke="${ac}" stroke-width="2"/><path d="M212 122 Q212 88 232 86 Q252 88 252 122" fill="#fff" stroke="${ac}" stroke-width="2"/><path d="M206 100 l-5 -5 a3.5 3.5 0 0 1 5 -5 a3.5 3.5 0 0 1 5 5 z" fill="${a2}"/>`,
    house:`<path d="M168 82 L210 50 L252 82" fill="none" stroke="${ac}" stroke-width="2"/><rect x="176" y="80" width="68" height="44" fill="#fff" stroke="${ac}" stroke-width="2"/><rect x="200" y="98" width="18" height="26" fill="${a3}"/><rect x="183" y="90" width="12" height="10" fill="${a3}"/><rect x="226" y="90" width="12" height="10" fill="${a3}"/>`,
    plant:`<path d="M200 124 L192 98 L232 98 L224 124 Z" fill="#fff" stroke="${ac}" stroke-width="2"/><path d="M212 98 Q206 70 186 64 Q196 86 212 98 Q220 66 242 58 Q232 84 212 98" fill="${a3}" stroke="${ac}" stroke-width="1.6"/>`,
    coins:`<rect x="176" y="104" width="16" height="20" fill="${a2}"/><rect x="198" y="92" width="16" height="32" fill="${a2}"/><rect x="220" y="76" width="16" height="48" fill="${a2}"/><path d="M180 88 L206 74 L226 60 L246 44" fill="none" stroke="${ac}" stroke-width="2"/><circle cx="246" cy="44" r="4" fill="${ac}"/>`,
    nodes:`<line x1="176" y1="104" x2="214" y2="70" stroke="${ac}" stroke-width="1.8"/><line x1="214" y1="70" x2="252" y2="104" stroke="${ac}" stroke-width="1.8"/><line x1="176" y1="104" x2="252" y2="104" stroke="${ac}" stroke-width="1.2" stroke-dasharray="4 4"/><circle cx="176" cy="104" r="12" fill="#fff" stroke="${ac}" stroke-width="2"/><circle cx="214" cy="70" r="12" fill="#fff" stroke="${ac}" stroke-width="2"/><circle cx="252" cy="104" r="12" fill="#fff" stroke="${ac}" stroke-width="2"/>`,
    laptop:`<rect x="180" y="70" width="62" height="40" rx="3" fill="#fff" stroke="${ac}" stroke-width="2"/><path d="M170 118 L252 118 L246 110 L176 110 Z" fill="${a3}" stroke="${ac}" stroke-width="1.6"/><rect x="152" y="98" width="20" height="20" fill="${a2}"/>`,
    book:`<path d="M168 76 Q190 68 210 78 Q230 68 252 76 L252 120 Q230 112 210 122 Q190 112 168 120 Z" fill="#fff" stroke="${ac}" stroke-width="2"/><line x1="210" y1="78" x2="210" y2="122" stroke="${ac}" stroke-width="1.6"/><path d="M176 88 h24 M176 98 h24 M220 88 h24 M220 98 h24" stroke="${a2}" stroke-width="1.6"/>`,
    sprout:`<path d="M210 124 L210 86" stroke="${ac}" stroke-width="2"/><path d="M210 96 Q186 92 180 70 Q204 72 210 96 Q216 66 242 62 Q236 90 210 96" fill="${a3}" stroke="${ac}" stroke-width="1.6"/>`,
    stars:`<circle cx="210" cy="78" r="44" fill="none" stroke="${a2}" stroke-width="1.4"/><path d="M180 64 L214 48 L246 74 L230 108 L192 104 Z" fill="none" stroke="${ac}" stroke-width="1.4"/>${[[180,64],[214,48],[246,74],[230,108],[192,104]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.4" fill="${ac}"/>`).join('')}`
  };
  return `<svg width="300" height="150" viewBox="0 0 300 150">${kind==='stars'?'':hill}${art[kind]||art.sprout}</svg>`;
}
function rpLineSVG(pts,ac){
  const W=634,H=230,px=36,top=26,bot=34,n=pts.length;if(n<2)return '';
  const x=i=>px+i*(W-px-14)/(n-1),y=v=>top+(H-top-bot)*(1-v/100);
  const P=pts.map((p,i)=>[x(i),y(p.v)]);
  const line=P.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const grid=[0,25,50,75,100].map(v=>`<line x1="${px}" x2="${W-14}" y1="${y(v)}" y2="${y(v)}" stroke="#ebe7dc"/><text x="${px-10}" y="${y(v)+4}" font-size="10" fill="#9aa198" text-anchor="end">${v}</text>`).join('');
  return `<svg class="rp-svgchart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${grid}<path d="${line} L${P[n-1][0]},${y(0)} L${P[0][0]},${y(0)} Z" fill="${tint(ac,.16)}"/><path d="${line}" fill="none" stroke="${ac}" stroke-width="2"/>${P.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${pts[i].cur?5.5:4.2}" fill="${pts[i].cur?ac:'#fff'}" stroke="${ac}" stroke-width="1.6"/><text x="${p[0]}" y="${p[1]-11}" font-size="11" fill="#252c2b" text-anchor="middle">${pts[i].v}</text><text x="${p[0]}" y="${H-10}" font-size="10.5" fill="#5f6a62" text-anchor="middle">${esc(pts[i].l)}</text>`).join('')}</svg>`;
}
function rpRadarSVG(items,ac){
  const S=330,c=S/2,r=112,n=items.length;
  const pt=(i,k)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [c+Math.cos(a)*r*k,c+Math.sin(a)*r*k];};
  const ring=k=>items.map((_,i)=>pt(i,k).map(v=>v.toFixed(1)).join(',')).join(' ');
  return `<svg class="rp-svgchart" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${[.25,.5,.75,1].map(k=>`<polygon points="${ring(k)}" fill="none" stroke="#e3dfd3"/>`).join('')}${items.map((_,i)=>{const [a,b]=pt(i,1);return `<line x1="${c}" y1="${c}" x2="${a.toFixed(1)}" y2="${b.toFixed(1)}" stroke="#e3dfd3"/>`;}).join('')}<polygon points="${items.map(([,v],i)=>pt(i,Math.max(.1,v/100)).map(z=>z.toFixed(1)).join(',')).join(' ')}" fill="${tint(ac,.28)}" stroke="${ac}" stroke-width="1.6"/>${items.map(([,v],i)=>{const [a,b]=pt(i,Math.max(.1,v/100));return `<circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="3" fill="${ac}"/>`;}).join('')}${items.map(([l],i)=>{const [a,b]=pt(i,1.18);return `<text x="${a.toFixed(1)}" y="${(b+4).toFixed(1)}" font-size="12" fill="#252c2b" text-anchor="middle">${esc(l)}</text>`;}).join('')}</svg>`;
}
function rpPillarCell(stem,isStem){
  if(stem==null)return `<div class="cell" style="background:#efece2"><span style="font-size:13px;color:#9aa198">모름</span></div>`;
  const oh=isStem?SOH[stem]:BOH[stem];
  return `<div class="cell" style="background:${OH_TINT[oh]}">${isStem?STEMKO[stem]:BRCHKO[stem]}<small>${OH_WORD[oh]}</small></div>`;
}
function rpVis(pg,d,spec,F){
  const v=pg.vis||'',ac=spec.accent,s=d.saju,pi=pg.pi,f=k=>F[k]||'';
  if(v==='pillars'){
    const ps=[s.yp,s.mp,s.dp,s.hp],ds=s.dp.stem;
    const tg=(p,i)=>!p?'시간 모름':i===2?'나 (일간)':plainTGBoard(tenGod(ds,p.stem));
    return `<div class="rp-pil"><div class="hd">구분</div>${['연주','월주','일주','시주'].map(l=>`<div class="hd">${l}</div>`).join('')}<div class="lb">천간</div>${ps.map(p=>rpPillarCell(p?p.stem:null,true)).join('')}<div class="lb">지지</div>${ps.map(p=>rpPillarCell(p?p.branch:null,false)).join('')}<div class="lb">십성</div>${ps.map((p,i)=>`<div class="tgc">${esc(tg(p,i))}</div>`).join('')}</div>`;
  }
  if(v==='pillarsAB'&&d.partner){
    const row=(lab,sj)=>`<div class="lb">${lab}</div>`+[sj.yp,sj.mp,sj.dp,sj.hp].map(p=>p?`<div class="cell" style="background:${OH_TINT[SOH[p.stem]]};font-size:17px">${STEMKO[p.stem]}${BRCHKO[p.branch]}<small>${OH_WORD[SOH[p.stem]]}·${OH_WORD[BOH[p.branch]]}</small></div>`:`<div class="cell" style="background:#efece2"><span style="font-size:13px;color:#9aa198">모름</span></div>`).join('');
    return `<div class="rp-pil"><div class="hd">구분</div>${['연주','월주','일주','시주'].map(l=>`<div class="hd">${l}</div>`).join('')}${row('A · 본인',s)}${row('B · 상대',d.partner.saju)}</div>`;
  }
  if(/^sliders:/.test(v)){
    const sl=SLIDERS[v.split(':')[1]];
    return `<div class="rp-sl">${sl.map(([k,a,b,fn])=>{const x=Math.max(8,Math.min(92,fn(d.persona)));return `<div class="row"><div class="k">${k}</div><div><div class="ends"><span>${a}</span><span>${b}</span></div><div class="track"><div class="fill" style="width:${x}%"></div><div class="knob" style="left:${x}%"></div></div></div></div>`;}).join('')}</div><p class="rp-cap">사주팔자의 기운 분포로 계산한 성향이에요 · 좋고 나쁨이 아니라 기울기예요</p>`;
  }
  if(v==='pair'&&d.persona2){
    return `<p class="rp-cap" style="text-align:left;margin:0 0 12px;font-weight:700;color:#252c2b">두 사람의 성향 비교</p><div class="rp-pair">${PAIR_ROWS.map(([k,fn])=>`<div class="row"><span>${k}</span><div class="rbars"><div class="bar"><i style="width:${fn(d.persona)}%"></i></div><div class="bar b"><i style="width:${fn(d.persona2)}%"></i></div></div><div class="ab">A<br>B</div></div>`).join('')}</div><div class="rp-legend"><span><i style="background:${tint(ac,.55)}"></i>A · 본인</span><span><i style="background:#c9a08f"></i>B · 상대</span></div><p class="rp-cap">두 사람을 이해하기 위한 비교예요 · 궁합의 확률이 아니에요</p>`;
  }
  if(/^line:/.test(v)){const L=rpLine(d,v.split(':')[1]);return `<p class="rp-cap" style="text-align:left;margin:0 0 4px;font-weight:700;color:#252c2b">${esc(L.cap)}</p>${rpLineSVG(L.pts,ac)}<p class="rp-cap">점수는 흐름을 비교하기 위한 지수예요 · 확률이나 수익률이 아니에요</p>`;}
  if(v==='radar'){const R=rpRadar(d);return `<div style="display:flex;align-items:center;gap:26px;margin:0 0 4px">${rpRadarSVG(R,ac)}<div style="flex:1"><p style="font-size:13px;font-weight:800;color:#252c2b;margin:0 0 12px">${R.length}대 영역 요약</p>${R.map(([l,x])=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;color:#4d5650"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${ac};margin-right:8px"></i>${l}</span><b style="font-weight:400;color:#252c2b">${x}</b></div>`).join('')}</div></div><p class="rp-cap">앞으로 10년 해마다 점수의 평균이에요</p>`;}
  if(/^steps:/.test(v)){const L=STEPS[v.split(':')[1]];return `<div class="rp-steps">${L.map((l,i)=>`${i?'<span class="ar">→</span>':''}<div class="st"><div class="c">${pad2(i+1)}</div><div class="l">${l}</div></div>`).join('')}</div><p class="rp-cap">단계마다의 상황과 다음 행동을 아래 풀이에 담았어요</p>`;}
  if(/^theme:/.test(v))return `<div class="rp-theme"><small>THEME READING</small><div class="core">${txt(f(`p${pi}core`))}</div><div class="kw">${esc(f(`p${pi}kw1`))}&nbsp;&nbsp;·&nbsp;&nbsp;${esc(f(`p${pi}kw2`))}</div><div class="cap">나의 기질 · 시기의 변화 · 실천 방향</div>${rpIllust(v.split(':')[1],ac)}</div>`;
  if(v==='zwTheme'){const z=d.zw,me=z.palaces.find(p=>p.name==='명궁');return `<div class="rp-theme"><small>ZI WEI DOU SHU</small><div class="core">${txt(f(`p${pi}core`))}</div><div class="kw">명궁 ${BRCHKO[me.branch]}궁&nbsp;&nbsp;·&nbsp;&nbsp;신궁 ${ZW_SHOW(z.shenPalace.name)}&nbsp;&nbsp;·&nbsp;&nbsp;${esc(me.stars.join('·')||'빈 방')}</div>${rpIllust('stars',ac)}</div>`;}
  if(v==='zwChart'){
    const z=d.zw,pos={5:[1,1],6:[1,2],7:[1,3],8:[1,4],4:[2,1],9:[2,4],3:[3,1],10:[3,4],2:[4,1],1:[4,2],0:[4,3],11:[4,4]};
    const dec=b=>(z.decades.find(x=>x.palace.branch===b)||{});
    const li=z.li||{};
    return `<div class="rp-zw">${z.palaces.map(p=>{const [r,c]=pos[p.branch];const dd=dec(p.branch);return `<div class="zc${p.name==='명궁'?' me':''}" style="grid-row:${r};grid-column:${c}"><b>${ZW_SHOW(p.name)}${z.shenPalace.branch===p.branch?' · 신궁':''}</b><span class="st">${esc(p.stars.join(' · ')||'빈 방')}</span><br>${STEMKO[p.stem]}${BRCHKO[p.branch]}<br><span class="dc">${dd.from!=null?`대한 ${dd.from}~${dd.to}세`:''}</span></div>`;}).join('')}<div class="zct"><h4>자미두수 명반</h4><span>${esc(d.meta.userName||'')}</span><span>음력 ${li.ly||''}.${li.lm||''}.${li.ld||''}${li.leap?' (윤달)':''} · ${d.meta.hour>=0?`${pad2(d.meta.hour)}시`:'태어난 시간 모름'}</span><span>명궁 ${BRCHKO[z.palaces[0].branch]}궁 · 신궁 ${ZW_SHOW(z.shenPalace.name)} · ${ZW_BUREAU_NAME[z.bureau]||''}</span></div></div><p class="rp-cap">14개 주성 기준 명반이에요 · 별이 없는 빈 방은 마주 보는 궁의 별을 함께 읽어요</p>`;
  }
  if(v==='zwStars'){const z=d.zw,pal=n=>z.palaces.find(p=>p.name===n),me=pal('명궁'),sh=z.shenPalace,out=pal('천이궁');const rows=[['명궁의 주성',me],['신궁의 주성',sh],['마주 보는 천이궁',out]];return rpTable(['항목','확인된 배치','해석 메모'],rows.map(([l,p],r)=>[l,`${p.stars.join('·')||'빈 방'} · ${ZW_SHOW(p.name)}`,f(`p${pi}c${r}a`)]));}
  if(v==='zwSihua'){return rpTable(['항목','확인된 배치','해석 메모'],rpSihua(d).map((r,i)=>[r[0],r[2]?`${r[1]} · ${r[2]}`:`${r[1]} · 보조성(이 명반에는 미배치)`,f(`p${pi}c${i}a`)]));}
  if(v==='zwDecades'){const z=d.zw,ci=z.decades.findIndex(x=>x===z.curDecade||x.from===z.curDecade.from),st=Math.max(0,Math.min(ci-1,z.decades.length-6));return rpTable(['나이','대한 궁','궁 안의 별'],z.decades.slice(st,st+6).map(x=>[`${x.from}~${x.to}세${x.from===z.curDecade.from?' · 지금':''}`,ZW_SHOW(x.palace.name),x.palace.stars.join('·')||'빈 방']));}
  if(v==='zwIndex'){const z=d.zw;return rpTable(['궁','명반에서 확인한 별','풀이 핵심'],ZW_ORDER.map((n,r)=>{const p=z.palaces.find(x=>x.name===n)||{stars:[]};return [ZW_SHOW(n),p.stars.join('·')||'빈 방',f(`p${pi}z${r}`)];}))+'<p class="rp-cap">별 배치는 연·월·일·시 기준 14주성이에요</p>';}
  if(v==='nameBoxes'){
    const nm=d.meta.nmExtra||{},han=nm.han||{},chars=[nm.surname||''].concat(String(nm.given||'').split('')).slice(0,3),hs=[han.surname,han.given1,han.given2];
    const mean=(h,c)=>{if(!h)return '';const e=((HAN_DICT||{})[c]||[]).find(x=>x.han===h);return e?e.meaning:'';};
    return `<div class="rp-names">${chars.map((c,i)=>`<div><b>${esc(c)}</b><small>${i?'이름':'성'}${hs[i]?` · ${esc(hs[i])}${mean(hs[i],c)?' '+esc(mean(hs[i],c)):''}`:' · 한자 미입력'}</small></div>`).join('')}</div>`;
  }
  if(v==='candidates'){const C=d.cands||[];if(!C.length)return '';return rpTable(['항목',...C.map((_,i)=>`후보 ${i+1}`)],[['한글 이름',...C.map(c=>c.name)],['정확한 한자',...C.map(c=>c.han)],['뜻과 발음',...C.map(c=>c.meaning)],['적용 기준',...C.map(c=>c.good)],['검토 의견',...C.map((_,k)=>f(`p${pi}cand${k}`))]],true);}
  if(v==='week:health')return `<table class="rp-week"><tr><th></th>${'월화수목금토일'.split('').map(x=>`<th>${x}</th>`).join('')}</tr>${['수면 리듬','가벼운 활동','식사 규칙','휴식 시간'].map(k=>`<tr><td class="k">${k}</td>${'1234567'.split('').map(()=>'<td><span></span></td>').join('')}</tr>`).join('')}</table><p class="rp-cap">풀이를 일상의 행동으로 옮기는 기록 공간이에요</p>`;
  if(v==='week:study')return `<table class="rp-week plan"><tr><th></th>${'월화수목금토일'.split('').map(x=>`<th>${x}</th>`).join('')}</tr>${['학습','복습','점검'].map(k=>`<tr><td class="k">${k}</td>${'1234567'.split('').map(()=>'<td></td>').join('')}</tr>`).join('')}</table><p class="rp-cap">시험 일정과 실제로 쓸 수 있는 시간에 맞춰 채워 보세요</p>`;
  if(v==='quarters')return `<div>${[1,2,3,4].map(q=>{const ms=d.ny.months.slice((q-1)*3,q*3);return `<div class="rp-q"><b>${q}분기 · ${ms.map(m=>m.month+'월').join('·')} · 평균 ${Math.round(ms.reduce((a,m)=>a+m.sc.total,0)/ms.length)}점</b><div class="t">${esc(f(`q${q}a`))}</div><p>${txt(f(`q${q}b`))}</p></div>`;}).join('')}</div>`;
  if(/^months:/.test(v)){const st=Number(v.split(':')[1]);return `<div>${[st,st+1,st+2].map(m=>{const x=d.ny.months.find(z=>z.month===m)||{};return `<div class="rp-q"><b>${pad2(m)}월 / ${SOLAR_TERMS[m-1]}~${SOLAR_TERMS[m%12]} 전 · ${esc(x.gz||'')}월 · ${x.sc?x.sc.total:''}점</b><div class="t">${esc(f(`m${m}a`))}</div><p>${txt(f(`m${m}b`))}</p><p>${txt(f(`m${m}c`))}</p></div>`;}).join('')}<p class="rp-cap">달의 경계는 절기(절입일) 기준이에요</p></div>`;}
  return '';
}
function rpAfterVis(pg,F){
  const v=pg.vis||'',pi=pg.pi,f=k=>F[k]||'';
  if(v==='situ')return rpTable(['나타날 수 있는 상황','확인할 기준'],[0,1].map(r=>[f(`p${pi}s${r}a`),f(`p${pi}s${r}b`)]));
  if(v==='check')return rpTable(['확인할 항목','현재 상황','다음 행동'],['우선 과제','필요한 준비','도움을 받을 곳'].map((l,r)=>[l,f(`p${pi}c${r}a`),f(`p${pi}c${r}b`)]),true);
  if(v==='talk')return rpTable(['대화 주제','나의 생각','함께 확인할 질문'],['생활과 기대','관계의 속도','경계와 약속'].map((l,r)=>[l,f(`p${pi}c${r}a`),f(`p${pi}c${r}b`)]),true);
  if(v==='childObs')return rpTable(['관찰할 상황','아이의 반응','바꿔볼 환경'],['새로운 활동','놀이와 학습','감정과 관계'].map((l,r)=>[l,f(`p${pi}c${r}a`),f(`p${pi}c${r}b`)]),true);
  if(v==='prep')return rpTable(['함께 준비할 일','현재 상황','다음 행동'],['시간과 돌봄','일과 생활','지원 환경','상담 질문'].map((l,r)=>[l,f(`p${pi}c${r}a`),f(`p${pi}c${r}b`)]),true);
  if(v==='nameCheck')return rpTable(['확인 항목','후보별 확인 내용'],['정확한 글자','발음과 사용성','본인의 선호','공식 사용'].map((l,r)=>[l,f(`p${pi}c${r}a`)]),true);
  return '';
}
// 표 위치 — 템플릿처럼 상단 도표형은 소제목 위, 나머지(상황표·확인표)는 소제목 아래 또는 위
const RP_TABLE_TOP={check:1,talk:1,childObs:1,prep:1,nameCheck:1};
function rpTable(head,rows,keyCol){return `<table class="rp-tbl"><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map((c,i)=>`<td${keyCol&&i===0?' class="k"':''}>${txt(c)}</td>`).join('')}</tr>`).join('')}</table>`;}

// ── 쪽 만들기 ──
function rpShell(host,spec,d,o){
  const pg=document.createElement('div');pg.className='rp-page';
  pg.style.setProperty('--ac',spec.accent);pg.style.setProperty('--ac2',tint(spec.accent,.55));pg.style.setProperty('--ac3',tint(spec.accent,.12));
  const who=d.meta.userName?`${esc(d.meta.userName)} 님`:'';
  pg.innerHTML=`<div class="rp-top"><span>${esc(spec.name)} 보고서</span><span>${who}</span></div>${o.tab?'<div class="rp-tab"></div>':''}${o.ey?`<p class="rp-ey">${esc(o.ey)}</p>`:''}${o.title?`<h2 class="rp-title">${esc(o.title)}</h2>`:''}${o.sub?`<p class="rp-sub">${txt(o.sub)}</p>`:''}<div class="rp-body"></div><div class="rp-foot"><span>${RP_BRAND} · ${esc(spec.name)}</span><b></b></div>`;
  host.appendChild(pg);return pg;
}
function rpFlow(host,spec,d,o,blocks){
  // blocks: [{html, keep}] — keep이면 다음 블록과 같은 쪽에 둔다
  const pages=[];let pg=rpShell(host,spec,d,o),body=pg.querySelector('.rp-body');pages.push(pg);
  // 서버(리눅스 크롬)와 사용자 기기의 글자 폭이 조금 달라도 잘리지 않게 쪽마다 한 줄 남짓 여유를 둔다
  const fits=()=>{
    if(body.scrollHeight>body.clientHeight+1)return false;
    const last=body.lastElementChild;if(!last)return true;
    const used=last.getBoundingClientRect().bottom-body.getBoundingClientRect().top+(parseFloat(getComputedStyle(last).marginBottom)||0);
    return used<=body.clientHeight-RP_SAFE;
  };
  const cont=()=>{pg=rpShell(host,spec,d,{...o,ey:(o.ey||'')+' · 이어서',sub:''});body=pg.querySelector('.rp-body');pages.push(pg);};
  const make=h=>{const t=document.createElement('div');t.innerHTML=h;return t.firstElementChild?(t.childElementCount===1?t.firstElementChild:t):t;};
  for(let i=0;i<blocks.length;i++){
    const b=blocks[i],el=make(b.html),nx=b.keep&&blocks[i+1]?make(blocks[i+1].html):null;
    body.appendChild(el);if(nx)body.appendChild(nx);
    const ok=fits();if(nx)nx.remove();
    if(ok)continue;
    el.remove();
    if(body.childElementCount)cont();
    body.appendChild(el);
  }
  return pages;
}
function rpCover(host,spec,d,F){
  const pg=document.createElement('div');pg.className='rp-page rp-cover';pg.style.setProperty('--ac',spec.accent);
  const dt=new Date(),date=`${dt.getFullYear()}.${pad2(dt.getMonth()+1)}.${pad2(dt.getDate())}`,nm=d.meta.userName;
  pg.innerHTML=`<p class="brand">${RP_BRAND} &nbsp;/&nbsp; <em>PERSONAL READING</em></p>${rpEmblem(spec.accent)}<p class="ey">${esc(spec.en)}</p><p class="kick">${esc(spec.kicker)}</p><h1>${esc(spec.name)}</h1><p class="lead">${esc(spec.sub)}</p><p class="intro">${txt(F.intro||'')}</p><div class="who"><b>${nm?`${esc(nm)} 님의 ${esc(spec.name)}`:`나의 ${esc(spec.name)}`}</b><span>${date} 발행 · ${esc(rpBasisLine(d))}</span><em>PREMIUM READING</em></div>`;
  host.appendChild(pg);return pg;
}
function rpBasisLine(d){const m=d.meta;return `${m.sy}년 ${m.sm}월 ${m.sd}일생 · ${m.gender==='female'?'여성':'남성'} · 만세력 기준 사주팔자`;}
function rpInfoRows(spec,d){
  const m=d.meta,ctx=(()=>{try{const c=buildSajuContextForChat('paid-report');return c&&c.situation?String(c.situation):'';}catch(e){return '';}})();
  const none='따로 입력하지 않았어요 · 사주 흐름으로 풀었어요';
  const marital={single:'혼자예요',dating:'연애 중이에요',married:'기혼이에요'}[m.marital]||'';
  const cur=d.curDaeun?`${d.curDaeun.age}~${d.curDaeun.age+9}세 대운 · ${d.age}세`:`${d.age}세`;
  const z=d.zw,ny=d.nyYear;
  const map={
    '현재 관심사':ctx||'일 · 관계 · 생활 전반','삶의 주요 변화':`지금은 ${cur}`,'운세 대상 연도':`${ny||d.y0}년`,'올해의 주요 계획':ctx||none,
    '관계의 형태':{dating:'연인',married:'부부'}[m.marital]||none,'관계 기간과 현재 상황':ctx||none,
    '요청 구분':'기존 이름 풀이 · 사주에 맞는 추천 이름','현재 이름과 정확한 한자':(()=>{const n=m.nmExtra||{},h=n.han||{};const hs=[h.surname,h.given1,h.given2].filter(Boolean).join('');return `${n.surname||''}${n.given||''}${hs?` (${hs})`:' · 한자 미입력'}`;})(),'작명 선호와 조건':none,
    '음력 및 윤달 정보':z&&z.li?`음력 ${z.li.ly}년 ${z.li.lm}월 ${z.li.ld}일${z.li.leap?' · 윤달':''}`:none,'명반 산출 및 해석 기준':'음력 생일 · 태어난 시 · 14주성 배치','명궁 · 신궁 · 오행국':z?`명궁 ${BRCHKO[z.palaces[0].branch]}궁 · 신궁 ${ZW_SHOW(z.shenPalace.name)} · ${ZW_BUREAU_NAME[z.bureau]||''}`:none,
    '현재 관계 상황':marital||none,'연애에서 궁금한 점':ctx||none,'현재 수입 및 업무 형태':none,'재물 관련 관심사':ctx||none,'현재 직무와 경력 단계':none,'앞으로의 관심 방향':ctx||none,
    '현재 혼인 및 관계 상황':marital||none,'공동생활의 관심사':ctx||none,'이별 또는 거리 두기 시점':none,'현재 연락 상태':none,'다시 생각하는 이유':ctx||none,
    '학업 또는 시험 목표':ctx||none,'시험 및 목표 일정':none,'현재 준비 상황':none,'아이의 현재 연령':`${d.age}세 · ${typeof stageLabelOf==='function'?stageLabelOf(d.age):''}`,'보호자와 양육 환경':none,'관찰된 관심과 어려움':ctx||none,
    '현재 가족과 계획 상황':marital||none,'자녀 계획에 대한 생각':ctx||none,'함께 검토할 생활 여건':none,'현재 생활 리듬':none,'생활 관리의 관심사':ctx||none
  };
  const user=d.info||{};
  return spec.info.map(k=>[k,user[k]||map[k]||none]);
}
function rpInfoPage(host,spec,d){
  const m=d.meta,cal=(typeof _lastInputs==='object'&&_lastInputs&&_lastInputs.calType==='lunar')?`음력${_lastInputs.isLeap?' · 윤달':''}`:'양력';
  const city=(()=>{try{return cityLabelOf(m.cityKey);}catch(e){return '';}})();
  const birth=`${m.sy}.${pad2(m.sm)}.${pad2(m.sd)}`,time=m.hour>=0?`${pad2(m.hour)}:${pad2(m.min||0)}`:'모름';
  let html;
  if(spec.pair&&d.partner){
    const p=d.partner.meta,gn=d.partner.gn;
    html=rpTable(['구분','A','B'],[['이름',m.userName||'본인','상대'],['생년월일',birth,`${p.sy}.${pad2(p.sm)}.${pad2(p.sd)}`],['양력 / 음력',cal,gn.cal==='lunar'?`음력${gn.leap?' · 윤달':''}`:'양력'],['출생 시각',time,gn.gh>=0?`${pad2(gn.gh)}:${pad2(gn.gmin||0)}`:'모름'],['출생 지역',city,(()=>{try{return cityLabelOf(gn.cityKey);}catch(e){return '';}})()]],true);
  }else html=rpTable(['구분','입력 정보'],[['이름',m.userName||'입력하지 않음'],['생년월일',birth],['달력 구분',cal],['출생 시각',time],['출생 지역',city]],true);
  html+=rpTable(['상담 및 해석 기준','입력 정보'],rpInfoRows(spec,d).concat([['명식 기준',spec.pair?'두 사람 모두 만세력 기준 사주팔자':(d.cat==='ziwei'?'음력 명반 + 만세력 사주팔자':'만세력 기준 사주팔자 · 출생 지역 시차 보정')]]),true);
  html+=`<h3 class="rp-h" style="margin-top:26px">풀이를 읽는 기준</h3><p class="rp-p">${txt(spec.note||NOTE_DEFAULT)}</p>`;
  return rpFlow(host,spec,d,{tab:true,ey:'BEFORE READING',title:'기본 정보와 풀이 기준',sub:spec.sub},[{html:`<div>${html}</div>`}]);
}
function rpGlancePage(host,spec,d,F){
  const L=spec.glance||GL_DEFAULT,q=spec.glanceQ==='@nyq'?`${d.nyYear}년에는 무엇을 넓히고 무엇을 정리하면 좋을까요?`:spec.glanceQ;
  const html=`<div><p class="rp-quote">“${txt(F.gq)}”</p><div class="rp-keys"><div><b>중심 주제</b><span>${esc(F.gk1)}</span></div><div><b>살릴 강점</b><span>${esc(F.gk2)}</span></div><div><b>우선할 행동</b><span>${esc(F.gk3)}</span></div></div>${L.map((l,i)=>`<div class="rp-num"><em>${pad2(i+1)}</em><div><b>${esc(l)}</b><p>${txt(F['gi'+(i+1)])}</p></div></div>`).join('')}</div>`;
  return rpFlow(host,spec,d,{tab:true,ey:'AT A GLANCE',title:'풀이 한눈에 보기',sub:q},[{html}]);
}
function rpChapterPages(host,spec,d,pg,S,F){
  const sub=pg.sub==='@early'||pg.sub==='@late'?(rpLifeRange(d,pg.sub)||F[`p${pg.pi}sub`]):pg.sub==='@nysub'?`${d.nyYear}년의 변화와 원국·대운의 관계를 함께 읽어요.`:(pg.sub||F[`p${pg.pi}sub`]||'');
  const blocks=[];const vis=rpVis(pg,d,spec,F),after=rpAfterVis(pg,F),top=RP_TABLE_TOP[pg.vis];
  if(vis)blocks.push({html:`<div>${vis}</div>`});
  if(after&&top)blocks.push({html:`<div>${after}</div>`});
  pg.h.forEach((h,k)=>{const ps=S[`p${pg.pi}h${k}`]||[];blocks.push({html:`<h3 class="rp-h">${esc(h)}</h3>`,keep:true});ps.forEach(p=>blocks.push({html:`<p class="rp-p">${txt(p)}</p>`}));});
  if(after&&!top)blocks.push({html:`<div style="margin-top:14px">${after}</div>`});
  return rpFlow(host,spec,d,{tab:true,ey:pg.ey,title:pg.t,sub},blocks);
}
function rpSummaryPage(host,spec,d,F){
  const L=['계속 살릴 강점','새롭게 조정할 부분','지금 시작할 행동'];
  const blocks=[{html:`<div><p class="rp-quote">“${txt(F.sq)}”</p>${L.map((l,i)=>`<div class="rp-num"><em>${pad2(i+1)}</em><div><b>${l}</b><p>${txt(F['si'+(i+1)])}</p></div></div>`).join('')}</div>`},{html:'<h3 class="rp-h" style="margin-top:26px">앞으로의 나에게</h3>',keep:true},{html:`<p class="rp-p">${txt(F.send)}</p>`}];
  return rpFlow(host,spec,d,{tab:true,ey:'YOUR NEXT STEP',title:'종합 정리와 실천',sub:'풀이를 읽은 뒤의 선택과 행동을 정리해요.'},blocks);
}
function rpContinued(host,spec,d,budget){
  const blocks=[];let used=0;
  d.sections.forEach((s,i)=>{
    if(used>budget)return;
    blocks.push({html:`<h3 class="rp-h rp-serif" style="font-size:21px;font-weight:400;margin-top:${i?30:4}px">${pad2(i+1)}&nbsp;&nbsp;${esc(s.title)}</h3>`,keep:true});
    s.blocks.forEach(b=>{if(used>budget)return;if(b.h){blocks.push({html:`<h3 class="rp-h" style="font-size:14.5px">${esc(b.h)}</h3>`,keep:true});}else{used+=b.p.length;blocks.push({html:`<p class="rp-p">${txt(b.p)}</p>`});}});
    while(blocks.length&&blocks[blocks.length-1].keep)blocks.pop();
  });
  if(!blocks.length)return [];
  return [{title:'상세 풀이',pages:rpFlow(host,spec,d,{tab:true,ey:'CONTINUED READING',title:'상세 풀이',sub:'화면에서 본 풀이 전문을 장별로 이어서 담았어요.'},blocks)}];
}
function rpTocPage(host,spec,d,entries){
  const html=`<ol class="rp-toc">${entries.map(([t,n])=>`<li><span>${esc(t)}</span><b>${pad2(n)}</b></li>`).join('')}</ol>`;
  return rpFlow(host,spec,d,{tab:false,ey:'CONTENTS',title:'차례',sub:'관심 있는 주제부터 읽고, 보고서 전체의 흐름으로 이어 가세요.'},[{html}]);
}
function rpCount(pages){return pages.reduce((n,p)=>n+clean(p.querySelector('.rp-body')?p.querySelector('.rp-body').textContent:p.textContent).length,0);}

// ── 진입점 ──
async function buildTemplateReport(cat,opts){
  opts=opts||{};const prog=opts.onProgress||(()=>{});
  const spec=SPECS[cat];if(!spec)throw new Error('지원하지 않는 리포트예요.');
  if(!_saju||!_meta)throw new Error('사주 정보가 없어요.');
  rpStyle();const fontLoad=rpFonts();
  prog('풀이를 모으는 중이에요');
  const d=rpCollect(cat);d.info=rpCleanInfo(opts.info);
  if(cat==='gunghap'&&!d.partner)throw new Error('상대 정보가 없어요.');
  const plan=rpPlan(spec,d);
  prog(`천기가 보고서를 쓰는 중이에요 (0/${plan.groups.length}) · 2~3분 걸려요`);
  const ai=opts.skipAI?{secs:{},fields:{},okGroups:0}:await rpAI(spec,d,plan,(n,t)=>prog(`천기가 보고서를 쓰는 중이에요 (${n}/${t}) · 2~3분 걸려요`),opts);
  const {secs:S,fields:F}=rpFill(plan,ai,d);
  prog('보고서 쪽을 짜는 중이에요');
  await fontLoad;
  const host=document.createElement('div');host.className='rp-host';document.body.appendChild(host);
  try{
    // 글꼴이 다 내려온 뒤에 쪽을 나눠야 줄 수가 맞는다 — 모든 글자를 한 번 그려 글꼴 조각을 받아 둔다
    const warm=document.createElement('div');warm.className='rp-page';warm.style.height='auto';
    warm.innerHTML=`<div class="rp-serif">${esc(spec.name+spec.sub+spec.kicker)}${spec.pages.map(p=>esc(p.t)).join('')}</div><div>${Object.values(F).map(esc).join(' ')} ${Object.values(S).flat().map(esc).join(' ')} ${d.sections.map(s=>esc(s.title)+s.blocks.map(b=>esc(b.p||b.h)).join(' ')).join(' ')}</div><b>${spec.pages.map(p=>p.h.map(esc).join('')).join('')}</b>`;
    host.appendChild(warm);await rpFontsReady();warm.remove();
    const cover=rpCover(host,spec,d,F);
    const tocSlot=document.createElement('div');host.appendChild(tocSlot);
    const info=rpInfoPage(host,spec,d),glance=rpGlancePage(host,spec,d,F);
    const chapters=plan.pages.map(pg=>({title:pg.t,pages:rpChapterPages(host,spec,d,pg,S,F)}));
    const summary=rpSummaryPage(host,spec,d,F);
    const mainPages=[...info,...glance,...chapters.flatMap(c=>c.pages),...summary];
    const budget=Math.max(3000,RP_MAX_CHARS-rpCount(mainPages)-600);
    const cont=rpContinued(host,spec,d,budget);
    // 차례 — 표지(1)·차례(2) 다음부터 번호를 매긴다
    let n=3;const entries=[];
    const push=(t,ps)=>{entries.push([t,n]);n+=ps.length;};
    push('기본 정보와 풀이 기준',info);push('풀이 한눈에 보기',glance);chapters.forEach(c=>push(c.title,c.pages));push('종합 정리와 실천',summary);
    cont.forEach(c=>push('상세 풀이 · 화면 풀이 전문',c.pages));
    const toc=rpTocPage(host,spec,d,entries);
    tocSlot.replaceWith(...toc);
    const all=[...host.querySelectorAll('.rp-page')];
    all.forEach((p,i)=>{const b=p.querySelector('.rp-foot b');if(b)b.textContent=pad2(i+1);});
    const chars=rpCount(all);
    if(opts.dryRun)return {host,pages:all,chars,ai:ai.okGroups,groups:plan.groups.length};
    const m=d.meta,fileName=`${RP_BRAND.replace(/\s/g,'')}_${spec.file}_리포트_${m.sy}${pad2(m.sm)}${pad2(m.sd)}.pdf`,base={fileName,title:`${spec.name} 리포트`,pages:all.length,chars,ai:ai.okGroups,groups:plan.groups.length};
    // 1순위 — 서버 브라우저로 인쇄(글자 선택·검색 가능, 용량 작음). 무료 한도를 넘거나 실패하면 아래 이미지 방식으로 만든다.
    if(!opts.imageOnly){
      prog('PDF 파일로 만드는 중이에요');
      const blob=await rpServerPdf(rpStandalone(all),opts);
      if(blob){host.remove();return {...base,blob,mode:'text'};}
    }
    const {jsPDF}=window.jspdf,pdf=new jsPDF('portrait','mm','a4');
    // html2canvas 1.4는 color-mix()로 칠한 문서 배경을 읽지 못한다 — 그리는 동안만 일반 색으로 바꿔 둔다
    const roots=[document.documentElement,document.body],saved=roots.map(el=>[el.style.getPropertyValue('background-color'),el.style.getPropertyPriority('background-color')]);
    roots.forEach(el=>el.style.setProperty('background-color','#faf8f3','important'));
    try{
    for(let i=0;i<all.length;i++){
      prog(`${i+1} / ${all.length}쪽을 그리는 중이에요`);
      const canvas=await html2canvas(all[i],{scale:1.5,backgroundColor:'#faf8f3',useCORS:true,logging:false,width:RP_W,height:RP_H,windowWidth:RP_W});
      if(i)pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.8),'JPEG',0,0,210,297);
      canvas.width=canvas.height=0;
    }
    }finally{roots.forEach((el,i)=>{if(saved[i][0])el.style.setProperty('background-color',saved[i][0],saved[i][1]);else el.style.removeProperty('background-color');});}
    host.remove();
    return {...base,blob:pdf.output('blob'),mode:'image'};
  }catch(e){host.remove();throw e;}
}
// ── 보고서에 반영할 정보 묻기 — 템플릿의 '상담 및 해석 기준' 칸. 모두 선택이고 건너뛸 수 있다 ──
const INFO_ASK={
  '현재 관심사':{o:['일·직업','돈','연애·결혼','가족','건강','공부'],multi:1},
  '삶의 주요 변화':{ph:'예: 이직을 고민 중, 이사 예정'},
  '올해의 주요 계획':{o:['이직·취업','이사','결혼','공부·시험','창업','건강 관리'],multi:1,ph:'그 밖의 계획(선택)'},
  '관계의 형태':{o:['연인','부부','썸','동업','가족·기타']},
  '관계 기간과 현재 상황':{ph:'예: 2년째 연애 중, 결혼 이야기 중'},
  '요청 구분':{o:['기존 이름 풀이','아기 작명','개명 검토','활동명']},
  '작명 선호와 조건':{ph:'예: 부르기 쉬운 두 글자, 돌림자 준'},
  '현재 관계 상황':{o:['비연애','썸','연애 중','관계 정리 중']},
  '연애에서 궁금한 점':{ph:'예: 언제쯤 인연이 올지'},
  '현재 수입 및 업무 형태':{o:['직장','사업','프리랜서','학생·준비 중','기타']},
  '재물 관련 관심사':{o:['수입 늘리기','지출 관리','저축·자산','사업','빚 관리'],multi:1},
  '현재 직무와 경력 단계':{o:['준비 중','1~3년차','4~9년차','10년 이상','관리자']},
  '앞으로의 관심 방향':{o:['지금 일 유지','이직','직무 전환','독립·창업'],multi:1},
  '현재 혼인 및 관계 상황':{o:['미혼','연애 중','결혼 준비','기혼']},
  '공동생활의 관심사':{o:['생활 습관','돈','양가 가족','주거','자녀'],multi:1},
  '이별 또는 거리 두기 시점':{o:['1개월 이내','6개월 이내','1년 이내','1년 넘게']},
  '현재 연락 상태':{o:['가끔 연락','연락 끊김','상대가 연락을 원하지 않음']},
  '다시 생각하는 이유':{ph:'예: 서로 오해가 있었던 것 같아서'},
  '학업 또는 시험 목표':{ph:'예: 공무원 9급, 수능, 자격증'},
  '시험 및 목표 일정':{ph:'예: 2027년 4월 / 미정'},
  '현재 준비 상황':{o:['시작 전','기초 다지는 중','문제 풀이 중','마무리 단계']},
  '보호자와 양육 환경':{ph:'예: 맞벌이, 할머니가 함께 돌봄'},
  '관찰된 관심과 어려움':{ph:'예: 그림을 좋아하고 낯을 가림'},
  '현재 가족과 계획 상황':{o:['결혼 전','신혼','자녀 있음','계획을 정하지 않음']},
  '자녀 계획에 대한 생각':{o:['생각해 보는 중','계획 중','준비 중','아직 없음']},
  '함께 검토할 생활 여건':{o:['시간','일','돌봄','경제적 지원'],multi:1},
  '현재 생활 리듬':{o:['규칙적','불규칙','교대 근무','밤에 활동']},
  '생활 관리의 관심사':{o:['수면','식사','운동','스트레스'],multi:1}
};
const RP_INFO_LS='rp_report_info_v1';
function rpCleanInfo(info){const o={};Object.entries(info||{}).forEach(([k,v])=>{const t=String(v||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,60);if(t&&INFO_ASK[k])o[k]=t;});return o;}
function rpHash(t){let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return (h>>>0).toString(36);}
function rpInfoLoad(cat){try{const all=JSON.parse(localStorage.getItem(RP_INFO_LS)||'{}');const scope=(typeof unlockScopeOf==='function'?unlockScopeOf(cat):'')||'';const v=all[cat+'|'+scope];return v&&v.exp>Date.now()?v.info:null;}catch(e){return null;}}
function rpInfoSave(cat,info){try{const all=JSON.parse(localStorage.getItem(RP_INFO_LS)||'{}');const now=Date.now();Object.keys(all).forEach(k=>{if(!all[k]||all[k].exp<now)delete all[k];});const scope=(typeof unlockScopeOf==='function'?unlockScopeOf(cat):'')||'';all[cat+'|'+scope]={info,exp:now+24*3600e3};localStorage.setItem(RP_INFO_LS,JSON.stringify(all));}catch(e){}}
function rpInfoGuess(cat){
  const m=_meta||{},g={};
  if(cat==='topic-love')g['현재 관계 상황']={single:'비연애',dating:'연애 중'}[m.marital]||'';
  if(cat==='topic-marriage')g['현재 혼인 및 관계 상황']={single:'미혼',dating:'연애 중',married:'기혼'}[m.marital]||'';
  if(cat==='gunghap')g['관계의 형태']={dating:'연인',married:'부부'}[m.marital]||'';
  return g;
}
function askTemplateReportInfo(cat){
  const spec=SPECS[cat],keys=spec?spec.info.filter(k=>INFO_ASK[k]):[];
  if(!keys.length)return Promise.resolve({});
  rpStyle();
  const prev={...rpInfoGuess(cat),...(rpInfoLoad(cat)||{})};
  return new Promise(done=>{
    const el=document.createElement('div');el.className='rp-ask';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','rpAskTitle');
    const field=(k,i)=>{const a=INFO_ASK[k],v=String(prev[k]||''),sel=v.split(' · ');
      const chips=a.o?`<div class="rp-ask-chips" data-multi="${a.multi?1:0}">${a.o.map(o=>`<button type="button" class="rp-ask-chip${sel.includes(o)?' on':''}" aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join('')}</div>`:'';
      const extra=a.o?sel.filter(x=>!a.o.includes(x)).join(' · '):v;
      const input=a.ph?`<input class="rp-ask-input" type="text" maxlength="60" placeholder="${esc(a.ph)}" value="${esc(extra)}" aria-label="${esc(k)}">`:'';
      return `<div class="rp-ask-f" data-k="${esc(k)}"><b id="rpAskL${i}">${esc(k)}</b>${chips}${input}</div>`;};
    el.innerHTML=`<div class="rp-ask-box"><h3 id="rpAskTitle">보고서에 반영할 정보</h3><p>지금 상황을 고르면 보고서의 기본 정보와 풀이에 함께 반영해요. 모두 선택이에요. 이름 같은 개인 정보는 적지 않아도 돼요.</p>${keys.map(field).join('')}<div class="rp-ask-act"><button type="button" class="rp-ask-skip">건너뛰고 만들기</button><button type="button" class="rp-ask-go">이 내용으로 만들기</button></div><button type="button" class="rp-ask-x" aria-label="닫기">×</button></div>`;
    document.body.appendChild(el);
    el.querySelectorAll('.rp-ask-chips').forEach(box=>box.addEventListener('click',e=>{const b=e.target.closest('.rp-ask-chip');if(!b)return;const multi=box.dataset.multi==='1';if(!multi)box.querySelectorAll('.rp-ask-chip').forEach(x=>{if(x!==b){x.classList.remove('on');x.setAttribute('aria-pressed','false');}});b.classList.toggle('on');b.setAttribute('aria-pressed',String(b.classList.contains('on')));}));
    const collect=()=>{const o={};el.querySelectorAll('.rp-ask-f').forEach(f=>{const vals=[...f.querySelectorAll('.rp-ask-chip.on')].map(b=>b.textContent);const t=f.querySelector('.rp-ask-input');if(t&&t.value.trim())vals.push(t.value.trim());if(vals.length)o[f.dataset.k]=vals.join(' · ');});return rpCleanInfo(o);};
    const close=v=>{el.remove();document.removeEventListener('keydown',onKey);done(v);};
    const onKey=e=>{if(e.key==='Escape')close(null);};document.addEventListener('keydown',onKey);
    el.querySelector('.rp-ask-x').onclick=()=>close(null);
    el.querySelector('.rp-ask-skip').onclick=()=>close({});
    el.querySelector('.rp-ask-go').onclick=()=>{const v=collect();rpInfoSave(cat,v);close(v);};
    const first=el.querySelector('.rp-ask-chip,.rp-ask-input');if(first)first.focus();
  });
}
window.askTemplateReportInfo=askTemplateReportInfo;
// 서버 인쇄용 문서 — 쪽 HTML과 보고서 스타일만 담는다(스크립트 없음)
function rpStandalone(pages){
  const css=RP_CSS+`@page{size:${RP_W}px ${RP_H}px;margin:0}html,body{margin:0;padding:0;background:#faf8f3}.rp-page{break-after:page;page-break-after:always}.rp-page:last-child{break-after:auto;page-break-after:auto}.lv4-nb{white-space:nowrap}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700&display=block"><style>${css}</style></head><body>${pages.map(p=>p.outerHTML).join('')}</body></html>`;
}
async function rpServerPdf(html,opts){
  const ctl=typeof AbortController==='function'?new AbortController():null,timer=ctl?setTimeout(()=>ctl.abort(),70000):0;
  try{
    const token=typeof latestPaidToken==='function'?latestPaidToken():'';
    const resp=await fetch((opts.endpoint||WORKER_URL).replace(/\/$/,'')+'/report-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({html,paidToken:token}),signal:ctl?ctl.signal:undefined});
    if(!resp.ok||!/application\/pdf/.test(resp.headers.get('Content-Type')||''))return null;
    const blob=await resp.blob();
    const head=new Uint8Array(await blob.slice(0,5).arrayBuffer());
    return blob.size>2000&&String.fromCharCode(...head).startsWith('%PDF')?blob:null;
  }catch(e){return null;}
  finally{if(timer)clearTimeout(timer);}
}
window.TEMPLATE_REPORT_SPECS=SPECS;
window.buildTemplateReport=buildTemplateReport;
})();
