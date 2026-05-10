#!/usr/bin/env python3
"""
인생 시기별 풀이 4편 생성기
- 초년(0~25, 년주) / 청년(25~50, 월주) / 중년(50~75, 일주) / 말년(75~, 시주)
- 사주 4기둥과 시기를 매핑하고 시기별 핵심 사건·보는 법·행동 가이드
"""
import os, json, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'blog', 'lifestage')
SITEMAP_PATH = os.path.join(ROOT, 'sitemap.xml')
HUB_PATH = os.path.join(ROOT, 'blog', 'index.html')

os.makedirs(OUT_DIR, exist_ok=True)

POSTS = [
  {
    'slug': 'choneon',
    'title': '초년 사주 보는 법 — 년주(年柱)로 읽는 0~25세',
    'description': '사주에서 초년(0~25세)은 년주(年柱)가 핵심입니다. 조상·부모·집안 환경·학업·진로 결정의 결을 년주의 천간·지지로 풀어내는 법을 정리합니다.',
    'keywords': '초년 사주, 년주 풀이, 어린 시절 사주, 학업운, 진로 사주, 사주 4기둥',
    'reading': '약 7분',
    'body': '''<p>사주에서 인생을 4단계로 나누면 초년·청년·중년·말년의 큰 흐름이 보입니다. 각 시기는 사주의 4기둥(년주·월주·일주·시주)과 짝을 이루며, 본인이 어느 시기에 어떤 결을 만나는지를 풀어줍니다. 그중 「초년(0~25세)」을 보는 핵심 자리는 <b>년주(年柱)</b>입니다.</p>

<h2>초년 = 년주의 자리</h2>
<p>년주는 본인이 태어난 해의 천간·지지 한 쌍입니다. 사주에서 「조상·뿌리·집안·초년」을 상징하는 자리이며, 본인이 어떤 환경에서 태어나 어떻게 자랐는지의 큰 결을 보여줍니다.</p>
<table>
  <thead><tr><th>년주의 의미</th><th>풀이 영역</th></tr></thead>
  <tbody>
    <tr><td><b>년 천간</b></td><td>조상·아버지 쪽 가문·집안 외양적 환경</td></tr>
    <tr><td><b>년 지지</b></td><td>조상·어머니 쪽 가문·집안의 실제 환경</td></tr>
    <tr><td><b>년주의 십신</b> (일간 기준)</td><td>본인이 부모·조상으로부터 받은 결의 색채</td></tr>
  </tbody>
</table>

<h2>년주 십신으로 보는 초년 환경</h2>
<p>년주의 천간이 본인 일간 기준 어떤 십신인지를 보면 초년 환경의 큰 결이 보입니다.</p>
<ul>
  <li><b>년주가 인성(印星)</b> — 부모·조상의 정신적·물질적 후원이 두텁다. 학구열이 높은 환경에서 자람.</li>
  <li><b>년주가 비겁(比劫)</b> — 형제·친척과의 인연이 진함. 어릴 때부터 자기 결정력이 강함.</li>
  <li><b>년주가 식상(食傷)</b> — 표현·창작·예술 환경이 친숙. 부모가 본인의 자유로운 표현을 받쳐줌.</li>
  <li><b>년주가 재성(財星)</b> — 활동·실리·재물의 환경. 부모가 활동적이거나 사업을 함.</li>
  <li><b>년주가 관성(官星)</b> — 책임·규율·전통의 환경. 부모가 엄격하거나 명예를 중시.</li>
</ul>

<h2>초년 핵심 사건 — 어떤 결을 만나는가</h2>
<ul>
  <li><b>학업·진학</b> — 사주의 인성·식상·문창귀인 작용으로 결정.</li>
  <li><b>가족 관계</b> — 년주·월주의 합·충 작용으로 부모·형제와의 결.</li>
  <li><b>건강의 기초</b> — 출생 시점 사주 오행 균형이 평생 건강의 결을 만듦.</li>
  <li><b>첫 친구·인연</b> — 비겁의 위치와 강약으로 결정.</li>
</ul>

<h2>초년 사주 보는 법 — 5가지 체크 포인트</h2>
<ol>
  <li><b>년주의 천간·지지 본질</b> — 「큰 나무 갑목」 같은 천간, 「겨울 깊은 물 자수」 같은 지지를 비유로 이해.</li>
  <li><b>년주가 일간과 어떤 관계</b> — 십신 분석으로 부모·환경의 결.</li>
  <li><b>년지가 다른 지지와 합·충</b> — 가족·환경의 평화·변동 결.</li>
  <li><b>인성 글자의 강약</b> — 부모 덕·학업운의 결.</li>
  <li><b>어린 시절 대운</b> — 첫 두 대운(0~10·10~20세)의 천간·지지 흐름.</li>
</ol>

<h2>초년 대운 — 첫 10년이 가장 결정적</h2>
<p>대운은 사주에 새 글자가 더해지는 10년 단위 흐름입니다. 본인의 대운 시작 나이부터 첫 두 대운(약 0~20세)이 본인의 학업·인성 형성에 가장 결정적 영향을 미칩니다.</p>
<div class="callout">📌 <b>주의</b> — 대운 시작 나이는 사람마다 다릅니다. 어떤 분은 3세부터 첫 대운, 어떤 분은 8세부터 시작합니다. 본인의 대운표를 확인하시면 첫 학업 시기의 결을 정확히 볼 수 있습니다.</div>

<h2>초년에 활용할 수 있는 사주의 결</h2>
<ul>
  <li><b>본인의 일간 본질을 파악</b> — 갑목 아이는 곧고 우직한 결, 계수 아이는 깊고 섬세한 결. 부모가 아이의 본질을 알면 양육이 달라집니다.</li>
  <li><b>부족한 오행 보강</b> — 사주에 부족한 오행을 색·음식·활동으로 보강하면 어릴 때부터 균형 있는 결로 자랄 수 있습니다.</li>
  <li><b>학업 타이밍</b> — 인성·문창귀인이 들어오는 대운·세운에 시험·자격을 배치.</li>
  <li><b>적성 발견</b> — 격국과 식상·관성의 위치로 본인이 잘 맞는 분야를 미리 안내.</li>
</ul>

<h2>초년의 결을 잘 가져가는 인생의 결</h2>
<p>초년은 본인이 선택하기 어려운 환경의 결입니다. 부모·집안·학교 환경이 본인을 둘러싸므로, 사주는 「<em>본인이 받은 결을 어떻게 가공할지</em>」의 큰 그림만 보여줍니다. 환경이 좋지 않은 결로 들어왔다 하더라도, 청년기 이후 본인이 본인의 결을 만들어가는 길이 사주가 권하는 가장 지혜로운 방식입니다.</p>

<h2>한 줄 정리</h2>
<p>초년 사주는 년주가 핵심입니다. 본인이 받은 환경·부모·학업의 결을 년주에서 읽어내고, 첫 두 대운으로 학업·인성 형성의 큰 흐름을 보세요. 환경은 선택할 수 없지만 그 결을 어떻게 살릴지는 본인의 선택입니다.</p>'''
  },
  {
    'slug': 'cheongnyeon',
    'title': '청년 사주 보는 법 — 월주(月柱)와 격국으로 읽는 25~50세',
    'description': '사주에서 청년기(25~50세)는 월주(月柱)와 격국(格局)이 핵심입니다. 직업·결혼·재물·도약 시기를 사주의 어느 자리로 보는지 정리합니다.',
    'keywords': '청년 사주, 월주 풀이, 직업 사주, 결혼 시기, 격국 풀이, 사주 4기둥',
    'reading': '약 7분',
    'body': '''<p>인생의 4단계 중 「청년기(25~50세)」는 사주에서 가장 분주하고 결정적인 시기입니다. 사회 진출·직업·결혼·재물 형성 등 인생의 굵직한 결정이 이 시기에 몰려 있으며, 사주의 어느 자리를 봐야 정확히 풀 수 있는지가 중요합니다.</p>

<h2>청년 = 월주의 자리</h2>
<p>청년기를 보는 핵심 자리는 <b>월주(月柱)</b>입니다. 월주는 본인이 태어난 달의 천간·지지 한 쌍이며, 사주에서 「부모·청년기·직업·격국」을 결정하는 가장 중요한 기둥입니다. 일주(본인) 다음으로 비중이 큰 자리입니다.</p>
<table>
  <thead><tr><th>월주의 의미</th><th>풀이 영역</th></tr></thead>
  <tbody>
    <tr><td><b>월 천간</b></td><td>부모(특히 어머니)의 결·청년기 외부 환경</td></tr>
    <tr><td><b>월 지지(월지)</b></td><td>격국(格局)을 결정 — 본인 직업·인생관의 큰 줄기</td></tr>
    <tr><td><b>월주의 십신</b></td><td>청년기에 어떤 결을 만나는가</td></tr>
  </tbody>
</table>

<h2>월지가 격국을 결정한다</h2>
<p>사주의 「격국(格局)」은 본인 인생관과 직업의 큰 틀입니다. 격국은 주로 월지(월주의 아래 글자)에 어떤 십신이 자리 잡고 있는지로 결정합니다.</p>
<ul>
  <li><b>월지 정관격</b> — 책임·명예·질서. 공직·관리직·법조에 결.</li>
  <li><b>월지 편관격</b> — 도전·돌파. 군경·외과·창업에 결.</li>
  <li><b>월지 정재격</b> — 안정적 재물. 회계·은행·관리.</li>
  <li><b>월지 편재격</b> — 활동 재물. 사업·영업·투자.</li>
  <li><b>월지 식신격</b> — 표현·풍요. 요식·예술·교육.</li>
  <li><b>월지 상관격</b> — 창의·기술. 예술·기술·강연.</li>
  <li><b>월지 정인격</b> — 학문·자격. 학자·교육·법조.</li>
  <li><b>월지 편인격</b> — 전문·연구. 연구·종교·역학.</li>
  <li><b>월지 건록격</b> — 자립·전문직. 본인 사업.</li>
  <li><b>월지 양인격</b> — 강한 추진력. 무관·외과·운동.</li>
</ul>
<p>본인 격국을 알면 청년기에 어느 분야로 진로를 잡아야 결이 잘 맞는지 또렷이 보입니다.</p>

<h2>청년기 핵심 사건 — 직업·결혼·재물</h2>

<h3>1. 직업 결정과 도약</h3>
<p>관성(정관·편관)이 들어오는 대운·세운에 직업 결정·승진·이직의 결정적 시기가 옵니다. 격국과 본인 일간을 함께 봐서 어느 분야가 결이 잘 맞는지를 정하시면 됩니다.</p>

<h3>2. 결혼 시기</h3>
<p>결혼 시기를 보려면 다음을 봅니다.</p>
<ul>
  <li><b>일지(배우자궁)에 합이 들어오는 해</b> — 일지와 합을 이루는 지지가 들어오는 세운.</li>
  <li><b>남자는 재성, 여자는 관성이 강해지는 시기</b> — 결혼 인연이 결실로 이어지기 쉬움.</li>
  <li><b>도화·홍염살 활성화 시기</b> — 인연 만남이 잦아짐.</li>
</ul>

<h3>3. 재물 형성</h3>
<p>재성 대운(편재·정재)이 청년기에 들어오면 재물 형성의 결정적 시기입니다. 본인의 일간이 강하면 큰 흐름의 돈을, 약하면 안정적 자산 위주로 결을 잡으시면 좋습니다.</p>

<h2>청년 사주 보는 법 — 7가지 체크 포인트</h2>
<ol>
  <li><b>월지의 정기 십신</b> → 격국 확인.</li>
  <li><b>본인 일간의 강약</b> → 신강·신약 판단으로 직업 강도 결정.</li>
  <li><b>용신 오행</b> → 본인에게 좋은 색·방향·직업.</li>
  <li><b>관성·재성의 위치</b> → 직업·결혼·재물의 결.</li>
  <li><b>일지의 합·충</b> → 배우자 결의 부드러움·변동.</li>
  <li><b>20대~40대 대운 흐름</b> → 도약과 정리의 시기.</li>
  <li><b>청년기 세운의 좋은 해</b> → 큰 결정 배치.</li>
</ol>

<h2>청년기 결정적 시기 알아보는 법</h2>
<p>청년기 동안 결정적 시기를 알려면 다음 두 가지를 봅니다.</p>
<div class="callout">🎯 <b>본인 용신이 들어오는 대운</b> — 본인 사주의 균형을 잡아주는 핵심 오행이 대운으로 들어오면 그 10년이 인생의 가장 큰 도약 시기가 됩니다.<br>🎯 <b>관성·재성이 들어오는 시기</b> — 직업·결혼·재물 결정의 결정적 시기가 됩니다.</div>

<h2>청년기를 잘 살아가는 결</h2>
<ul>
  <li><b>본인 격국에 맞는 분야 선택</b> — 격국을 거스르는 직업은 평생 답답함을 만듭니다.</li>
  <li><b>결정적 시기에 굵직한 결정 배치</b> — 결혼·이직·창업은 본인의 좋은 대운·세운에 맞추세요.</li>
  <li><b>약한 영역은 의식적으로 보강</b> — 본인 사주의 약점을 청년기에 의식적으로 챙기면 평생의 결이 균형 잡힙니다.</li>
  <li><b>건강의 기초 다지기</b> — 청년기 무리는 중년기에 그대로 돌아옵니다. 본인 약한 오행 영역을 챙기세요.</li>
</ul>

<h2>한 줄 정리</h2>
<p>청년기 사주는 월주가 핵심입니다. 월지로 격국을 잡고, 관성·재성·용신의 흐름으로 직업·결혼·재물의 결정적 시기를 보세요. 인생의 굵직한 결정은 본인의 결이 잘 맞는 시기에 배치하는 게 청년기 사주 활용의 핵심입니다.</p>'''
  },
  {
    'slug': 'jungnyeon',
    'title': '중년 사주 보는 법 — 일주(日柱)와 대운으로 읽는 50~75세',
    'description': '사주에서 중년기(50~75세)는 일주(日柱) 자체와 대운 흐름이 핵심입니다. 본인의 본질이 가장 또렷이 발현되는 시기, 건강·관계·자아실현의 결을 정리합니다.',
    'keywords': '중년 사주, 일주 풀이, 50대 사주, 60대 사주, 대운 풀이, 사주 4기둥',
    'reading': '약 7분',
    'body': '''<p>인생의 4단계 중 「중년기(50~75세)」는 사주에서 본인의 본질이 가장 또렷이 발현되는 시기입니다. 청년기에 쌓아온 결실을 거두는 동시에 새로운 도약을 준비하는 시기이며, 사주의 일주(日柱) 자체와 그 시기 대운이 핵심입니다.</p>

<h2>중년 = 일주의 자리 + 5~7번째 대운</h2>
<p>일주(日柱)는 본인 자체이므로 모든 시기에 작용하지만, 특히 중년기에는 본인이 가진 결이 가장 또렷이 발현됩니다. 청년기까지 쌓아온 자산·관계·경험이 본인의 일간 본질과 만나 「<em>본인다운 인생</em>」이 완성되는 시기입니다.</p>
<table>
  <thead><tr><th>중년 풀이 자리</th><th>풀이 영역</th></tr></thead>
  <tbody>
    <tr><td><b>일간(日干)</b></td><td>본인 자체. 중년기에 가장 또렷이 발현</td></tr>
    <tr><td><b>일지(日支, 배우자궁)</b></td><td>배우자·가까운 관계의 결</td></tr>
    <tr><td><b>5~7번째 대운</b> (40대 후반~70대)</td><td>중년기 사회적 도약과 정리의 흐름</td></tr>
    <tr><td><b>일주의 신살</b></td><td>본인의 강점·약점이 가장 진하게 발현</td></tr>
  </tbody>
</table>

<h2>중년기 핵심 사건</h2>

<h3>1. 자아실현 — 본인다움의 완성</h3>
<p>청년기까지는 외부 환경에 적응하느라 본인의 결이 가려지지만, 중년기에 들어서면 본인의 일간 본질이 또렷이 발현됩니다. 「큰 나무 갑목」은 우직한 리더로 단단해지고, 「이슬비 계수」는 깊이 있는 사색가로 완성되는 식입니다.</p>

<h3>2. 사회적 정점</h3>
<p>50~60대는 직장·사업의 사회적 정점입니다. 청년기에 쌓아온 자산이 결실로 돌아오는 시기이며, 관성(정관·편관)이 강한 사주는 이 시기에 큰 자리에 오릅니다.</p>

<h3>3. 건강 점검</h3>
<p>청년기에 무리한 결이 중년기에 그대로 돌아옵니다. 본인 사주의 약한 오행 영역(간·심·소화·폐·신장)이 50대 이후 본격적으로 신호를 보냅니다. 정기 검진과 본인 약점 영역의 의식적 관리가 필수입니다.</p>

<h3>4. 부부 관계 재정립</h3>
<p>자녀가 독립하면서 부부만의 시간이 다시 늘어나는 시기입니다. 일지(배우자궁)의 합·충 작용에 따라 관계의 결이 새로 잡힙니다.</p>

<h3>5. 인생 2막 시작</h3>
<p>은퇴·이직·창업 등 인생 2막의 결정적 시기. 본인 격국과 일간을 다시 점검하고 「<em>이 결을 가지고 다음 25년을 어떻게 살까</em>」를 정해야 합니다.</p>

<h2>중년 사주 보는 법 — 6가지 체크 포인트</h2>
<ol>
  <li><b>일주 자체</b> — 본인의 60갑자 일주의 결이 가장 진하게 발현.</li>
  <li><b>일주의 신살</b> — 천을귀인·역마·도화·양인 등이 중년기에 또렷.</li>
  <li><b>5~7번째 대운</b> — 40대 후반부터 시작되는 대운의 천간·지지 십신.</li>
  <li><b>관성의 강약</b> — 사회적 자리·승진·권위의 결.</li>
  <li><b>식상의 활용</b> — 본인의 표현·창작·후배 양성의 결.</li>
  <li><b>일지 합·충</b> — 배우자·가족 관계의 결.</li>
</ol>

<h2>중년 대운 — 인생의 가장 결정적 시기</h2>
<p>대부분의 사람에게 가장 큰 사회적 도약은 4~6번째 대운(약 30대 후반~60대 초반)에 옵니다. 이 시기 대운에 본인의 용신·관성·재성이 들어오면 인생의 정점에 오를 수 있습니다.</p>
<div class="callout">🎯 <b>중년 대운 활용</b> — 본인의 좋은 대운에 인생의 큰 결정을 배치하세요. 이직·창업·결혼·자녀 결혼·이사 등 모든 굵직한 일을 좋은 대운 시기에 몰아넣는 게 결실을 키우는 결입니다.</div>

<h2>중년기 잘 살아가는 결</h2>

<h3>본인다움의 완성에 집중</h3>
<p>청년기에는 「세상에 맞추는 결」이 컸다면 중년기는 「본인의 결을 세상에 풀어내는 결」입니다. 본인 일간의 본질을 깊이 알고 그 결을 따라 살아가시는 게 가장 중요합니다.</p>

<h3>건강에 우선순위 두기</h3>
<p>본인 사주의 약한 오행 영역을 50대부터 본격적으로 챙기세요. 정기 검진·식단·운동·휴식의 균형이 노년의 결을 결정합니다.</p>

<h3>인생 2막 미리 설계</h3>
<p>은퇴 이후의 결을 미리 그려보세요. 본인의 격국·일간이 가장 빛나는 분야를 1막 종료 5년 전부터 준비하시면 자연스럽게 2막이 시작됩니다.</p>

<h3>가까운 관계 다듬기</h3>
<p>일지(배우자궁)의 작용으로 부부 관계가 새로 정의되는 시기입니다. 의식적인 대화·여행·취미 공유가 결을 다듬어줍니다.</p>

<h3>후배·자녀에게 결 전하기</h3>
<p>본인이 쌓아온 결실을 후배·자녀에게 전하는 결도 중년기의 큰 자산입니다. 가르침·멘토링·물려줌은 본인의 결이 사회로 확장되는 통로입니다.</p>

<h2>한 줄 정리</h2>
<p>중년기 사주는 일주 자체와 대운이 핵심입니다. 본인의 일간 본질을 깊이 알고 그 결을 풀어내며, 좋은 대운에 굵직한 결정을 배치하면 본인다움의 완성과 인생 2막의 도약을 함께 이룰 수 있습니다.</p>'''
  },
  {
    'slug': 'malnyeon',
    'title': '말년 사주 보는 법 — 시주(時柱)와 자녀·노년의 결',
    'description': '사주에서 말년(75세~)은 시주(時柱)가 핵심입니다. 자녀운·노년의 풍요·정신적 안정·후세에 남기는 결을 시주의 천간·지지로 풀어내는 법을 정리합니다.',
    'keywords': '말년 사주, 시주 풀이, 노년 사주, 자녀운, 노후 풀이, 사주 4기둥',
    'reading': '약 7분',
    'body': '''<p>인생의 4단계 중 「말년(75세~)」은 사주에서 본인이 살아온 결의 결실을 거두고, 다음 세대에 결을 넘기는 시기입니다. 사주의 시주(時柱)가 핵심이며, 마지막 대운들이 노년의 결을 결정합니다.</p>

<h2>말년 = 시주의 자리 + 마지막 두세 대운</h2>
<p>시주(時柱)는 본인이 태어난 시각의 천간·지지 한 쌍입니다. 사주에서 「자녀·후배·말년·정신적 결실」을 상징하는 자리이며, 본인 인생의 마지막 풍경을 보여주는 기둥입니다.</p>
<table>
  <thead><tr><th>시주의 의미</th><th>풀이 영역</th></tr></thead>
  <tbody>
    <tr><td><b>시 천간</b></td><td>아들·후배·말년에 만나는 외부 결</td></tr>
    <tr><td><b>시 지지</b></td><td>딸·말년의 거주 환경·내면의 평화</td></tr>
    <tr><td><b>시주의 십신</b></td><td>말년에 어떤 결을 누리는가</td></tr>
    <tr><td><b>마지막 대운들</b></td><td>노년의 사회적·정신적 결의 흐름</td></tr>
  </tbody>
</table>
<div class="callout">⚠️ <b>시간 미상의 경우</b> — 본인이 태어난 시각을 모르면 시주를 정확히 산출할 수 없어 말년 풀이가 어렵습니다. 호적·가족에게 확인하시면 정확한 풀이가 가능합니다.</div>

<h2>시주 십신으로 보는 말년의 결</h2>
<ul>
  <li><b>시주가 정관(正官)</b> — 명예로운 노년. 후손이 출세하거나 사회적 존경을 받는 결.</li>
  <li><b>시주가 편관(偏官)</b> — 활동적인 노년. 끝까지 한 분야에서 활동하는 결.</li>
  <li><b>시주가 정재·편재</b> — 풍요로운 노년. 재물 결실과 안락한 환경.</li>
  <li><b>시주가 식신·상관</b> — 예술·창작·후배 양성에 결이 좋음. 정신적 풍요.</li>
  <li><b>시주가 정인·편인</b> — 학문·종교·정신적 깊이의 노년. 깊이 있는 사색.</li>
  <li><b>시주가 비견·겁재</b> — 자기 결을 끝까지 지키는 노년. 자녀와의 거리감 가능.</li>
</ul>

<h2>말년 핵심 영역</h2>

<h3>1. 자녀운</h3>
<p>시주는 자녀의 자리이기도 합니다. 시주의 천간·지지 십신과 본인 일간 관계로 자녀의 결을 봅니다. 시주가 안정적이고 길한 결이면 자녀가 효성스럽고 출세하기 쉽습니다.</p>

<h3>2. 노년의 풍요</h3>
<p>시주에 재성·식상이 있으면 노년에 경제적·물질적 풍요를 누리는 결입니다. 청년·중년기에 쌓은 자산이 노년에 안정으로 돌아옵니다.</p>

<h3>3. 정신적 평화</h3>
<p>시주의 지지가 평이하고 합·충이 적으면 정신적 안정이 따르는 결입니다. 종교·학문·예술 등 정신적 활동에 깊이 들어갑니다.</p>

<h3>4. 건강·장수</h3>
<p>본인 사주의 일간이 끝까지 강한지(신강), 약한지(신약)가 장수의 결을 결정합니다. 일간이 약한 사주는 노년기 의료적 관리가 더 중요합니다.</p>

<h3>5. 후세에 남기는 결</h3>
<p>말년은 본인이 쌓아온 결을 다음 세대에 어떻게 전할지를 정리하는 시기입니다. 식상·인성이 강한 사주는 가르침·작품·기록을 남기기 좋은 결입니다.</p>

<h2>말년 사주 보는 법 — 6가지 체크 포인트</h2>
<ol>
  <li><b>시주의 천간·지지 본질</b> — 마지막 기둥의 결.</li>
  <li><b>시주의 십신</b> — 말년에 어떤 결을 만나는가.</li>
  <li><b>시주가 일주와 어떤 관계</b> — 합·충·생·극으로 본인과의 결.</li>
  <li><b>마지막 두세 대운</b> — 65세 이후 대운의 흐름.</li>
  <li><b>일간의 강약</b> — 노년 건강·장수의 결.</li>
  <li><b>시주의 신살</b> — 화개살이 시주에 있으면 종교·학문에 깊이 들어감 등.</li>
</ol>

<h2>말년 대운 — 마무리의 결</h2>
<p>마지막 두세 대운(60대 중반 이후)에서 들어오는 글자가 본인 사주에 어떤 작용을 하는지가 노년의 결을 결정합니다.</p>
<ul>
  <li><b>마지막 대운에 인성</b> — 정신적 안정과 학문·종교의 깊이.</li>
  <li><b>마지막 대운에 식상</b> — 후배 양성·창작·표현의 결실.</li>
  <li><b>마지막 대운에 재성</b> — 물질적 풍요와 안락.</li>
  <li><b>마지막 대운에 관성</b> — 사회적 명예가 끝까지 따르는 결.</li>
  <li><b>마지막 대운에 비겁</b> — 자기 결을 끝까지 지키지만 외로움 가능.</li>
</ul>

<h2>말년을 잘 살아가는 결</h2>

<h3>본인다움을 끝까지</h3>
<p>중년기에 완성된 본인의 결을 말년에도 그대로 가져가시는 게 가장 자연스럽습니다. 사회적 역할이 줄어들어도 본인의 본질은 변하지 않습니다.</p>

<h3>정신적 깊이 확장</h3>
<p>말년은 정신적 활동이 가장 풍요로워지는 시기입니다. 종교·철학·역학·예술·기록 등 본인이 끌리는 정신적 분야에 깊이 들어가시면 노년의 결이 빛납니다.</p>

<h3>자녀·후배에게 결을 전함</h3>
<p>본인이 쌓아온 결을 가르침·이야기·작품으로 남기세요. 사주에서 식상·인성이 강한 분이면 이 작업이 본인에게 자연스러운 결입니다.</p>

<h3>건강의 기초 유지</h3>
<p>본인 사주의 약한 오행 영역을 끝까지 챙기세요. 노년 건강의 핵심은 청년·중년기 관리이지만, 노년에도 식단·운동의 기초를 유지하는 게 결을 길게 가져갑니다.</p>

<h3>가까운 한 사람과 깊이</h3>
<p>노년의 인간관계는 넓이보다 깊이입니다. 평생 함께한 배우자·친구·자녀와의 깊이 있는 시간이 노년의 가장 큰 풍요가 됩니다.</p>

<h2>한 줄 정리</h2>
<p>말년 사주는 시주가 핵심입니다. 본인이 살아온 결의 결실을 거두고 다음 세대에 결을 넘기는 시기이며, 시주와 마지막 대운으로 자녀·풍요·정신적 안정의 결을 풀어보세요. 본인다움을 끝까지 가져가는 결이 노년의 가장 큰 자산입니다.</p>'''
  },
]

TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>{title} | 천지인 사주</title>
<meta name="description" content="{description}">
<meta name="keywords" content="{keywords}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://saju-mbti-9h1.pages.dev/blog/lifestage/{slug}.html">

<meta property="og:type" content="article">
<meta property="og:site_name" content="천지인 사주">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="https://saju-mbti-9h1.pages.dev/blog/lifestage/{slug}.html">
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
    <div class="blog-article-cat">인생 시기별 풀이</div>
    <h1>{title}</h1>
    <div class="blog-article-meta">
      <time datetime="2026-05-10">2026년 5월 10일</time>
      <span class="dot">·</span>
      <span>읽는 시간 {reading}</span>
    </div>
  </header>

  <div class="blog-article-body">
{body}

    <div class="article-cta">
      <div class="article-cta-title">📿 내 인생 시기별 흐름 보기</div>
      <div class="article-cta-desc">생년월일·시·태어난 곳을 입력하시면 본인의 4기둥과 대운 흐름을<br>10년 단위로 자세히 풀이해드립니다. 본인의 결정적 시기가 언제인지 확인하세요.</div>
      <a href="/?utm_source=blog&utm_medium=cta&utm_campaign=lifestage-{slug}" class="article-cta-btn">내 사주 보러가기 →</a>
    </div>

    <div class="related">
      <h3>📖 함께 읽으면 좋은 글</h3>
      <div class="blog-grid">
        <a href="/blog/basics/saju-basics.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>사주 보는 법 — 사주팔자 8글자의 의미</h3>
          <p>4기둥의 의미와 시기별 작용을 처음부터 차근히</p>
        </a>
        <a href="/blog/basics/daeun-saewoon.html" class="blog-card">
          <div class="card-tag">사주 기초</div>
          <h3>대운과 세운 — 10년·1년 단위의 흐름</h3>
          <p>인생의 결정적 시기를 알아보는 핵심 도구</p>
        </a>
      </div>
    </div>
  </div>
</article>

<footer class="blog-foot">
  <div>☯︎ 천지인 사주 — 만세력 기반 사주팔자 × MBTI 통합 분석</div>
  <div style="margin-top:8px"><a href="/">사주 분석 도구</a> · <a href="/blog/">가이드 모음</a></div>
</footer>

</body>
</html>
"""

def make_post(p):
  jsonld = json.dumps({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": p['title'],
    "description": p['description'],
    "datePublished": "2026-05-10",
    "dateModified": "2026-05-10",
    "author": {"@type":"Organization","name":"천지인 사주"},
    "publisher": {"@type":"Organization","name":"천지인 사주","url":"https://saju-mbti-9h1.pages.dev/"},
    "mainEntityOfPage": f"https://saju-mbti-9h1.pages.dev/blog/lifestage/{p['slug']}.html",
    "inLanguage": "ko",
    "articleSection": "인생 시기별 풀이"
  }, ensure_ascii=False, indent=2)
  return TEMPLATE.format(jsonld=jsonld, **p)

# 4편 생성
for p in POSTS:
  fpath = os.path.join(OUT_DIR, f"{p['slug']}.html")
  with open(fpath, 'w', encoding='utf-8') as f:
    f.write(make_post(p))
print(f'생성 완료: {len(POSTS)}편')
for p in POSTS:
  print(f"  {p['slug']} — {p['title'][:35]}...")

# sitemap
with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
  sm = f.read()
new_blocks = ''
for p in POSTS:
  url = f'https://saju-mbti-9h1.pages.dev/blog/lifestage/{p["slug"]}.html'
  if url in sm:
    continue
  new_blocks += f'  <url>\n    <loc>{url}</loc>\n    <lastmod>2026-05-10</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n'
if new_blocks:
  sm_new = sm.replace('</urlset>', new_blocks + '</urlset>')
  with open(SITEMAP_PATH, 'w', encoding='utf-8') as f:
    f.write(sm_new)
  print('sitemap.xml 업데이트 — 4 lifestage URL 추가')

# 블로그 허브
with open(HUB_PATH, 'r', encoding='utf-8') as f:
  hub = f.read()

cards = []
for p in POSTS:
  short = p['title'].split(' — ')[0]
  desc_short = p['description'].split('.')[0][:55]
  cards.append(f'''      <a href="/blog/lifestage/{p['slug']}.html" class="blog-card">
        <div class="card-tag">시기별 · {short.replace(' 사주 보는 법','')}</div>
        <h3>{short}</h3>
        <p>{desc_short}</p>
      </a>''')
grid = '\n'.join(cards)

section_html = f'''  <section class="blog-section">
    <h2>📜 인생 시기별 풀이</h2>
    <p class="sec-desc">초년·청년·중년·말년 각각 사주의 어느 자리를 봐야 하는지, 시기별 결정적 사건과 활용법.</p>
    <div class="blog-grid">
{grid}
    </div>
  </section>

'''

existing = re.search(r'<section class="blog-section">\s*<h2>📜 인생 시기별 풀이</h2>[\s\S]*?</section>\s*', hub)
if existing:
  new_hub = hub[:existing.start()] + section_html + hub[existing.end():]
else:
  pattern = re.compile(r'(<section class="blog-section">\s*<h2>⚡ 신살 개별 풀이</h2>[\s\S]*?</section>\s*)', re.DOTALL)
  m = pattern.search(hub)
  if m:
    insert_pos = m.end()
    new_hub = hub[:insert_pos] + section_html + hub[insert_pos:]
  else:
    print('!! 신살 섹션 패턴을 찾지 못함')
    new_hub = hub

with open(HUB_PATH, 'w', encoding='utf-8') as f:
  f.write(new_hub)
print('blog/index.html 인생 시기별 섹션 갱신 완료')
