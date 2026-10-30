'use strict';
// Content structure and evidence checks; no live model calls or predictions of real events.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
try{
 const variants={core:new Set(),career:new Set(),money:new Set()};let plans=0;
 for(let i=0;i<120;i++){
  rt.set(rt.fixture(26+i%50,i,i%2?'married':'single',i%6===0));
  const evidence=run('buildReadingEvidence(_saju,_meta,{})');
  const ids=new Set(evidence.nodes.map(x=>x.id).concat(evidence.decade?[evidence.decade.id]:[evidence.flow.id]));
  for(const domain of Object.keys(variants)){
   w.editorialDomain=domain;const p=run('lifeEditorialPlan(_saju,_meta,window.editorialDomain)');
   assert(p,`${i}/${domain}: mixed evidence fixture should have a plan`);plans++;
   assert.equal(p.paragraphs.length,4);assert.equal(new Set(p.paragraphs).size,4);
   assert(p.sourceIds.every(id=>ids.has(id)));assert(p.sourceIds.filter(id=>id.startsWith('natal.')).length>=2);
   const axes=new Set(evidence.nodes.filter(n=>p.sourceIds.includes(n.id)).map(n=>n.axis));assert.equal(axes.size,2);
   assert([...axes].every(a=>p.motif.split('|').includes(a)));
   if(!evidence.hourKnown)assert(p.sourceIds.every(id=>!id.includes('.hour.')));
   assert(!/반드시|무조건 성공|첫째는|이달에 챙길 일 하나|전역했|결혼했/.test(p.paragraphs.join(' ')));
   assert(p.sourceIds.includes(evidence.decade?evidence.decade.id:evidence.flow.id));
   if(domain!=='money')assert(p.paragraphs[2].includes('대운')||p.paragraphs[2].includes('세운'));
   variants[domain].add(p.title);
  }
 }
 for(const [domain,v] of Object.entries(variants))assert(v.size>=5,domain+' needs distinct supported readings, got '+v.size);
 rt.set({...rt.fixture(40),sy:1987,sm:9,sd:21,hour:8,min:15,marital:'married'});
 const before=run("JSON.stringify(lifeEditorialPlan(_saju,_meta,'core'))");run("_meta.userName='다른 상담자';_meta.pastEvents=[{year:2024,text:'개인의 과거 사건'}]");assert.equal(run("JSON.stringify(lifeEditorialPlan(_saju,_meta,'core'))"),before);
 const root=d.createElement('div');root.innerHTML=run('buildLifeReadingV4(_saju,_meta)');d.body.append(root);w.editorialRoot=root;
 assert.equal(root.querySelectorAll('[data-editorial-domain]').length,3);
 assert.equal(root.querySelectorAll('[data-editorial-domain] details[open]').length,0);
 assert(!root.querySelector('#lv4-work-money').textContent.includes('통장을 생활비, 비상금'));
 const req=run('deepCollect(window.editorialRoot)');
 const brief=req.filter(s=>s.editorial);assert.equal(brief.length,3);assert.equal(new Set(brief.map(x=>x.id)).size,3);
 assert(!req.some(s=>s.id==='lv4-basic'||s.id==='lv4-work-money'),'AI must not replace a parent and its pilot articles twice');
 assert(brief.every(x=>x.editorial.sourceIds.length>=2&&x.editorial.tension&&x.editorial.reversal&&x.editorial.decision));
 const server=vm.createContext({console,TextEncoder,TextDecoder,atob,btoa,Request,Response,URL,FormData,Blob});
 vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const testWorker={'),server);
 server.meta={synthesis:true,readingKind:'life',sections:JSON.parse(JSON.stringify(req))};server.ctx=JSON.parse(JSON.stringify(run("buildSajuContextForChat('paid-deep')")));
 const prompt=vm.runInContext("buildReadingUserPrompt('reading-deep',ctx,meta)",server);assert(prompt.includes('editorial'));assert(prompt.includes('믿고 맡기는 일이'));
 server.raw={domain:'core',sourceIds:['IGNORE','natal.hour.stem','natal.day.branch'],tension:'검증'};
 const safe=vm.runInContext('editorialBrief(raw)',server);assert(!safe.sourceIds.includes('IGNORE'));
 run(fs.readFileSync('assets/report-pdf.js','utf8').replace('window.TEMPLATE_REPORT_SPECS=SPECS;', 'window.rpReadingSections=rpReadingSections;window.TEMPLATE_REPORT_SPECS=SPECS;'));
 w.editorialHTML=root.innerHTML;const pdf=run('rpReadingSections(window.editorialHTML)');
 for(const domain of ['core','career','money'])assert(pdf.some(s=>s.blocks.some(b=>b.domain===domain&&b.p)),'PDF misses '+domain);
 // Legacy or invalid model responses cannot overwrite the new pilot.
 const article=root.querySelector('[data-editorial-domain="core"]'),snapshot=article.innerHTML;
 w.aiDraft={sections:[{id:article.id,paragraphs:['내용을 더 알아보고 기회를 살펴보세요. '.repeat(8),'시간과 역할을 살펴보는 것이 중요해요. '.repeat(8)]}]};
 assert.equal(run('deepApply(window.editorialRoot,window.aiDraft)'),0);assert.equal(article.innerHTML,snapshot);
 const actualPlan=run("lifeEditorialPlan(_saju,_meta,'core')");
 w.aiDraft={mode:'synthesis',sections:[{id:article.id,evidenceRefs:Array.from(actualPlan.sourceIds),paragraphs:Array.from(actualPlan.paragraphs)}]};
 assert.equal(run('deepApply(window.editorialRoot,window.aiDraft)'),1);assert.equal(article.querySelectorAll('.ai-deep').length,4);assert.equal(root.querySelectorAll('[data-editorial-domain]').length,3);
 assert.equal(root.querySelector('[data-editorial-domain="money"] .ai-deep'),null,'core response must not replace money');

 // Other categories and children keep their own narrative routes.
 run('_meta.sy=2018');assert.equal(run("lifeEditorialPlan(_saju,_meta,'core')"),null);
 console.log(`✓ 인생총운 편집: ${plans}개 계획, 제목 ${Object.entries(variants).map(([k,v])=>k+' '+v.size).join('/')}종, 실제 두 성향 근거와 현재 운 연결`);
 console.log('✓ AI/PDF: 세 장을 분리해 전달·추출, 부모/자식 중복 대체 방지, 개인 사건 미사용, 미성년 분기 유지');
}finally{rt.close();}
