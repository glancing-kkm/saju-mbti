#!/usr/bin/env node
// AI 사용량 보기 — saju-chat 워커가 하루 단위로 센 성공 요청 수를 종류별로 보여 준다.
// 사용: node tools/usage-report.js [일수=7]   (wrangler 로그인 필요, 읽기만 함)
const { execFileSync } = require('child_process');
const path = require('path');

const days = Math.max(1, Math.min(120, Number(process.argv[2]) || 7));
const LABEL = {
  'reading:reading-deep': '결제 후 심층 해석',
  'reading:topic-answer': '주제별 질문 답',
  tarot: '타로 AI 풀이',
  astrology: '점성술 AI 풀이',
  portrait: '인상 이미지',
};
const labelOf = (t) => LABEL[t] || (t.startsWith('reading:report-') ? `PDF 리포트(${t.slice(15)})` : t.startsWith('reading:') ? `풀이 AI(${t.slice(8)})` : t.startsWith('chat:') ? `채팅(${t.slice(5)})` : t);

const raw = execFileSync('npx', ['wrangler', 'kv', 'key', 'list', '--binding', 'SAJU_QNA_CACHE', '--prefix', 'usage:', '--remote'], {
  cwd: path.join(__dirname, '..', 'worker'),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const keys = JSON.parse(raw.slice(raw.indexOf('[')));
const since = new Date(Date.now() + 9 * 3600e3 - (days - 1) * 86400e3).toISOString().slice(0, 10);

const byDay = {};
for (const k of keys) {
  const [, day, ...rest] = k.name.split(':');
  if (day < since) continue;
  const type = rest.join(':');
  const n = Number(k.metadata && k.metadata.n) || 0;
  (byDay[day] = byDay[day] || {})[type] = n;
}
const daysSorted = Object.keys(byDay).sort().reverse();
if (!daysSorted.length) {
  console.log(`최근 ${days}일 동안 기록된 AI 요청이 없어요.`);
  process.exit(0);
}
const total = {};
for (const day of daysSorted) {
  const rows = Object.entries(byDay[day]).sort((a, b) => b[1] - a[1]);
  const sum = rows.reduce((s, [, n]) => s + n, 0);
  console.log(`\n${day}  합계 ${sum}회`);
  for (const [t, n] of rows) {
    console.log(`  ${labelOf(t).padEnd(22)} ${String(n).padStart(5)}회`);
    total[t] = (total[t] || 0) + n;
  }
}
const img = total.portrait || 0;
console.log(`\n최근 ${days}일 합계: ${Object.values(total).reduce((s, n) => s + n, 0)}회 · 인상 이미지 ${img}장(약 ${img}원)`);
console.log('* 동시에 몰린 요청은 조금 적게 셀 수 있어요. AI 글 비용은 OpenAI·Anthropic 사용량 화면에서 금액으로 확인하세요.');
