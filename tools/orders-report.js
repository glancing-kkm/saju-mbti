#!/usr/bin/env node
// 결제 승인 내역 보기 — 결제 워커가 승인 때 남긴 기록(paid_order:)과, 질문권이면 채팅 워커가 센 사용 횟수를 함께 보여 준다.
// 사용: node tools/orders-report.js [일수=30]   (wrangler 로그인 필요, 읽기만 함)
// 질문권은 사용 횟수와 자동 환불 상태(후보 / 환불됨)도 함께 보여 준다.
const { execFileSync } = require('child_process');
const path = require('path');

const days = Math.max(1, Math.min(400, Number(process.argv[2]) || 30));
const workerDir = path.join(__dirname, '..', 'worker');
const list = (args) => {
  const raw = execFileSync('npx', ['wrangler', 'kv', 'key', 'list', ...args, '--remote'], { cwd: workerDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(raw.slice(raw.indexOf('[')));
};
const get = (binding, key, config) => {
  try {
    return execFileSync('npx', ['wrangler', 'kv', 'key', 'get', key, '--binding', binding, ...(config ? ['--config', config] : []), '--remote'], { cwd: workerDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const orders = list(['--binding', 'REVIEWS_KV', '--config', 'wrangler.kakao-payment.toml', '--prefix', 'paid_order:'])
  .map((k) => ({ orderId: k.name.slice('paid_order:'.length), category: (k.metadata && k.metadata.c) || '', amount: Number(k.metadata && k.metadata.a) || 0, at: Number(k.metadata && k.metadata.t) || 0, refundedAt: Number(k.metadata && k.metadata.r) || 0 }))
  .filter((o) => o.at >= Date.now() - days * 86400e3)
  .sort((a, b) => b.at - a.at);

const candidates = new Set(list(['--binding', 'REVIEWS_KV', '--config', 'wrangler.kakao-payment.toml', '--prefix', 'refund_candidate:']).map((k) => k.name.slice('refund_candidate:'.length)));
if (!orders.length) {
  console.log(`최근 ${days}일 동안 승인된 결제가 없어요.`);
  process.exit(0);
}
const kst = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
let sum = 0;
console.log(`최근 ${days}일 결제 승인 ${orders.length}건`);
for (const o of orders) {
  sum += o.amount;
  let usage = '';
  const pack = /^chatpack(\d+)$/.exec(o.category);
  if (pack || ['life', 'newyear'].includes(o.category)) {
    const used = Number(get('SAJU_QNA_CACHE', `paid-use:chat:${o.orderId.slice(0, 80)}`)) || 0;
    usage = pack ? `  질문권 ${used}/${pack[1]}회 사용` : `  포함 질문 ${used}/1회 사용`;
  }
  if (o.refundedAt) usage += `  · 자동 환불됨(${kst(o.refundedAt)})`;
  else if (candidates.has(o.orderId)) usage += '  · 자동 환불 후보(환불 기능 꺼짐)';
  console.log(`  ${kst(o.at)}  ${o.category.padEnd(16)} ${String(o.amount.toLocaleString('ko-KR') + '원').padStart(8)}  ${o.orderId}${usage}`);
}
console.log(`  합계 ${sum.toLocaleString('ko-KR')}원`);
