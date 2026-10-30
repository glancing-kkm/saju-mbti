'use strict';
// No live AI, payments or mail. These tests verify data provenance, not divination accuracy.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const server=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,Request,Response,URL,FormData,Blob,console});
vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const testWorker={'),server);
(async()=>{
 rt.set({...rt.fixture(40),sy:1987,sm:9,sd:21,hour:8,min:15,marital:'married'});
 const original=run('JSON.stringify(hookPast(_saju,buildLifeV2Model(_saju,_meta)))');
 run("_meta.pastEvents=[{year:2017,text:'本人だけの記録'}];_meta.userName='別人';_meta.counsel={source:'user-stated',category:'life',answers:[{key:'focus',label:'고민',value:'개인 경험 표본'}]};");
 assert.equal(run('JSON.stringify(hookPast(_saju,buildLifeV2Model(_saju,_meta)))'),original);
 for(let i=0;i<120;i++){
  rt.set(rt.fixture(10+i%75,i,i%2?'married':'single',i%6===0));
  const past=run('hookPast(_saju,buildLifeV2Model(_saju,_meta))');
  for(const p of past){
   assert(p.year<2026&&p.year>=2016);assert.equal(p.confirmedEvent,false);assert(p.grounds.length);
   for(const g of p.grounds){
    w.ground=g;w.pastYear=p.year;
    assert.equal(run("(()=>{const x=_lifeV2YearInfo(_saju,window.pastYear),g=window.ground;const k={연지:'yp',월지:'mp',일지:'dp',시지:'hp'}[g.place];return g.type==='stem'?stemRel(_saju.dp.stem,x.yp.stem).kind:brRel(_saju[k].branch,x.yp.branch).kind;})()"),g.kind);
   }
   assert(!/전역|입사|결혼했|했을 거예요|맞았다면/.test(p.text+p.why+p.nextText));
  }
 }
 console.log('✓ 과거 풀이 120표본: 실제 원국 관계만 인용, 개인 사건·이름·혼인 상태로 사건을 역산하지 않음');
 rt.set({...rt.fixture(40),sy:1987,sm:9,sd:21,hour:8,min:15});
 const pastBox=d.createElement('div');pastBox.innerHTML=run('hookCardsHTML(_saju,buildLifeV2Model(_saju,_meta))');
 const years=[...pastBox.querySelectorAll('.hook-past-year')];assert.equal(years.length,3);
 const visible=years.map(y=>[...y.children].filter(e=>e.tagName!=='DETAILS').map(e=>e.textContent).join(' '));
 assert.equal(new Set(visible).size,3);
 assert(visible[0].includes('바깥일'));assert(visible[1].includes('주변의 기대'));assert(visible[2].includes('결과물'));
 for(const y of years){
   const main=[...y.querySelectorAll(':scope>p')].map(e=>e.textContent).join(' ');
   assert(main.length>=80);assert(!/천간|지지|월지|일지|시지|원진|반합|충 관계/.test(main));
   const why=y.querySelector('details');assert(why&&!why.open);assert(why.textContent.includes('관계'));
 }
 assert(pastBox.textContent.includes('진과'));assert(!pastBox.textContent.includes('진와'));
 run("_meta.sy=2012;_saju=calcSaju(2012,3,4,9,0)");
 const childPast=run('hookPast(_saju,buildLifeV2Model(_saju,_meta))');
 assert(childPast.every(x=>!/(직장|배우자|계약|이직|연봉)/.test(x.text)));
 console.log('✓ 회고 본문: 세 해의 다른 생활 장면, 기술 근거는 접힘, 조사·아이 나이 문맥 유지');

 run("goToInput('topic-career');document.getElementById('iY').value='1990';document.getElementById('iM').value='5';document.getElementById('iD').value='15';renderCounselFields('topic-career');");
 d.getElementById('counsel_occupation').value='개발 5년 차';d.getElementById('counsel_goal').value='직장 변경 검토';run('counselSave()');
 run("renderCounselFields('topic-money')");assert.equal(d.getElementById('counsel_occupation').value,'개발 5년 차');assert.equal(d.getElementById('counsel_activity').value,'');
 run("renderCounselFields('topic-career')");assert.equal(d.getElementById('counsel_occupation').value,'개발 5년 차');
 run("document.getElementById('iY').value='1991';renderCounselFields('topic-career')");assert.equal(d.getElementById('counsel_occupation').value,'');
 run("document.getElementById('iY').value='1990';renderCounselFields('topic-career');_meta.counsel=counselRead('topic-career');_category='topic-career';");
 const key=run("aiReadingCacheKey('reading-deep','topic-career','ko')");
 const payload=run("buildAIReadingPayload('reading-deep',{source:'paid-deep'})");assert.equal(payload.sajuContext.userStatements.source,'user-stated');assert.equal(payload.sajuContext.userStatements.answers[0].value,'개발 5년 차');assert.equal(payload.sajuContext.provenance.pastEventsConfirmed,false);
 assert(payload.sajuContext.situation.includes('개발 5년 차'),'PDF가 쓰는 공통 상황에도 포함');
 run("_meta.counsel.answers[0].value='교사 2년 차'");assert.notEqual(run("aiReadingCacheKey('reading-deep','topic-career','ko')"),key);
 const cats=run('Object.keys(COUNSEL_FIELDS)');assert(cats.length>=14);assert(!cats.includes('monthly')&&!cats.includes('daypick'));
 for(const cat of cats){w.cat=cat;run('renderCtxQuestion(window.cat)');assert(d.querySelector('#counselFields .counsel-step'));assert.equal(d.querySelectorAll('#counselFields [required]').length,1);assert(!d.querySelector('#counselFields [maxlength]'));assert(!d.querySelector('#counselFields details'));}
 console.log('✓ 카테고리별 상담: 직업 필수·다른 항목 선택, 생일/카테고리별 저장·복원·격리, AI/PDF 전달, 상담 수정 시 캐시 분리');
 for(const bad of ['2018년에 입사했을 거예요.','2024년에 결혼했어요.','그해 전역했죠.','맞았다면 앞으로의 미래도 믿으세요.']){w.bad=bad;assert.equal(run('readingProvenanceQuality(window.bad)'),false,bad);}
 for(const good of ['말씀하신 2024년 결혼을 기준으로 생활의 변화를 살펴볼게요.','그해 일지와 세운 지지가 합 관계를 이뤄요.','이직했다면 새 역할의 부담도 살펴보세요.']){w.good=good;assert(run('readingProvenanceQuality(window.good)'),good);}
 server.ctx=JSON.parse(JSON.stringify(payload.sajuContext));server.ctx.situation='사용자가 직접 적은 정보';
 const prompt=vm.runInContext("buildReadingUserPrompt('reading-deep',ctx,{})",server),system=vm.runInContext("buildReadingSystemPrompt('reading-deep',{})",server);
 assert(prompt.includes('사용자 진술'));assert(prompt.includes('숨')||prompt.includes('hidden'));assert(system.includes('같은 명식'));assert(system.includes('알려 주신 결혼 시점'));
 const chart=payload.sajuContext.chartAnalysis;assert(chart.pillars.length>=3);assert(chart.pillars.every(p=>p.hidden.length));assert(chart.limits.length>=2);
 const a=await vm.runInContext("qnaCacheKey({question:'언제 움직일까요?',sajuContext:ctx,category:'life',language:'ko'})",server);
 server.ctx.userStatements.answers[0].value='다른 사람의 상황';
 const b=await vm.runInContext("qnaCacheKey({question:'언제 움직일까요?',sajuContext:ctx,category:'life',language:'ko'})",server);assert.notEqual(a,b);
 server.ctx.userStatements=null;server.ctx.detailedReading='개인 A의 상담 기록';
 const c=await vm.runInContext("qnaCacheKey({question:'언제 움직일까요?',sajuContext:ctx,category:'life',language:'ko'})",server);
 server.ctx.detailedReading='개인 B의 상담 기록';assert.notEqual(await vm.runInContext("qnaCacheKey({question:'언제 움직일까요?',sajuContext:ctx,category:'life',language:'ko'})",server),c);
 console.log('✓ 서버: 개인 진술 출처·원국 상세·계산 한계 전달, 상담/기존 본문이 다르면 Q&A 캐시 분리');
 rt.set({...rt.fixture(40),sy:1987,sm:9,sd:21,hour:8,min:15});
 const source=run("buildReadingNarrative(_saju,_meta,'career').paragraphs");
 const section=d.createElement('div');section.innerHTML='<section class="lv4-sec" id="synthesis-case"><div class="reading-narrative"><p>계산형 설명</p></div><p>기존 앞 문단</p><p>기존 뒤 문단</p><div class="lv4-rows"><p>기간별 표는 보존해요.</p></div><details class="lv4-why"><p>2026년 계산 근거</p></details></section>';d.body.append(section);w.synthesisRoot=section;
 w.synthesisData={mode:'synthesis',sections:[{id:'synthesis-case',evidenceRefs:['natal.year.stem','invented'],paragraphs:Array.from(source)}]};
 const before=section.innerHTML;assert.equal(run('deepApply(window.synthesisRoot,window.synthesisData)'),0);assert.equal(section.innerHTML,before);
 w.synthesisData.sections[0].evidenceRefs=['natal.year.stem','natal.month.branch'];assert.equal(run('deepApply(window.synthesisRoot,window.synthesisData)'),1);
 assert.equal(section.querySelectorAll('.ai-deep').length,4);assert.equal(section.querySelectorAll('.reading-narrative').length,0);assert(section.querySelector('.lv4-rows'));section.remove();
 console.log('✓ 종합 풀이: 유효한 계산 참조가 있는 응답만 장 본문을 대체, 근거 오류는 원문 보존');
 const card=d.createElement('div');card.innerHTML=run("renderAIReadingCard('life','검증용','')");d.body.append(card);
 let release;w.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({text:'지금 맡은 역할과 시간을 나누어 살펴보세요. 새로운 일의 책임 범위를 확인하는 것이 먼저예요.'}),headers:{get:()=>null}});});
 const pending=run("hydrateAIReading('life')");assert(release);run("_meta.userName='다른 상담자'");release();await pending;
 assert.equal(run("aiReadingCacheGet('life','','ko')"),null);assert(!card.querySelector('.ai-ready'));card.remove();
 console.log('✓ 비동기 격리: 응답 대기 중 상담자가 바뀌면 새 상담자의 캐시/화면에 저장하지 않음');

})().finally(()=>rt.close()).catch(e=>{console.error(e);process.exitCode=1;});
