'use strict';
const assert=require('node:assert/strict'),reply=require('./lib/ai-report-model-fixture');
const rt=require('./lib/reading-runtime')(),{w,d,run}=rt;
try{
 rt.set(rt.fixture(40));const A=w.AIReport,report=run("AIReport.sources('life',_saju,_meta)");
 const plan=A.normalizePlan(reply({...report,phase:'plan'}),report),target=report.chapters.find(c=>c.kind==='future');
 const section=reply({...report,plan,phase:'chapters',requestedChapters:[target]}).sections[0];
 assert.deepEqual(Array.from(A.chapterIssues(section,report,plan)),[]);
 for(const year of [2027,2032,2033]){
  const ps=section.paragraphs.filter((p,i,a)=>!p.startsWith('### '+year+'년')&&!(i>0&&a[i-1].startsWith('### '+year+'년')));
  assert(A.chapterIssues({...section,paragraphs:ps},report,plan).includes('missing_year_'+year));
 }
 const year=report.year,onlyHeading={...section,paragraphs:section.paragraphs.filter((p,i,a)=>!(i>0&&a[i-1].startsWith('### '+year+'년')))};
 assert(A.chapterIssues(onlyHeading,report,plan).includes('missing_year_explanation_'+year));
 const noRef={...section,evidenceRefs:section.evidenceRefs.filter(id=>id!=='year.'+year)};assert(A.chapterIssues(noRef,report,plan).includes('missing_year_evidence'));
 const intro='복잡한 용어를 현실적인 언어로 바꿔보겠습니다. 거래처에서 조건을 다시 확인하는 장면입니다.';
 assert.equal(A.readerText(intro),'거래처에서 조건을 다시 확인하는 장면입니다.');assert(!A.aiBody([intro]).includes('바꿔보겠습니다'));assert(!A.plain(intro).includes('바꿔보겠습니다'));
 assert(report.chapters.every(c=>!c.question.includes('5~7개')));
 const host=d.createElement('div');host.innerHTML=run('renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour||8,_meta.min||0)');
 const graph=host.querySelector('#lv4-lc-graph');assert(graph,'real life graph exists');
 const radar=[...graph.querySelectorAll('.lc-radar text.l')].map((el,i)=>[el.textContent,Number(graph.querySelectorAll('.lc-radar text.v')[i].textContent)]);
 const bars=[...graph.querySelectorAll('.lc-area-row')].map(row=>[row.querySelector('span').textContent,Number(row.querySelector('b').textContent)]);
 assert(radar.length>=5);assert.deepEqual(radar,bars,'same domains, year and exact scores');assert(!graph.innerHTML.includes('영역별 운 지도 · 앞으로 10년'));
 const zero=run("lcYearAreaScores({love:{yearNow:{score:0}},money:{yearNow:{score:76},years:[{score:20}]}})");assert.deepEqual(JSON.parse(JSON.stringify(zero)),[['연애운',0],['재물운',76]],'zero is valid; never substitute multi-year average');
 const contrast='하지만 이 장점에는 반대쪽 모습도 있습니다. 휴식이 미루기로 이어지지 않게 시간을 정하세요.';
 assert.equal(A.readerText(contrast),'하지만 휴식이 미루기로 이어지지 않게 시간을 정하세요.');
 const job='사무직이라는 현재 정보를 토대로 연결해 보면, 오래 앉아 있는 날에는 자세를 바꿔 보세요.';
 assert.equal(A.readerText(job),'오래 앉아 있는 날에는 자세를 바꿔 보세요.');
 assert.equal(A.readerText('사업에서는 거래 조건이 중요합니다. 사무직이라는 현재 정보를 토대로 연결해 보면, 오래 앉는 날에는 쉬어 가세요.'),'사업에서는 거래 조건이 중요합니다. 오래 앉는 날에는 쉬어 가세요.');
 const real='사무직이라면 업무 중 자주 앉았다 일어나는 시간을 정해 보세요.';assert.equal(A.readerText(real),real,'meaningful job-specific conditions retained');
 for(const cat of Object.keys(A.CAT)){
  w.feedbackCat=cat;const r=run('AIReport.sources(window.feedbackCat,_saju,_meta)'),p=A.normalizePlan(reply({...r,phase:'plan'}),r);
  const sections=reply({...r,plan:p,phase:'chapters',requestedChapters:r.chapters}).sections;
  const state={plan:p,complete:true,accepted:Object.fromEntries(sections.map(x=>[x.id,{...x,paragraphs:[contrast,job,...x.paragraphs]}]))};
  const rendered=A.render(r,state,{orbs:[],boards:[],diagrams:[],people:[]});
  assert(!rendered.includes('ai-limits'),cat+' appendix and TOC removed');assert(!rendered.includes('반대쪽 모습도 있습니다'));assert(!rendered.includes('현재 정보를 토대로'));
  const doc=A.pdfDoc(r,state),text=doc.parts.flatMap(x=>x.blocks).join(' ');
  assert(!doc.parts.some(x=>['해석 근거와 한계','명리학적 해석 근거'].includes(x.title)),cat+' PDF appendix removed');assert(!text.includes('반대쪽 모습도 있습니다'));assert(!text.includes('현재 정보를 토대로'));
 }
 console.log('Report feedback passed: repeated preamble removed from web/PDF rendering, ten individual annual explanations/evidence required, 2027/2032/2033 omissions detected, real radar/bar domains and scores identical. 14 product web/PDF appendices absent, repeated contrast/context intros cleaned, meaningful occupation conditions retained. No live AI calls.');
}finally{rt.close();}
