'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const E=require('../assets/interpretation-engine');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const chapter=(id='core',topic='core')=>({id,title:id,topic});
try{
 run('window.FortuneStoryConfig={enabled:true}');
 // Story selection needs actual support; question alone never creates an aspect/period.
 const base={id:'saju:natal.month.branch',divination_type:'saju',source_reference:'natal.month.branch',source_value:{glyph:'유'},interpretation_method:'fixture',topic:['core'],meaning:'기준을 세워 하나씩 정리하는 방식으로 읽어요.',advice:'끝낼 일의 범위를 정하세요.'};
 const p=E.createPlan({system:'saju',signals:[base],chapters:[chapter()],snapshot:{original:1}});
 assert.equal(p.primary_storytelling_type,'STORY_01');assert(!p.secondary_storytelling_types.includes('STORY_04'));assert(E.validatePlan(p).ok);
 const altered=E.createPlan({system:'saju',signals:[{...base,source_value:{glyph:'묘'},meaning:'새로운 방식으로 시작할 자리를 살펴요.'}],chapters:[chapter()]});assert.notEqual(p.id,altered.id);
 const no=E.createPlan({system:'saju',signals:[{...base,source_value:undefined}],chapters:[chapter()]});assert(!E.validatePlan(no).ok);
 assert.equal(Object.keys(E.LIBRARY).length,10);
 assert(E.validateChapters(p,[{id:'core',paragraphs:['계산에 없는 2035년에 변화가 와요.'],supporting_signal_ids:[base.id]}]).issues.some(x=>x.startsWith('unsupported_period')));
 assert(!E.validateChapters(p,[{id:'core',paragraphs:['확인한 근거로 읽어요.'],supporting_signal_ids:[base.id],claims:[{signal_id:base.id,source_value:{glyph:'묘'}}]}]).ok);
 // A concrete conditional scene is allowed; it is not a newly calculated fact.
 assert(E.validateChapters(p,[{id:'core',paragraphs:['이 대목이 익숙하다면, 남에게 맡긴 뒤에도 다시 확인하느라 피곤했을 수도 있어요. 맡은 범위가 분명한 환경에서는 이 꼼꼼함을 실수 예방에 쓸 수 있어요.'],supporting_signal_ids:[base.id],claims:[{signal_id:base.id,source_value:base.source_value}]}]).ok);
 assert(!E.validateChapters(p,[{id:'core',paragraphs:['내년에는 반드시 성공해요.'],supporting_signal_ids:[base.id]}]).ok);
 const shared=E.createPlan({system:'saju',signals:[base],chapters:[chapter('one'),chapter('two')]});
 assert.equal(shared.chapter_dependencies.length,1);assert(shared.secondary_storytelling_types.includes('STORY_06'));
 assert(!E.validateChapters(shared,['one','two'].map(id=>({id,paragraphs:['동일한 문장을 여러 장에 그대로 붙여 넣으면 독자의 질문을 각각 풀어 주지 못하게 됩니다.'],supporting_signal_ids:[base.id]}))).ok);
 // Real application adapters, stable plans, no mutation of engine output.
 const plans=[],screens={};
 for(let i=0;i<12;i++){
  rt.set(rt.fixture(28+i,i,['single','dating','married'][i%3]));const before=run('JSON.stringify(_saju)');
  const html=run('renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)'),box=d.createElement('div');box.innerHTML=html;
  const plan=run(`storyFromElement((()=>{const b=document.createElement('div');b.innerHTML=${JSON.stringify(html)};return b;})())`);
  assert(plan&&E.validatePlan(plan).ok);assert.equal(before,run('JSON.stringify(_saju)'));plans.push(plan.id);
  const again=run('storyBuild("saju","life",{saju:_saju,meta:_meta},'+JSON.stringify(plan.chapter_outline.map(c=>({id:c.id,title:c.title,topic:c.topic})))+')');assert.equal(plan.id,again.id);
  assert(box.querySelector('.story-evidence'));assert(!box.querySelector('.story-map'));assert(!box.querySelector('.story-keywords'));
  assert(!box.querySelector('.story-connection'));
  if(i===0)screens.saju=html;
 }
 assert(new Set(plans).size>=10);
 rt.set(rt.fixture(40,3,'married',true));const unknown=run('storySajuInput(_saju,_meta,[])');assert(!unknown.signals.some(s=>s.source_reference.includes('natal.hour')));
 rt.set(rt.fixture(10,3,'single'));const child=run('storySajuInput(_saju,_meta,[])');assert(!/계약|대출|승진|이직/.test(child.signals.filter(s=>s.topic.includes('core')).map(s=>s.meaning+' '+s.advice).join(' ')));
 rt.set(rt.fixture(40,3,'married'));const zi=run('storyBuild("ziwei","life",{saju:_saju,meta:_meta},[{id:"zw",title:"명궁",topic:"core"},{id:"zw-time",title:"대한",topic:"timing"}])');assert(zi);assert.equal(zi.primary_storytelling_type,'STORY_09');assert(zi.limitations.some(x=>x.includes('유년')));assert(zi.calculation_settings.school.includes('간이'));screens.ziwei=run('renderZiweiPaid(_saju,_meta)');
 const cardInput=run(`buildAIReadingInput({question:'어떤 조건을 살펴볼까요?',topic:'career',questionCategory:'career',spreadName:'3장',positions:getSpreadPositions('tarot3','career','career'),selectedCards:[{positionIndex:0,cardId:'swords-08',orientation:'reversed'},{positionIndex:1,cardId:'wands-08',orientation:'upright'},{positionIndex:2,cardId:'pentacles-08',orientation:'upright'}]})`);w.input=cardInput;
 const md=run('generateTemplateReading(window.input)'),tp=run('storyMdPlan(generateTemplateReading(window.input),"tarot",window.input,"career")');assert.equal(tp.primary_storytelling_type,'STORY_07');assert(md.includes('시야가 열리'));assert(md.includes('소식과 일이 빠르게'));assert(md.includes('반복을 통해 실력'));assert(tp.relations.every(r=>r.signal_ids.every(id=>tp.selected_signals.some(s=>s.id===id))));
 const fakeChart=()=>({birthInfo:{birthTimeUnknown:false,year:1990},planets:[{planet:'sun',sign:'aries',degree:10,house:1},{planet:'moon',sign:'cancer',degree:5,house:4},{planet:'mercury',sign:'pisces',degree:20,house:12},{planet:'venus',sign:'taurus',degree:3,house:2},{planet:'mars',sign:'leo',degree:15,house:5}],aspects:[{planetA:'sun',planetB:'moon',aspectType:'square',orb:1.2,meaningType:'tense'}],ascendant:{sign:'aries'}});
 w.chart=fakeChart();const ap=run('storyBuild("astrology","life",{chart:window.chart},[{id:"a",title:"내면",topic:"core"}])');assert.equal(ap.primary_storytelling_type,'STORY_08');assert(ap.relations.some(r=>r.kind==='tension'));
 w.chart={...fakeChart(),aspects:[],birthInfo:{birthTimeUnknown:true,year:1990}};const ua=run('storyBuild("astrology","life",{chart:window.chart},[{id:"a",title:"내면",topic:"core"}])');assert.notEqual(ua.primary_storytelling_type,'STORY_08');assert(!ua.selected_signals.some(s=>'house'in s.source_value||s.source_reference==='ascendant'));
 w.missingChart={planets:[{planet:'sun',sign:'not-calculated'}],aspects:[]};const missing=run('storyAstroInput(window.missingChart,null,[],"")');assert.equal(missing.signals.length,0,'missing sign must not become Aries');
 // User events remain user statements and never become a shared calculated signal.
 const ss=run('storySajuInput(_saju,{..._meta,counsel:{source:"user-stated",answers:[{key:"concern",value:"2021년 특별한 개인 사건"}]}},[])');assert(!JSON.stringify(ss.signals).includes('특별한 개인 사건'));assert(JSON.stringify(ss.userStatements).includes('특별한 개인 사건'));
 // Pilot rejection is transactional; missing/mismatched proof preserves the computed chapter.
 const root=d.createElement('div');root.innerHTML=screens.saju;const el=root.querySelector('[data-deep]');w.el=el;
 const sp=run('storyFromElement(window.el)'),c=sp.chapter_outline.find(c=>c.id==='life-editorial-core');assert(c);
 const sig=sp.selected_signals.find(s=>s.id===c.supporting_signal_ids[0]);const proof={planId:sp.id,signalIds:[sig.id],claims:[{signal_id:sig.id,source_value:sig.source_value}]};
 w.section={id:c.id,paragraphs:['새 질문에 맞는 계산 근거를 사용해 성향을 설명해요.'],story:proof};assert(run('storyAcceptDeep(window.el,window.section)'));
 w.section.story.claims[0].source_value={glyph:'없는 글자'};assert(!run('storyAcceptDeep(window.el,window.section)'));
 w.section.story=null;assert(!run('storyAcceptDeep(window.el,window.section)'));
 // Turning the pilot off restores the existing route and does not change prices/calculation.
 const price=run("JSON.stringify(['life','newyear','tarot-total3','tarot-topic10','astro-life'].map(basePriceFor))");run('window.FortuneStoryConfig={enabled:false}');assert(!run('renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)').includes('data-story-plan'));assert.equal(price,run("JSON.stringify(['life','newyear','tarot-total3','tarot-topic10','astro-life'].map(basePriceFor))"));run('window.FortuneStoryConfig={enabled:true}');
 // Real DOM adoption succeeds with the correct proof, and leaves evidence UI intact.
 const acceptRoot=d.createElement('div');acceptRoot.innerHTML=run('renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)');w.acceptRoot=acceptRoot.querySelector('[data-deep]');
 const acceptPlan=run('storyFromElement(window.acceptRoot)'),ac=acceptPlan.chapter_outline.find(c=>c.id==='life-editorial-core'),as=acceptPlan.selected_signals.filter(s=>ac.supporting_signal_ids.includes(s.id));
 const aps=[as[0].meaning+' '+(as[1]?.meaning||''),as[0].counterpoint+' '+(as[1]?.counterpoint||''),'지금의 역할을 고를 때는 평소 익숙한 방식과 새로 요구되는 조건을 나누어 보세요. 한 가지 성향만으로 본인을 고정하지 않아도 돼요.',as.filter(s=>s.advice).slice(0,2).map(s=>s.advice).join(' ')];
 w.acceptData={mode:'synthesis',sections:[{id:ac.id,paragraphs:aps,evidenceRefs:as.map(s=>s.source_reference),story:{planId:acceptPlan.id,signalIds:as.map(s=>s.id),claims:as.map(s=>({signal_id:s.id,source_value:s.source_value}))}}]};
 assert.equal(run('deepApply(window.acceptRoot,window.acceptData)'),1,'correct proof should be adopted');assert(w.acceptRoot.querySelector('.ai-deep'));assert(w.acceptRoot.querySelector('.story-evidence'));
 // All existing tarot topic/spread shapes use only their drawn cards in pilot mode.
 for(const topic of ['life','newyear','love','marriage','reunion','gunghap','money','career','study','child','children','health'])for(const spread of ['tarot3','tarot5','tarot10']){
  w.combo={topic,spread};const result=run(`(()=>{const {topic,spread}=window.combo,positions=getSpreadPositions(spread,topic,topic),flow={question:'지금 무엇부터 확인할까요?',topic,questionCategory:topic,spreadName:spread,positions,selectedCards:positions.map((p,i)=>({positionIndex:p.index,cardId:TAROT_CARDS[22+i*2].id,orientation:i%2?'reversed':'upright'}))};const input=buildAIReadingInput(flow),md=generateTemplateReading(input);return {input,md,plan:storyMdPlan(md,'tarot',input,topic)};})()`);
  assert(result.plan&&E.validatePlan(result.plan).ok);assert.equal(result.plan.selected_signals.length,result.input.cards.length);assert.equal((result.md.match(/^# [1-8]\./gm)||[]).length,8);
 }
 // Calculator and draw source remains byte-identical to the last deployed commit.
 const {JSDOM,VirtualConsole}=require('jsdom');
 const original=cp.execFileSync('git',['show','HEAD:index.html'],{encoding:'utf8',maxBuffer:8*1024*1024});
 const oldDom=new JSDOM(original,{url:'https://baseline.example/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()}),ow=oldDom.window,oc=oldDom.getInternalVMContext();
 ow.scrollTo=()=>{};ow.matchMedia=()=>({matches:false,addEventListener(){}});ow.fetch=async()=>({ok:true,json:async()=>({}),headers:{get:()=>null}});ow.alert=()=>{};
 vm.runInContext(fs.readFileSync(path.join(rt.root,'assets/vendor/astronomy.browser.min.js'),'utf8'),oc);
 vm.runInContext([...ow.document.querySelectorAll('script')].filter(s=>!s.src&&!/json/.test(s.type)).map(s=>s.textContent).join('\n;\n'),oc);
 vm.runInContext(cp.execFileSync('git',['show','HEAD:assets/astrology.js'],{encoding:'utf8'}),oc);
 for(const name of ['calcSaju','calcDaeun','yearPillar','monthPillar','buildZiweiChart','getSpreadPositions','selectDeckCard','seededRand','calculateAstrologyChart','calculateTransit','calculateTransitAspects'])assert.equal(run(name+'.toString()'),vm.runInContext(name+'.toString()',oc),name+' changed');
 oldDom.window.close();
 // Server plans are bounded, use only their declared evidence, and retain the legacy response schema.
 const worker=fs.readFileSync(path.join(rt.root,'worker/saju-chat-worker.js'),'utf8').replace(/^import .*?;\n/m,'').replace('export default','const worker =');
 const wc={console,TextEncoder,TextDecoder,URL,Date,JSON,Map,Set};vm.createContext(wc);vm.runInContext(worker,wc);
 wc.plan=E.prompt(tp);const prompt=vm.runInContext('storyPlanText(plan,true)',wc);assert(prompt.includes('source_value'));assert(prompt.includes(tp.id));assert(prompt.includes('生活')===false);const policy=vm.runInContext('storyWritingPolicy()',wc);assert(policy.includes('생활 예시'));assert(policy.includes('장 전체를 새로 집필'));assert(policy.includes('이랬을 수 있다'));
 wc.bad={version:'story-v1',id:'story-v1-abc',system:'saju',signals:[],chapters:[{id:'x',signalIds:{bad:1}}],dependencies:[{from:'x',to:'y',signal_ids:{bad:1}}]};assert.doesNotThrow(()=>vm.runInContext('storyPlanText(bad,true)',wc));
 console.log('Story engine: 10 techniques; deterministic real adapters; evidence-only selection and links; unknown-time/child safety; false proof/date/duplicate rejection; legacy flag.');
}finally{rt.close();}
