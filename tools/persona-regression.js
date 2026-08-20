#!/usr/bin/env node
/*
 * persona-regression.js — 개인화 회귀 점검 (브라우저 없이 Node로 실행)
 *
 * 무엇을 보장하나:
 *   "같은 일주(또는 같은 일간)라도 나머지 사주가 다르면 풀이가 달라진다"
 *   + 주요 카테고리가 에러 없이 렌더되고, 미치환(${dm.x})·undefined 누수가 없다.
 *
 * 사용법:
 *   node tools/persona-regression.js               # ../index.html 자동 사용
 *   node tools/persona-regression.js path/to/index.html
 *
 * 동작: index.html의 인라인 <script>를 추출 → 브라우저 전역을 무해 스텁으로 채움
 *       → 실제 사주 함수를 직접 호출 → 결과를 검사. 하나라도 실패하면 exit 1.
 *
 * 개인화를 손볼 때마다 돌리세요. 누군가 풀이를 다시 "일간 한 글자"로 되돌리면 여기서 잡힙니다.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const target = process.argv[2] || path.join(__dirname, '..', 'index.html');
if (!fs.existsSync(target)) {
  console.error('대상 파일을 찾을 수 없어요:', target);
  process.exit(2);
}
const html = fs.readFileSync(target, 'utf8');

// 인라인 JS만 추출 (외부 src·JSON-LD 제외)
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, code = '';
while ((m = re.exec(html))) {
  const attrs = m[1] || '';
  if (/\ssrc\s*=/.test(attrs)) continue;
  if (/application\/ld\+json/i.test(attrs)) continue;
  code += '\n;\n' + m[2];
}

// 브라우저 전역 무해 스텁 (top-level DOM 코드가 throw하지 않게)
const mkProxy = () => new Proxy(function () {}, {
  get: (t, k) => {
    if (k === 'cookie') return '';
    if (k === 'length') return 0;
    if (k === 'toString' || k === 'valueOf' || k === Symbol.toPrimitive) return () => '';
    return mkProxy();
  },
  set: () => true, apply: () => mkProxy(), construct: () => mkProxy(), has: () => true,
});
const sb = {};
sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.top = sb;
sb.document = mkProxy();
sb.navigator = { userAgent: 'node', language: 'ko' };
sb.location = { href: 'http://x/', search: '', hash: '', pathname: '/' };
sb.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
sb.sessionStorage = sb.localStorage;
sb.addEventListener = () => {}; sb.removeEventListener = () => {};
sb.setTimeout = () => 0; sb.setInterval = () => 0; sb.clearTimeout = () => {}; sb.clearInterval = () => {};
sb.requestAnimationFrame = () => 0;
sb.fetch = () => Promise.resolve({ json: () => Promise.resolve({}), text: () => Promise.resolve('') });
sb.Kakao = mkProxy(); sb.gtag = () => {}; sb.dataLayer = [];
sb.matchMedia = () => ({ matches: false, addEventListener: () => {}, addListener: () => {} });
sb.alert = () => {}; sb.confirm = () => true; sb.prompt = () => '';
sb.history = { pushState: () => {}, replaceState: () => {} };
sb.URL = URL; sb.URLSearchParams = URLSearchParams;
sb.html2canvas = () => Promise.resolve(mkProxy());
sb.console = console;
sb.__SOURCE_HTML__ = html;

// 점검 본체 — 앱 코드와 같은 스코프에서 실행해야 const 테이블에 접근 가능
const harness = `
;(function(){
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });
  const clean = s => String(s).replace(/<[^>]+>/g, '');
  // 미치환 템플릿·undefined 누수 탐지
  const leaky = s => /\\\$\\{dm\\.(pos|neg|core|n)/.test(s) ||
                     /undefined(을|를|의|이|가|이라는| 경향)|,\\s*undefined/.test(s);

  // 사주 만들기: (년간,년지, 월간,월지, 일간,일지, 시간,시지)
  const C = (ys,yb,ms,mb,ds,db,hs,hb) => ({yp:{stem:ys,branch:yb},mp:{stem:ms,branch:mb},dp:{stem:ds,branch:db},hp:{stem:hs,branch:hb},mi:Math.max(0,MON_BRN.indexOf(mb))});
  // 두 사주는 일주(갑인=0,2) 동일, 나머지 여섯 글자만 다름 → 십신축 self vs gwan
  const SELF = C(1,3, 0,2, 0,2, 1,3);   // 목 가득 → 자기 주도
  const GWAN = C(6,8, 7,9, 0,2, 6,8);   // 금 가득 → 책임·완성
  // 띠: 같은 날(그날 지지 午=6), 일지만 다름
  const ZRAT  = C(1,3, 0,2, 0,0, 1,3);  // 일지 子(쥐)
  const ZTIGER= C(6,8, 7,9, 0,2, 6,8);  // 일지 寅(호랑이)

  try {
    // 1) 직업 적성 — 같은 일주, 다른 십신축
    const ca = careerProfile(SELF).careers.join(','), cb = careerProfile(GWAN).careers.join(',');
    ok('careerProfile: 같은 일주라도 십신축 다르면 추천 직군 다름', ca !== cb, 'SELF=['+ca+'] GWAN=['+cb+']');

    // 2) 강점/약점 — personaStrengths
    const sa = JSON.stringify(personaStrengths(SELF)), sbb = JSON.stringify(personaStrengths(GWAN));
    ok('personaStrengths: 같은 일주라도 강점/약점 다름', sa !== sbb);
    ok('personaStrengths.keyword 존재', !!personaStrengths(SELF).keyword);

    // 3) personaTwist — 한 구절이 사주별로 다름
    ok('personaTwist: 사주별로 다른 구절', personaTwist(SELF) !== personaTwist(GWAN));

    // 4) 좋은 띠 — 같은 날, 다른 일지
    const ys1 = getYongsin(ohCount(ZRAT)).main, ys2 = getYongsin(ohCount(ZTIGER)).main;
    const g1 = userMatchZodiacs(ZRAT, ys1, 6).good.join(','), g2 = userMatchZodiacs(ZTIGER, ys2, 6).good.join(',');
    ok('userMatchZodiacs: 같은 날이라도 일지 다르면 좋은 띠 다름', g1 !== g2, '쥐=['+g1+'] 범=['+g2+']');

    // 5) 궁합 성격궁합 — 같은 일간쌍이라도 사주 다르면 다름
    const pcAB = getPersonalityCompat(DM[0],DM[0],0,0,SELF,GWAN);
    const pcAA = getPersonalityCompat(DM[0],DM[0],0,0,SELF,SELF);
    ok('getPersonalityCompat: 같은 일간쌍이라도 사주 다르면 다름', pcAB !== pcAA);

    // 6) 결과 헤더 키워드 칩 — 사주별로 다름
    ok('resultHeroHTML 키워드 칩: 사주별로 다름',
       resultHeroHTML(SELF,'','life') !== resultHeroHTML(GWAN,'','life'));

    // 렌더에 필요한 전역
    _meta = { gender:'male', mbti:'INTJ', sy:1990, sm:5, sd:15, hour:12, min:0, tsoMin:0 };
    gender = 'male'; _saju = SELF;

    // 7) 인생총운 full 렌더 — 깨짐/누수 없음 + 두 사주 다름
    const ha = renderSajuPaid(SELF,1990,5,15,12,0), hb = renderSajuPaid(GWAN,1990,5,15,12,0);
    ok('renderSajuPaid 렌더 정상', typeof ha === 'string' && ha.length > 30000, 'length='+ha.length);
    ok('renderSajuPaid 누수 없음(dm 미치환·undefined)', !leaky(ha) && !leaky(hb));
    ok('renderSajuPaid 비유 본질: 같은 일간이라도 다름',
       ha.includes('봄 태생') && hb.includes('가을 태생'));
    const fpSelf=buildPersonalFingerprint(SELF),fpGwan=buildPersonalFingerprint(GWAN);
    ok('개인 지문: 같은 일주도 나머지 여섯 글자에 따라 다름',
       fpSelf.key!==fpGwan.key && fpSelf.hook!==fpGwan.hook);
    const fingerprintSet=new Set();
    for(let i=0;i<120;i++){
      const sample=C(i%10,(i*5+1)%12,(i*7+3)%10,(i*7+2)%12,(i*3+1)%10,(i*11+4)%12,(i*9+2)%10,(i*5+7)%12);
      const fp=buildPersonalFingerprint(sample);if(fp)fingerprintSet.add(fp.key+'|'+fp.hook);
    }
    ok('개인 지문: 120개 표본에서 60개 이상의 조합', fingerprintSet.size>=60, 'unique='+fingerprintSet.size);
    ok('인생총운: 캐릭터와 통합 풀이에 개인 지문 노출',
       characterCardHTML(SELF,{compact:true}).includes('개인 지문') && ha.includes('life-v2-lead') && ha.includes(fpSelf.hook));

    // 8) 신년운세 — 10개 심층 상담 카드 + 3층 UI
    const ny = renderNewyearFortune(SELF, 2026);
    ok('renderNewyearFortune V3 렌더 정상', typeof ny==='string' && ny.includes('NY_OVERVIEW') && !leaky(ny));
    ok('신년운세 3층: 요약·핵심 덱·전체 서고',
       (ny.match(/data-story-layer=/g)||[]).length===3 && (_storyDeckStore['newyear-2026']||[]).length===8);
    ok('신년운세: 요약과 핵심 카드에 개인 지문 연결',
       ny.includes('story-personal-note') && (_storyDeckStore['newyear-2026'][0].copy||'').includes(fpSelf.hook));

    // 9) MBTI 통합 — 사주 측 강점/약점이 사주별로 다름
    const ma = renderMBTI(SELF,'INTJ'), mb = renderMBTI(GWAN,'INTJ');
    const grab = (s,k) => { const i=s.indexOf(k); return i<0?'':clean(s.slice(i,i+80)); };
    ok('renderMBTI 통합: 성장 방향이 사주별로 다름', grab(ma,'성장 방향') !== grab(mb,'성장 방향') && !leaky(ma));

    // 10) 자세히 사주 천성 — personaTwist로 갈림
    const da = renderSajuAnalysis(SELF), db_ = renderSajuAnalysis(GWAN);
    ok('renderSajuAnalysis 천성: 같은 일간이라도 다름',
       da.includes('봄 태생') && db_.includes('가을 태생') && !leaky(da));

    // 11) 인생총운 3층 구조 — 덱 8장·카드당 300~400자·초상 40조합
    const deck = buildLifeDeck(SELF,_meta);
    const deckLens = deck.map(card=>String(card.copy||'').replace(/<[^>]+>|&nbsp;/g,' ').length);
    ok('인생총운 덱: 8장 생성', deck.length===8, 'count='+deck.length);
    ok('인생총운 덱: 카드당 300~400자', deckLens.every(n=>n>=300&&n<=400), deckLens.join(','));
    ok('인생총운 덱: 20대부터 100세 이후까지 9구간',
       deck.every(card=>card.timeline.length===9&&card.timeline[0].label==='20대'&&card.timeline[8].label==='100세+'));
    ok('인생총운 덱: 본인 현재 나이대 한 곳만 강조',
       deck.every(card=>card.timeline.filter(item=>item.current).length===1));
    const firstDeckCard=lifeDeckCardHTML(deck[0],0,deck.length);
    ok('인생총운 덱: 분야별 전용 심볼 배지 사용',
       firstDeckCard.includes('life-deck-emblem emblem-money')&&firstDeckCard.includes('material-symbols-outlined'));
    const secondDeckCard=lifeDeckCardHTML(deck[1],1,deck.length);
    ok('인생총운 덱: 이전·근거·다음 버튼 제공',
       secondDeckCard.includes('lifeDeckPrev()')&&secondDeckCard.includes('lifeOpenEvidence(')&&secondDeckCard.includes('lifeDeckNext()'));
    ok('전체 서고: 고정 목차 접기 버튼 제공',
       ha.includes('toc-collapse-btn')&&globalThis.__SOURCE_HTML__.includes('function toggleStickyTOC('));
    ok('미니 만세력: 네 기둥 명칭 확대 스타일 적용',
       globalThis.__SOURCE_HTML__.includes('.mm-lab .term{display:inline-block;font-size:1.45rem'));
    const themeGradientLeaks=globalThis.__SOURCE_HTML__.split('\\n').filter(line=>/(?:linear|radial)-gradient/.test(line)&&
      !/(tarot-card-label|mask-image|ic-insta|ai-provider-mark\.gemini|home-share-option\.instagram|lock-preview::after|key:'instagram')/.test(line));
    ok('테마 UI: 브랜드·기능성 오버레이 외 그라데이션 0건', themeGradientLeaks.length===0, themeGradientLeaks.join(' | '));
    const portraitSet=new Set();
    [2,5,8,11].forEach(monthBranch=>{
      for(let stem=0;stem<10;stem++)portraitSet.add(characterPortraitSVG(C(1,3,0,monthBranch,stem,2,1,3)));
    });
    ok('캐릭터 초상: 일간 10종 × 계절 4종', portraitSet.size===40, 'unique='+portraitSet.size);
    const share=buildLifeShareCardHtml(SELF);
    ok('공유 카드: 1080 정사각형 클래스 생성', /life-share-card/.test(share)&&/character-portrait/.test(share));
    const layered=renderSajuPaid(SELF,1990,5,15,12,0);
    ok('인생총운 3층: 캐릭터·덱·서고 순서',
       (layered.match(/data-life-layer=/g)||[]).length===3 &&
       layered.indexOf('data-life-layer="character"')<layered.indexOf('data-life-layer="deck"') &&
       layered.indexOf('data-life-layer="deck"')<layered.indexOf('data-life-layer="library"'));
    const lifeV3Labels=['PROFILE','OPENING','PERSONA','TALENT','CAREER','WEALTH','LOVE','HUMAN','HEALTH','DAEUN10','SEWOON','MONTH12','YEAR10','GOLDEN','PRACTICE','CAUTION','MASTER'];
    ok('전체 서고: 첨부 상담 흐름을 17개 심층 카드로 구성',
       lifeV3Labels.every(label=>layered.includes('<!--CARD_START:'+label+'-->')) &&
       lifeV3Labels.filter(label=>layered.includes('<!--CARD_START:'+label+'-->')).length===17);
    ok('인생총운 V3: 사주판·관계도·이모티콘 도식 노출',
       layered.includes('life-v3-pillar-board') && layered.includes('life-v3-relation') &&
       (layered.match(/class="life-evidence"/g)||[]).length>=6 &&
       (layered.match(/class="life-v3-emoji"/g)||[]).length>=40,
       'evidence='+(layered.match(/class="life-evidence"/g)||[]).length+' emoji='+(layered.match(/class="life-v3-emoji"/g)||[]).length);
    ok('인생총운 V3: 12개월과 향후 10년을 모두 제공',
       (layered.match(/class="life-v3-time-card/g)||[]).length>=22 &&
       buildLifeV2Model(SELF,_meta).months.length===12 && buildLifeV2Model(SELF,_meta).futureYears.length===10);
    ok('인생총운 V3: 기존 반복 타임라인 카드 제거',
       !layered.includes('CARD_START:WEALTH_TIMELINE') && !layered.includes('CARD_START:CAREER_TIMELINE'));
    const lifeVisible=clean(layered);
    const lifeForbidden=['정관','편관','정재','편재','정인','편인','식신','상관','비견','겁재','격국','용신','희신','기신','지장간','십이운성','공망'].filter(word=>lifeVisible.includes(word));
    ok('인생총운 V3: 풀이 본문 전문용어·단독 명사 결 노출 없음',
       lifeForbidden.length===0 && !/(?<![가-힣])결(?![가-힣])/.test(lifeVisible), lifeForbidden.join(','));
    ok('인생총운 V3: 심층 요약본이 구조·공식·현재 시간을 사용',
       layered.includes('심층 인생총운 요약본') && _lifeSummaryData && _lifeSummaryData.version===3 &&
       buildLifeSummaryA4Html().includes('이 풀이가 나온 구조'));
    const EXAMPLE=C(3,3,5,9,9,9,2,4); // 정묘·기유·계유·병진
    const savedMeta=_meta,savedInputs=_lastInputs;
    _meta={gender:'male',sy:1987,sm:9,sd:21,hour:8,min:15,cityKey:'daejeon',tsoMin:-30};
    _lastInputs={hour:'8',min:'45',cityKey:'daejeon'};
    const exampleHtml=renderSajuPaid(EXAMPLE,1987,9,21,8,15);
    const examplePlain=exampleHtml.replace(/&nbsp;|\u00a0/g,' ');
    const exampleModel=buildLifeV2Model(EXAMPLE,_meta);
    ok('인생총운 V3: 예시 사주 네 자리·출생지·보정 시각을 그대로 반영',
       ['정묘','기유','계유','병진'].every(gz=>exampleHtml.includes(gz)) && exampleHtml.includes('life-v3-pillar-board') &&
       examplePlain.includes('대전광역시') && examplePlain.includes('08시 45분') && examplePlain.includes('08시 15분'),
       'missing='+['정묘','기유','계유','병진','대전광역시','08시 45분','08시 15분'].filter(x=>!examplePlain.includes(x)).join(','));
    ok('인생총운 V3: 예시 사주에 12개월·향후 10년·황금기 노출',
       (exampleHtml.match(/class="life-v3-time-card/g)||[]).length>=22 && (exampleHtml.match(/life-v3-golden-card/g)||[]).length>=3);
    ok('인생총운 V3: 첨부 예시의 현재 10년·8월·다음 해 원본값 유지',
       STEMKO[exampleModel.cur.stem]+BRCHKO[exampleModel.cur.branch]==='을사' &&
       exampleModel.months[7].gz==='병신' && exampleModel.futureYears[0].gz==='정미',
       'current='+STEMKO[exampleModel.cur.stem]+BRCHKO[exampleModel.cur.branch]+' aug='+exampleModel.months[7].gz+' next='+exampleModel.futureYears[0].gz);

    const newyearExample=renderNewyearFortune(EXAMPLE,2027);
    const newyearModel=buildNewyearV3Model(EXAMPLE,2027,_meta);
    const newyearPlain=clean(newyearExample).replace(/&nbsp;|\u00a0/g,' ');
    const newyearLabels=['NY_PROFILE','NY_OVERVIEW','NY_ORIGIN','NY_WEALTH','NY_LOVE','NY_HEALTH','NY_CAREER','NY_LUCK','NY_DAEUN','NY_MASTER'];
    ok('신년운세 V3: 첨부 상담 흐름을 10개 심층 카드로 구성',
       newyearLabels.every(label=>newyearExample.includes('<!--CARD_START:'+label+'-->')) &&
       newyearLabels.filter(label=>newyearExample.includes('<!--CARD_START:'+label+'-->')).length===10);
    ok('신년운세 V3: 사주판·관계도·이모티콘·기운 분포 도식 노출',
       newyearExample.includes('life-v3-pillar-board') && newyearExample.includes('life-v3-relation') &&
       newyearExample.includes('ny-v3-oh') && (newyearExample.match(/class="life-v3-emoji"/g)||[]).length>=45,
       'emoji='+(newyearExample.match(/class="life-v3-emoji"/g)||[]).length);
    ok('신년운세 V3: 예시의 출생·음력·보정 시각 원본값 반영',
       newyearPlain.includes('1987년 9월 21일') && newyearPlain.includes('1987년 7월 29일') &&
       newyearPlain.includes('08시 45분') && newyearPlain.includes('08시 15분') && newyearPlain.includes('대전광역시'));
    ok('신년운세 V3: 2027 정미·현재 을사 34~43세·나이 변화를 유지',
       newyearModel.info.gz==='정미' && STEMKO[newyearModel.cur.stem]+BRCHKO[newyearModel.cur.branch]==='을사' &&
       newyearModel.cur.age===34 && newyearModel.ageText.includes('만 39세에서 40세') &&
       newyearPlain.includes('34~43세') && newyearPlain.includes('정미'),
       'year='+newyearModel.info.gz+' current='+STEMKO[newyearModel.cur.stem]+BRCHKO[newyearModel.cur.branch]+' age='+newyearModel.ageText);
    ok('신년운세 V3: 예시 다섯 기운 분포와 도움 방향 유지',
       newyearModel.ohPct.join(',')==='13,25,25,25,13' && OHNAME[newyearModel.ys.main]==='목' && OHNAME[newyearModel.ys.support]==='수',
       'oh='+newyearModel.ohPct.join(',')+' help='+OHNAME[newyearModel.ys.main]+'/'+OHNAME[newyearModel.ys.support]);
    ok('신년운세 V3: 기존 반복 카드와 AI 대체 본문 제거',
       !newyearExample.includes('CARD_START:MONTHDETAIL') && !newyearExample.includes('CARD_START:SAMJAE') &&
       !newyearExample.includes('data-ai-fallback-for="newyear-core"'));
    const newyearForbidden=['정관','편관','정재','편재','정인','편인','식신','상관','비견','겁재','격국','용신','희신','기신','지장간','십이운성','공망'].filter(word=>newyearPlain.includes(word));
    ok('신년운세 V3: 풀이 본문 전문용어·단독 명사 결 노출 없음',
       newyearForbidden.length===0 && !/(?<![가-힣])결(?![가-힣])/.test(newyearPlain),newyearForbidden.join(','));
    ok('신년운세 V3: 심층 요약본도 V3 구조를 사용',
       _newyearSummaryData && _newyearSummaryData.version===3 &&
       buildNewyearSummaryA4Html().includes('신년운세 상담 요약') && buildNewyearSummaryA4Html().includes('10년 단위 큰 흐름'));
    _meta=savedMeta;_lastInputs=savedInputs;

    // 12) 다른 유료 풀이도 같은 3층 표현 계층을 사용하고 상세 본문은 보존한다.
    const nameExtra={surname:'김',given:'민수',han:{surname:'金',given1:'珉',given2:'秀'},strokes:{surname:8,given1:10,given2:7}};
    const nameLayered=renderNamePaid(SELF,nameExtra);
    ok('이름풀이·작명 3층: 요약·핵심 6장·전체 서고',
       (nameLayered.match(/data-story-layer=/g)||[]).length===3 && (_storyDeckStore['name-reading']||[]).length===6 && nameLayered.includes('card-RECOMMEND'));
    ok('이름풀이·작명: 사주 개인 지문 연결', nameLayered.includes('story-personal-note'));
    const pairExtra={gy:1991,gm:3,gd:20,gh:12,gmin:0,cal:'solar',gender:'female',cityKey:'서울특별시',mbti:'ENFP'};
    _meta.gnExtra=pairExtra;
    const pairLayered=renderGunghapPaid(SELF,pairExtra);
    ok('궁합 3층: 요약·핵심 6장·전체 서고',
       (pairLayered.match(/data-story-layer=/g)||[]).length===3 && (_storyDeckStore['gunghap-reading']||[]).length===6 && pairLayered.includes('card-MARRIAGE'));
    ok('궁합: 두 사람의 관계 반응을 함께 비교',
       pairLayered.includes('story-personal-note') && (_storyDeckStore['gunghap-reading'][0].copy||'').includes('상대는'));
    ok('공통 카드 덱: 이전·근거·다음 버튼 제공',
       pairLayered.includes('storyDeckPrev(')&&pairLayered.includes('storyOpenEvidence(')&&pairLayered.includes('storyDeckNext('));
    const storyNavigateSource=globalThis.__SOURCE_HTML__.match(/function storyNavigate[\s\S]*?function storyDeckNext/)?.[0]||'';
    const lifeNavigateSource=globalThis.__SOURCE_HTML__.match(/function lifeNavigate[\s\S]*?function lifeDeckNext/)?.[0]||'';
    ok('카드 이동: 전환·이전·다음 버튼이 스크롤을 맨 위로 올리지 않음',
       !storyNavigateSource.includes('window.scrollTo')&&!lifeNavigateSource.includes('window.scrollTo'));

    // 13) 같은 입력을 12번 렌더해도 6개 유료 카테고리가 모두 한 가지 결과여야 한다.
    const OTHER=C(6,8,7,9,3,7,6,8);
    const deterministicRenderers={
      life:()=>renderSajuPaid(SELF,1990,5,15,12,0),
      newyear:()=>renderNewyearFortune(SELF,2026),
      daypick:()=>renderDaypickFortune(SELF,2026,8,20,{}),
      monthly:()=>renderMonthlyFortune(SELF,2026,8,2026,9,{}),
      gunghap:()=>renderGunghapBody(SELF,OTHER,'male','female','',''),
      name:()=>renderNamePaid(SELF,null)
    };
    const unstable=[];
    Object.entries(deterministicRenderers).forEach(([cat,render])=>{
      const set=new Set();for(let i=0;i<12;i++)set.add(render());
      if(set.size!==1)unstable.push(cat+':'+set.size);
    });
    ok('결정성: 유료 6종 × 12회 모두 동일', unstable.length===0, unstable.join(', '));
    const quoteSet=new Set();for(let i=0;i<12;i++)quoteSet.add(pickQuote(68,'regression-seed'));
    ok('결정성: 고전 한 줄 시드 고정', quoteSet.size===1, 'variants='+quoteSet.size);
  } catch (e) {
    ok('예외 없이 완주', false, e.message + ' | ' + String(e.stack||'').split('\\n')[1]);
  }

  // 출력
  let failed = 0;
  for (const r of results) {
    console.log((r.pass ? '  ✅ ' : '  ❌ ') + r.name + (r.pass ? '' : '  →  ' + r.detail));
    if (!r.pass) failed++;
  }
  console.log('\\n' + (failed ? ('실패 ' + failed + '/' + results.length + ' ❌') : ('전체 통과 ' + results.length + '/' + results.length + ' ✅')));
  globalThis.__REGRESSION_FAILED__ = failed;
})();
`;

const ctx = vm.createContext(sb);
try {
  vm.runInContext(code + harness, ctx, { filename: 'app.js' });
} catch (e) {
  console.error('하니스 실행 중 오류(앱 코드 파싱/로딩 실패):', e.message);
  process.exit(2);
}
try {
  const astroCode = fs.readFileSync(path.join(path.dirname(target), 'assets', 'astrology.js'), 'utf8');
  const astroHarness = `
    astrologyResultVisualHTML=()=>'<section class="astro-panel">원형 차트</section>';
    const __astroPlanets=[
      ['sun','leo'],['moon','pisces'],['mercury','virgo'],['venus','libra'],['mars','aries'],
      ['jupiter','sagittarius'],['saturn','capricorn'],['uranus','aquarius'],['neptune','pisces'],['pluto','scorpio']
    ].map(([planet,sign])=>({planet,sign,degree:10}));
    const __astroFlowMock={productName:'종합 리포트',birthInfo:{city:'서울'},createdAt:'2026-08-16T00:00:00.000Z',resultMarkdown:'# 상세 풀이',chart:{birthInfo:{city:'서울',birthTimeUnknown:false},planets:__astroPlanets,ascendant:{sign:'taurus',degree:4},elementBalance:{fire:3,earth:2,air:2,water:3},modalityBalance:{cardinal:4,fixed:3,mutable:3},aspects:[]}};
    const __astroConfig=buildAstrologyStoryConfig(__astroFlowMock);
    const __astroHtml=buildStoryExperienceHTML(__astroConfig);
    globalThis.__ASTRO_STORY_OK__=(__astroConfig.deck.length===7&&(__astroHtml.match(/data-story-layer=/g)||[]).length===3&&__astroHtml.includes('점성술 전체 서고'));
  `;
  vm.runInContext(astroCode + astroHarness, ctx, { filename: 'astrology.js' });
  console.log((sb.__ASTRO_STORY_OK__?'  ✅ ':'  ❌ ')+'점성술 3층: 요약·핵심 7장·전체 서고');
  if (!sb.__ASTRO_STORY_OK__) sb.__REGRESSION_FAILED__++;
} catch (e) {
  console.error('  ❌ 점성술 3층 회귀 검사 →', e.message);
  sb.__REGRESSION_FAILED__++;
}
process.exit(sb.__REGRESSION_FAILED__ ? 1 : 0);
