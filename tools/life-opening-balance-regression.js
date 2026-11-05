'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rt=require('./lib/reading-runtime')(),{w,run}=rt;
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});
vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
try{
 let ledger=null;
 for(const occupation of ['영업직','사무직','학생']){
  const meta={...rt.fixture(39,1,'married'),counsel:{answers:[{key:'occupation',value:occupation}]}};rt.set(meta);
  const report=run("AIReport.sources('life',_saju,_meta)");
  const actualLedger=JSON.stringify(report.ledger);if(ledger)assert.equal(actualLedger,ledger,'occupation must not change chart facts');ledger=actualLedger;
  const opening=report.chapters.filter(c=>['prologue','chart','nature'].includes(c.kind));assert.equal(opening.length,5);
  const nature=opening.filter(c=>c.kind==='nature');assert.equal(nature.length,3);
  assert.match(opening[0].question,/성격·감정.*가까운 사람.*즐거움·생활/);
  assert.match(nature[0].question,/일간과 태어난 계절/);assert.match(nature[0].question,/입력 직업을 사례로 쓰거나 성과·평가로 귀결하지 마세요/);
  assert.match(nature[1].question,/실제로 강하거나 상반되는 십성/);assert.match(nature[1].question,/마음이 편해지는 조건/);
  assert.match(nature[2].question,/실제 충·합/);assert.match(nature[2].question,/자료에 없으면 억지로 만들지/);
  assert(report.chapters.some(c=>c.tag==='직업운'&&c.question.includes('적용 예시 한 문단')),'job personalization retained in career chapter');
  const pdf=w.AIReport.preparePdf(report);for(const c of nature){const p=pdf.chapters.find(x=>x.id===c.id);assert(p.question.includes('직업')||p.question.includes('업무'));assert.equal(p.kind,'nature');}
  const old=JSON.parse(JSON.stringify(report));old.chapters.find(c=>c.kind==='nature').question='직업 장면을 먼저 쓰세요';assert.notEqual(w.AIReport.reportFingerprint(report),w.AIReport.reportFingerprint(old),'old writing plan must not match new cache fingerprint');
  assert.equal(report.userStatements.counsel.answers[0].value,occupation,'provided facts retained');
 }
 for(const product of ['life','newyear','topic-career']){
  ctx.data={product,productGuide:null};const system=vm.runInContext("professionalReportSystem(data,{code:'ko'})",ctx);
  assert.equal(system.includes('[인생총운 도입부의 생활 균형'),product==='life');
  if(product==='life'){assert(system.includes('기존 question에 직업 사례'));assert(system.includes('없는 갈등이나 행복했던 경험을 만들지'));}
 }
 console.log('Life opening balance contracts passed: 3 occupations, unchanged calculation facts, distinct personality/emotion/relationship scope, job chapter retained, PDF scope, cache fingerprint and legacy-client prompt precedence. Does not assess live AI prose quality.');
}finally{rt.close();}
