'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),reply=require('./lib/ai-report-model-fixture');
const rt=require('./lib/reading-runtime')(),{w,run}=rt;
const server=vm.createContext({console,TextEncoder,TextDecoder,atob,btoa,Request,Response,URL,FormData,Blob});vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),server);
(async()=>{try{
 rt.set(rt.fixture(40));const calls=[];
 w.fetch=async(url,opts)=>{const req=JSON.parse(opts.body),r=req.meta.aiReport;calls.push({kind:req.kind,r});const out=reply(r);if(r.depth==='pdf'&&out.sections)out.sections.forEach(s=>s.paragraphs.push(r.requestedChapters.find(c=>c.id===s.id).title+'의 추가 설명에서는 이미 살펴본 근거를 실제 생활의 선택 기준과 연결하여 비교합니다. '+r.requestedChapters.find(c=>c.id===s.id).title+'에서 업무와 생활 조건이 달라지면 같은 성향도 다른 모습으로 나타나기 때문에 조건을 함께 확인해야 합니다.'));return {ok:true,status:200,json:async()=>({text:JSON.stringify(out)})};};
 for(const cat of Object.keys(w.AIReport.CAT)){
  w.cat=cat;const web=run('AIReport.sources(window.cat,_saju,_meta)'),webFingerprint=w.AIReport.reportFingerprint(web);
  const start=calls.length,empty=w.AIReport.preparePdf(web);assert.equal(empty.webBasis,null);assert.equal(empty.depth,'pdf');assert.equal(calls.length,start,'preparation must not call AI');
  if(cat==='life'){const n=calls.length;await w.AIReport.author(empty,{kind:'report-tpl',token:'mock-pdf-token'});assert(calls.slice(n).every(c=>c.r.depth==='pdf'),'missing web cache must never trigger a separate web generation');}
  const authored=await w.AIReport.author(web),before=calls.length,pdf=w.AIReport.preparePdf(web,{concern:'추가 질문'});
  assert.equal(w.AIReport.reportFingerprint(web),webFingerprint,'web report must stay unchanged');assert.equal(pdf.depth,'pdf');assert(pdf.chapters.reduce((sum,c)=>sum+c.pdfMaxCharacters,0)<=45000,'whole PDF prose budget');assert(pdf.chapters.every(c=>c.pdfMaxCharacters<=6000));assert.equal(pdf.webBasis.chapters.length,web.chapters.length);assert.equal(calls.length,before,'no PDF authorship while preparing metadata');
  const result=await w.AIReport.author(pdf,{kind:'report-tpl',token:'mock-pdf-token'}),batch=calls.slice(before);
  assert(result.complete);assert(batch.length);assert(batch.every(c=>c.r.phase==='chapters'&&c.r.depth==='pdf'),'reuse the story plan without paying for a second plan');
  assert.deepEqual(JSON.parse(JSON.stringify(result.plan)),JSON.parse(JSON.stringify(authored.plan)),'same story/conclusions/links');
  batch.forEach(({r})=>{assert(r.webBasis.chapters.every(c=>r.requestedChapters.some(q=>q.id===c.id)),'only requested web chapters are sent');server.raw=r;server.data=vm.runInContext('professionalReportData(raw)',server);assert.equal(server.data.webBasis.chapters.length,r.requestedChapters.length);assert(server.data.requestedChapters.every(c=>c.pdfMaxCharacters>=240));assert(vm.runInContext('professionalReportUser(data)',server).includes('PDF 심층판 집필'));});
  web.chapters.forEach(c=>{assert(result.accepted[c.id].paragraphs.join('').length>authored.accepted[c.id].paragraphs.join('').length);assert(w.AIReport.chapterIssues(authored.accepted[c.id],pdf,result.plan).includes('pdf_not_expanded'),'web copy must not pass as deep PDF');});
  const n=calls.length;await w.AIReport.author(pdf,{kind:'report-tpl',token:'mock-pdf-token'});assert.equal(calls.length,n,'repeat download must reuse completed PDF prose');
  const changed=w.AIReport.preparePdf(web,{concern:'다른 질문'});assert.notEqual(w.AIReport.reportFingerprint(changed),w.AIReport.reportFingerprint(pdf));
  // A different source or a missing web cache must not borrow another person's web prose.
  const different={...web,year:web.year+1};assert.equal(w.AIReport.preparePdf(different).webBasis,null);
 }
 // Real production PDF route must use expansion for every supported product.
 const source=fs.readFileSync('assets/report-pdf.js','utf8');assert(source.includes('AIReport.preparePdf(AIReport.sources(cat,d.saju,d.meta)'));assert(source.includes("AIReport.author(report,{kind:'report-tpl',token"));
 run(source);const n=calls.length;const rendered=await run("buildTemplateReport('life',{dryRun:true,info:{}})");assert(rendered.pages.length>2);assert(rendered.html.includes('추가 설명에서는'));assert(calls.slice(n).every(c=>c.r.depth==='pdf'&&c.r.phase==='chapters'),'production route must expand the saved web report');rendered.host.remove();
 const index=fs.readFileSync('index.html','utf8');assert(index.includes("if(!isUnlockedFor('pdf-'+cat)){_pdfBusy=false;openPaymentConsent('pdf-'+cat,'KAKAOPAY');return;}"));
 console.log('PDF expansion passed: all 14 products, unchanged web, same story plan, chapter-scoped web context, separate paid generation/cache, no duplicate plan or web requests, copy rejection, changed-input isolation. Model responses mocked; prose quality/real cost not measured.');
}finally{rt.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
