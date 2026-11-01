'use strict';
// Hold mocked responses to check the actual pending interval, not only the finished state.
const assert=require('node:assert/strict');
const rt=require('./lib/reading-runtime')(),{w,d,run}=rt;
(async()=>{try{
 rt.set({...rt.fixture(40,7,'married'),hour:9});run("_category='life';window.FortuneStoryConfig.enabled=false");
 const box=d.createElement('div');box.innerHTML=run('renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)');d.body.append(box);w.loadingRoot=box.querySelector('[data-deep]');
 let resolve;const hold=new Promise(r=>resolve=r);let calls=0;w.fetch=async()=>{calls++;await hold;return {ok:false,status:400,json:async()=>({error:'mocked unavailable'})};};
 const before=w.loadingRoot.textContent;const pending=run('hydrateDeepReading(window.loadingRoot)');
 assert(w.loadingRoot.classList.contains('reading-pending'));assert.equal(w.loadingRoot.getAttribute('aria-busy'),'true');assert.equal(w.loadingRoot.querySelector(':scope > .reading-wait').textContent,'풀이 중입니다');assert(calls>0);
 resolve();await pending;
 assert(!w.loadingRoot.classList.contains('reading-pending'));assert(!w.loadingRoot.hasAttribute('aria-busy'));assert(!w.loadingRoot.querySelector('.reading-wait'));assert.equal(w.loadingRoot.textContent,before,'failure must reveal the existing computed body');
 // Two concurrent owners cannot reveal an incomplete report or leave it permanently hidden.
 const a=run('beginReadingWait(window.loadingRoot)'),b=run('beginReadingWait(window.loadingRoot)');a();assert(w.loadingRoot.classList.contains('reading-pending'));a();assert(w.loadingRoot.classList.contains('reading-pending'));b();assert(!w.loadingRoot.classList.contains('reading-pending'));
 const view=d.createElement('div');w.loadingView=view;run("_tarotFlow={deepLoading:true,spreadName:'3장',resultMarkdown:'아직 보여주면 안 되는 풀이'};renderTarotResult(window.loadingView)");assert.equal(view.textContent,'풀이 중입니다');assert(!view.querySelector('.lv4'));
 run("_astroFlow={deepLoading:true,productName:'점성술',resultMarkdown:'아직 보여주면 안 되는 풀이'};renderAstrologyResult(window.loadingView)");assert.equal(view.textContent,'풀이 중입니다');assert(!view.querySelector('.lv4'));
 // Persisted in-flight flags must never leave a reloaded page stuck on the loader.
 run("sessionStorage.setItem(TAROT_FLOW_KEY,JSON.stringify({deepLoading:true,resultLoading:true,resultMarkdown:'저장된 타로 풀이'}));sessionStorage.setItem(ASTRO_FLOW_KEY,JSON.stringify({deepLoading:true,resultLoading:true,resultMarkdown:'저장된 점성술 풀이'}))");
 const tarot=run('loadTarotFlow()'),astro=run('loadAstrologyFlow()');for(const flow of [tarot,astro]){assert.equal(flow.deepLoading,false);assert.equal(flow.resultLoading,false);assert(flow.resultMarkdown.startsWith('저장된'));}
 const css=require('fs').readFileSync('assets/reading-flow.css','utf8');assert(css.includes('.reading-pending>:not(.reading-wait){display:none!important}'));assert(css.includes('prefers-reduced-motion'));
 console.log('Loading checks passed: pending body withheld, no estimated duration, failure fallback, concurrent cleanup, tarot/astrology preparation screen. All network mocked.');
}finally{rt.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
