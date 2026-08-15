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
  const C = (ys,yb,ms,mb,ds,db,hs,hb) => ({yp:{stem:ys,branch:yb},mp:{stem:ms,branch:mb},dp:{stem:ds,branch:db},hp:{stem:hs,branch:hb}});
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
    ok('renderSajuPaid 렌더 정상', typeof ha === 'string' && ha.length > 50000);
    ok('renderSajuPaid 누수 없음(dm 미치환·undefined)', !leaky(ha) && !leaky(hb));
    ok('renderSajuPaid 비유 본질: 같은 일간이라도 다름',
       ha.includes('봄 태생') && hb.includes('가을 태생'));

    // 8) 신년운세 — 띠 작용 개인화 구절 포함
    const ny = renderNewyearFortune(SELF, 2026);
    ok('renderNewyearFortune 렌더 + 띠작용 개인화 구절', typeof ny==='string' && ny.includes('다만 같은 띠라도') && !leaky(ny));

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
    ok('전체 서고: 기존 38카드 보존', (layered.match(/<!--CARD_START:/g)||[]).length===38);

    // 12) 같은 입력을 12번 렌더해도 6개 유료 카테고리가 모두 한 가지 결과여야 한다.
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
process.exit(sb.__REGRESSION_FAILED__ ? 1 : 0);
