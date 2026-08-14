#!/usr/bin/env node
/*
 * build-rarity.js — 캐릭터 유형의 "진짜" 출현 빈도표를 만든다.
 *
 * 1950~2020년 출생 × 12개 출생시각(2시간 간격)을 전부 돌려서
 * (일간, 계절, 신강구간, 최강십신축) 유형이 몇 %인지 실측한다.
 * 결과를 index.html에 상수로 심어, "100명 중 N명" 문구가 지어낸 수치가 아니게 한다.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('/Users/kangmin/Desktop/웹사이트/MBTI/index.html', 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let m, code = '';
while ((m = re.exec(html))) {
  const a = m[1] || '';
  if (/\ssrc\s*=/.test(a) || /application\/ld\+json/i.test(a)) continue;
  code += '\n;\n' + m[2];
}
const mkProxy = () => new Proxy(function () {}, {
  get: (t, k) => (k === 'cookie' ? '' : k === 'length' ? 0 : (k === 'toString' || k === 'valueOf' || k === Symbol.toPrimitive) ? () => '' : mkProxy()),
  set: () => true, apply: () => mkProxy(), construct: () => mkProxy(), has: () => true,
});
const sb = {}; sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.top = sb;
sb.document = mkProxy(); sb.navigator = { userAgent: 'node', language: 'ko' };
sb.location = { href: 'http://x/', search: '', hash: '', pathname: '/' };
const st = {};
sb.localStorage = { getItem: k => (k in st ? st[k] : null), setItem: (k, v) => { st[k] = String(v); }, removeItem: k => { delete st[k]; }, clear: () => {} };
sb.sessionStorage = sb.localStorage;
sb.addEventListener = () => {}; sb.removeEventListener = () => {};
sb.setTimeout = () => 0; sb.setInterval = () => 0; sb.clearTimeout = () => {}; sb.clearInterval = () => {};
sb.requestAnimationFrame = () => 0;
sb.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
sb.Kakao = mkProxy(); sb.gtag = () => {}; sb.dataLayer = [];
sb.matchMedia = () => ({ matches: false, addEventListener: () => {}, addListener: () => {} });
sb.alert = () => {}; sb.confirm = () => true; sb.prompt = () => '';
sb.history = { pushState: () => {}, replaceState: () => {} };
sb.URL = URL; sb.URLSearchParams = URLSearchParams; sb.html2canvas = () => Promise.resolve(mkProxy());
sb.console = { log(){}, warn(){}, error(){} };

const harness = `
;(function(){
  const tally = Object.create(null);
  let total = 0, failed = 0;
  const HOURS = [0,2,4,6,8,10,12,14,16,18,20,22];
  for (let y = 1950; y <= 2020; y++) {
    for (let mo = 1; mo <= 12; mo++) {
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      for (let d = 1; d <= dim; d++) {
        for (const h of HOURS) {
          try {
            const s = calcSaju(y, mo, d, h, 0, '서울특별시');
            const p = buildPersonaProfile(s);
            const key = [s.dp.stem, p.season, p.strength, p.axisSorted[0][0]].join('|');
            tally[key] = (tally[key] || 0) + 1;
            total++;
          } catch (e) { failed++; }
        }
      }
    }
  }
  globalThis.__T__ = { tally, total, failed };
})();
`;
vm.runInContext(code + harness, vm.createContext(sb), { filename: 'app.js' });
const { tally, total, failed } = sb.__T__;

const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
console.log(`표본 ${total.toLocaleString()}건 (실패 ${failed}) · 실제로 나타난 유형 ${entries.length}가지`);
console.log('\n가장 흔한 5가지:');
entries.slice(0, 5).forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${(v / total * 100).toFixed(3)}%`));
console.log('\n가장 드문 5가지:');
entries.slice(-5).forEach(([k, v]) => console.log(`  ${k.padEnd(28)} ${(v / total * 100).toFixed(3)}%`));

// ── 고정 폭 문자열로 압축 ──
// index = ((일간*4 + 계절)*4 + 신강구간)*5 + 십신축  → 0..799
// 각 칸은 만분율(bp, 1 = 0.01%)을 36진수 2자리로. 표 전체가 1,600자.
const SEASONS = ['봄', '여름', '가을', '겨울'];
const STRENGTHS = ['강', '중강', '중약', '약'];
const AXES = ['self', 'out', 'wealth', 'gwan', 'in_'];
const idxOf = (stem, season, strength, axis) =>
  ((Number(stem) * 4 + SEASONS.indexOf(season)) * 4 + STRENGTHS.indexOf(strength)) * 5 + AXES.indexOf(axis);

const cells = new Array(800).fill(0);
for (const [k, v] of entries) {
  const [stem, season, strength, axis] = k.split('|');
  const i = idxOf(stem, season, strength, axis);
  if (i < 0 || i >= 800) { console.error('인덱스 범위 밖:', k, i); process.exit(1); }
  cells[i] = Math.min(1295, Math.max(1, Math.round(v / total * 10000))); // 36^2-1 상한
}
const packed = cells.map(v => v.toString(36).padStart(2, '0')).join('');
console.log(`\n압축 표: ${packed.length}자 (${(packed.length / 1024).toFixed(1)}KB), 최대 bp=${Math.max(...cells)}`);

// 왕복 검증 — 압축본에서 되읽은 값이 원본과 일치하는가
let bad = 0;
for (const [k, v] of entries) {
  const [stem, season, strength, axis] = k.split('|');
  const i = idxOf(stem, season, strength, axis);
  const got = parseInt(packed.substr(i * 2, 2), 36);
  const want = Math.min(1295, Math.max(1, Math.round(v / total * 10000)));
  if (got !== want) bad++;
}
console.log(bad ? `❌ 왕복 불일치 ${bad}건` : '✅ 압축 왕복 검증 통과');
fs.writeFileSync('/private/tmp/claude-501/-Users-kangmin-Desktop------MBTI/e564ae61-26e7-4512-92f2-919ed58222c9/scratchpad/rarity-packed.txt', packed);

// 분포 감각 — 별점 구간을 어디서 끊을지 판단용
const pcts = entries.map(([, v]) => v / total * 100).sort((a, b) => a - b);
const q = p => pcts[Math.floor(pcts.length * p)].toFixed(3);
console.log(`\n유형별 비율 분포: 최소 ${q(0)}% / 25% ${q(.25)} / 중앙 ${q(.5)} / 75% ${q(.75)} / 최대 ${pcts[pcts.length-1].toFixed(3)}%`);
