#!/usr/bin/env python3
"""
60갑자 일주 풀이 일괄 생성기
- 천간/지지 비유 사전 + 관계(생/극/비화)/십신 패턴으로 60편 일관 생성
- 각 일주는 본인 별명·동물·오행·삼합 그룹에 따라 사람·연애·직업·건강·신살이 자연스럽게 분기
"""
import os, json
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ILJU_DIR = os.path.join(ROOT, 'blog', 'ilju-list')
SITEMAP_PATH = os.path.join(ROOT, 'sitemap.xml')
HUB_PATH = os.path.join(ROOT, 'blog', 'index.html')

os.makedirs(ILJU_DIR, exist_ok=True)

# ── 천간 ──
STEMS = ['갑','을','병','정','무','기','경','신','임','계']
STEMS_HJ = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
STEM_OH = [0,0,1,1,2,2,3,3,4,4]   # 0목 1화 2토 3금 4수
STEM_OH_KO = ['목','화','토','금','수']
STEM_OH_HJ = ['木','火','土','金','水']
STEM_YANG = [True,False,True,False,True,False,True,False,True,False]
STEM_NICK = ['큰 나무·기둥','풀잎·덩굴','태양','촛불·화롯불','큰 산·언덕','논밭·정원','바위·강철','보석·예리한 칼','큰 바다·강','이슬비·옹달샘']
STEM_BODY = [
  '하늘로 곧게 뻗은 큰 나무이자 들보. 우직한 추진력과 리더십, 솔직하고 보수적인 성품',
  '바람에 휘어지는 풀잎과 덩굴. 부드럽지만 끈질기고 환경에 적응하며 실속 있게 성장하는 성품',
  '하늘 위 태양. 밝고 열정적이며 모든 것을 비추는 활달하고 호방한 성품',
  '조용히 빛나는 촛불과 화롯불. 섬세하고 정성스러우며 깊이 있는 예술적 성품',
  '우뚝 솟은 산과 너른 언덕. 듬직하고 신뢰감 있는 중심추 같은 성품',
  '곡식이 자라는 논밭과 정원. 부드럽고 헌신적이며 사람·일을 키우는 성품',
  '단단한 바위와 잘 벼린 강철. 결단력 있고 의리 있으며 강한 추진력의 성품',
  '잘 다듬어진 보석과 예리한 칼날. 섬세하고 자존심 강하며 완벽주의의 성품',
  '깊고 넓은 큰 바다와 강. 포용력 있고 지혜로우며 변화에 능한 성품',
  '맑은 이슬비와 옹달샘 물. 깨끗하고 겸손하며 조용히 스며드는 섬세하고 총명한 성품'
]
STEM_KEYS = [
  '곧음·강직·시작·성장·리더십','유연·조화·끈기·실리·지지',
  '열정·밝음·표현·확장·호방','섬세·따뜻함·정성·예술·내공',
  '신중·중후·신뢰·포용·중심','온화·헌신·실용·꼼꼼·키움',
  '결단·의리·강직·추진·돌파','섬세·예리·자존·완성·정밀',
  '지혜·포용·유연·변화·기획','겸손·순수·섬세·총명·자정'
]

# ── 지지 ──
BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해']
BRANCHES_HJ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
BR_ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
BR_OH = [4,2,0,0,2,1,1,2,3,3,2,4]  # 정기 오행
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
BR_KEYS = [
  '지혜·계획·잠재·시작','인내·축적·꾸준함·고집',
  '도전·기개·시작·통솔','섬세·예술·매력·온화',
  '큰 그릇·신비·변화·창조','직관·총명·야망·세련',
  '열정·활달·사교·표현','온정·예술·헌신·감수성',
  '영리·실리·활동·기지','정확·단정·완벽·결실',
  '충직·책임·보수·신의','순수·인정·사색·풍요'
]

# 60갑자 인덱스 → (stem, branch)
def gz(i):
  return (i % 10, i % 12)

# 슬러그 (영문 표기)
STEM_ROMAN = ['gap','eul','byeong','jeong','mu','gi','gyeong','sin','im','gye']
BR_ROMAN = ['ja','chuk','in','myo','jin','sa','o','mi','sin','yu','sul','hae']
def slug(stem, branch):
  return f"{STEM_ROMAN[stem]}{BR_ROMAN[branch]}"

# 오행 관계: stem_oh과 branch_oh의 관계
# 0목 1화 2토 3금 4수
# 상생: 목→화→토→금→수→목  (sheng[i] = 다음 오행)
SHENG = [1,2,3,4,0]
KE    = [2,3,4,0,1]  # 극 (목→토→수→화→금→목)
def oh_relation(s_oh, b_oh):
  """일간(s_oh)과 일지(b_oh) 관계. 비화/생/극의 어느 쪽인지 + 어느 쪽이 주체인지"""
  if s_oh == b_oh:
    return ('비화', f"같은 {STEM_OH_KO[s_oh]} 오행끼리 만난 비화(比和) 관계")
  if SHENG[b_oh] == s_oh:
    # 일지가 일간을 생함 → 인성
    return ('인성', f"일지 {STEM_OH_KO[b_oh]}가 일간 {STEM_OH_KO[s_oh]}을 생(生)하는 인성(印星) 관계")
  if SHENG[s_oh] == b_oh:
    # 일간이 일지를 생함 → 식상
    return ('식상', f"일간 {STEM_OH_KO[s_oh]}이 일지 {STEM_OH_KO[b_oh]}를 생(生)하는 식상(食傷) 관계")
  if KE[s_oh] == b_oh:
    # 일간이 일지를 극함 → 재성
    return ('재성', f"일간 {STEM_OH_KO[s_oh]}이 일지 {STEM_OH_KO[b_oh]}를 극(剋)하는 재성(財星) 관계")
  if KE[b_oh] == s_oh:
    # 일지가 일간을 극함 → 관성
    return ('관성', f"일지 {STEM_OH_KO[b_oh]}가 일간 {STEM_OH_KO[s_oh]}을 극(剋)하는 관성(官星) 관계")
  return ('평', "평이한 관계")

REL_BODY = {
  '비화': '같은 오행끼리 만나 자기 정체성이 뚜렷하고 자립심이 강한 결입니다. 본인의 색깔이 사주에서 가장 진하게 발휘되는 일주이며, 한 분야에 깊이 들어갈 때 본인의 본질이 빛납니다. 다만 자기 주장이 강해지기 쉬워 협력보다 독자 노선을 걷는 경향이 있으니 의식적으로 타인의 의견을 듣는 연습이 도움됩니다.',
  '인성': '일지가 일간을 받쳐주는 결로, 정신적·물질적 후원을 받기 좋은 일주입니다. 부모·스승·어른의 도움이 평생 따르며, 학문·자격·문서운에 강합니다. 안정적이지만 외부 활동성이 약해질 수 있어, 한 단계 도약하려면 외부로 발신하는 노력이 필요합니다.',
  '식상': '본인의 기운을 일지로 흘려보내는 결로, 표현력과 창작력이 풍부한 일주입니다. 자기를 드러내는 데 능하고 사람·일에 정성을 쏟지만, 에너지가 일지로 빠져나가는 만큼 일간이 다소 약해져 과로와 소진에 주의가 필요합니다. 적절한 휴식이 본인의 결을 살리는 핵심입니다.',
  '재성': '일간이 일지를 다스리는 결로, 활동적·실리적인 결의 일주입니다. 재물·기회·이성을 다루는 능력이 자연스럽게 발휘되며 사업·영업에 강합니다. 다만 욕심이 과해지면 무리한 확장으로 큰 손실을 볼 수 있으니 그릇만큼만 받는 절제가 중요합니다.',
  '관성': '일지가 일간을 극하는 결로, 외부 자극과 압력을 자주 받는 일주입니다. 그 자극이 성장의 동력이 되어 큰 그릇으로 자라는 경우가 많지만, 한편으로 스트레스가 쌓이기 쉬워 휴식과 자기 돌봄의 시간을 의식적으로 확보하는 것이 중요합니다.',
  '평': '평이한 결의 일주로, 한쪽으로 치우치지 않는 균형감을 가집니다. 본인의 결을 어디로 끌고 가느냐가 인생을 좌우하는 만큼, 중심을 잡고 한 길을 차분히 가는 결이 잘 맞습니다.'
}

# 십신 작용에 따른 직업 결
JOB_BY_REL = {
  '비화': '자영업·전문직·1인 사업 같은 자기 결이 그대로 드러나는 분야에 결이 좋습니다. 본인의 색을 살릴 수 있는 일에 큰 두각을 나타냅니다.',
  '인성': '학문·교육·연구·법조·상담·문화 등 본인의 깊이를 펼치는 분야에 결이 좋습니다. 큰 조직 안에서 안정적으로 입지를 다진 뒤 독립을 고려하는 것이 좋습니다.',
  '식상': '창작·예술·강연·콘텐츠·요식 등 본인을 표현하는 일에 결이 좋습니다. 자유로운 환경에서 결이 살아납니다.',
  '재성': '영업·금융·투자·유통·사업 등 활동성과 결단력이 필요한 일에 결이 좋습니다. 사람과 돈을 다루는 자리에서 빛납니다.',
  '관성': '공직·관리직·법조·군경·대기업 등 책임과 명예가 따르는 일에 결이 좋습니다. 조직 안에서 입지를 다지며 큰 그릇으로 자라는 결입니다.',
  '평': '본인의 강점과 흥미가 만나는 분야면 어디든 결을 살릴 수 있습니다. 격국과 용신을 따라 진로를 결정하시면 결이 잘 맞습니다.'
}

# 삼합 그룹: 申子辰=수, 寅午戌=화, 巳酉丑=금, 亥卯未=목
SAMHAP = {
  '수': [8, 0, 4],
  '화': [2, 6, 10],
  '금': [5, 9, 1],
  '목': [11, 3, 7]
}
def samhap_group(branch_idx):
  for k, g in SAMHAP.items():
    if branch_idx in g:
      return k, g
  return None, []

# 삼합별 일지 신살 (도화·역마·화개)
def sinsals_for(branch_idx):
  k, g = samhap_group(branch_idx)
  if not g:
    return []
  ym = g[2]   # 역마 (마지막)
  dh = g[1]   # 도화 (가운데)
  hg = g[0]   # 화개 (첫번째)
  res = []
  if branch_idx == ym:
    res.append('역마살(驛馬煞) — 활동·이동·해외의 결')
  if branch_idx == dh:
    res.append('도화살(桃花煞) — 매력·끼·이성을 끌어당기는 결')
  if branch_idx == hg:
    res.append('화개살(華蓋煞) — 학문·종교·예술의 깊이')
  return res

# 좋은 인연(합/삼합)
def good_partners(branch_idx):
  partners = set()
  HAP6 = [(0,1),(2,11),(3,10),(4,9),(5,8),(6,7)]
  for a,b in HAP6:
    if a == branch_idx: partners.add(b)
    elif b == branch_idx: partners.add(a)
  k, g = samhap_group(branch_idx)
  for x in g:
    if x != branch_idx: partners.add(x)
  return sorted(partners)

# 한 해 결정적 시기 (대운에서)
DAEUN_HINT = {
  '비화': '본인 오행과 같은 오행이 들어오는 대운에는 자기 색이 더 진해지지만 자기 주장 과잉을 조심. 반대 오행 대운에 균형이 잡힙니다.',
  '인성': '식상이 들어오는 대운에 표현·확장의 결이 살아나고, 인성이 더 들어오는 대운엔 학문·자격에 깊이 들어가기 좋습니다.',
  '식상': '재성이 들어오는 대운에 본인의 표현이 돈으로 바뀌는 결이 옵니다. 인성 대운엔 학습·정리에 집중.',
  '재성': '관성이 들어오는 대운에 사회적 자리가 열립니다. 비겁 대운엔 동업·금전 거래에 신중.',
  '관성': '인성이 들어오는 대운에 책임을 감당할 그릇이 커집니다. 재성 대운엔 활동성이 살아나면서 결실이 따릅니다.',
  '평': '본인의 약한 오행을 보강하는 대운이 가장 큰 도약을 가져옵니다.'
}

CLASSIC_QUOTES = [
  '「적천수(滴天髓)」 — 順其氣勢 則吉, 逆其氣勢 則凶 (그 기세를 따르면 길하고, 거스르면 흉하다)',
  '「궁통보감(窮通寶鑑)」 — 用神得力 一生富貴 (용신이 힘을 얻으면 평생이 부귀롭다)',
  '「자평진전(子平眞詮)」 — 體用不離 動靜相成 (체와 용은 분리되지 않고 동과 정은 서로 이룬다)',
  '「연해자평(淵海子平)」 — 일주가 강건하면 능히 재관(財官)을 감당한다',
  '「궁통보감」 — 寒暖燥濕 各有其時 (춥고 따뜻하고 마르고 습한 것이 모두 때가 있다)',
  '「적천수」 — 中和爲貴 (중화함이 귀하다)'
]

# ── HTML 템플릿 ──
TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>{ko}({hj})일주 — {stem_nick} + {branch_nick}의 결 | 천지인 사주</title>
<meta name="description" content="{ko}일주는 60갑자 중 {idx_ord}번째 자리입니다. 「{stem_nick}」 천간 {stem_ko}{stem_oh_ko}과 「{branch_nick}」 지지 {br_ko}{br_oh_ko}({animal})가 만난 결을 성품·연애·직업·건강·신살로 풀어드립니다.">
<meta name="keywords" content="{ko}일주, {ko}, {stem_ko}{stem_oh_ko} 일간, {br_ko}{br_oh_ko}, 60갑자, 일주 풀이, {ko}일주 성격, {ko}일주 연애, {ko}일주 직업">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://saju-mbti-9h1.pages.dev/blog/ilju-list/{slug}.html">

<meta property="og:type" content="article">
<meta property="og:site_name" content="천지인 사주">
<meta property="og:title" content="{ko}({hj})일주 — {stem_nick} + {branch_nick}의 결">
<meta property="og:description" content="{ko}일주의 성품·연애·직업·건강·신살을 비유로 쉽게 풀이.">
<meta property="og:url" content="https://saju-mbti-9h1.pages.dev/blog/ilju-list/{slug}.html">
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
    <div class="blog-article-cat">60갑자 · {idx_ord}번</div>
    <h1>{ko}({hj})일주 — 「{stem_nick}」 + 「{branch_nick}」의 결</h1>
    <div class="blog-article-meta">
      <time datetime="{date_iso}">{date_kr}</time>
      <span class="dot">·</span>
      <span>읽는 시간 약 6분</span>
    </div>
  </header>

  <div class="blog-article-body">
    <p>{ko}({hj})일주는 60갑자의 {idx_ord}번째 자리에 해당합니다. 천간 <em>{stem_ko}{stem_oh_ko}({stem_hj}{stem_oh_hj})</em> — 「{stem_nick}」와 지지 <em>{br_ko}{br_oh_ko}({br_hj})</em> — 「{branch_nick}」({animal})가 만나 만들어내는 일주로, 사주 명리학에서는 두 글자의 결을 함께 읽어내야 그 사람의 본질이 보입니다.</p>

    <h2>두 글자의 결</h2>
    <ul>
      <li><b>일간 — {stem_ko}{stem_oh_ko}({stem_hj}{stem_oh_hj})</b> · {stem_body}.</li>
      <li><b>일지 — {br_ko}{br_oh_ko}({br_hj}, {animal})</b> · {branch_body}.</li>
    </ul>
    <p>오행 작용으로 보면 {rel_desc}입니다. 즉 <em>{rel_meta}</em>의 결입니다.</p>
    <p>{rel_body}</p>

    <h2>성품 — 「{stem_nick}」 위에 「{branch_nick}」가 앉은 결</h2>
    <p>{ko}일주는 외적으로 <b>{stem_keys}</b>의 결을 보이며, 내면에는 <b>{branch_keys}</b>의 결이 깃들어 있습니다. 평소에는 {stem_trait_short}, 결정 앞에서는 {branch_trait_short}하는 결이 함께 흐릅니다.</p>
    <p>{personality_extra}</p>

    <h2>연애·결혼운 — 일지 「{animal}」 자리</h2>
    <p>일지({br_ko}, {animal})가 사주에서 「<b>나의 자리이자 배우자의 자리(配偶宮)</b>」입니다. {ko}일주는 배우자에게서 {branch_keys}의 결을 만나기 쉬우며, 본인 일간 {stem_ko}{stem_oh_ko}이 일지 위에 앉아 있는 결이 {rel_kind} 관계라 {love_extra}</p>
    <div class="callout">💕 <b>좋은 인연의 결</b> — 일지 {br_ko}와 잘 어울리는 띠는 {good_partners_str}입니다. 이 띠의 분과 만남에 결이 잘 맞습니다.</div>

    <h2>직업·사업운 — {stem_oh_ko} 일간 + {rel_kind}의 결</h2>
    <p>{job_body}</p>
    <p>본인 사주에 식상·재성·관성 중 어느 글자가 함께 있느냐에 따라 직업의 색깔이 달라지므로, 본인 사주 전체를 함께 보시는 게 정확합니다.</p>

    <h2>건강운 — {stem_oh_ko}·{br_oh_ko} 두 오행</h2>
    <p>{health_body}</p>

    <h2>신살(神煞) 작용</h2>
    {sinsal_body}

    <h2>대운 흐름</h2>
    <p>{daeun_hint}</p>

    <blockquote>{quote}</blockquote>

    <h2>한 줄 정리</h2>
    <p>{ko}일주는 <b>「{stem_nick}」 위에 「{branch_nick}」가 앉은 결</b>입니다. {summary}</p>

    <div class="article-cta">
      <div class="article-cta-title">🌀 내 일주는 60갑자 중 어디인가</div>
      <div class="article-cta-desc">생년월일·시·태어난 곳을 입력하시면 본인의 일주가 60갑자 중 어느 자리인지,<br>그 결이 어떤 인생 흐름과 만나는지 자세히 풀어드립니다.</div>
      <a href="/?utm_source=blog&utm_medium=cta&utm_campaign=ilju-{slug}" class="article-cta-btn">내 일주 확인하기 →</a>
    </div>

    <div class="related">
      <h3>📖 함께 읽으면 좋은 글</h3>
      <div class="blog-grid">
        <a href="/blog/basics/saju-basics.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>사주 보는 법 — 사주팔자 8글자의 의미</h3>
          <p>일간·일지의 의미를 처음부터 차근히</p>
        </a>
        <a href="/blog/basics/manseryeok.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>만세력이란? 진태양시 보정의 의미</h3>
          <p>왜 사주는 양력이 아닌 절기·진태양시를 보는가</p>
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

# ── 보조 텍스트 ──
STEM_TRAIT_SHORT = [
  '곧고 솔직하지만','부드럽고 유연하지만','밝고 활달하지만','조용하고 섬세하지만',
  '듬직하고 신중하지만','온화하고 헌신적이지만','단호하고 의리 있지만','단정하고 예리하지만',
  '포용력 있고 지혜롭지만','겸손하고 총명하지만'
]
BRANCH_TRAIT_SHORT = [
  '깊이 사색','꾸준히 인내','진취적으로 결단','섬세하게 관조',
  '큰 그릇으로 품음','직관적으로 야망을 품','열정적으로 표현','감수성 있게 헌신',
  '실리적으로 판단','정확하게 정리','보수적으로 책임짐','순수하게 사색'
]
PERSONALITY_EXTRA = {
  '비화': '같은 오행이 만나 본인의 색이 매우 진하므로, 자기 주장을 한 번 누그러뜨리는 연습이 사람과의 결을 부드럽게 만듭니다.',
  '인성': '안정적인 받침을 받고 있어 차분히 깊이 들어가는 결이 강합니다. 다만 외부 활동성이 약해질 수 있으니 의도적으로 발신하는 시간을 만드세요.',
  '식상': '본인을 자연스럽게 드러내는 결이 강해 사람들에게 매력적으로 보이지만, 에너지를 너무 많이 쏟으면 번아웃이 옵니다. 적당한 휴식이 결을 오래 가져갑니다.',
  '재성': '활동적이고 사람·돈을 다루는 결이 자연스럽지만, 욕심이 과해지면 큰 손실로 돌아옵니다. 그릇만큼만 잡는 절제가 본인의 결을 살립니다.',
  '관성': '외부 자극이 많아 평생 단단해지는 결입니다. 다만 스트레스 누적으로 건강을 잃지 않도록 정기적인 회복 시간이 필수입니다.',
  '평': '극단적으로 치우치지 않는 결이 강점입니다. 본인이 어디에 깊이 들어갈지 한 가지를 정하면 큰 결실이 옵니다.'
}
LOVE_EXTRA = {
  '비화': '서로 비슷한 결의 사람과 잘 통하는 결입니다. 부부가 함께 한 분야를 일구거나 비슷한 결의 친구 같은 부부가 잘 어울립니다.',
  '인성': '본인을 깊이 이해하고 받쳐주는 어른 같은 배우자가 잘 어울립니다. 정신적 후원자가 평생의 힘이 됩니다.',
  '식상': '본인의 표현·창작을 잘 받아주는 부드러운 결의 배우자가 잘 어울립니다. 함께 무언가를 만들어가는 관계에 결이 좋습니다.',
  '재성': '활동적이고 함께 움직이는 결의 배우자가 잘 맞습니다. 부부가 같이 사업·활동을 하면 결이 살아납니다.',
  '관성': '본인을 자극해 성장시키는 결단력 있는 배우자가 잘 어울립니다. 다소 부딪히더라도 그 자극이 본인을 단단하게 만듭니다.',
  '평': '본인의 결을 진심으로 알아주는 사람이라면 어떤 결의 배우자도 잘 맞습니다. 진정성이 가장 중요합니다.'
}
HEALTH_BODY_BY_OH = [
  '간·담·근육·시력 영역(목 영역)이 본인의 약점이 되기 쉽습니다. 신맛 음식과 녹색 채소가 보강이 됩니다. 무리한 활동보다 꾸준한 산책·등산이 결에 잘 맞습니다.',
  '심장·소장·혈액순환 영역(화 영역)을 살펴주세요. 쓴맛과 붉은 식재료가 보강이 됩니다. 명상과 가벼운 운동이 본인 결을 살립니다.',
  '위장·비장·소화 영역(토 영역)이 본인의 영역입니다. 단맛과 뿌리채소가 잘 맞습니다. 규칙적인 식사·생활 리듬이 가장 중요합니다.',
  '폐·대장·면역 영역(금 영역)이 본인의 약점이 되기 쉽습니다. 매운맛과 흰 식재료가 보강이 됩니다. 호흡 운동·필라테스가 잘 맞습니다.',
  '신장·방광·생식기 영역(수 영역)을 살펴주세요. 짠맛과 검은 식재료가 보강이 됩니다. 수영·휴식이 본인의 결을 회복시킵니다.'
]

def make_summary(stem, branch, rel_kind):
  oh_korean = STEM_OH_KO[STEM_OH[stem]]
  rel_summary = {
    '비화': f'본인의 {oh_korean} 결을 한 분야에 깊이 풀어낼 때 가장 빛나는 일주이며, 자기 주장을 한 번 누그러뜨리는 결이 인생을 부드럽게 만듭니다.',
    '인성': '받쳐주는 받침이 든든해 차분히 깊이 들어가면 큰 결실이 따르는 일주입니다. 외부로 발신하는 한 발이 도약의 열쇠입니다.',
    '식상': '본인의 표현·창작이 자산이 되는 일주입니다. 사람과 함께 일할 때 결이 살아나며, 적절한 휴식이 결을 오래 가져갑니다.',
    '재성': '활동·실리·기회를 다루는 결이 자연스러운 일주입니다. 그릇만큼만 잡는 절제가 평생의 자산이 됩니다.',
    '관성': '외부 자극에 단단해지는 큰 그릇의 일주입니다. 책임을 감당하는 자리에서 결이 살아납니다.',
    '평': '균형감을 가진 일주로, 본인이 한 분야를 정해 깊이 들어가시면 큰 결실이 옵니다.'
  }
  return rel_summary.get(rel_kind, rel_summary['평'])

def num_to_kor_ord(n):
  return f"{n}"

def make_post(idx):
  stem, branch = gz(idx)
  rel_kind, rel_desc = oh_relation(STEM_OH[stem], BR_OH[branch])

  # 신살
  sins = sinsals_for(branch)
  sinsal_body = '<p>본 일주의 일지({br})에는 다음 신살이 활성화될 가능성이 큽니다.</p><ul>'.format(br=BRANCHES[branch]) if sins else '<p>본 일주의 일지({br})에는 두드러지는 신살이 적습니다. 본인 사주의 다른 글자에 따라 신살이 결정되니 사주 전체를 함께 봐야 합니다.</p>'.format(br=BRANCHES[branch])
  if sins:
    for s in sins:
      sinsal_body += f'<li>{s}</li>'
    sinsal_body += '</ul>'

  # 좋은 띠
  partners = good_partners(branch)
  partner_str = ', '.join([f'{BR_ANIMAL[p]}({BRANCHES[p]})' for p in partners]) if partners else '특별히 두드러지는 합 띠가 없습니다'

  # JSON-LD
  jsonld = json.dumps({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": f"{STEMS[stem]}{BRANCHES[branch]}({STEMS_HJ[stem]}{BRANCHES_HJ[branch]})일주 — {STEM_NICK[stem]} + {BR_NICK[branch]}의 결",
    "description": f"{STEMS[stem]}{BRANCHES[branch]}일주의 성품·연애·직업·건강·신살을 비유로 쉽게 풀이.",
    "datePublished": "2026-05-10",
    "dateModified": "2026-05-10",
    "author": {"@type":"Organization","@id":"https://saju-mbti-9h1.pages.dev/#organization","name":"천지인 사주","url":"https://saju-mbti-9h1.pages.dev/about.html"},
    "publisher": {"@type":"Organization","@id":"https://saju-mbti-9h1.pages.dev/#organization","name":"천지인 사주","url":"https://saju-mbti-9h1.pages.dev/","logo":{"@type":"ImageObject","url":"https://saju-mbti-9h1.pages.dev/assets/og-image.png","width":1200,"height":630}},
    "image": ["https://saju-mbti-9h1.pages.dev/assets/og-image.png"],
    "isPartOf": {"@type":"Blog","@id":"https://saju-mbti-9h1.pages.dev/blog/#blog","name":"천지인 사주풀이 가이드","url":"https://saju-mbti-9h1.pages.dev/blog/"},
    "mainEntityOfPage": f"https://saju-mbti-9h1.pages.dev/blog/ilju-list/{slug(stem,branch)}.html",
    "inLanguage": "ko",
    "articleSection": "60갑자 일주"
  }, ensure_ascii=False, indent=2)

  ko = STEMS[stem] + BRANCHES[branch]
  hj = STEMS_HJ[stem] + BRANCHES_HJ[branch]
  s_oh = STEM_OH[stem]
  b_oh = BR_OH[branch]

  ctx = {
    'idx_ord': num_to_kor_ord(idx + 1),
    'ko': ko,
    'hj': hj,
    'slug': slug(stem, branch),
    'stem_ko': STEMS[stem],
    'stem_hj': STEMS_HJ[stem],
    'stem_oh_ko': STEM_OH_KO[s_oh],
    'stem_oh_hj': STEM_OH_HJ[s_oh],
    'stem_nick': STEM_NICK[stem],
    'stem_body': STEM_BODY[stem],
    'stem_keys': STEM_KEYS[stem],
    'br_ko': BRANCHES[branch],
    'br_hj': BRANCHES_HJ[branch],
    'br_oh_ko': STEM_OH_KO[b_oh],
    'animal': BR_ANIMAL[branch],
    'branch_nick': BR_NICK[branch],
    'branch_body': BR_BODY[branch],
    'branch_keys': BR_KEYS[branch],
    'rel_kind': rel_kind,
    'rel_desc': rel_desc,
    'rel_meta': REL_BODY[rel_kind].split('.')[0],
    'rel_body': REL_BODY[rel_kind],
    'stem_trait_short': STEM_TRAIT_SHORT[stem],
    'branch_trait_short': BRANCH_TRAIT_SHORT[branch],
    'personality_extra': PERSONALITY_EXTRA[rel_kind],
    'love_extra': LOVE_EXTRA[rel_kind],
    'good_partners_str': partner_str,
    'job_body': JOB_BY_REL[rel_kind] + ' ' + ('큰 흐름은 본인 일간 ' + STEMS[stem] + STEM_OH_KO[s_oh] + '의 본질을 살리는 분야에 집중하세요.'),
    'health_body': HEALTH_BODY_BY_OH[s_oh] + ' 일지 ' + STEM_OH_KO[b_oh] + ' 영역도 함께 살피시면 좋습니다.',
    'sinsal_body': sinsal_body,
    'daeun_hint': DAEUN_HINT[rel_kind],
    'quote': CLASSIC_QUOTES[idx % len(CLASSIC_QUOTES)],
    'summary': make_summary(stem, branch, rel_kind),
    'date_iso': '2026-05-10',
    'date_kr': '2026년 5월 10일',
    'jsonld': jsonld,
  }
  return TEMPLATE.format(**ctx)

# ── 60편 생성 ──
generated = []
for i in range(60):
  stem, branch = gz(i)
  fname = slug(stem, branch) + '.html'
  fpath = os.path.join(ILJU_DIR, fname)
  with open(fpath, 'w', encoding='utf-8') as f:
    f.write(make_post(i))
  generated.append((i, stem, branch, fname))

print(f'생성 완료: {len(generated)}편')
for i, s, b, fn in generated[:5]:
  print(f'  {i+1:>2}번 {STEMS[s]}{BRANCHES[b]} → {fn}')
print('  ...')

# ── sitemap.xml 업데이트 ──
sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
def url_entry(loc, priority='0.7', freq='monthly'):
  return f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>2026-05-10</lastmod>\n    <changefreq>{freq}</changefreq>\n    <priority>{priority}</priority>\n  </url>'

sitemap_lines.append(url_entry('https://saju-mbti-9h1.pages.dev/', '1.0', 'daily'))
sitemap_lines.append(url_entry('https://saju-mbti-9h1.pages.dev/blog/', '0.9', 'weekly'))
sitemap_lines.append(url_entry('https://saju-mbti-9h1.pages.dev/blog/basics/saju-basics.html', '0.8', 'monthly'))
sitemap_lines.append(url_entry('https://saju-mbti-9h1.pages.dev/blog/basics/manseryeok.html', '0.8', 'monthly'))
sitemap_lines.append(url_entry('https://saju-mbti-9h1.pages.dev/blog/mbti-saju/infj.html', '0.7', 'monthly'))

for i, s, b, fn in generated:
  sitemap_lines.append(url_entry(f'https://saju-mbti-9h1.pages.dev/blog/ilju-list/{fn}', '0.7', 'monthly'))

sitemap_lines.append('</urlset>')
with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
  f.write('\n'.join(sitemap_lines) + '\n')
print(f'sitemap.xml 업데이트 완료 — {len(generated) + 5} URL')

# ── 블로그 허브 (blog/index.html) 일주 그리드 교체 ──
with open(HUB_PATH, 'r', encoding='utf-8') as f:
  hub = f.read()

# 60갑자 섹션의 현재 그리드를 통째로 교체
ilju_grid_lines = []
for i in range(60):
  stem, branch = gz(i)
  fname = slug(stem, branch) + '.html'
  ko = STEMS[stem] + BRANCHES[branch]
  hj = STEMS_HJ[stem] + BRANCHES_HJ[branch]
  ilju_grid_lines.append(f'''      <a href="/blog/ilju-list/{fname}" class="blog-card">
        <div class="card-tag">60갑자 · {i+1}번</div>
        <h3>{ko}({hj})일주</h3>
        <p>「{STEM_NICK[stem]}」 + 「{BR_NICK[branch]}」의 결</p>
      </a>''')

new_grid = '\n'.join(ilju_grid_lines)

# 60갑자 섹션 교체
import re
pattern = re.compile(r'(<section class="blog-section">\s*<h2>🌀 60갑자 일주 풀이</h2>.*?<div class="blog-grid">)(.*?)(</div>\s*<p class="sec-desc"[^<]*</p>\s*</section>)', re.DOTALL)
m = pattern.search(hub)
if m:
  new_hub = hub[:m.start(2)] + '\n' + new_grid + '\n    ' + hub[m.end(2):]
  # 안내 문구도 갱신
  new_hub = new_hub.replace('※ 60갑자 전체 풀이는 순차적으로 공개됩니다.', '※ 60갑자 전체 풀이가 공개되어 있습니다. 본인 일주를 클릭해 풀이를 확인하세요.')
  with open(HUB_PATH, 'w', encoding='utf-8') as f:
    f.write(new_hub)
  print('blog/index.html 60갑자 그리드 교체 완료')
else:
  print('!! 블로그 허브 60갑자 섹션 패턴을 찾지 못함 — 수동 점검 필요')
