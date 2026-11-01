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
 rt.set({...rt.fixture(40),sy:1990,sm:4,sd:12});const fresh=run("AIReport.sources('life',_saju,_meta)");invalidOnce=true;const repaired=await w.AIReport.author(fresh);{const doc=w.AIReport.pdfDoc(fresh,repaired),titles=doc.parts.map(p=>p.title);assert.equal(titles[0],'기본 정보와 풀이 기준');assert(titles.includes('당신의 인생을 관통하는 세 가지 특징'));assert(titles.some(t=>/^직업운 — /.test(t)));assert.equal(titles.at(-1),'해석 근거와 한계');assert(doc.parts.every(p=>p.blocks.length));}assert(Object.values(repaired.accepted).every(c=>!c.evidenceRefs.includes('fabricated.fact')));assert(calls.some(r=>r.feedback?.some(f=>f.issues?.includes('unassigned_evidence'))));
 rt.set({...rt.fixture(43),sm:8});const partial=run("AIReport.sources('life',_saju,_meta)");badIds.add(partial.chapters[0].id);await assert.rejects(w.AIReport.author(partial));badIds.clear();const n=calls.length;await w.AIReport.author(partial);assert(calls.slice(n).every(r=>r.phase==='chapters'&&r.requestedChapters.length===1&&r.requestedChapters[0].id===partial.chapters[0].id),'retry writes only the missing chapter');
 // Paid HTML contains only newly authored paragraphs, and failures never expose the old computed body.
 run("_category='life'");const el=d.createElement('div');el.setAttribute('data-deep','life');el.innerHTML='<p>OLD COMPUTED PROSE</p><div class="chat-card"><input value="채팅 유지"></div>';const chat=el.querySelector('.chat-card');d.body.append(el);w.testRoot=el;
 await run('AIReport.run(window.testRoot)');const lifeCount=run("AIReport.sources('life',_saju,_meta).chapters.length");assert.equal(el.querySelectorAll('[data-ai-authored]').length,lifeCount);
 // 독자 말: 자료 ID·영어·뜻이 안 잡히는 비유는 한 번 다시 쓰게 하고, 남은 자료 ID는 화면에서 지운다. 직업은 제목이 되지 않는다.
 const A=w.AIReport;assert(A.wordingIssues('말의 결이나 약속의 모양을 먼저 봅니다.').includes('vague_metaphor'));assert(A.wordingIssues('natal.relations에서 월주와 일주가 합을 이뤄요.').includes('internal_or_english_word'));assert(A.wordingIssues('일과 책임을 거쳐 손에 들어오는 흐름으로 읽힙니다.').length);assert.deepEqual(Array.from(A.wordingIssues('맡은 일을 해내고 받는 월급 같은 돈이 잘 맞아요.')),[]);
 assert.equal(A.readerText('natal.relations에서 월주와 일주가 합을 이뤄요.'),'월주와 일주가 합을 이뤄요.');
 const job={userStatements:{counsel:{answers:[{key:'occupation',value:'영업직'}]}}};assert(A.themeIssues({profile:{theme:'영업직 사주의 흐름과 선택 기준'}},job).length);assert(!A.themeIssues({profile:{theme:'정에 약하지만 선은 분명한 사람'}},job).length);
 // 신년운세: 입춘부터 절기로 나눈 12개 명리월과 예시 리포트의 장 순서.
 const ny=run("AIReport.sources('newyear',_saju,{..._meta,nyExtra:{y:2027}})");const m1=ny.ledger.find(x=>x.id==='mw.2027.1').value,m12=ny.ledger.find(x=>x.id==='mw.2027.12').value;
 assert.equal(m1.stem+m1.branch,'임인');assert.match(m1.start,/^2027-02-04 /);assert.equal(m12.stem+m12.branch,'계축');assert.match(m12.start,/^2028-01-0[56] /);
 assert.deepEqual(Array.from(ny.chapters.filter(c=>c.kind!=='mw').map(c=>c.kind).slice(0,3)),['prologue','total','compare']);assert.equal(ny.chapters.filter(c=>c.kind==='mw').length,12);assert.deepEqual(Array.from(w.AIReport.chapterLabels(ny.chapters)).filter(Boolean).slice(0,3),['프롤로그','제1장','제2장']);
 // 심층 상담 리포트 구성: 프롤로그 → 원국 표 → 대운별 인생의 장 → 미래 10년 표 → 영역별 운(직업운 — …) → 에필로그 → 활용 설명서 → 해석 근거와 한계.
 const toc=el.querySelector('.lv4-toc').textContent;assert.match(toc,/프롤로그\. 당신의 인생을 관통하는 세 가지 특징/);assert.match(toc,/직업운 — /);assert.match(toc,/재물운 — /);assert.match(toc,/인생의 장: \d{4}~\d{4}년 [갑을병정무기경신임계][자축인묘진사오미신유술해]대운/);assert.match(toc,/에필로그\. 앞으로 당신에게 가장 중요한 질문/);
 assert(el.querySelector('.ai-ch-chart table.ai-table'));assert(el.querySelector('.ai-ch-future table.ai-table'));assert(el.querySelector('#ai-limits'));assert(el.querySelector('.ai-headline'));assert(el.querySelector('.ai-basis li'));
 assert(el.querySelectorAll('figure[data-ai-cue] .lc-bubble').length>=3);assert(el.querySelector('figure[data-ai-cue]').nextElementSibling.matches('.ai-authored-chapter'));
 assert.equal(w.AIReport.aiBody(['### 소제목','- 하나','- 둘','**핵심 문장입니다.**','보통 문단입니다.']).replace(/\u200b/g,''),'<h3 class="ai-subhead">소제목</h3><ul class="ai-list"><li>하나</li><li>둘</li></ul><p class="ai-key"><strong>핵심 문장입니다.</strong></p><p>보통 문단입니다.</p>');assert.equal(w.AIReport.plain('### 소제목'),'소제목');
 rt.set({...rt.fixture(41),sm:5});el.innerHTML='<p>DO NOT REVEAL FALLBACK</p>';delete el.dataset.aiComplete;fail=true;let release;held=new Promise(r=>release=r);const task=run('AIReport.run(window.testRoot)');assert(el.classList.contains('reading-pending'));release();held=null;await task;assert(!el.classList.contains('reading-pending'));assert(el.querySelector('.ai-report-notice'));assert(!el.querySelector('.reading-wait'));assert(!el.querySelector('[data-ai-authored="true"]'));assert(!el.textContent.includes('다시 풀이하기'));assert(!el.textContent.includes('DO NOT REVEAL FALLBACK'));fail=false;
 // PDF production path authors every heading and every summary field; skipAI remains an explicit offline QA option.
 rt.set(rt.fixture(40));run(fs.readFileSync('assets/report-pdf.js','utf8').replace('window.buildTemplateReport=buildTemplateReport;','window.buildTemplateReport=buildTemplateReport;window.pdfTest={rpFullAuthor,rpPlan,rpCollect,SPECS};'));
 for(const cat of Object.keys(w.AIReport.CAT)){w.cat=cat;const result=await run('(async()=>{const d=pdfTest.rpCollect(window.cat),spec=pdfTest.SPECS[window.cat];d.info={};return pdfTest.rpFullAuthor(spec,d,pdfTest.rpPlan(spec,d),()=>{},{})})()');assert.equal(result.filled.coverage.computed,0,cat);assert.equal(result.filled.coverage.ai,result.filled.coverage.total);assert(Object.values(result.filled.sources).every(v=>v==='ai'));assert(Object.keys(result.filled.fields).length>20,cat);assert.equal(Object.keys(result.filled.fieldProofs).length,Object.keys(result.filled.fields).length,cat+' summary proof coverage');}
 const raw={...one,phase:'fields',fieldRequests:[{id:'intro',ask:'소개',max:44,context:'작성한 AI 본문의 요약'}]};server.raw=JSON.parse(JSON.stringify(raw));const parsed=vm.runInContext('professionalReportData(raw)',server);assert.equal(parsed.fieldRequests.length,1);server.data=parsed;assert(vm.runInContext('professionalReportUser(data)',server).includes('새로 요약'));
 console.log('AI full-report checks passed: 14 paid products + 14 PDF authorship pipelines; plan/source/month validation, repair, exact cache, progressive delivery/failure recovery, no computed prose fallback. All provider responses mocked.');
}finally{rt.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
