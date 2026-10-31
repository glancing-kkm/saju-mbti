'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const V=require('../assets/reading-voice');
const guarded='2030년 자료는 계산하지 않았어요. 실제 이별이 있었다는 뜻은 아니에요. 이런 상황에서는 답답했을 수도 있어요. 시간을 몰라 하우스는 제외했어요. 증상이 이어지면 진료를 받으세요.';
assert.equal(V.text(guarded),guarded);assert.equal(V.text(V.text('확인할 필요가 있어요.')),V.text('확인할 필요가 있어요.'));
const html='<p data-note="확인할 필요가 있어요">확인할 필요가 있어요.</p><script>"확인할 필요가 있어요"</script><style>.x{content:"확인할 필요가 있어요"}</style><code>확인할 필요가 있어요</code>';
const edited=V.html(html);assert(edited.includes('data-note="확인할 필요가 있어요"'));assert(edited.includes('>확인하세요.</p>'));assert(edited.includes('<script>"확인할 필요가 있어요"</script>'));assert(edited.includes('<code>확인할 필요가 있어요</code>'));
const rt=require('./lib/reading-runtime')();
try{
 rt.run('window.FortuneStoryConfig={enabled:false}');rt.set({...rt.fixture(40,7,'married'),hour:9});
 const routes={life:'renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)',newyear:'renderNewyearFortune(_saju,2027)',gunghap:'renderGunghapPaid(_saju,_meta.gnExtra)',name:'renderNamePaid(_saju,_meta.nmExtra)',ziwei:'renderZiweiPaid(_saju,_meta)',manse:'renderManseryeokFull(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min,s2l(_meta.sy,_meta.sm,_meta.sd))',daily:'renderDailyFortune(_saju)',vedic:'renderVedicFree(_saju,_meta)',mahabote:'renderMahaboteFree(_saju,_meta)',mbti:"renderMBTI(_saju,'INTJ')"};
 for(const k of ['love','marriage','reunion','money','career','study','child','children','health'])routes['topic-'+k]=`renderTopicPaid('topic-${k}',_saju,_meta)`;
 let edits=0;const native=rt.w.ReadingVoice.html;rt.w.ReadingVoice.html=function(h){edits++;return native(h);};
 for(const [key,expr]of Object.entries(routes)){const before=edits,h=rt.run(expr);assert(edits>before,key+' bypasses voice editor');assert(h.length>200);assert(!/undefined|NaN|\[object Object\]/.test(rt.text(h)),key+' bad render');}
 for(const fn of ['renderSajuPaid','renderNewyearFortune','renderNamePaid','renderGunghapPaid','renderZiweiPaid','renderVedicFree','renderMahaboteFree','renderTodayTarot','renderTarotResult','renderTodayAstrologyResult','renderNatalChartResult','renderAstrologyResult'])assert.equal(rt.run(fn+'.readingVoiceVersion'),V.VERSION,fn+' voice not installed');
 for(const topic of ['life','newyear','love','marriage','reunion','gunghap','money','career','study','child','children','health'])for(const n of [3,5,10]){
  const h=rt.run(`(()=>{const topic=${JSON.stringify(topic)},positions=getSpreadPositions('tarot${n}',topic,topic),input=buildAIReadingInput({question:'지금 무엇을 확인할까요?',topic,questionCategory:topic,spreadName:'${n}장',positions,selectedCards:positions.map((p,i)=>({positionIndex:p.index,cardId:TAROT_CARDS[i*2].id,orientation:i%2?'reversed':'upright'}))});return markdownToTarotHTML(generateTemplateReading(input));})()`);
  assert(h.length>200);assert(!/undefined|NaN/.test(rt.text(h)));
 }
 for(const card of rt.run('TAROT_CARDS')){rt.w.card=card;assert(rt.run('todayTarotResultHTML(window.card)').includes(card.nameKo));}
 rt.run("_astroFlow={};window.voiceChart=calculateAstrologyChart({year:1990,month:5,day:15,hour:9,minute:30,latitude:37.57,longitude:126.98,timezone:'Asia/Seoul',utcDateTime:'1990-05-15T00:30:00.000Z',birthTimeUnknown:false})");
 for(const topic of ['life','newyear','love','marriage','reunion','gunghap','money','career','study','child','children','health'])assert(rt.run(`astroPreviewTemplate(window.voiceChart,${JSON.stringify(topic)})`).length>300);
 const source=fs.readFileSync('worker/saju-chat-worker.js','utf8').replace(/^import .*?;\n/m,'').replace('export default','const worker =');const ctx={console,TextEncoder,TextDecoder,URL,Date,JSON,Map,Set};vm.createContext(ctx);vm.runInContext(source,ctx);
 const prompts=[vm.runInContext("buildTarotReadingSystemPrompt('ko')",ctx),vm.runInContext("buildAstrologyReadingSystemPrompt('ko')",ctx)];
 for(const cat of ['life','life-core','newyear','newyear-core','gunghap','reading-deep','report-tpl','topic-answer','name','ziwei']){ctx.cat=cat;prompts.push(vm.runInContext("buildReadingSystemPrompt(cat,{synthesis:true,reportName:'검증',topic:'검증'})",ctx));}
 for(const p of prompts){assert(p.includes('장 전체를 새로 집필'));assert(p.includes('웹 분량을 늘리지'));assert(p.includes('근거 없는 이별'));assert(p.includes('짧고 분명하게'));}
 assert(fs.readFileSync('assets/report-pdf.js','utf8').includes("RP_VERSION='v10-consultation'"));
 console.log('Voice coverage: 19 saju/free routes, 78 daily cards, 36 paid tarot combinations, 12 astrology topics, all Korean AI prompt families and PDF editor; uncertainty/HTML attributes preserved. No real AI/payment requests.');
}finally{rt.close();}
