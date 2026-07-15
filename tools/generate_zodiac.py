#!/usr/bin/env python3
"""
12 띠 풀이 일괄 생성기
- 12 지지(자~해)별 동물·오행·계절·시진 + 합/삼합/충/형 작용 매핑
- 띠별 성품·연애·직업·건강·결정적 시기 일관 생성
- 본문 1500~2000자 / BlogPosting JSON-LD 포함
"""
import os, json, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'blog', 'zodiac')
SITEMAP_PATH = os.path.join(ROOT, 'sitemap.xml')
HUB_PATH = os.path.join(ROOT, 'blog', 'index.html')

os.makedirs(OUT_DIR, exist_ok=True)

# ── 12 지지 메타 ──
BR_KO = ['자','축','인','묘','진','사','오','미','신','유','술','해']
BR_HJ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
BR_ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
BR_SLUG = ['ja','chuk','in','myo','jin','sa','o','mi','sin','yu','sul','hae']
BR_OH = [4,2,0,0,2,1,1,2,3,3,2,4]  # 0목 1화 2토 3금 4수
OH_KO = ['목','화','토','금','수']
BR_NICK = [
  '한밤중의 깊은 물','겨울 끝 얼어붙은 땅','봄의 시작·새벽','완연한 봄·푸른 잎',
  '봄비 머금은 옥토','한낮을 향한 불기운','한낮의 태양','여름 끝 마른 흙',
  '가을의 시작·바위','가을의 정오·정련된 금','늦가을 마른 흙','겨울 시작·큰 물'
]
BR_BODY = [
  '자정·동지의 응축된 물. 지혜롭고 영민하며 잠재력이 풍부한 자리',
  '대한·겨울의 차가운 흙. 우직하고 인내력 있으며 묵묵히 쌓아가는 자리',
  '입춘 새벽·갓 자라기 시작한 나무. 도전적이고 진취적이며 새 시작에 강한 자리',
  '경칩·완연한 봄의 풀잎. 섬세하고 예술적이며 매력 있는 자리',
  '청명·봄비를 머금은 비옥한 흙. 큰 그릇과 신비한 잠재력을 품은 자리',
  '입하·불의 시작. 명석하고 직관적이며 야망 있는 자리',
  '하지·정오의 강렬한 태양. 활달하고 열정적이며 사교성이 큰 자리',
  '대서·뜨겁게 마른 흙. 따뜻하고 헌신적이며 예술적 감수성이 있는 자리',
  '입추·단단해지기 시작한 금. 영리하고 실리적이며 활동력이 큰 자리',
  '추분·완성된 금. 정확하고 단정하며 완벽주의의 자리',
  '한로·말라 단단해진 흙. 충직하고 책임감 있으며 보수적인 자리',
  '입동·새로 차오르는 큰 물. 순수하고 인정 많으며 깊이 생각하는 자리'
]
BR_HOUR = [
  '자시(23:30~01:30)','축시(01:30~03:30)','인시(03:30~05:30)','묘시(05:30~07:30)',
  '진시(07:30~09:30)','사시(09:30~11:30)','오시(11:30~13:30)','미시(13:30~15:30)',
  '신시(15:30~17:30)','유시(17:30~19:30)','술시(19:30~21:30)','해시(21:30~23:30)'
]
BR_SEASON = [
  '한겨울 자정','늦겨울','초봄 새벽','한봄','봄과 여름의 환절기','초여름',
  '한여름 정오','늦여름','초가을','한가을','늦가을','초겨울'
]

# ── 띠별 동물 본성 (성품 키워드) ──
ANIMAL_TRAITS = {
  '쥐':   {'pos':['영리함','민첩함','재치','생존력','적응력'],
          'neg':['잔걱정','계산적인 면','때로 너무 신중함']},
  '소':   {'pos':['우직함','인내력','꾸준함','근면','신뢰감'],
          'neg':['고집','변화에 느림','말수가 적음']},
  '호랑이':{'pos':['용맹','리더십','도전 정신','기개','정의감'],
          'neg':['독선','거친 표현','참을성 부족']},
  '토끼': {'pos':['섬세함','온화함','예술 감각','매력','평화로움'],
          'neg':['결단력 부족','갈등 회피','감정 기복']},
  '용':   {'pos':['큰 그릇','신비로움','창조력','카리스마','이상주의'],
          'neg':['자만심','현실 감각 부족','외로움']},
  '뱀':   {'pos':['직관','총명','세련됨','매력','전략적 사고'],
          'neg':['의심 많음','속을 잘 안 보임','차가운 인상']},
  '말':   {'pos':['활달함','열정','독립심','모험심','솔직함'],
          'neg':['변덕','끈기 부족','즉흥적 결정']},
  '양':   {'pos':['온정','예술적 감수성','헌신','부드러움','협조'],
          'neg':['우유부단','소심함','자기 주장 약함']},
  '원숭이':{'pos':['영리함','재치','다재다능','사교성','학습 능력'],
          'neg':['변덕','한 분야 집중 부족','겉치레']},
  '닭':   {'pos':['정확함','단정함','완벽주의','실용성','책임감'],
          'neg':['지나친 비판','완벽주의 피로','잔소리']},
  '개':   {'pos':['충직함','정의감','책임감','신의','정직'],
          'neg':['고지식','걱정 많음','융통성 부족']},
  '돼지': {'pos':['순수함','인정','풍요','복록','관대함'],
          'neg':['우유부단','낭비','지나친 신뢰']}
}

# ── 띠별 추천 직업·재물 결 ──
JOB_BY_ANIMAL = {
  '쥐':'기획·전략·금융·IT·정보 분석·연구처럼 영민한 두뇌와 빠른 판단이 필요한 분야',
  '소':'농업·제조·관리·교육·공무원·은행·세무처럼 꾸준함과 책임이 핵심인 분야',
  '호랑이':'리더 포지션·창업·군경·운동·정치·기업 임원처럼 추진력과 결단이 필요한 분야',
  '토끼':'예술·디자인·뷰티·서비스·교육·상담처럼 섬세함과 미감이 필요한 분야',
  '용':'창업·예술·종교·연예·전략 컨설팅·CEO처럼 큰 그릇과 카리스마가 필요한 분야',
  '뱀':'전략 기획·법조·심리상담·연구·투자·정보 분석처럼 직관과 통찰이 필요한 분야',
  '말':'영업·마케팅·운동선수·여행·항공·언론처럼 활동성과 열정이 필요한 분야',
  '양':'예술·디자인·교사·간호·복지·종교·요식처럼 따뜻한 헌신이 필요한 분야',
  '원숭이':'마케팅·영업·기획·연예·교육·창업처럼 재치와 다재다능이 필요한 분야',
  '닭':'회계·법조·관리·디자인·요식·서비스처럼 정확함과 완성도가 핵심인 분야',
  '개':'공직·법조·군경·교육·복지·관리처럼 책임과 정의가 핵심인 분야',
  '돼지':'요식·서비스·교육·복지·예술·자영업처럼 사람과 정성이 핵심인 분야'
}

# ── 띠별 건강 영역 (지지 오행 기반) ──
HEALTH_BY_OH = [
  '간·담·근육·시력 영역(목 영역)을 평생 살펴주세요. 신맛과 녹색 채소·견과류가 보강이 됩니다. 무리한 일정보다 꾸준한 산책·등산이 결에 잘 맞습니다.',
  '심장·소장·혈액순환 영역(화 영역)을 살펴주세요. 쓴맛과 붉은 식재료·구운 음식이 보강이 됩니다. 명상과 가벼운 운동이 본인 결을 살립니다.',
  '위장·비장·소화 영역(토 영역)이 본인 영역입니다. 단맛과 뿌리채소·곡류가 잘 맞습니다. 규칙적인 식사와 생활 리듬이 가장 중요합니다.',
  '폐·대장·면역 영역(금 영역)을 평생 살펴주세요. 매운맛과 흰 식재료·향신료가 보강이 됩니다. 호흡 운동·필라테스가 잘 맞습니다.',
  '신장·방광·생식기 영역(수 영역)을 살펴주세요. 짠맛과 검은 식재료·발효식이 보강이 됩니다. 수영·휴식이 결을 회복시킵니다.'
]

# ── 합/충 ──
HAP6 = [(0,1),(2,11),(3,10),(4,9),(5,8),(6,7)]   # 자축, 인해, 묘술, 진유, 사신, 오미
CHUNG = [(0,6),(1,7),(2,8),(3,9),(4,10),(5,11)]  # 자오, 축미, 인신, 묘유, 진술, 사해
SAMHAP = {
  '수': [8, 0, 4],   # 신자진
  '화': [2, 6, 10],  # 인오술
  '금': [5, 9, 1],   # 사유축
  '목': [11, 3, 7]   # 해묘미
}

def hap_partner(b):
  for a,c in HAP6:
    if a==b: return c
    if c==b: return a
  return None

def chung_partner(b):
  for a,c in CHUNG:
    if a==b: return c
    if c==b: return a
  return None

def samhap_group(b):
  for k,g in SAMHAP.items():
    if b in g: return k, g
  return None, []

CLASSIC_QUOTES = [
  '「적천수(滴天髓)」 — 順其氣勢 則吉, 逆其氣勢 則凶 (그 기세를 따르면 길하고, 거스르면 흉하다)',
  '「궁통보감(窮通寶鑑)」 — 用神得力 一生富貴 (용신이 힘을 얻으면 평생이 부귀롭다)',
  '「자평진전(子平眞詮)」 — 體用不離 動靜相成 (체와 용은 분리되지 않고 동과 정은 서로 이룬다)',
  '「연해자평(淵海子平)」 — 일주가 강건하면 능히 재관(財官)을 감당한다',
  '「궁통보감」 — 寒暖燥濕 各有其時 (춥고 따뜻하고 마르고 습한 것이 모두 때가 있다)',
  '「적천수」 — 中和爲貴 (중화함이 귀하다)'
]

# ── 템플릿 ──
TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>{animal}띠({hj}) 풀이 — 「{nick}」 자리의 본질·연애·직업·건강 | 천지인 사주</title>
<meta name="description" content="{animal}띠({hj}, {ko}지)는 사주의 12지지 중 {idx_ord}번째 자리입니다. 「{nick}」의 결을 가진 {animal}띠의 성품·연애·직업·건강·잘 맞는 띠와 피할 띠를 정리.">
<meta name="keywords" content="{animal}띠, {ko}지, {animal}띠 성격, {animal}띠 연애, {animal}띠 직업, {animal}띠 운세, 12지지, 띠 풀이">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://saju-mbti-9h1.pages.dev/blog/zodiac/{slug}.html">

<meta property="og:type" content="article">
<meta property="og:site_name" content="천지인 사주">
<meta property="og:title" content="{animal}띠({hj}) 풀이 — 「{nick}」 자리의 결">
<meta property="og:description" content="{animal}띠의 성품·연애·직업·건강·잘 맞는 띠와 피할 띠를 사주의 12지지 관점에서 풀이.">
<meta property="og:url" content="https://saju-mbti-9h1.pages.dev/blog/zodiac/{slug}.html">
<meta property="og:locale" content="ko_KR">
<meta name="theme-color" content="#0e1428">

<!-- Google AdSense -->
<meta name="google-adsense-account" content="ca-pub-9194151925851653">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9194151925851653" crossorigin="anonymous"></script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Noto+Serif+KR:wght@500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/blog/blog.css">

<script type="application/ld+json">
{jsonld}
</script>
</head>
<body>

<nav class="blog-nav" aria-label="블로그 네비게이션">
  <div class="blog-shell">
    <a href="/blog/" class="blog-brand"><span class="blog-brand-mark" aria-hidden="true">☯︎</span><span>천지인 사주 가이드</span></a>
    <a href="/" class="blog-cta">내 사주 보기</a>
  </div>
</nav>

<article class="blog-article">
  <header class="blog-article-head">
    <div class="blog-article-cat">12 띠 · {idx_ord}번 {ko}({hj})</div>
    <h1>{animal}띠({hj}) 풀이 — 「{nick}」 자리의 결</h1>
    <div class="blog-article-meta">
      <time datetime="2026-05-10">2026년 5월 10일</time>
      <span class="dot">·</span>
      <span>읽는 시간 약 6분</span>
    </div>
  </header>

  <div class="blog-article-body">
    <p>{animal}띠({hj})는 사주의 12지지 중 {idx_ord}번째 자리에 해당합니다. 한국식 표현으로 「{ko}지(支)」라 부르며, 사주에서 「{nick}」의 결을 가진 자리로 풀이합니다. 띠는 본인이 태어난 해의 지지 글자이므로, 그 글자의 본질을 알면 본인의 큰 결이 보입니다.</p>

    <h2>{animal}띠의 본질 — 「{nick}」</h2>
    <ul>
      <li><b>한자</b> · {hj} ({ko})</li>
      <li><b>오행</b> · {oh}({oh}行)</li>
      <li><b>계절</b> · {season}</li>
      <li><b>시진</b> · {hour}</li>
    </ul>
    <p>{body}</p>
    <p>{animal}띠는 자연에서 「{nick}」으로 비유되는 결입니다. 본인이 태어난 해가 {animal}띠라는 건 출생 시점의 자연이 이런 기운으로 흐르고 있었다는 뜻이며, 본인의 큰 결도 그 기운의 색채를 어느 정도 따라갑니다.</p>

    <h2>{animal}띠의 성품 — 강점과 그림자</h2>
    <p><b>강점</b> — {pos_str}</p>
    <p><b>그림자</b> — {neg_str}</p>
    <p>{personality_extra}</p>

    <h2>{animal}띠와 잘 맞는 띠 (육합·삼합)</h2>
    <p>사주에서 두 지지가 만났을 때 「합(合)」을 이루면 부드럽고 호혜적인 결이 흐릅니다. {animal}띠와 잘 맞는 띠는 다음입니다.</p>
    <ul>
      {good_html}
    </ul>
    <div class="callout">💕 <b>연애·결혼 결</b> — 위 띠의 분과 만나면 자연스럽게 결이 부드러워집니다. 깊이 있는 인연으로 발전하기 좋고, 갈등이 생겨도 합의 작용으로 풀리는 결입니다.</div>

    <h2>{animal}띠와 부딪히는 띠 (충)</h2>
    <p>반대로 「충(衝)」 작용은 두 지지가 정면으로 부딪히는 결입니다. {animal}띠와 충 관계인 띠는 다음입니다.</p>
    <ul>
      <li><b>{chung_animal}띠({chung_ko})</b> — 정면 충돌의 결. 이 띠와는 의식적으로 한 톤 부드럽게 표현하시는 게 좋습니다.</li>
    </ul>
    <p>충은 흉이 아니라 「자리를 흔드는 신호」입니다. 충 띠와의 관계가 곧 결혼·동업의 흉이 되는 건 아니며, 본인의 결을 인지하고 한 박자 살피는 지혜만 더하면 충분히 좋은 결을 만들 수 있습니다.</p>

    <h2>{animal}띠의 직업·재물 결</h2>
    <p>{job_body}</p>
    <p>본인 사주의 일간이 무엇이냐에 따라 직업의 색깔이 더 정확히 결정되므로, 띠만으로 진로를 정하기보다 본인 사주 전체를 함께 보시는 게 정확합니다.</p>

    <h2>{animal}띠의 건강 결 — {oh} 오행</h2>
    <p>{health_body}</p>

    <h2>{animal}띠 vs 본인 사주 — 띠만으론 부족한 이유</h2>
    <p>「{animal}띠는 ◯◯하다」는 말은 사주의 12지지 중 한 글자만 본 것입니다. 사주는 8글자(년·월·일·시 × 천간·지지)로 이뤄져 있어, 띠는 그중 한 글자(년지)에 불과합니다. 같은 {animal}띠라도 일간·월지·시주가 다르면 인생의 결이 완전히 달라집니다.</p>
    <div class="callout">📌 <b>정확한 풀이의 결</b> — 띠로 큰 결만 잡고, 일주(일간+일지)·격국·용신·대운으로 디테일을 풀이하시는 게 사주 명리학의 정확한 결입니다. 띠는 시작점이지 결론이 아닙니다.</div>

    <blockquote>{quote}</blockquote>

    <h2>한 줄 정리</h2>
    <p>{animal}띠는 「{nick}」의 결을 가진 자리입니다. {summary} 띠의 큰 결을 알되, 본인의 일주·격국·용신을 함께 보고 자세한 풀이를 받으시면 본인의 진짜 결이 또렷이 보입니다.</p>

    <div class="article-cta">
      <div class="article-cta-title">📿 내 사주 전체 풀어보기</div>
      <div class="article-cta-desc">띠는 시작점일 뿐, 본인의 결을 정확히 보려면 일주·격국·용신을 함께 봐야 합니다.<br>생년월일·시·태어난 곳을 입력하시면 만세력 기반 정확한 사주 풀이를 무료로 드립니다.</div>
      <a href="/?utm_source=blog&utm_medium=cta&utm_campaign=zodiac-{slug}" class="article-cta-btn">내 사주 보러가기 →</a>
    </div>

    <div class="related">
      <h3>📖 함께 읽으면 좋은 글</h3>
      <div class="blog-grid">
        <a href="/blog/basics/saju-basics.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>사주 보는 법 — 사주팔자 8글자의 의미</h3>
          <p>띠 외 7글자가 본인의 결을 어떻게 만드는지</p>
        </a>
        <a href="/blog/basics/sipsin.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>십신 — 비겁·식상·재성·관성·인성</h3>
          <p>지지가 일간과 만나 만들어내는 인생 영역의 결</p>
        </a>
      </div>
    </div>
  </div>
</article>

<footer class="blog-foot">
  <div>☯︎ 천지인 사주 — 만세력 기반 사주팔자 × MBTI 통합 분석</div>
  <div style="margin-top:8px"><a href="/">사주 분석 도구</a> · <a href="/blog/">가이드 모음</a> · <a href="/about.html">서비스 소개</a> · <a href="/legal/editorial-policy.html">콘텐츠 작성 기준</a> · <a href="/legal/privacy.html">개인정보처리방침</a></div>
  <div style="margin-top:8px;color:var(--muted);font-size:.76rem">사주·운세 콘텐츠는 참고용 정보이며 의료·법률·투자 판단을 대신하지 않아요.</div>
</footer>

</body>
</html>
"""

# 띠별 personality extra (성격 확장 한 단락)
def personality_extra(animal):
  m = {
    '쥐':'쥐띠는 어둠 속에서도 길을 찾는 영민함의 결입니다. 작은 신호를 잘 잡아내고 위기에서 빠르게 판단해 손해를 줄이는 능력이 뛰어납니다. 다만 너무 계산적으로 비치지 않도록 의식적으로 따뜻한 표현을 더해주세요.',
  '소':'소띠는 묵묵히 한 길을 가는 힘의 결입니다. 짧은 시간엔 화려해 보이지 않을지 모르지만 5년·10년 단위로 보면 가장 단단한 자산을 쌓는 결입니다. 변화에 너무 느리지 않도록 작은 실험은 자주 시도하세요.',
  '호랑이':'호랑이띠는 한번 결정하면 곧장 행동하는 결입니다. 추진력과 정의감이 강해 사람들 앞에 자연스럽게 서지만, 거친 표현이 가까운 사람에게 상처가 될 수 있으니 한 톤 부드럽게 가져가시면 결이 더 살아납니다.',
  '토끼':'토끼띠는 사람의 마음을 부드럽게 만지는 결입니다. 미적 감각과 섬세함이 뛰어나 예술·서비스 분야에서 빛나며, 결정 앞에서 너무 망설이지 않도록 작은 결단을 자주 연습하시면 결이 균형을 잡습니다.',
  '용':'용띠는 다른 사람과는 다른 큰 그릇의 결입니다. 평범한 일에 만족하지 못하고 큰 그림을 그리는 결이라 창업·예술·리더 자리에서 빛납니다. 다만 현실 감각을 잃지 않도록 작은 디테일도 함께 챙기세요.',
  '뱀':'뱀띠는 깊이 들여다보는 통찰의 결입니다. 사람의 진짜 의도를 직관적으로 파악하고 한 발 앞을 내다보는 능력이 뛰어납니다. 너무 의심하거나 차갑게 비치지 않도록 따뜻한 표현을 한 가지 더해주세요.',
  '말':'말띠는 한 곳에 머무르지 않는 활동의 결입니다. 새로운 곳·사람·일에 끌리며 빠른 추진력으로 결과를 만들지만, 끈기가 부족해 시작한 일을 마무리하는 루틴이 결을 살리는 핵심입니다.',
  '양':'양띠는 사람의 마음을 따뜻하게 보듬는 결입니다. 헌신적이고 예술적 감수성이 풍부해 가까운 사람을 키우는 자리에서 빛납니다. 본인의 욕구도 표현하는 연습이 결의 균형을 잡아줍니다.',
  '원숭이':'원숭이띠는 빠르게 학습하고 재치 있게 풀어내는 결입니다. 다재다능하고 사교적이라 어디서든 적응이 빠르지만, 한 분야에 깊이 들어가지 않으면 결실이 작아집니다. 1년 이상 한 가지에 머무는 연습이 도움됩니다.',
  '닭':'닭띠는 정확함과 완성도가 핵심인 결입니다. 한 가지 일을 끝까지 완벽하게 해내는 능력이 뛰어나며, 회계·법조·디자인 같은 정밀한 분야에서 빛납니다. 다만 비판적 시선이 가까운 사람에게는 잔소리로 느껴질 수 있으니 칭찬을 의식적으로 더해주세요.',
  '개':'개띠는 신의와 정의의 결입니다. 한번 약속한 사람·조직에 대한 충성이 깊고 책임감이 강해 신뢰를 쌓는 자리에서 빛납니다. 너무 고지식해 융통성을 잃지 않도록 다른 관점도 한 번씩 들어보세요.',
  '돼지':'돼지띠는 순수하고 인정 많은 결입니다. 사람을 잘 받아들이고 풍요로움을 부르는 결이라 요식·서비스·복지 분야에서 빛납니다. 너무 사람을 신뢰해 손해를 보지 않도록 큰 결정엔 한 박자 살피는 습관을 더하세요.'
  }
  return m.get(animal, '')

def make_summary(animal):
  m = {
    '쥐':'영민함과 적응력으로 어둠 속에서도 길을 찾는 결입니다.',
    '소':'묵묵한 인내로 큰 자산을 쌓는 결입니다.',
    '호랑이':'추진력과 정의감으로 사람을 이끄는 결입니다.',
    '토끼':'섬세함과 미감으로 사람의 마음을 만지는 결입니다.',
    '용':'큰 그릇과 카리스마로 다른 결을 만들어가는 결입니다.',
    '뱀':'깊은 통찰과 직관으로 한 발 앞을 보는 결입니다.',
    '말':'활달한 추진력으로 새로운 길을 여는 결입니다.',
    '양':'따뜻한 헌신으로 사람을 보듬는 결입니다.',
    '원숭이':'재치와 다재다능으로 어디든 적응하는 결입니다.',
    '닭':'정확함과 완성도로 한 분야의 장인이 되는 결입니다.',
    '개':'신의와 정의로 신뢰를 쌓는 결입니다.',
    '돼지':'순수와 인정으로 풍요를 부르는 결입니다.'
  }
  return m.get(animal, '')

def make_post(idx):
  br = idx
  ko = BR_KO[br]
  hj = BR_HJ[br]
  animal = BR_ANIMAL[br]
  slug = BR_SLUG[br]

  # 잘 맞는 띠 (육합·삼합)
  good = set()
  hp = hap_partner(br)
  if hp is not None:
    good.add((hp, '육합(六合) — 부드러운 짝의 결'))
  k, group = samhap_group(br)
  for x in group:
    if x != br:
      good.add((x, f'삼합 {k}국(三合) — 한 흐름으로 모이는 결'))

  good_html = '\n      '.join([f'<li><b>{BR_ANIMAL[x]}띠({BR_KO[x]})</b> — {desc}</li>' for x, desc in sorted(good)])

  # 충 띠
  cp = chung_partner(br)
  chung_animal = BR_ANIMAL[cp] if cp is not None else ''
  chung_ko = BR_KO[cp] if cp is not None else ''

  # 동물 본성
  trait = ANIMAL_TRAITS[animal]

  jsonld = json.dumps({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": f"{animal}띠({hj}) 풀이 — 「{BR_NICK[br]}」 자리의 결",
    "description": f"{animal}띠의 성품·연애·직업·건강·잘 맞는 띠와 피할 띠를 사주의 12지지 관점에서 풀이.",
    "datePublished": "2026-05-10",
    "dateModified": "2026-05-10",
    "author": {"@type":"Organization","@id":"https://saju-mbti-9h1.pages.dev/#organization","name":"천지인 사주","url":"https://saju-mbti-9h1.pages.dev/about.html"},
    "publisher": {"@type":"Organization","@id":"https://saju-mbti-9h1.pages.dev/#organization","name":"천지인 사주","url":"https://saju-mbti-9h1.pages.dev/","logo":{"@type":"ImageObject","url":"https://saju-mbti-9h1.pages.dev/assets/og-image.png","width":1200,"height":630}},
    "image": ["https://saju-mbti-9h1.pages.dev/assets/og-image.png"],
    "isPartOf": {"@type":"Blog","@id":"https://saju-mbti-9h1.pages.dev/blog/#blog","name":"천지인 사주풀이 가이드","url":"https://saju-mbti-9h1.pages.dev/blog/"},
    "mainEntityOfPage": f"https://saju-mbti-9h1.pages.dev/blog/zodiac/{slug}.html",
    "inLanguage": "ko",
    "articleSection": "12 띠 풀이"
  }, ensure_ascii=False, indent=2)

  ctx = {
    'idx_ord': str(br + 1),
    'ko': ko,
    'hj': hj,
    'animal': animal,
    'slug': slug,
    'oh': OH_KO[BR_OH[br]],
    'season': BR_SEASON[br],
    'hour': BR_HOUR[br],
    'nick': BR_NICK[br],
    'body': BR_BODY[br],
    'pos_str': '·'.join(trait['pos']),
    'neg_str': '·'.join(trait['neg']),
    'personality_extra': personality_extra(animal),
    'good_html': good_html if good_html else '<li>특별한 합 띠가 없는 평이한 결입니다.</li>',
    'chung_animal': chung_animal,
    'chung_ko': chung_ko,
    'job_body': JOB_BY_ANIMAL[animal],
    'health_body': HEALTH_BY_OH[BR_OH[br]],
    'quote': CLASSIC_QUOTES[idx % len(CLASSIC_QUOTES)],
    'summary': make_summary(animal),
    'jsonld': jsonld,
  }
  return TEMPLATE.format(**ctx)

# ── 12편 생성 ──
generated = []
for i in range(12):
  fname = f"{BR_SLUG[i]}.html"
  fpath = os.path.join(OUT_DIR, fname)
  with open(fpath, 'w', encoding='utf-8') as f:
    f.write(make_post(i))
  generated.append((i, BR_ANIMAL[i], fname))
print(f'생성 완료: {len(generated)}편')
for i, a, fn in generated:
  print(f"  {i+1:>2}번 {a}띠 → {fn}")

# ── sitemap 갱신 ──
with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
  sm = f.read()

new_blocks = ''
for i in range(12):
  url = f'https://saju-mbti-9h1.pages.dev/blog/zodiac/{BR_SLUG[i]}.html'
  if url in sm:
    continue
  new_blocks += f'  <url>\n    <loc>{url}</loc>\n    <lastmod>2026-05-10</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n'

if new_blocks:
  sm_new = sm.replace('</urlset>', new_blocks + '</urlset>')
  with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
    f.write(sm_new)
  print(f'sitemap.xml 업데이트 — 12 띠 URL 추가')

# ── 블로그 허브에 띠 섹션 추가 ──
with open(HUB_PATH, 'r', encoding='utf-8') as f:
  hub = f.read()

# 이미 띠 섹션이 있으면 통째로 교체
zodiac_cards = []
for i in range(12):
  zodiac_cards.append(f'''      <a href="/blog/zodiac/{BR_SLUG[i]}.html" class="blog-card">
        <div class="card-tag">12 띠 · {i+1}번</div>
        <h3>{BR_ANIMAL[i]}띠({BR_HJ[i]})</h3>
        <p>「{BR_NICK[i]}」의 결</p>
      </a>''')
zodiac_grid = '\n'.join(zodiac_cards)

zodiac_section_html = f'''  <section class="blog-section">
    <h2>🐾 12 띠 풀이</h2>
    <p class="sec-desc">본인이 태어난 해의 띠가 가지는 결을 12지지 관점에서. 띠는 시작점일 뿐, 정확한 풀이는 일주·격국과 함께 봐야 합니다.</p>
    <div class="blog-grid">
{zodiac_grid}
    </div>
  </section>

'''

# 기존 띠 섹션이 있는지 확인
existing = re.search(r'<section class="blog-section">\s*<h2>🐾 12 띠 풀이</h2>[\s\S]*?</section>\s*', hub)
if existing:
  new_hub = hub[:existing.start()] + zodiac_section_html + hub[existing.end():]
else:
  # MBTI 섹션 직후에 삽입
  pattern = re.compile(r'(<section class="blog-section">\s*<h2>☯︎ MBTI × 사주</h2>[\s\S]*?</section>\s*)', re.DOTALL)
  m_mbti = pattern.search(hub)
  if m_mbti:
    insert_pos = m_mbti.end()
    new_hub = hub[:insert_pos] + zodiac_section_html + hub[insert_pos:]
  else:
    print('!! MBTI 섹션을 찾지 못해 띠 섹션 삽입 실패')
    new_hub = hub

with open(HUB_PATH, 'w', encoding='utf-8') as f:
  f.write(new_hub)
print('blog/index.html 띠 섹션 갱신 완료')
