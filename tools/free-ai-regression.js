'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const calls=[],rows=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ai=p=>['/reading','/tarot-reading','/astrology-reading','/portrait','/translate','/'].includes(p);
w.fetch=async(url,options={})=>{const p=new URL(String(url),'https://audit.example/').pathname;calls.push({path:p,method:options.method||'GET'});return {ok:true,status:200,json:async()=>({}),text:async()=>'',headers:{get:()=>null}};};
const marks=()=>calls.filter(c=>ai(c.path));
const check=async(cat,fn)=>{const before=marks().length;await fn();await wait(250);const added=marks().slice(before);rows.push({category:cat,aiRequests:added.length,requests:added});assert.equal(added.length,0,cat+': '+JSON.stringify(added));};
(async()=>{try{
 await wait(40);
 for(const cat of ['manse','daily','vedic','mahabote'])await check(cat,async()=>{
  run(`goToInput(${JSON.stringify(cat)})`);d.getElementById('iName').value='무료검증';d.getElementById('iY').value='1990';d.getElementById('iM').value='5';d.getElementById('iD').value='15';d.getElementById('iHourInput').value='9';d.getElementById('iMin').value='30';run("setTimeUnknown(false);syncHourInput('9');analyze()");await wait(150);assert(d.getElementById('view-result').classList.contains('on'));const p=cat==='manse'?'p0':cat==='daily'?'p1':'p9';assert(d.getElementById(p).textContent.trim().length>200);assert.equal(d.querySelectorAll('#'+p+' [data-ai-reading],#'+p+' [data-deep],#'+p+' [data-portrait]').length,0);
 });
 await check('tarot-today',async()=>{run("_todayTarotSelectedCardId='';_todayTarotCardIds=[];tarotNavigate('today')");const id=run('_todayTarotCardIds[0]');w.cardId=id;run('selectTodayTarot(window.cardId)');assert(d.getElementById('tarotApp').textContent.length>200);});
 const chart=run("calculateAstrologyChart({country:'대한민국',city:'서울특별시',year:1990,month:5,day:15,hour:9,minute:0,latitude:37.57,longitude:126.98,timezone:'Asia/Seoul',utcDateTime:'1990-05-15T00:00:00.000Z',birthTimeUnknown:false})");w.freeChart=chart;
 await check('astro-today',async()=>{run("_astroFlow={birthInfo:window.freeChart.birthInfo,chart:window.freeChart,transit:calculateTransit(new Date())};astroNavigate('today')");assert(d.getElementById('astroApp').textContent.length>200);});
 await check('astro-natal',async()=>{run("_astroFlow={birthInfo:window.freeChart.birthInfo,chart:window.freeChart};astroNavigate('natalResult')");assert(d.getElementById('astroApp').textContent.length>200);});
 // Locked paid previews must also remain deterministic and incur no inference request.
 for(const cat of ['life','newyear','gunghap','name','ziwei','topic-love','topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-child','topic-children','topic-health'])await check('preview:'+cat,async()=>{
  rt.set({...rt.fixture(40,7,'married'),hour:9});w.cat=cat;
  const out=run("paidPreviewHTML(window.cat,()=>window.cat==='life'?renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min):window.cat==='newyear'?renderNewyearFortune(_saju,2027):window.cat==='name'?renderNamePaid(_saju,_meta.nmExtra):window.cat==='gunghap'?renderGunghapPaid(_saju,_meta.gnExtra):renderExtraPaid(window.cat,_saju,_meta))");
  const root=d.createElement('div');root.innerHTML=out;d.body.appendChild(root);w.freeRoot=root;run('hydrateAIReadings(window.freeRoot)');await wait(30);root.remove();
 });
 await check('tarot-locked-preview',async()=>{run("_tarotFlow={question:'검증용 질문',topic:'career',questionCategory:'career',spreadName:'3장',positions:getSpreadPositions('tarot3','career','career'),selectedCards:[{positionIndex:0,cardId:'cups-05',orientation:'upright'},{positionIndex:1,cardId:'major-07-chariot',orientation:'reversed'},{positionIndex:2,cardId:'pentacles-01',orientation:'upright'}],paymentStatus:'none'}");await run('finishTarotDraw()');});
 await check('astro-locked-preview',async()=>{run("_astroFlow={birthInfo:window.freeChart.birthInfo,chart:window.freeChart,transit:calculateTransit(new Date()),productType:'career',paymentStatus:'none'}");await run('finishAstrologyReading()');});
 rt.set({...rt.fixture(40,7,'married'),hour:9});run("_category='life'");const paidRoot=d.createElement('div');paidRoot.innerHTML=run('renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)');d.body.append(paidRoot);w.paidRoot=paidRoot;const posBefore=marks().length;await run("hydrateDeepReading(window.paidRoot.querySelector('[data-deep]'))");const positive=marks().slice(posBefore);assert(positive.some(x=>x.path==='/reading'),'Fetch spy positive control: paid synthesis must make a mocked reading request');paidRoot.remove();
 fs.writeFileSync('/tmp/saju-free-ai-results.json',JSON.stringify({scope:'Runtime fetch spy with mocked network on local application scripts; no real AI calls.',rows,paidPositiveControl:positive,allRequests:calls},null,2));console.log('Free AI checks passed: '+rows.length+' free/preview flows, zero inference/portrait/translation requests; paid positive control '+positive.length+' mocked reading requests.');
}finally{rt.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
