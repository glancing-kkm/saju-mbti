'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),reply=require('./lib/ai-report-model-fixture'),rt=require('./lib/reading-runtime')(),{w,run}=rt;
const server=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),server);
try{
 for(const age of [16,39,70]){rt.set(rt.fixture(age,1,'married'));for(const cat of Object.keys(w.AIReport.CAT)){
  w.cat=cat;const A=w.AIReport,r=run('AIReport.sources(cat,_saju,_meta)'),p=A.normalizePlan(reply({...r,phase:'plan'}),r);assert(A.planQuality(p,r));
  assert(r.webLength);assert.equal(new Set(r.chapters.map(c=>c.id)).size,r.chapters.length);
  if(cat==='life'){
   assert.equal(r.chapters.length,11);assert.equal(r.chapters.filter(c=>c.kind==='nature').length,1);assert.equal(r.chapters.filter(c=>c.kind==='chart').length,1);assert.equal(r.chapters.filter(c=>c.kind==='domain').length,6);
   const future=r.chapters.find(c=>c.kind==='future');assert.equal(future.refs.filter(id=>/^year\./.test(id)).length,10);
   const flow=r.chapters.find(c=>c.requiredDecades?.length),s=reply({...r,plan:p,phase:'chapters',requestedChapters:[flow]}).sections[0];assert(!A.chapterIssues(s,r,p).length);const id=flow.requiredDecades[0],d=r.ledger.find(x=>x.id===id).value;assert(A.chapterIssues({...s,paragraphs:s.paragraphs.filter(t=>!t.includes(d.approxYears[0]+'~'+d.approxYears[1]+'년'))},r,p).some(i=>i.startsWith('missing_decade_')),'merged flow cannot silently omit a requested decade');
  }
  if(cat==='newyear'){const months=r.chapters.filter(c=>c.kind==='mw');assert.deepEqual(Array.from(months,c=>c.mw),Array.from({length:12},(_,i)=>i+1));for(const c of months){assert(c.question.includes('300~400자'));assert(r.ledger.some(s=>s.id===c.refs[0]&&s.value.start&&s.value.end));}}
  if(cat.startsWith('topic-'))assert.equal(r.webLength.ratio,.8);
  server.raw={...r,phase:'chapters',requestedChapters:r.chapters.slice(0,1),plan:p};server.data=vm.runInContext('professionalReportData(raw)',server);assert(vm.runInContext('professionalReportUser(data)',server).includes('웹 간결판입니다'));
  const pdf=A.preparePdf(r);assert.equal(pdf.webLength,null);assert(pdf.chapters.every(c=>!/(?:본문 )?분량은 공백 포함 \d+~\d+자입니다|웹은 공백 포함 약 \d+자/.test(c.question)),'web budgets never constrain PDF');assert(pdf.chapters.reduce((n,c)=>n+c.pdfMaxCharacters,0)<=45000);
  server.raw={...pdf,phase:'chapters',requestedChapters:pdf.chapters.slice(0,1),plan:p};server.data=vm.runInContext('professionalReportData(raw)',server);const prompt=vm.runInContext('professionalReportUser(data)',server);assert(prompt.includes('PDF 심층판 집필'));assert(!prompt.includes('웹 간결판입니다'));
 }}
 console.log('Web length passed: 14 products × 3 ages; compact life, all 12 solar-term months/10 years/requested decades retained; omission rejected; web/PDF budget isolation and server delivery. Mock AI only; no latency/actual word-count guarantee.');
}finally{rt.close()}
