'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),E=require('../assets/interpretation-engine'),rt=require('./lib/reading-runtime')(),{w,run}=rt;
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
try{
 const products=['life','newyear','gunghap','love','marriage','reunion','money','career','study','child','children','health'];let cases=0;
 for(const system of ['saju','tarot','astrology','ziwei','name'])for(const product of products)for(const depth of ['web','pdf']){
  ctx.cat=depth==='pdf'?'report-tpl':'reading-deep';ctx.meta={readingKind:system==='name'?'name':product,systemEvidence:{system},language:{code:'ko'},sections:[]};ctx.source={marital:'single'};
  const p=vm.runInContext('buildReadingUserPrompt(cat,source,meta)',ctx);assert(p.includes('[상품의 독립적인 상담 가치]'));assert(p.includes('[상품별 상담 초점]'));assert(p.includes('핵심 질문:'));if(depth==='pdf')assert(p.includes('PDF는 웹의 핵심 해석을 유지'));cases++;
 }
 for(const [raw,product] of [['life-core','life'],['newyear-core','newyear'],['report-love','love'],['topic-money','money'],['name:가상','name'],['ziwei','ziwei']]){ctx.raw=raw;assert.equal(vm.runInContext('readingSubject({readingKind:raw}).product',ctx),product);}
 const labels={marriage:'결혼과 부부 생활',reunion:'재회와 이별',health:'건강과 휴식',study:'학업과 시험',child:'아이의 양육',children:'임신과 가족계획'};
 for(const [topic,label]of Object.entries(labels)){w.label=label;assert.equal(run("storyTopic('',label)"),topic,'unrelated chapters must not all become core/love');}
 for(const system of ['saju','tarot','astrology','ziwei'])for(const product of products){const signal={id:system+':actual.source',divination_type:system,source_reference:'actual.source',source_value:{glyph:'원본'},interpretation_method:'existing-symbolic',topic:['all'],meaning:'원본에서 계산한 실제 근거의 상징적 해석만 사용해요.'},p=E.createPlan({system,product,signals:[signal],chapters:[{id:'one',title:'현재 질문',topic:'core'}]}),wire=E.prompt(p);assert(E.validatePlan(p).ok);assert.equal(wire.product,product);assert(wire.chapters[0].newContribution);assert(wire.chapters[0].question.includes(E.subjectQuestion(product,'core')));ctx.plan=wire;assert(vm.runInContext('storyPlanText(plan)',ctx).includes('newContribution'));assert.deepEqual(p.selected_signals[0].source_value,signal.source_value);}
 const pdf=fs.readFileSync('assets/report-pdf.js','utf8');assert(pdf.includes('readingKind:d.cat,reportName:'),'legacy PDF explicitly sends its product rather than inferring it from a title');assert(pdf.includes('const report=AIReport.preparePdf(AIReport.sources(d.cat,d.saju,d.meta),d.info||{})'),'both PDF entry points must remove web-length constraints');
 console.log('All-category consultation passed: '+cases+' legacy system/product/depth policy combinations; 4 × 12 shared deterministic plans, specific chapter classification, source preservation and both PDF preparation paths. No live model/payment calls.');
}finally{rt.close()}
