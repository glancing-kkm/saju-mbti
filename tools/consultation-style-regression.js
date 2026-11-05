'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rt=require('./lib/reading-runtime')(),{run,w}=rt;
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});
vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
try{
 rt.set({...rt.fixture(39,1,'married')});let count=0;
 for(const cat of Object.keys(w.AIReport.CAT)){
  w.cat=cat;const report=run('AIReport.sources(window.cat,_saju,_meta)');
  for(const c of report.chapters){assert(c.question.length<=1600,cat+'/'+c.id+' server question limit');if(c.kind!=='chart')assert(c.question.includes('핵심 해석을 먼저'),cat+'/'+c.id);}
  const pdf=w.AIReport.preparePdf(report);assert(pdf.chapters.every(c=>c.kind==='chart'||c.question.includes('핵심 해석을 먼저')));
  for(const phase of ['plan','chapters'])for(const depth of ['web','pdf']){
   ctx.raw=JSON.parse(JSON.stringify({...report,phase,depth,requestedChapters:report.chapters.slice(0,1)}));
   const data=vm.runInContext('professionalReportData(raw)',ctx);assert(data);ctx.data=data;
   const sys=vm.runInContext("professionalReportSystem(data,{code:'ko'})",ctx);
   assert(sys.includes('[상담형 집필 원칙]'));assert(sys.includes('[상품별 상담 초점]'));assert(sys.includes('같은 기간·조건의 같은 선택'));assert(sys.includes('다른 서비스의 문장·고유 표현을 옮기지'));
   if(depth==='pdf')assert(sys.includes('PDF는 웹의 핵심 해석을 유지'));
   if(cat==='ziwei')assert(sys.includes('궁·별·대한'));if(cat==='name')assert(sys.includes('확인된 획수'));
   count++;
  }
 }
 for(const fn of ['buildTarotReadingSystemPrompt','buildAstrologyReadingSystemPrompt'])assert(vm.runInContext(`${fn}('ko')`,ctx).includes('[상담형 집필 원칙]'));
 const cards=[{positionLabel:'현재',cardNameKo:'마법사',orientation:'upright'},{positionLabel:'과제',cardNameKo:'은둔자',orientation:'upright'},{positionLabel:'조언',cardNameKo:'힘',orientation:'upright'}];ctx.input={cards,question:'어떻게 선택할까요?',topic:'career'};
 const tarot=vm.runInContext("buildTarotReadingUserPrompt(input,'ko')",ctx);assert(tarot.includes('실제 뽑힌 카드의 자리·방향'));assert(tarot.includes('1,100~1,600자'));assert(tarot.includes('능력이 드러나는 환경'));
 for(const system of ['saju','tarot','astrology','ziwei','name']){ctx.system=system;assert(vm.runInContext("consultationFocus(system,'health')",ctx).includes('질병·사고·회복 시기'));}
 assert(vm.runInContext("consultationFocus('astrology','love')",ctx).includes('행성·별자리·하우스·각도'));
 console.log('Consultation style passed: 14 products × plan/chapter × web/PDF, topic identities, answer-first chapter instructions, PDF expansion, cross-chapter consistency and unsupported-event restrictions. Prompt contracts only; actual prose evaluated separately.');
}finally{rt.close();}
