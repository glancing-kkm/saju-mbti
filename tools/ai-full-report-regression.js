'use strict';
// Mock-model integration: verifies authorship, source allocation and fail-closed behavior, not fortune accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const server=vm.createContext({console,TextEncoder,TextDecoder,atob,btoa,Request,Response,URL,FormData,Blob});
vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const testWorker={'),server);
let calls=[],fail=false,held=null,invalidOnce=false,badIds=new Set();
const response=require('./lib/ai-report-model-fixture');
w.fetch=async(url,opts)=>{const payload=JSON.parse(opts.body),r=payload.meta.aiReport;assert.equal(payload.sajuContext.detailedReading,'');assert.equal(payload.sajuContext.yongsin,'별도 종합 판정 없음');calls.push(r);if(held)await held;if(fail)return {ok:false,status:503,json:async()=>({})};let out=response(r);if(r.phase==='chapters')out.sections.forEach(s=>{if(badIds.has(s.id))s.evidenceRefs=['fabricated.fact'];});if(invalidOnce&&r.phase==='chapters'){out.sections[0].evidenceRefs=['fabricated.fact'];invalidOnce=false;}return {ok:true,status:200,json:async()=>({text:JSON.stringify(out)})};};
(async()=>{try{
 run('AIReportConfig.enabled=true');rt.set({...rt.fixture(40),hour:8,min:15});
 const reports=[];
 for(const cat of run('Object.keys(AIReport.CAT)')){w.cat=cat;const report=run('AIReport.sources(window.cat,_saju,_meta)');reports.push(report);assert(!JSON.stringify(report).includes('natal.undefined'));assert(report.ledger.length>=2);assert(report.storytelling.primary.startsWith('STORY_'));
  server.raw=JSON.parse(JSON.stringify({...report,phase:'plan'}));assert(vm.runInContext('professionalReportData(raw)',server),cat+' server source acceptance');
  const result=await w.AIReport.author(report);assert.equal(Object.keys(result.accepted).length,report.chapters.length,cat);
  for(const c of report.chapters)assert.deepEqual(Array.from(w.AIReport.chapterIssues(result.accepted[c.id],report,result.plan)),[],cat+'/'+c.id);
  const count=calls.length;await w.AIReport.author(report);assert.equal(calls.length,count,'complete cache must not call model');
 }
 assert.equal(reports.length,14);
 // Source changes must affect the exact fingerprint; confirmed private events cannot become calculated facts.
 const one=reports[0],day=one.ledger.find(x=>x.id==='natal.day.stem').value.glyph,other=day==='갑'?'을':'갑';assert(w.AIReport.natalClaimsConsistent('본인 일간은 '+day+'이에요.',one));assert(!w.AIReport.natalClaimsConsistent('본인 일간은 '+other+'이에요.',one));
 rt.set({...rt.fixture(40),hour:-1});const unknown=run("AIReport.sources('life',_saju,_meta)");assert(!unknown.ledger.some(x=>x.id.startsWith('natal.hour.')));assert.notEqual(JSON.stringify(one),JSON.stringify(unknown));
 rt.set({...rt.fixture(40),sy:1990,sm:4,sd:12});const fresh=run("AIReport.sources('life',_saju,_meta)");invalidOnce=true;const repaired=await w.AIReport.author(fresh);assert(Object.values(repaired.accepted).every(c=>!c.evidenceRefs.includes('fabricated.fact')));assert(calls.some(r=>r.feedback?.some(f=>f.issues?.includes('unassigned_evidence'))));
 rt.set({...rt.fixture(43),sm:8});const partial=run("AIReport.sources('life',_saju,_meta)");badIds.add(partial.chapters[0].id);await assert.rejects(w.AIReport.author(partial));badIds.clear();const n=calls.length;await w.AIReport.author(partial);assert(calls.slice(n).every(r=>r.phase==='chapters'&&r.requestedChapters.length===1&&r.requestedChapters[0].id===partial.chapters[0].id),'retry writes only the missing chapter');
 // Paid HTML contains only newly authored paragraphs, and failures never expose the old computed body.
 run("_category='life'");const el=d.createElement('div');el.setAttribute('data-deep','life');el.innerHTML='<p>OLD COMPUTED PROSE</p><div class="chat-card"><input value="채팅 유지"></div>';const chat=el.querySelector('.chat-card');d.body.append(el);w.testRoot=el;
 await run('AIReport.run(window.testRoot)');assert.equal(el.querySelectorAll('[data-ai-authored]').length,13);
 // 목차·장 제목에 운 이름을 괄호로 붙이고, 인연 카드는 인연 장 바로 뒤에, 천기 말풍선은 이야기가 바뀌는 장 앞에 둔다.
 assert.match(el.querySelector('.lv4-toc').textContent,/일과 사회적 역할 \(직업운\)/);assert.match(el.querySelector('.lv4-toc').textContent,/생활 리듬과 회복 \(건강운\)/);assert.match(el.querySelector('.lv4-toc').textContent,/자녀와 가족 \(자녀·가족운\)/);
 assert.equal(el.querySelectorAll('.lv4-toc a > span').length,13);
 assert(el.querySelectorAll('figure[data-ai-cue] .lc-bubble').length>=3);assert(el.querySelector('figure[data-ai-cue]').nextElementSibling.matches('.ai-authored-chapter'));assert(!el.textContent.includes('OLD COMPUTED'));assert.equal(el.querySelector('.chat-card'),chat,'chat must keep original DOM and handlers');assert(!el.querySelector('details.lv4-why'));
 rt.set({...rt.fixture(41),sm:5});el.innerHTML='<p>DO NOT REVEAL FALLBACK</p>';delete el.dataset.aiComplete;fail=true;let release;held=new Promise(r=>release=r);const task=run('AIReport.run(window.testRoot)');assert(el.classList.contains('reading-pending'));release();held=null;await task;assert(!el.classList.contains('reading-pending'));assert(el.querySelector('.ai-report-notice'));assert(!el.querySelector('.reading-wait'));assert(!el.querySelector('[data-ai-authored="true"]'));assert(!el.textContent.includes('다시 풀이하기'));assert(!el.textContent.includes('DO NOT REVEAL FALLBACK'));fail=false;
 // PDF production path authors every heading and every summary field; skipAI remains an explicit offline QA option.
 rt.set(rt.fixture(40));run(fs.readFileSync('assets/report-pdf.js','utf8').replace('window.buildTemplateReport=buildTemplateReport;','window.buildTemplateReport=buildTemplateReport;window.pdfTest={rpFullAuthor,rpPlan,rpCollect,SPECS};'));
 for(const cat of Object.keys(w.AIReport.CAT)){w.cat=cat;const result=await run('(async()=>{const d=pdfTest.rpCollect(window.cat),spec=pdfTest.SPECS[window.cat];d.info={};return pdfTest.rpFullAuthor(spec,d,pdfTest.rpPlan(spec,d),()=>{},{})})()');assert.equal(result.filled.coverage.computed,0,cat);assert.equal(result.filled.coverage.ai,result.filled.coverage.total);assert(Object.values(result.filled.sources).every(v=>v==='ai'));assert(Object.keys(result.filled.fields).length>20,cat);assert.equal(Object.keys(result.filled.fieldProofs).length,Object.keys(result.filled.fields).length,cat+' summary proof coverage');}
 const raw={...one,phase:'fields',fieldRequests:[{id:'intro',ask:'소개',max:44,context:'작성한 AI 본문의 요약'}]};server.raw=JSON.parse(JSON.stringify(raw));const parsed=vm.runInContext('professionalReportData(raw)',server);assert.equal(parsed.fieldRequests.length,1);server.data=parsed;assert(vm.runInContext('professionalReportUser(data)',server).includes('새로 요약'));
 console.log('AI full-report checks passed: 14 paid products + 14 PDF authorship pipelines; plan/source/month validation, repair, exact cache, progressive delivery/failure recovery, no computed prose fallback. All provider responses mocked.');
}finally{rt.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
