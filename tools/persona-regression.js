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
    ok('renderSajuPaid 렌더 정상', typeof ha === 'string' && ha.length > 18000, 'length='+ha.length);
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
       characterCardHTML(SELF,{compact:true}).includes('개인 지문') && clean(ha).replace(/&nbsp;|\u00a0|\u200b/g,' ').replace(/· /g,'·').includes(fpSelf.hook));

    // 8) 신년운세 — 10개 심층 상담 카드 + 3층 UI
    const ny = renderNewyearFortune(SELF, 2026);
    ok('renderNewyearFortune 한 페이지 렌더 정상', typeof ny==='string' && ny.includes('id="lv4-ny-basic"') && ny.length>18000 && !leaky(ny));
    ok('신년운세: 한 페이지 본문에 개인 지문 연결',
       clean(ny).replace(/&nbsp;|\u00a0|\u200b/g,' ').replace(/· /g,'·').includes(fpSelf.hook));

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
    ok('인생총운 한 페이지: 목차에서 섹션으로 바로 이동',
       ((ha.match(/class="lv4-toc"[\\s\\S]*?<\\/nav>/)||[''])[0].match(/lv4Jump\\('/g)||[]).length===8 && globalThis.__SOURCE_HTML__.includes('function lv4Jump('));
    ok('미니 만세력: 네 기둥 명칭 확대 스타일 적용',
       globalThis.__SOURCE_HTML__.includes('.mm-lab .term{display:inline-block;font-size:var(--saju-glyph)') &&
       parseFloat((globalThis.__SOURCE_HTML__.match(/--saju-glyph:\\s*([\\d.]+)rem/)||[])[1]||0) >= 1.4);
    // 사주판은 어디에 나오든 라벨·십신은 --saju-label, 간지 글자는 --saju-glyph 하나로 맞춘다.
    const sajuSizeRules=[
      '.plabel{font-size:var(--saju-label)',
      '.pstem .sm,.pbranch .sm{font-size:var(--saju-label)',
      '.pillars>.pcol .sm{font-size:var(--saju-label)',
      '.pillars>.pcol .pstem,.pillars>.pcol .pbranch{font-size:var(--saju-glyph)',
      '.pillars>.pcol.unknown .sm{font-size:var(--saju-label)',
      '.mm-lab{font-size:var(--saju-label)',
      '.mm-cell{padding:12px 2px;font-size:var(--saju-glyph)',
      '.mm-cell .mm-sub{font-size:var(--saju-label)',
      ';font-size:var(--saju-glyph);font-weight:800;line-height:1.12}',
      '.pillar4-tag{font-size:var(--saju-label)',
      '.life-v3-pillar small{display:block;color:var(--muted);font-size:var(--saju-label)}',
      '.life-v3-pillar span{display:block;color:var(--sub);font-size:var(--saju-label)'
    ];
    const sajuSizeMiss=sajuSizeRules.filter(rule=>!globalThis.__SOURCE_HTML__.includes(rule));
    ok('사주판: 모든 판이 같은 글씨 크기 토큰 사용',
       globalThis.__SOURCE_HTML__.includes('--saju-label:') && sajuSizeMiss.length===0, sajuSizeMiss.join(' | '));
    // 회색 음영은 다크 테마 잔재다. 팝업 뒤 딤 처리 외에는 본문 어디에도 남기지 않는다.
    const grayFills=globalThis.__SOURCE_HTML__.split(String.fromCharCode(10)).filter(line=>
      /background(?:-color)?:\\s*.?rgba\\((?:29,32,33|0,0,0|144,144,150|180,180,180)/.test(line) &&
      !/(share-overlay|ai-copy-overlay|pay-overlay|manse-modal|upsell-overlay|position:fixed)/.test(line));
    ok('테마 UI: 본문 회색 음영 0건', grayFills.length===0, grayFills.map(l=>l.trim().slice(0,90)).join(' | '));
    const themeGradientLeaks=globalThis.__SOURCE_HTML__.split('\\n').filter(line=>/(?:linear|radial)-gradient/.test(line)&&
      !/(tarot-card-label|mask-image|ic-insta|ai-provider-mark\.gemini|home-share-option\.instagram|lock-preview::after|key:'instagram')/.test(line));
    ok('테마 UI: 브랜드·기능성 오버레이 외 그라데이션 0건', themeGradientLeaks.length===0, themeGradientLeaks.join(' | '));
    const portraitSet=new Set();
    [2,5,8,11].forEach(monthBranch=>{
      for(let stem=0;stem<10;stem++)portraitSet.add(characterPortraitSVG(C(1,3,0,monthBranch,stem,2,1,3)));
    });
    ok('캐릭터 초상: 일간 10종 × 계절 4종', portraitSet.size===40, 'unique='+portraitSet.size);
    ok('동양화 초상: 모든 유형이 새 WebP 인물 이미지 사용', [...portraitSet].every(p=>p.includes('/assets/art-v2/posters/')&&p.includes('.webp')));
    const share=buildLifeShareCardHtml(SELF);
    ok('공유 카드: 1080 정사각형 클래스 생성', /life-share-card/.test(share)&&/character-portrait/.test(share));
    const layered=renderSajuPaid(SELF,1990,5,15,12,0);
    const lv4Ids=['basic','talent','work-money','love-people','health','now','future','practice'];
    ok('인생총운 한 페이지: 넘김 없이 소개 순서 8개 섹션을 이어서 노출',
       !layered.includes('data-life-layer=') && !layered.includes('lifeDeckNext') &&
       lv4Ids.every((id,i)=>layered.indexOf('id="lv4-'+id+'"')>-1 && (i===0||layered.indexOf('id="lv4-'+lv4Ids[i-1]+'"')<layered.indexOf('id="lv4-'+id+'"'))) &&
       (layered.match(/class="lv4-sec"/g)||[]).length===8);
    ok('인생총운 한 페이지: 사주판·글자 관계를 일상어로 설명',
       layered.includes('life-v3-pillar-board') && /끌어당기는 사이|부딪히는 사이|모으는 사이|깎아 내는 사이|어긋나기 쉬운 사이|한 팀을 이루는 사이/.test(clean(layered).replace(/&nbsp;|\u00a0/g,' ')) &&
       (layered.match(/class="lv4-key/g)||[]).length===1,[layered.includes('life-v3-pillar-board'),(layered.match(/끌어당기는 사이|부딪히는 사이|모으는 사이|깎아 내는 사이|어긋나기 쉬운 사이|한 팀을 이루는 사이/)||[''])[0],(layered.match(/class="lv4-key"/g)||[]).length].join('|'));
    ok('인생총운 한 페이지: 12개월과 향후 10년을 모두 제공',
       (layered.match(/class="lv4-row/g)||[]).length>=22 &&
       buildLifeV2Model(SELF,_meta).months.length===12 && buildLifeV2Model(SELF,_meta).futureYears.length===10);
    const lifeVisible=clean(layered);
    const lifeForbidden=['정관','편관','정재','편재','정인','편인','식신','상관','비견','겁재','격국','희신','기신','지장간','십이운성','공망'].filter(word=>lifeVisible.includes(word));
    ok('인생총운 V3: 풀이 본문 전문용어·단독 명사 결 노출 없음',
       lifeForbidden.length===0 && !/(?<![가-힣])결(?![가-힣])/.test(lifeVisible), lifeForbidden.join(','));
    ok('인생총운 V3: 심층 요약본이 구조·공식·현재 시간을 사용',
       layered.includes('심층 인생총운 요약본') && _lifeSummaryData && _lifeSummaryData.version===3 &&
       buildLifeSummaryA4Html().includes('이 풀이가 나온 구조'));
    const EXAMPLE=C(3,3,5,9,9,9,2,4); // 정묘·기유·계유·병진
    const savedMeta=_meta,savedInputs=_lastInputs;
    _meta={gender:'male',sy:1987,sm:9,sd:21,hour:8,min:15,cityKey:'daejeon',tsoMin:-30.46199999999999};
    _lastInputs={hour:'8',min:'45',cityKey:'daejeon'};
    const exampleHtml=renderSajuPaid(EXAMPLE,1987,9,21,8,15);
    const examplePlain=exampleHtml.replace(/&nbsp;|\u00a0/g,' ');
    const exampleModel=buildLifeV2Model(EXAMPLE,_meta);
    ok('인생총운 V3: 예시 사주 네 자리·출생지·보정 시각을 그대로 반영',
       ['정묘','기유','계유','병진'].every(gz=>exampleHtml.includes(gz)) && exampleHtml.includes('life-v3-pillar-board') &&
       examplePlain.includes('대전광역시') && examplePlain.includes('08시 45분') && examplePlain.includes('08:15 (시간 보정 적용 · 입력 08:45)'),
       'missing='+['정묘','기유','계유','병진','대전광역시','08시 45분','08:15'].filter(x=>!examplePlain.includes(x)).join(','));
    ok('인생총운 V3: 실제 계산에 쓴 보정 분과 입력·적용 시각 구분',
       examplePlain.includes('30분 앞당겨') && examplePlain.includes('입력 시각 08:45') && !examplePlain.includes('-30.461999'),
       (examplePlain.match(/-30[^분]*분 보정/)||[])[0]);
    ok('인생총운 한 페이지: 겹친 글자를 문장으로 풀어 설명',
       clean(examplePlain).replace(/\u200b/g,'').includes("사주팔자 중에 '유(닭)'라는 글자가 두 번 나와요") && !/유 2번|유 2개/.test(examplePlain),
       (examplePlain.match(/사주팔자 중에[^.]*\./)||[''])[0]);
    ok('인생총운 V3: 목차 글자와 관계도 고아글자 방지',
       exampleHtml.includes('class="lv4-toc"') && exampleHtml.includes('<small>연주</small>') && exampleHtml.includes('class="lv4-why"'));
    ok('인생총운 V3: 녹색 사주판 글자는 흰색으로 고정',
       globalThis.__SOURCE_HTML__.includes('.life-v3-pillar.self .life-v3-pillar-glyph b *{background:var(--accent);color:#fff!important}'));
    ok('인생총운 V3: 근거 노드 내용은 가로·세로 중앙 정렬',
       globalThis.__SOURCE_HTML__.includes('.life-evidence-node{position:relative;display:flex') &&
       globalThis.__SOURCE_HTML__.includes('flex-direction:column;align-items:center;justify-content:center'));
    // 고아글자는 keep-all·text-wrap:pretty·preventOrphan()이 막는다. 정렬로 막지 않는다.
    ok('풀이 본문: 화면 폭과 무관하게 왼쪽 기준선으로 정렬',
       globalThis.__SOURCE_HTML__.includes('미리보기와 전체 풀이 본문은 왼쪽 정렬과 자연스러운 간격을 함께 사용한다') &&
       globalThis.__SOURCE_HTML__.includes('list-style-position:outside') &&
       !/@media\\(max-width:640px\\)\\{[^}]*text-align:left/.test(globalThis.__SOURCE_HTML__));
    const alignBlock=globalThis.__SOURCE_HTML__.slice(
      globalThis.__SOURCE_HTML__.indexOf('/* 본문 읽기 품질'),
      globalThis.__SOURCE_HTML__.indexOf('/* \\u2500\\u2500 Header \\u2500\\u2500 */'));
    ok('풀이 본문: 긴 글에 가운데 정렬이 남아있지 않음',
       /text-align:left;\\s*text-align-last:left/.test(alignBlock) &&
       !/(\\.nb-body|\\.conversion-hook-body|\\.tarot-markdown)[^{]*\\{[^}]*text-align:center/.test(alignBlock),
       alignBlock.length+'자');
    ok('풀이 본문: 한 줄 표시 문구와 비교 도식은 가운데 유지',
       ['.daily-card','.card-quote','.life-final-line','.life-evidence-node','.life-v3-pillar','.ny-v3-season-card']
         .every(cls=>alignBlock.includes(cls)) && /text-align:center;\\s*text-align-last:auto/.test(alignBlock));
    // text-align-last는 상속된다. center로 두면 가운데 카드 안쪽 본문 마지막 줄까지 끌려간다.
    ok('풀이 본문: text-align-last:center 잔재 0건',
       !globalThis.__SOURCE_HTML__.includes('text-align-last:center'));
    ok('모바일 풀이: 설명형 카드와 목차는 한 열로 정돈',
       globalThis.__SOURCE_HTML__.includes('#app .life-v3-profile,#app .life-v3-emoji-grid,#app .life-v3-months') &&
       globalThis.__SOURCE_HTML__.includes('#app .toc-detail-grid{grid-template-columns:1fr}'));
    ok('인생총운 V3: 예시 사주에 12개월·향후 10년·황금기 노출',
       (exampleHtml.match(/class="lv4-row/g)||[]).length>=22 && (examplePlain.match(/황금기는 /g)||[]).length>=3);
    ok('인생총운 V3: 첨부 예시의 현재 10년·8월·다음 해 원본값 유지',
       STEMKO[exampleModel.cur.stem]+BRCHKO[exampleModel.cur.branch]==='을사' &&
       exampleModel.months[7].gz==='병신' && exampleModel.futureYears[0].gz==='정미',
       'current='+STEMKO[exampleModel.cur.stem]+BRCHKO[exampleModel.cur.branch]+' aug='+exampleModel.months[7].gz+' next='+exampleModel.futureYears[0].gz);

    const newyearExample=renderNewyearFortune(EXAMPLE,2027);
    const newyearModel=buildNewyearV3Model(EXAMPLE,2027,_meta);
    const newyearPlain=clean(newyearExample).replace(/&nbsp;|\u00a0/g,' ');
    const nyIds=['ny-basic','ny-money','ny-love','ny-health','ny-work','ny-luck','ny-daeun'];
    ok('신년운세 한 페이지: 넘김 없이 소개 순서 7개 섹션을 이어서 노출',
       !newyearExample.includes('data-story-layer=') &&
       nyIds.every((id,i)=>newyearExample.indexOf('id="lv4-'+id+'"')>-1 && (i===0||newyearExample.indexOf('id="lv4-'+nyIds[i-1]+'"')<newyearExample.indexOf('id="lv4-'+id+'"'))) &&
       (newyearExample.match(/class="lv4-sec"/g)||[]).length===7);
    ok('신년운세 한 페이지: 사주판·글자 관계·12개월을 일상어로 설명',
       newyearExample.includes('life-v3-pillar-board') && newyearPlain.includes("사주팔자 중에 '유(닭)'라는 글자가 두 번 나와요") &&
       (newyearExample.match(/class="lv4-row/g)||[]).length>=12 && (newyearExample.match(/class="lv4-key/g)||[]).length===1);
    const cheapReadingEmoji=['💰','💕','❤️','🌿','🧠','📦','🤝','🚀','⚠️','📅'].filter(mark=>newyearExample.includes(mark));
    ok('풀이 심볼: 컬러 이모지 대신 녹색·금색 프리미엄 문양 사용',
       newyearExample.includes('class="reading-sigil"') && cheapReadingEmoji.length===0,
       cheapReadingEmoji.join(','));
    const premiumBody=_calmReadingHtml('<p>💰 돈 · ❤️ 사랑 · 🌿 건강 · ⚠️ 주의</p>');
    ok('풀이 심볼: 모든 유료 본문 공통 변환 계층 적용',
       (premiumBody.match(/class="reading-sigil"/g)||[]).length===4 && !/[💰❤️🌿⚠]/u.test(premiumBody));
    ok('신년운세 V3: 예시의 출생·음력·보정 시각 원본값 반영',
       newyearPlain.includes('1987년 9월 21일') && newyearPlain.includes('1987년 7월 29일') &&
       newyearPlain.includes('08시 45분') && newyearPlain.includes('08:15 (시간 보정 적용 · 입력 08:45)') && newyearPlain.includes('대전광역시'));
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
    const newyearForbidden=['정관','편관','정재','편재','정인','편인','식신','상관','비견','겁재','격국','희신','기신','지장간','십이운성','공망'].filter(word=>newyearPlain.includes(word));
    ok('신년운세 V3: 풀이 본문 전문용어·단독 명사 결 노출 없음',
       newyearForbidden.length===0 && !/(?<![가-힣])결(?![가-힣])/.test(newyearPlain),newyearForbidden.join(','));
    ok('신년운세 V3: 심층 요약본도 V3 구조를 사용',
       _newyearSummaryData && _newyearSummaryData.version===3 &&
       buildNewyearSummaryA4Html().includes('신년운세 상담 요약') && buildNewyearSummaryA4Html().includes('10년 단위 큰 흐름'));
    const premiumA4=premiumizeReadingHtml(buildNewyearSummaryA4Html());
    ok('풀이 심볼: 저장 이미지·PDF도 프리미엄 문양으로 변환',
       premiumA4.includes('class="reading-sigil"') && !/[💰❤️🌿⚠]/u.test(premiumA4));
    _meta=savedMeta;_lastInputs=savedInputs;

    // 12) 다른 유료 풀이도 같은 3층 표현 계층을 사용하고 상세 본문은 보존한다.
    const nameExtra={surname:'김',given:'민수',han:{surname:'金',given1:'珉',given2:'秀'},strokes:{surname:8,given1:10,given2:7}};
    const nameLayered=renderNamePaid(SELF,nameExtra);
    const nmIds=['nm-core','nm-suri','nm-hanja','nm-sound','nm-mix','nm-strength','nm-recommend'];
    const namePlain=clean(nameLayered).replace(/&nbsp;|\u00a0|\u200b/g,' ');
    ok('이름풀이 한 페이지: 넘김 없이 소개 순서 7개 섹션을 이어서 노출',
       !nameLayered.includes('data-story-layer=') &&
       nmIds.every((id,i)=>nameLayered.indexOf('id="lv4-'+id+'"')>-1 && (i===0||nameLayered.indexOf('id="lv4-'+nmIds[i-1]+'"')<nameLayered.indexOf('id="lv4-'+id+'"'))) &&
       (nameLayered.match(/class="lv4-sec"/g)||[]).length===7);
    ok('이름풀이: 한글 소리·한자 네 자리·81수리·추천 이름을 일상어로 풀이',
       namePlain.includes('초성 ㄱ은 목 기운') && namePlain.includes('평생의 자리') && /숫자 \\d+[은는] '/.test(namePlain) && namePlain.includes('추천 이름') && !/원격|형격|이격|정격|자원오행/.test(namePlain) && !leaky(nameLayered),
       [namePlain.includes('초성 ㄱ은 목 기운'),namePlain.includes('평생의 자리'),/숫자 \\d+[은는] '/.test(namePlain),namePlain.includes('추천 이름'),(namePlain.match(/원격|형격|이격|정격|자원오행/)||[''])[0],leaky(nameLayered)].join('|'));
    const pairExtra={gy:1991,gm:3,gd:20,gh:12,gmin:0,cal:'solar',gender:'female',cityKey:'서울특별시',mbti:'ENFP'};
    _meta.gnExtra=pairExtra;
    const pairLayered=renderGunghapPaid(SELF,pairExtra);
    const ghIds=['gh-core','gh-persona','gh-star','gh-scenes','gh-married','gh-timing','gh-score','gh-seat'];
    const pairPlain=clean(pairLayered).replace(/&nbsp;|\u00a0|\u200b/g,' ');
    ok('궁합 한 페이지: 넘김 없이 소개 순서 8개 섹션을 이어서 노출',
       !pairLayered.includes('data-story-layer=') &&
       ghIds.every((id,i)=>pairLayered.indexOf('id="lv4-'+id+'"')>-1 && (i===0||pairLayered.indexOf('id="lv4-'+ghIds[i-1]+'"')<pairLayered.indexOf('id="lv4-'+id+'"'))) &&
       (pairLayered.match(/class="lv4-sec"/g)||[]).length===8 && (pairLayered.match(/class="lv4-row/g)||[]).length>=14);
    const ghForbidden=['정관','편관','정재','편재','정인','편인','식신','상관','비견','겁재','격국','공망','12운성'].filter(w=>pairPlain.includes(w));
    ok('궁합: 두 사람의 반응을 비교하고 전문용어 없이 풀이',
       pairPlain.includes('상대는') && pairPlain.includes('두 사람의 배우자 자리는') && ghForbidden.length===0 && !/상대[은을] /.test(pairPlain),ghForbidden.join(','));
    const topicLayered=renderTopicPaid('topic-love',SELF,_meta);
    ok('공통 카드 덱: 이전·근거·다음 버튼 제공',
       globalThis.__SOURCE_HTML__.includes('function storyDeckPrev(')&&globalThis.__SOURCE_HTML__.includes('function storyOpenEvidence(')&&globalThis.__SOURCE_HTML__.includes('function storyDeckNext('));
    const tpCats=['topic-love','topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-child','topic-children','topic-health'];
    const tpBad=tpCats.filter(c=>{const h=renderTopicPaid(c,SELF,_meta),pl=clean(h);const n=((PAID_META[c]||{}).features||[]).length;return (h.match(/class="lv4-sec"/g)||[]).length!==n||h.includes('data-story-layer=')||leaky(h)||/정관|편관|정재|편재|정인|편인|식신|상관|비견|겁재|격국/.test(pl);});
    ok('주제별 풀이 한 페이지: 9개 주제 모두 소개 항목 수만큼 섹션, 전문용어 없음', tpBad.length===0, tpBad.join(','));
    const storyNavigateSource=globalThis.__SOURCE_HTML__.match(/function storyNavigate[\s\S]*?function storyDeckNext/)?.[0]||'';
    const lifeNavigateSource=globalThis.__SOURCE_HTML__.match(/function lifeNavigate[\s\S]*?function lifeDeckNext/)?.[0]||'';
    ok('카드 이동: 전환·이전·다음 버튼이 스크롤을 맨 위로 올리지 않음',
       !storyNavigateSource.includes('window.scrollTo')&&!lifeNavigateSource.includes('window.scrollTo'));

    const dpPage=renderDaypickFortune(SELF,2026,8,20,{contextTag:'job'}),moPage=renderMonthlyFortune(SELF,2026,8,2026,10,{contextTag:'money'});
    const dpPlain=clean(dpPage).replace(/&nbsp;|\u00a0|\u200b/g,' '),moPlain=clean(moPage).replace(/&nbsp;|\u00a0|\u200b/g,' ');
    ok('지정일 한 페이지: 소개 순서 7개 섹션과 열두 시간대 풀이',
       (dpPage.match(/class="lv4-sec"/g)||[]).length===7 && dpPage.indexOf('id="lv4-dp-daeun"')<dpPage.indexOf('id="lv4-dp-stars"') &&
       (dpPlain.match(/[자축인묘진사오미신유술해]시 · /g)||[]).length===12 && !/상관|정관|편관|길시/.test(dpPlain) && !leaky(dpPage));
    ok('월별 한 페이지: 소개 순서 6개 섹션과 달마다 풀이',
       (moPage.match(/class="lv4-sec"/g)||[]).length===6 && moPage.indexOf('id="lv4-mo-daeun"')<moPage.indexOf('id="lv4-mo-guide"') &&
       ['2026년 8월 ·','2026년 9월 ·','2026년 10월 ·'].every(x=>moPlain.includes(x)) && !/상관|정관|편관|관성/.test(moPlain) && !leaky(moPage));

    const zwPage=renderZiweiPaid(SELF,{..._meta,sy:1990,sm:5,sd:15,hour:12,min:0}),zwPlain=clean(zwPage);
    ok('자미두수 한 페이지: 소개 순서 6개 섹션, 12개 방 판, 한자 방 이름 노출 없음',
       (zwPage.match(/class="lv4-sec"/g)||[]).length===6 && zwPage.includes('zw-board') && !zwPage.includes('data-story-layer=') &&
       !/명궁|부부궁|재백궁|관록궁|복덕궁|대한(?!민국)|오행국|[수목금토화][이삼사오육]국/.test(zwPlain) && /성\(.+의 별\)/.test(zwPlain) && !leaky(zwPage));

    const __md=lv4FromMarkdown('# 1. 질문 요약\\n고민을 정리했어요.\\n\\n# 3. 카드별 해석\\n## 현재 - 별\\n- 핵심키워드: 희망, 회복\\n희망이 보여요.\\n한 줄 정리: 다시 일어설 힘이 있어요.\\n<script>x</script>','tr');
    ok('AI 마크다운 → 한 페이지 섹션: 제목·소제목·목록 변환, 한 줄 정리 줄은 빼고 HTML 이스케이프',
       __md.items.length===2 && __md.items[1][1]==='카드별 해석' && __md.html.includes('<h3>현재 - 별</h3>') && __md.html.includes('lv4-md-list') && !__md.html.includes('한 줄 정리') && !__md.html.includes('<script>'));

    const __savedCtx=_meta.ctx;_meta.ctx={cat:'topic-love',key:'tired',label:'권태기'};
    const __ctxLove=renderTopicPaid('topic-love',SELF,_meta);_meta.ctx=__savedCtx;
    ok('지금 상황 객관식: 고른 상황이 풀이 첫머리·질문형 소제목·해시태그로 반영',
       __ctxLove.includes('lv4-ctx') && clean(__ctxLove).includes('권태기') && __ctxLove.includes('lv4-sec-label') && clean(__ctxLove).includes('우리는 왜 같은 일로 자꾸 부딪힐까?') && __ctxLove.includes('lv4-scene') && __ctxLove.includes('lv4-tags') && __ctxLove.includes('lv4-gauge') &&
       Object.keys(CTX_Q).every(c=>CTX_Q[c].o.length>=3));

    const __svC=_meta.ctx;_meta.ctx=null;const __keyNo=aiReadingCacheKey('life','');
    _meta.ctx={cat:'topic-love',key:'tired',label:'권태기'};
    const __sit=ctxSituationText(),__keyCtx=aiReadingCacheKey('life',''),__chat=renderChatSection('life');_meta.ctx=__svC;
    ok('AI 풀이·역술가 질문: 고른 상황을 함께 보내고, 상황이 바뀌면 AI 풀이 캐시도 따로 저장',
       __sit==='지금 연애 상태는 어떤가요? → 권태기' && __keyNo!==__keyCtx && __chat.includes('제 상황(권태기)'));

    const __lifePin=renderSajuPaid(SELF,1990,5,15,12,0),__topicPin=renderTopicPaid('topic-money',SELF,_meta);
    const __mainOnly=h=>clean(h.replace(/<details class="lv4-why">[\\s\\S]*?<\\/details>/g,''));
    ok('핀셋 풀이: 글자 개수 같은 이론은 접힌 사주 근거로, 기본 용어는 첫 등장만 풀이',
       __lifePin.includes('class="lv4-why"') && !/뜻하는 글자가 \\d+개|글자가 \\d+개예요/.test(__mainOnly(__lifePin)+__mainOnly(__topicPin)) && /연주/.test(__lifePin) && /대운\\(10년마다 바뀌는 큰 흐름\\)/.test(__lifePin) && !__lifePin.includes('lv4-pin') && !__topicPin.includes('lv4-pin'));
    ok('궁금한 점 직접 입력: 적은 글에서 상황을 짐작하고 MBTI 입력은 받지 않음',
       ctxInfer('topic-love','요즘 남자친구랑 자꾸 싸워요')==='tired' && ctxInfer('topic-career','회사를 그만두고 싶어요')==='move' &&
       globalThis.__SOURCE_HTML__.includes('id="ctxText"') && globalThis.__SOURCE_HTML__.includes('const hideMbti=true'));

    const __frameBad=[];
    [['life',()=>renderSajuPaid(SELF,1990,5,15,12,0)],['newyear',()=>renderNewyearFortune(SELF,2026)],['name',()=>renderNamePaid(SELF,nameExtra)],['ziwei',()=>renderZiweiPaid(SELF,{..._meta,sy:1990,sm:5,sd:15,hour:12,min:0})],
     ['daypick',()=>renderDaypickFortune(SELF,2026,8,20,{})],['monthly',()=>renderMonthlyFortune(SELF,2026,8,2026,10,{})],['gunghap',()=>buildGunghapReadingV4(SELF,C(6,8,7,9,3,7,6,8),{sy1:1990,sm1:5,sd1:15,h1:12,min1:0,sy2:1992,sm2:3,sd2:2,h2:-1,min2:0,gen1:'male',gen2:'female',mbti1:'',mbti2:''})]]
      .concat(['topic-love','topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-child','topic-children','topic-health'].map(c=>[c,()=>renderTopicPaid(c,SELF,_meta)]))
      .forEach(([c,fn])=>{let h='';try{h=fn();}catch(e){h='';}if(!h.includes('class="lc-orbs"')||!h.includes('class="lc-chapter"')||!h.includes('class="lc-tl '))__frameBad.push(c);});
    ok('유료 풀이 장 구성: 16개 카테고리 모두 원국 구슬·3가지 순간·장 제목', __frameBad.length===0, __frameBad.join(', '));

    const __ppLove=renderTopicPaid('topic-love',SELF,_meta),__ppLife=renderSajuPaid(SELF,1990,5,15,12,0),__ppNy=renderNewyearFortune(SELF,2026),__ppPlain=clean(__ppLove).replace(/&nbsp;|\\u00a0|\\u200b|\\u2060/g,'');
    ok('콕 찍은 풀이: 연애운·인생총운·신년운세 본문에 출생년도·띠·이름 초성·지역·직업·만나는 곳',
       __ppLove.includes('pp-box') && /\\d{4}년생\\([가-힣]+띠\\)/.test(__ppPlain) && /초성 예시는 [ㄱ-ㅎ·]+/.test(__ppPlain) && /(동쪽|서쪽|남쪽|북쪽|가까운)/.test(__ppPlain) && __ppPlain.includes('처음 만나는 곳') &&
       (__ppLife.match(/pp-box/g)||[]).length>=3 && (__ppNy.match(/pp-box/g)||[]).length>=3,
       [__ppLove.includes('pp-box'),/\\d{4}년생/.test(__ppPlain),(__ppLife.match(/pp-box/g)||[]).length,(__ppNy.match(/pp-box/g)||[]).length].join('|'));

    const __ppBad=['topic-money','topic-career','topic-health','topic-study','topic-marriage','topic-reunion','topic-child','topic-children'].filter(c=>!renderTopicPaid(c,SELF,_meta).includes('pp-box'));
    if((renderSajuPaid(SELF,1990,5,15,12,0).match(/pp-box/g)||[]).length<7)__ppBad.push('life');
    if((renderNewyearFortune(SELF,2026).match(/pp-box/g)||[]).length<5)__ppBad.push('newyear');
    if(!renderDaypickFortune(SELF,2026,8,20,{}).includes('pp-box'))__ppBad.push('daypick');
    if(!buildGunghapReadingV4(SELF,C(6,8,7,9,3,7,6,8),{sy1:1990,sm1:5,sd1:15,h1:12,min1:0,sy2:1992,sm2:3,sd2:2,h2:-1,min2:0,gen1:'male',gen2:'female',mbti1:'',mbti2:''}).includes('pp-box'))__ppBad.push('gunghap');
    ok('콕 찍은 풀이: 직업·재물·건강·학업·결혼·재회·아이·행운·궁합·하루까지 구체 풀이 상자', __ppBad.length===0, __ppBad.join(', '));

    const __svMeta=_meta;_meta={..._meta,userName:'김하늘',marital:'married'};
    const __lifeM=renderSajuPaid(SELF,1990,5,15,12,0),__nyM=renderNewyearFortune(SELF,2026);let __ctxJson='';try{__ctxJson=JSON.stringify(buildSajuContextForChat('paid-life')||{});}catch(e){}
    _meta=__svMeta;
    ok('이름·결혼 상태: 이름은 제목·말풍선에만 쓰고 AI로 보내지 않음, 기혼이면 운명의 상대 대신 배우자와의 관계',
       __lifeM.includes('김하늘님') && !__ctxJson.includes('김하늘') && __lifeM.includes('부부 사이를 지키는 법') && !__lifeM.includes('운명의 상대는 이런 사람이에요') && __nyM.includes('배우자와의 흐름'),
       [__lifeM.includes('김하늘님'),!__ctxJson.includes('김하늘'),__lifeM.includes('부부 사이를 지키는 법'),!__lifeM.includes('운명의 상대는 이런 사람이에요'),__nyM.includes('배우자와의 흐름')].join('|'));

    const __svC2=_meta.ctx;_meta.ctx={cat:'topic-love',key:'tired',label:'권태기',text:'남자친구가 해외 발령이 났는데 따라가야 할까요?'};
    const __tpAns=renderTopicPaid('topic-love',SELF,_meta);_meta.ctx=__svC2;
    ok('궁금한 점: 주제별에만 있고, 적은 질문에는 규칙 답 + 결제 후 AI 답 자리',
       !CTX_Q.life && !CTX_Q.newyear && !CTX_Q.gunghap && Object.keys(CTX_Q).every(k=>/^topic-/.test(k)) &&
       __tpAns.includes('data-ai-reading="topic-answer"') && __tpAns.includes('data-ai-rule=') && __tpAns.includes('lv4-answer'));

    const __sceneRender={name:()=>renderNamePaid(SELF,nameExtra),ziwei:()=>renderZiweiPaid(SELF,{..._meta,sy:1990,sm:5,sd:15,hour:12,min:0}),life:()=>renderSajuPaid(SELF,1990,5,15,12,0),newyear:()=>renderNewyearFortune(SELF,2026),gunghap:()=>buildGunghapReadingV4(SELF,C(6,8,7,9,3,7,6,8),{sy1:1990,sm1:5,sd1:15,h1:12,min1:0,sy2:1992,sm2:3,sd2:2,h2:-1,min2:0,gen1:'male',gen2:'female',mbti1:'',mbti2:''})};
    const __sceneBad=[];
    Object.keys(CTX_SCENE).forEach(cat=>Object.keys(CTX_SCENE[cat]).forEach(key=>{
      const sv=_meta.ctx;_meta.ctx={cat,key,label:'상황'};
      let out='';try{out=(__sceneRender[cat]||(()=>renderTopicPaid(cat,SELF,_meta)))();}catch(e){out='ERR '+e.message;}
      _meta.ctx=sv;
      const txt=clean(out),sc=(out.match(/<div class="lv4-scene">([\\s\\S]*?)<\\/div>/)||[])[1]||'';
      if(!out.includes('lv4-scene')||/undefined|NaN|\\$\\{|ERR /.test(txt)||!sc||/(^|\\s)결(\\s|이|을|에)|당신|상관|여덟 글자/.test(clean(sc)))__sceneBad.push(cat+':'+key);
    }));
    ok('상황별 본문 장면: 모든 상황 선택지가 해당 섹션에 장면 문단을 넣고, 빈 값·금지어 없음',__sceneBad.length===0,__sceneBad.join(', '));

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
    __astroFlowMock.resultMarkdown='# 1. 출생차트 핵심 요약\\n본인은 밝은 사람이에요.\\n\\n- 태양: 사자자리예요\\n한 줄 정리: 빛나는 사람이에요.\\n\\n# 2. 성격과 기질\\n## 강점\\n추진력이 좋아요.';
    const __astroHtml=buildAstrologyOnePageHTML(__astroFlowMock);
    globalThis.__ASTRO_STORY_OK__=(!__astroHtml.includes('data-story-layer=')&&(__astroHtml.match(/class="lv4-sec"/g)||[]).length===2&&__astroHtml.includes('lv4-sec lv4-extra')&&__astroHtml.includes('원형 차트')&&__astroHtml.includes('<h3>강점</h3>'));
  `;
  vm.runInContext(astroCode + astroHarness, ctx, { filename: 'astrology.js' });
  console.log((sb.__ASTRO_STORY_OK__?'  ✅ ':'  ❌ ')+'점성술 한 페이지: 출생차트·AI 리포트 섹션·한 줄 정리');
  if (!sb.__ASTRO_STORY_OK__) sb.__REGRESSION_FAILED__++;
} catch (e) {
  console.error('  ❌ 점성술 3층 회귀 검사 →', e.message);
  sb.__REGRESSION_FAILED__++;
}
process.exit(sb.__REGRESSION_FAILED__ ? 1 : 0);
