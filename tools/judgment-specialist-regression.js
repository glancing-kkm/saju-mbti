'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rt=require('./lib/reading-runtime')(),reply=require('./lib/ai-report-model-fixture'),{w,run}=rt;
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
try{
 rt.set(rt.fixture(39,1,'married'));const A=w.AIReport;let count=0;
 for(const cat of Object.keys(A.CAT)){
  w.cat=cat;const r=run('AIReport.sources(window.cat,_saju,_meta)'),p=A.normalizePlan(reply({...r,phase:'plan'}),r);assert(A.planQuality(p,r),cat);
  const noContribution=JSON.parse(JSON.stringify(p));delete noContribution.chapters[0].newContribution;assert(!A.planQuality(noContribution,r),'each chapter owns a distinct contribution');
  const repeatedContribution=JSON.parse(JSON.stringify(p));repeatedContribution.chapters[1].newContribution=repeatedContribution.chapters[0].newContribution;assert(!A.planQuality(repeatedContribution,r));
  const missing=JSON.parse(JSON.stringify(p));delete missing.judgments;assert(!A.planQuality(missing,r));
  const wrong=JSON.parse(JSON.stringify(p));wrong.judgments[0].supportingRefs=['fabricated.fact'];assert(!A.planQuality(wrong,r));
  const invented=JSON.parse(JSON.stringify(p));invented.judgments[0].condition='2099년에 반드시 결혼하며 새로운 인연이 생기는 조건입니다.';assert(!A.planQuality(invented,r));
  const detached=JSON.parse(JSON.stringify(p));detached.chapters[0].judgmentIds=['judgment-9'];assert(!A.planQuality(detached,r));
  const payload=A.chapterPayload(r,p,[r.chapters[0]]);for(const j of p.judgments)for(const id of j.supportingRefs)assert(payload.ledger.some(s=>s.id===id));
  ctx.raw=JSON.parse(JSON.stringify({...r,phase:'plan'}));const parsed=vm.runInContext('professionalReportData(raw)',ctx);ctx.data=parsed;const format=vm.runInContext('professionalReportFormat(data)',ctx);assert.equal(parsed.analysisContract,'judgment-v2');assert(format.schema.properties.chapters.items.required.includes('newContribution'));assert(format.schema.required.includes('judgments'));assert(format.schema.properties.chapters.items.required.includes('judgmentIds'));
  ctx.raw=JSON.parse(JSON.stringify({...payload,phase:'chapters'}));const writing=vm.runInContext('professionalReportData(raw)',ctx);assert.equal(writing.plan.chapters[0].newContribution,p.chapters[0].newContribution,'chapter ownership survives server sanitization');
  const v1={...r,analysisContract:'judgment-v1'};const oldPlan=JSON.parse(JSON.stringify(p));oldPlan.chapters.forEach(c=>delete c.newContribution);assert(A.planQuality(oldPlan,v1),'v1 reports remain readable');
  const legacy={...r,analysisContract:undefined};ctx.raw={...legacy,phase:'plan'};ctx.data=vm.runInContext('professionalReportData(raw)',ctx);assert(!vm.runInContext('professionalReportFormat(data)',ctx).schema.required.includes('judgments'),'legacy schema retained');
  const scaled=A.scaleWebQuestions(r.chapters,.65);assert(scaled.some((c,i)=>c.question!==r.chapters[i].question));const pdf=A.preparePdf({...r,chapters:scaled});assert(pdf.chapters.every(c=>!c.question.includes('분량은 공백 포함')),'PDF does not inherit web reduction');
  count++;
 }
 const variants=['money','love','marriage','reunion','career','study','child','children','health','gunghap','name'];
 for(const system of ['saju','tarot','astrology','ziwei']){const texts=variants.map(product=>{ctx.system=system;ctx.product=product;return vm.runInContext('specialistProductPolicy(system,product)',ctx)});assert.equal(new Set(texts).size,variants.length);assert(texts.every(t=>t.includes('핵심 질문')));}
 rt.set({...rt.fixture(16,1,'single'),hour:-1});const unknown=run("AIReport.sources('life',_saju,_meta)"),up=A.normalizePlan(reply({...unknown,phase:'plan'}),unknown),nat=unknown.chapters.find(c=>c.kind==='nature'),decadeRef=unknown.ledger.find(s=>s.id.startsWith('decade.')).id;
 const section=reply({...unknown,plan:up,phase:'chapters',requestedChapters:[nat]}).sections[0];section.evidenceRefs.push(decadeRef);up.chapters.find(c=>c.id===nat.id).evidenceRefs.push(decadeRef);
 assert(!A.chapterIssues(section,unknown,up).includes('unknown_decade_boundary'),'merely referencing a decade never requires repetitive warning');
 const ageOnly={...section,paragraphs:[...section.paragraphs,'본인의 16세 생활에서는 배움과 가까운 사람의 관계를 따로 살펴보는 것이 중요합니다.']};assert(!A.chapterIssues(ageOnly,unknown,up).includes('unknown_decade_boundary'));
 const boundary={...section,paragraphs:[...section.paragraphs,'대운은 12세에 시작하여 22세까지 이어지는 시기입니다.']};assert(A.chapterIssues(boundary,{...unknown,uncertaintyDisclosure:'standalone'},up).includes('unknown_decade_boundary'),'standalone exact boundary still blocked');
 assert(!A.chapterIssues(boundary,unknown,up).includes('unknown_decade_boundary'),'whole reports disclose reference boundaries once at the start');
 const doc=A.pdfDoc(unknown,{plan:up,accepted:{},complete:false});assert(doc.parts[0].blocks.some(b=>b.includes('시작 나이와 기간은 달라질 수 있는 참고 범위')),'PDF preserves the global uncertainty disclosure');
 assert(A.repairInstruction(['wrong_natal_claim'],unknown).includes('원국 자리와 글자가 달랐습니다'));assert(A.repairInstruction(['unsupported_year'],unknown).includes('응답 evidenceRefs'));
 const story=unknown.chapters.find(c=>c.kind==='flow'),assigned=up.chapters.find(c=>c.id===story.id);assert(story.requiredDecades.every(id=>assigned.evidenceRefs.includes(id)),'recap has the historical evidence it must summarize');
 const same='같은 문장을 다른 장에 반복해서 쓰면 독자의 궁금증에 새롭게 답하지 못하고 분량만 늘어나는 문제가 생깁니다.';
 const audit=A.repetitionAudit([{id:'a',paragraphs:[same]},{id:'b',paragraphs:[same]},{id:'c',paragraphs:['2027년에는 실제 근거를 연결해서 현재의 생활 조건과 장기적으로 준비할 방향을 함께 설명하는 문장입니다.']},{id:'d',paragraphs:['2028년에는 실제 근거를 연결해서 현재의 생활 조건과 장기적으로 준비할 방향을 함께 설명하는 문장입니다.']}]);assert(audit.duplicates.some(d=>d.from==='a'&&d.to==='b'));assert(!audit.duplicates.some(d=>d.to==='d'),'different years never treated as interchangeable');
 ctx.data={phase:'plan',analysisContract:'judgment-v1'};assert.equal(vm.runInContext('professionalWritingEffort(data)',ctx),'medium');
 console.log('Judgment/specialist checks passed: '+count+' paid/PDF products, real evidence/counter/period constraints, missing/fabricated judgments rejected, legacy protocol, web-only scale, 4 systems × 11 distinct questions and repetition diagnostics. No live AI.');
}finally{rt.close();}
