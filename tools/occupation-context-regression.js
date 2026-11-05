'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const rt=require('./lib/reading-runtime')(),{run}=rt;
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});
vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
try{
 for(const product of ['life','newyear','ziwei']){
  let planContext;
  for(const occupation of ['영업직','사무직','프리랜서']){
   rt.set({...rt.fixture(39,1,'married'),counsel:{answers:[{key:'occupation',value:occupation},{key:'concern',value:'지출과 저축의 균형'}]}});
   const report=run(`AIReport.sources('${product}',_saju,_meta)`);ctx.raw=JSON.parse(JSON.stringify({...report,phase:'plan'}));
   const plan=vm.runInContext('professionalReportData(raw)',ctx);assert(plan);
   assert(!plan.userStatements.includes(occupation));assert(plan.userStatements.includes('지출과 저축의 균형'));
   assert.equal(plan.chapterContexts.length,0);if(planContext)assert.equal(plan.userStatements,planContext);planContext=plan.userStatements;
   const career=report.chapters.find(c=>/직업|사업|부업/.test(c.title)),money=report.chapters.find(c=>/돈을 버는|재물/.test(c.title));assert(career&&money,product);
   ctx.raw.phase='chapters';ctx.raw.requestedChapters=[career,money];
   const batch=vm.runInContext('professionalReportData(raw)',ctx);assert(!batch.userStatements.includes(occupation));assert.equal(batch.chapterContexts.length,1);assert.equal(batch.chapterContexts[0].id,career.id);assert.equal(batch.chapterContexts[0].occupation[0],occupation);
   ctx.raw.requestedChapters=[money];assert.equal(vm.runInContext('professionalReportData(raw)',ctx).chapterContexts.length,0,'money-only generation must not receive occupation');
   ctx.raw.depth='pdf';assert.equal(vm.runInContext('professionalReportData(raw)',ctx).chapterContexts.length,0,'PDF same scope');
  }
 }
 rt.set({...rt.fixture(39),counsel:{answers:[{key:'occupation',value:'영업직'}]}});ctx.raw=JSON.parse(JSON.stringify({...run("AIReport.sources('topic-career',_saju,_meta)"),phase:'plan'}));
 assert(vm.runInContext('professionalReportData(raw)',ctx).userStatements.includes('영업직'),'career-specific consultation retains occupation');
 ctx.data={product:'life'};const policy=vm.runInContext("professionalReportSystem(data,{code:'ko'})",ctx);assert(policy.includes('정재=고객 계약'));assert(policy.includes('입력 직업에서 성격·재능·재정 상태를 거꾸로 추론하지'));
 console.log('Occupation context passed: 3 broad products × 3 jobs, occupation-free planning, per-chapter career scope in mixed batches, money/PDF exclusion, concern retained, career product personalization preserved. Model output not simulated as quality evidence.');
}finally{rt.close();}
