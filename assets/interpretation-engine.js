/* FortuneStory v1: pure interpretation planning. No ephemeris, random draw, network or payment code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FortuneStory=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='story-v1';
const LIBRARY={
 STORY_01:{name:'자기인식',requires:'signal',steps:['conclusion','scene','counterpoint','advice']},
 STORY_02:{name:'모순 발견',requires:'tension',steps:['scene','counterpoint','conclusion','advice']},
 STORY_03:{name:'원인 추적',requires:'relation',steps:['scene','conclusion','counterpoint','advice']},
 STORY_04:{name:'전환점',requires:'period',steps:['scene','period','counterpoint','advice']},
 STORY_05:{name:'선택의 갈림길',requires:'question',steps:['scene','counterpoint','conclusion','advice']},
 STORY_06:{name:'복선 회수',requires:'dependency',steps:['conclusion','counterpoint','period','advice']},
 STORY_07:{name:'단서 연결',requires:'tarotRelation',steps:['scene','counterpoint','conclusion','advice']},
 STORY_08:{name:'내면의 대화',requires:'astroTension',steps:['scene','counterpoint','conclusion','advice']},
 STORY_09:{name:'인생 영역 연결',requires:'ziweiRelation',steps:['scene','conclusion','period','advice']},
 STORY_10:{name:'회복과 성장',requires:'signal',steps:['counterpoint','conclusion','advice','period']}
};
const clone=x=>JSON.parse(JSON.stringify(x));
const stable=x=>x==null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(stable).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
function hash(x){let h=2166136261;for(const c of stable(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
const txt=x=>String(x==null?'':x).trim();
const uniq=x=>[...new Set(x)];
function eligible(type,ctx){
 const {signals,relations,system,question}=ctx;
 switch(LIBRARY[type].requires){
 case 'signal':return signals.length>0;
 case 'tension':return relations.some(r=>r.kind==='tension');
 case 'relation':return relations.length>0;
 case 'period':return signals.some(s=>s.applicable_period&&s.applicable_period.computed===true);
 case 'question':return !!question;
 case 'dependency':return ctx.dependencies.length>0;
 case 'tarotRelation':return system==='tarot'&&relations.length>0;
 case 'astroTension':return system==='astrology'&&relations.some(r=>r.kind==='tension');
 case 'ziweiRelation':return system==='ziwei'&&relations.length>0;
 default:return false;
 }
}
function createPlan(input){
 const system=input.system,product=input.product||'life',question=txt(input.question);
 if(!['saju','tarot','astrology','ziwei'].includes(system))throw Error('Unsupported interpretation system');
 const seen=new Set();
 const signals=(input.signals||[]).map(s=>clone(s)).filter(s=>{
  if(!s.id||seen.has(s.id)||s.divination_type!==system||!s.source_reference||s.source_value==null||!s.interpretation_method||!s.meaning)return false;
  seen.add(s.id);return true;
 }).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.id.localeCompare(b.id));
 const ids=new Set(signals.map(s=>s.id));
 const relations=(input.relations||[]).filter(r=>r.signal_ids&&r.signal_ids.length>=2&&r.signal_ids.every(id=>ids.has(id))).map(clone);
 for(const r of relations)for(const id of r.signal_ids){const s=signals.find(s=>s.id===id);const key=r.kind==='tension'?'conflicting_factors':'supporting_factors';s[key]=uniq((s[key]||[]).concat(r.signal_ids.filter(x=>x!==id)));}
 const chapters=(input.chapters||[]).map((c,i)=>{
  const topic=c.topic||'core';
  let pool=signals.filter(s=>s.topic.includes(topic)||s.topic.includes('all'));
  if(!pool.length)pool=signals;
  const diverse=uniq(pool.map(s=>s.source_value?.axis||s.id)).map(k=>pool.find(s=>(s.source_value?.axis||s.id)===k));
  pool=diverse.concat(pool.filter(s=>!diverse.includes(s)));
  let selected=c.signalIds?c.signalIds.map(id=>signals.find(s=>s.id===id)).filter(Boolean):pool.slice(0,4);
  const relation=relations.find(r=>r.signal_ids.some(id=>selected.some(s=>s.id===id)));
  if(relation&&!c.signalIds)for(const id of relation.signal_ids){if(!selected.some(s=>s.id===id)){const s=signals.find(s=>s.id===id);if(s&&selected.length<7)selected.push(s);}}
  return {id:txt(c.id)||'chapter-'+i,title:txt(c.title),core_question:txt(c.question)||`${txt(c.title)}에서 본인이 먼저 살필 것은 무엇일까요?`,topic,
   supporting_signal_ids:selected.map(s=>s.id),conclusion:selected[0]?.meaning||'',counterpoints:uniq(selected.map(s=>s.counterpoint).filter(Boolean)),
   period_analysis:selected.filter(s=>s.applicable_period?.computed).map(s=>({signal_id:s.id,period:s.applicable_period})),
   practical_advice:uniq(selected.map(s=>s.advice).filter(Boolean)).slice(0,2),next_chapter_connection:null};
 });
 const dependencies=[];
 chapters.forEach((c,i)=>{
  // Link the closest preceding chapter only when they actually share a signal.
  const prev=chapters.slice(0,i).reverse().find(p=>p.supporting_signal_ids.some(id=>c.supporting_signal_ids.includes(id)));
  if(prev){const shared=prev.supporting_signal_ids.filter(id=>c.supporting_signal_ids.includes(id));const dep={from:prev.id,to:c.id,signal_ids:shared};dependencies.push(dep);prev.next_chapter_connection=dep;}
 });
 const ctx={signals,relations,system,question,dependencies};
 const topic=product.replace(/^topic-/,'');
 const defaults={saju:['STORY_02','STORY_01'],tarot:['STORY_07','STORY_05','STORY_01'],astrology:['STORY_08','STORY_02','STORY_01'],ziwei:['STORY_09','STORY_01']};
 let preferred=defaults[system];
 if(['health','child','children'].includes(topic))preferred=['STORY_10'].concat(preferred);
 else if(topic==='newyear')preferred=['STORY_04'].concat(preferred);
 else if(['love','marriage','reunion','gunghap'].includes(topic)&&system==='saju')preferred=['STORY_03'].concat(preferred);
 else if(/왜|반복|이유/.test(question))preferred=['STORY_03'].concat(preferred);
 else if(/선택|이직|남을|옮길|창업/.test(question)&&['money','career'].includes(topic))preferred=['STORY_05'].concat(preferred);

 const primary=preferred.find(t=>eligible(t,ctx))||'STORY_01';
 const secondary=uniq((question?['STORY_05']:[]).concat(['STORY_06','STORY_04','STORY_10'])).filter(t=>t!==primary&&eligible(t,ctx)).slice(0,2);
 const limits=uniq((input.limitations||[]).concat(signals.flatMap(s=>s.limitations||[])));
 const unresolved=[];
 if(!signals.length)unresolved.push('활용할 계산 근거가 없어 기존 풀이를 유지합니다.');
 if(!eligible('STORY_04',ctx))unresolved.push('계산된 시기 신호가 없어 전환 시점은 만들지 않습니다.');
 const plan={version:VERSION,system,product_type:product,user_question:question,calculation_fingerprint:hash(input.snapshot||signals.map(s=>[s.source_reference,s.source_value])),
  main_theme:signals[0]?.meaning||'확인 가능한 근거 안에서 읽어요.',primary_storytelling_type:primary,secondary_storytelling_types:secondary,
  selection_reason:{type:primary,requirement:LIBRARY[primary].requires,signal_ids:signals.map(s=>s.id),relation_ids:relations.map(r=>r.id),candidates:uniq(preferred).map(type=>({type,eligible:eligible(type,ctx)}))},
  selected_signals:signals,relations,chapter_outline:chapters,chapter_dependencies:dependencies,unresolved_questions:unresolved,limitations:limits,
  resolution:input.resolution&&input.resolution.signal_ids?.length&&input.resolution.signal_ids.every(id=>ids.has(id))?clone(input.resolution):null,
  user_statements:clone(input.userStatements||{}),calculation_settings:clone(input.settings||{})};
 plan.id=VERSION+'-'+hash({writing_revision:'living-scenes-v2',system,product,question,signals,relations,chapters,settings:plan.calculation_settings,userStatements:plan.user_statements,resolution:plan.resolution,primary,secondary});
 return plan;
}
function compose(plan,chapter){
 const by=Object.fromEntries(plan.selected_signals.map(s=>[s.id,s]));const ss=chapter.supporting_signal_ids.map(id=>by[id]).filter(Boolean);
 if(!ss.length)return [];
 const rel=plan.relations.find(r=>r.signal_ids.every(id=>chapter.supporting_signal_ids.includes(id)));
 const parts={conclusion:chapter.conclusion,scene:ss[0].scene||ss[0].meaning,counterpoint:rel?.meaning||chapter.counterpoints[0]||'',period:chapter.period_analysis.map(p=>by[p.signal_id]?.meaning).filter(Boolean).join(' '),advice:chapter.practical_advice.join(' ')};
 return uniq(LIBRARY[plan.primary_storytelling_type].steps.map(k=>parts[k]).filter(Boolean));
}
function validatePlan(plan){
 const issues=[],ids=new Set(plan.selected_signals.map(s=>s.id)),cs=new Set(plan.chapter_outline.map(c=>c.id));
 if(!ids.size)issues.push('missing_signals');
 for(const c of plan.chapter_outline){if(!c.supporting_signal_ids.length||c.supporting_signal_ids.some(id=>!ids.has(id)))issues.push('ungrounded_chapter:'+c.id);}
 for(const d of plan.chapter_dependencies)if(!cs.has(d.from)||!cs.has(d.to)||!d.signal_ids.every(id=>ids.has(id)))issues.push('invalid_dependency');
 if(!eligible(plan.primary_storytelling_type,{signals:plan.selected_signals,relations:plan.relations,system:plan.system,question:plan.user_question,dependencies:plan.chapter_dependencies}))issues.push('ineligible_story');
 return {ok:!issues.length,issues};
}
const normalize=s=>txt(s).replace(/[\s\u200b\u00a0]/g,'');
function validateChapters(plan,output){
 const issues=[],known=new Map(plan.chapter_outline.map(c=>[c.id,c])),seen=new Set(),allSentences=new Map();
 for(const ch of output||[]){
  const target=known.get(ch.id);if(!target){issues.push('unknown_chapter:'+ch.id);continue;}if(seen.has(ch.id))issues.push('duplicate_chapter:'+ch.id);seen.add(ch.id);
  const refs=ch.supporting_signal_ids||ch.signalIds||[];
  if(!refs.length||refs.some(id=>!target.supporting_signal_ids.includes(id)))issues.push('unassigned_signal:'+ch.id);
  const body=(ch.paragraphs||[]).join(' ');if(!body.trim())issues.push('empty_chapter:'+ch.id);
  if(/(?:반드시|무조건).{0,12}(?:성공|결혼|합격|재회)|100\s?%|(?:큰\s?병|사망|사고)가?\s?(?:와요|납니다)|과거에 반드시/.test(body))issues.push('unsafe_assertion:'+ch.id);
  const assigned=plan.selected_signals.filter(s=>refs.includes(s.id));
  const allowedYears=new Set(assigned.flatMap(s=>[s.applicable_period?.year,s.applicable_period?.from_year,s.applicable_period?.to_year]).filter(Boolean).map(String));
  const sourceText=assigned.map(s=>stable(s.source_value)).join(' ');
  for(const y of body.match(/(?:19|20)\d{2}년/g)||[])if(!allowedYears.has(y.slice(0,4))&&!sourceText.includes(y.slice(0,4)))issues.push('unsupported_period:'+ch.id);
  for(const sentence of body.split(/(?<=[.!?])\s+/)){const key=normalize(sentence);if(key.length<28)continue;if(allSentences.has(key)&&allSentences.get(key)!==ch.id)issues.push('repeated_sentence:'+ch.id);else allSentences.set(key,ch.id);}
  // Structured claims are checked against the exact referenced source, not just an existing ID.
  for(const claim of ch.claims||[]){const sig=assigned.find(s=>s.id===claim.signal_id);if(!sig||stable(claim.source_value)!==stable(sig.source_value))issues.push('source_mismatch:'+ch.id);}
 }
 return {ok:!issues.length,issues:uniq(issues)};
}
function prompt(plan){
 return {version:VERSION,id:plan.id,system:plan.system,main_theme:plan.main_theme,question:plan.user_question,resolution:plan.resolution,
  story:plan.primary_storytelling_type,secondary:plan.secondary_storytelling_types,settings:plan.calculation_settings,limitations:plan.limitations,
  signals:plan.selected_signals.filter(s=>plan.chapter_outline.some(c=>c.supporting_signal_ids.includes(s.id))).map(s=>({id:s.id,reference:s.source_reference,value:s.source_value,method:s.interpretation_method,meaning:s.meaning,period:s.applicable_period||null,limitations:s.limitations||[]})),
  chapters:plan.chapter_outline.map(c=>({id:c.id,question:c.core_question,topic:c.topic,signalIds:c.supporting_signal_ids,advice:c.practical_advice})),dependencies:plan.chapter_dependencies,
  rule:'전체 핵심 질문을 장마다 다른 측면에서 풀고, 실제 공유 근거가 있는 장만 연결하세요. 결말은 도입을 그대로 반복하지 말고 선택 기준으로 회수하세요. 계산 사실과 상징적 해석, 사용자 진술과 조언을 구분하세요. 근거가 없는 갈등·시기는 생략하세요.'};
}
return {VERSION,LIBRARY,createPlan,compose,validatePlan,validateChapters,prompt,hash};
});
