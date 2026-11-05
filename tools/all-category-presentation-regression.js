'use strict';
// Mock/local calculations only. Checks coverage, not interpretive accuracy or live model latency.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),V=require('../assets/reading-voice'),reply=require('./lib/ai-report-model-fixture');
const rt=require('./lib/reading-runtime')(),{w,d,run}=rt;
try{
 const noisy='복잡한 용어를 현실적인 언어로 바꿔보겠습니다. 하지만 이 장점에는 반대쪽 모습도 있습니다. 사무직이라는 현재 정보를 토대로 연결해 보면, 오래 앉아 있는 날에는 쉬는 시간을 정하세요.';
 assert.equal(V.cleanText(noisy),'하지만 오래 앉아 있는 날에는 쉬는 시간을 정하세요.');assert.equal(V.cleanText(V.cleanText(noisy)),V.cleanText(noisy));
 assert.equal(V.html('<script>const title="<h2>가르는 법</h2>";</script>'),'<script>const title="<h2>가르는 법</h2>";</script>');
 const caution='계산하지 않은 시기는 알 수 없습니다. 실제 사건이 있었다는 뜻은 아니며 이런 조건에서 어려웠을 수 있습니다.';assert.equal(V.cleanText(caution),caution);
 const heading='돕는 사람과 멀리할 선을 가르는 법';assert(V.headingHTML(heading).endsWith('가르는\u00a0법'));
 const md='# 1. '+heading+'\n\n'+noisy+'\n\n# 2. 해석 근거와 한계\n\n제거할 마지막 부록\n\n## 원국\n\n중복 원국\n\n# 3. 다음 행동\n\n'+caution;
 const cleaned=V.markdown(md);assert(!cleaned.includes('제거할 마지막'));assert(cleaned.includes(caution));
 for(const renderer of ['markdownToTarotHTML','markdownToAstroHTML']){w.md=md;const html=run(renderer+'(window.md)');assert(!html.includes('바꿔보겠습니다'));assert(!html.includes('반대쪽 모습'));assert(!html.includes('현재 정보를'));assert(!html.includes('중복 원국'));assert(html.includes('가르는\u00a0법'));}
 w.md=md;const rich=run("lv4FromMarkdown(window.md,'coverage')");assert.equal(rich.items.length,2);assert(rich.html.includes('가르는\u00a0법'));assert(!rich.html.includes('해석 근거와 한계'));
 rt.set({...rt.fixture(40),hour:8,min:15});let checkedPeriods=0;
 for(const cat of Object.keys(w.AIReport.CAT)){w.cat=cat;const r=run('AIReport.sources(window.cat,_saju,_meta)'),plan=w.AIReport.normalizePlan(reply({...r,phase:'plan'}),r);
  for(const c of r.chapters.filter(c=>['future','topic-future','topic-months'].includes(c.kind))){
   const s=reply({...r,plan,phase:'chapters',requestedChapters:[c]}).sections[0];assert.equal(w.AIReport.chapterIssues(s,r,plan).length,0,cat+'/'+c.id);checkedPeriods++;
   if(s.paragraphs[0].startsWith('### ')){const bad={...s,paragraphs:s.paragraphs.slice(2)};assert(w.AIReport.chapterIssues(bad,r,plan).length,cat+' missing period must be caught');}
  }
 }
 run("FortuneStoryConfig.enabled=true;_astroFlow={};window.coverChart=calculateAstrologyChart({year:1990,month:5,day:15,hour:9,minute:30,latitude:37.57,longitude:126.98,timezone:'Asia/Seoul',utcDateTime:'1990-05-15T00:30:00.000Z',birthTimeUnknown:false});window.coverPartner=calculateAstrologyChart({year:1992,month:8,day:11,hour:11,minute:0,latitude:37.57,longitude:126.98,timezone:'Asia/Seoul',utcDateTime:'1992-08-11T02:00:00.000Z',birthTimeUnknown:false})");
 const topics=['life','newyear','love','marriage','reunion','gunghap','money','career','study','child','children','health'];let astro=0;
 for(const cat of topics){w.cat=cat;const result=run(`(()=>{_astroFlow={chart:window.coverChart,productType:window.cat,targetYear:2027,yearTransits:window.cat==='newyear'?astroYearTransits(2027):[],partnerChart:window.coverPartner,question:'이 선택에서 무엇을 확인할까요?'};const md=astroPreviewTemplate(_astroFlow.chart,window.cat);return {md,plan:storyMdPlan(md,'astrology',_astroFlow,window.cat)};})()`);assert(result.plan,cat+' missing story plan');assert.equal(result.plan.product_type,cat);assert.equal(run('mdSections('+JSON.stringify(result.md)+').length'),6);assert(result.plan.selected_signals.length>0);if(cat==='newyear')assert.equal(result.plan.selected_signals.filter(s=>s.source_reference.startsWith('yearTransits.')).length,12);if(cat==='gunghap')assert(result.plan.selected_signals.some(s=>s.source_reference.startsWith('partnerChart.')));astro++;}
 const months=Array.from({length:12},(_,i)=>`### ${i+1}월 — 선택 조건\n\n${i+1}월의 실제 행성 위치를 기준으로 앞뒤 시기와 달라지는 생활 조건을 살펴봅니다. 이 달의 기준일은 월 전체에 같은 사건이 생긴다는 의미는 아닙니다.`).join('\n\n');assert.equal(V.periodIssues(months,topics.map((_,i)=>i+1),'월').length,0);assert(V.periodIssues(months.replace(/### 7월[^]*?(?=### 8월)/,''),[7],'월').length);
 w.nyMd=Array.from({length:6},(_,i)=>`# ${i+1}. ${i+1}번째 장\n\n이 ${i+1}번째 장에서는 각 행성의 실제 배치와 생활 환경을 함께 비교합니다. ${i+1}번의 선택을 돌아볼 때에는 주어진 역할과 바꿀 수 있는 조건을 구분해 살펴봅니다. 이렇게 ${i+1}번 장의 조건을 비교하면 같은 배치도 어떤 환경에서 부담이 되는지 이해할 수 있습니다. 마지막으로 ${i+1}번 장의 판단 기준을 실제 행동과 비교합니다.`).join('\n\n')+'\n\n# 7. 달마다의 흐름\n\n'+months;
 assert(run("astroAIQuality(window.nyMd,{chart:window.coverChart,productType:'newyear',targetYear:2027,yearTransits:astroYearTransits(2027)})"),'complete annual model fixture');w.badNy=w.nyMd.replace(/### 7월[^]*?(?=### 8월)/,'');assert(!run("astroAIQuality(window.badNy,{chart:window.coverChart,productType:'newyear',targetYear:2027,yearTransits:astroYearTransits(2027)})"),'missing computed month rejected');
 const pair=run("({own:signNameKo(findPlanet(window.coverChart,'sun').sign),other:signNameKo(findPlanet(window.coverPartner,'sun').sign)})");w.pairMd=`# 1. 본인의 배치\n\n당신의 태양은 ${pair.own}에 있습니다.\n\n# 2. 상대의 배치\n\n상대방 태양은 ${pair.other}에 있습니다.`;
 assert(run("storyValidateMarkdown(window.pairMd,'astrology',{chart:window.coverChart,partnerChart:window.coverPartner,productType:'gunghap'})"),'partner claims checked against partner chart');
 w.wrongPair=w.pairMd.replace('상대방 태양은 '+pair.other,'상대방 태양은 '+(pair.other==='양자리'?'처녀자리':'양자리'));assert(!run("storyValidateMarkdown(window.wrongPair,'astrology',{chart:window.coverChart,partnerChart:window.coverPartner,productType:'gunghap'})"));
 const server=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa});vm.runInContext(fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),server);
 for(const expr of ["buildTarotReadingSystemPrompt('ko')","buildAstrologyReadingSystemPrompt('ko')","professionalReportSystem({depth:'web'})"]){const p=vm.runInContext(expr,server);assert(p.includes('집필 안내'));assert(p.includes('부록'));if(!expr.startsWith('professional')){assert(p.includes('~입니다 / ~합니다'));assert(!p.includes('당신" 대신 "본인'));}}
 console.log(JSON.stringify({sharedCopyAndOrphans:true,markdownAndAppendix:true,periodChapters:checkedPeriods,astroTopics:astro,annualMissingMonthBlocked:true,partnerChartClaimsSeparated:true,freeAIAdded:false,modelResponses:'synthetic; no live provider/payment calls'}));
}finally{rt.close();}
