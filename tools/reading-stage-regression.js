'use strict';
const assert=require('node:assert/strict'),reply=require('./lib/ai-report-model-fixture');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{try{
 run('AIReportConfig.enabled=true');rt.set({...rt.fixture(40),hour:8});run("_category='life'");
 let pending=[],calls=0;
 w.fetch=async(url,opts)=>{calls++;const data=JSON.parse(opts.body).meta.aiReport;if(data.phase!=='plan')await new Promise(resolve=>pending.push({data,resolve}));return {ok:true,status:200,json:async()=>({text:JSON.stringify(reply(data))})};};
 const panel=d.getElementById('p5');panel.innerHTML='<div data-deep="life">MUST NOT SHOW DRAFT</div>';panel.dataset.rendered='1';
 run("gotoCard(5);showView('result')");
 const root=panel.querySelector('[data-deep]'),task=root._fullReportTask;
 assert(d.getElementById('view-analysis').classList.contains('on'));assert(!d.getElementById('view-result').classList.contains('on'));assert.equal(d.querySelectorAll('#view-analysis .analysis-glyph').length,8);assert(!d.getElementById('view-analysis').textContent.includes('MUST NOT'));
 d.querySelector('.analysis-board').click();assert(d.getElementById('view-analysis').classList.contains('on'),'analysis cannot be skipped by clicking');
 for(let i=0;i<20&&pending.length<6;i++)await tick();assert.equal(pending.length,6);pending[0].resolve();await tick();await tick();assert.equal(root.querySelectorAll('[data-ai-authored=true]').length,0);assert(!d.getElementById('view-result').classList.contains('on'));
 let done=false;task.then(()=>done=true);for(let i=0;i<200&&!done;i++){pending.splice(0).forEach(x=>x.resolve());await tick();}await task;
 assert(d.getElementById('view-result').classList.contains('on'));assert(!d.getElementById('view-analysis').classList.contains('on'));assert(root.dataset.aiComplete);assert(!root.textContent.includes('풀이 중입니다'));assert(!root.querySelector('[data-ai-authored=false]'));const before=calls;run("showView('result')");await tick();assert.equal(calls,before);
 // Leaving while generation runs must never pull the user back to a result page.
 rt.set({...rt.fixture(42),hour:9});run("_category='life'");panel.innerHTML='<div data-deep="life"></div>';panel.dataset.rendered='1';pending=[];run("gotoCard(5);showView('result')");const leaving=panel.firstElementChild._fullReportTask;for(let i=0;i<20&&!pending.length;i++)await tick();run("showView('home')");done=false;leaving.then(()=>done=true);for(let i=0;i<200&&!done;i++){pending.splice(0).forEach(x=>x.resolve());await tick();}await leaving;assert(d.getElementById('view-home').classList.contains('on'));assert(!w.ReadingStage.active);
 // Returning to the same in-flight report attaches the completion gate to the new visit.
 rt.set({...rt.fixture(43),hour:9});run("_category='life'");panel.innerHTML='<div data-deep="life"></div>';panel.dataset.rendered='1';pending=[];run("gotoCard(5);showView('result')");const returning=panel.firstElementChild._fullReportTask;for(let i=0;i<20&&!pending.length;i++)await tick();run("showView('home');showView('result')");assert(d.getElementById('view-analysis').classList.contains('on'));done=false;returning.then(()=>done=true);for(let i=0;i<200&&!done;i++){pending.splice(0).forEach(x=>x.resolve());await tick();}await returning;assert(d.getElementById('view-result').classList.contains('on'));assert(!w.ReadingStage.active);
 // A real failure stays on the analysis screen; it never reveals accepted partial chapters.
 rt.set({...rt.fixture(45),hour:-1});run("_category='life'");w.fetch=async()=>({ok:false,status:403,json:async()=>({code:'NEED_PAYMENT'})});panel.innerHTML='<div data-deep="life"></div>';panel.dataset.rendered='1';run("gotoCard(5);showView('result')");await panel.firstElementChild._fullReportTask;assert(d.getElementById('view-analysis').classList.contains('on'));assert(!d.getElementById('view-result').classList.contains('on'));assert(d.querySelector('.analysis-error').textContent.includes('결제 정보'));assert.equal(d.querySelectorAll('#view-analysis .analysis-glyph').length,6);assert(d.querySelector('.analysis-unknown'));assert(d.querySelector('.analysis-state').hidden);
 // The request trim retains chapter IDs, actual assigned evidence and cross-chapter connections.
 rt.set({...rt.fixture(40),hour:8});const report=run("AIReport.sources('topic-money',_saju,_meta)");const plan=w.AIReport.normalizePlan(reply({...report,phase:'plan'}),report);const requested=[report.chapters[3]],wire=w.AIReport.chapterPayload(report,plan,requested);
 assert(JSON.stringify(wire).length<JSON.stringify({...report,plan}).length);assert.equal(wire.chapters.length,report.chapters.length);assert.equal(wire.userStatements,report.userStatements);assert(wire.chapters.filter(c=>c.question).length===1);for(const id of plan.chapters.find(c=>c.id===requested[0].id).evidenceRefs)assert(wire.ledger.some(s=>s.id===id));
 console.log('Completion gate passed: source chart, hidden result/partial chapters, no click-to-skip, all-at-once completion, cached immediate display, navigation safety, honest failure state, unknown hour, reduced source payload. Mock AI only.');
}finally{rt.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
