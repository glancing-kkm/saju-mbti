/* Existing calculation results -> FortuneStory. No calendar/draw/ephemeris algorithms are replaced. */
'use strict';
function storyEnabled(system,product){
 const cfg=window.FortuneStoryConfig||{};
 return !!window.FortuneStory&&cfg.enabled===true&&cfg.mode!=='legacy'&&(system==='saju'?['life','manse','daily'].includes(product):system==='ziwei'?product==='life':system==='astrology'?['life','newyear','love','marriage','reunion','gunghap','money','career','study','child','children','health'].includes(product):system==='tarot');
}
function storySignal(system,id,reference,value,meaning,options){
 return Object.assign({id:system+':'+id,divination_type:system,source_type:'calculated',source_reference:reference,source_value:JSON.parse(JSON.stringify(value)),
 interpretation_method:system+':existing-engine-symbolic-v1',topic:['core'],meaning,supporting_factors:[],conflicting_factors:[],applicable_period:null,
 uncertainty:'symbolic',limitations:[],priority:1},options||{});
}
function storySajuInput(saju,meta,chapters){
 const e=buildReadingEvidence(saju,meta,{}),signals=[],relations=[],young=['preschool','school'].includes(e.stage);
 const ageNarrative=young?buildReadingNarrative(saju,meta,'core').paragraphs:null;
 const domains={self:['core'],out:['core','talent'],wealth:['core','money'],gwan:['core','career'],in_:['core','talent']};
 for(const n of e.nodes){const axis=n.axis;if(!READING_SCENES.core[axis])continue;
  const x=storySignal('saju',n.id,n.id,{glyph:n.glyph,tg:n.tg,axis,place:n.place},young?ageNarrative[0]:READING_SCENES.core[axis],{
   topic:domains[axis].concat(n.id==='natal.day.branch'?['love']:[]),counterpoint:young?READING_REVERSAL_YOUNG[axis]:READING_REVERSAL.core[axis],advice:young?readingAction(e,'core','core').text:READING_ACTION.core[axis],
   scene:young?ageNarrative[0]:READING_SCENES.core[axis],label:`${n.place} ${n.glyph} · ${plainTG(n.tg)}`,keyword:READING_AXIS[axis],priority:axis===e.primary?4:2});signals.push(x);
 }
 if(e.flow?.id)signals.push(storySignal('saju',e.flow.id,e.flow.id,{stem:STEMKO[e.flow.stem],branch:BRCHKO[e.flow.branch],front:e.flow.front,back:e.flow.back},readingShiftLine(e,'core'),{
  topic:['timing'],label:e.flow.label,applicable_period:{computed:true,year:e.year,kind:'year'},priority:3}));
 if(e.decade)signals.push(storySignal('saju',e.decade.id,e.decade.id,e.decade,`${e.decade.from}~${e.decade.to}세 대운에서는 ${READING_AXIS[e.decade.axis]}을 함께 살펴요.`,{
  topic:['timing'],label:`${e.decade.from}~${e.decade.to}세 대운`,applicable_period:{computed:true,from_age:e.decade.from,to_age:e.decade.to,kind:'decade'},priority:2}));
 const places=[['year',saju.yp],['month',saju.mp],['day',saju.dp],['hour',saju.hp]].filter(x=>x[1]);
 for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++){
  const a=places[i],b=places[j],rel=brRel(a[1].branch,b[1].branch);
  if(!/충|형|원진|파|해/.test(rel.kind))continue;
  const ids=[`saju:natal.${a[0]}.branch`,`saju:natal.${b[0]}.branch`];if(!ids.every(id=>signals.some(s=>s.id===id)))continue;
  const sa=signals.find(s=>s.id===ids[0]),sb=signals.find(s=>s.id===ids[1]);
  relations.push({id:`saju-relation-${a[0]}-${b[0]}`,kind:'tension',signal_ids:ids,source_value:{branches:[a[1].branch,b[1].branch],kind:rel.kind},
   interpretation_method:'existing brRel',meaning:`${sa.label}와 ${sb.label} 사이에 ${rel.kind} 관계가 계산됐어요. 두 자리의 요구가 엇갈리는 조건을 함께 살피되, 특정 사건이 있었다고 단정하지 않아요.`});
 }
 const axes=uniqStory(e.nodes.map(n=>n.axis)).filter(a=>READING_AXIS[a]),keyNodes=axes.slice(0,2).map(a=>e.nodes.find(n=>n.axis===a));
 const resolution={signal_ids:keyNodes.map(n=>'saju:'+n.id),text:young?ageNarrative[3]:`이 풀이에서 일과 돈, 관계를 이어 주는 기준은 ${axes.slice(0,2).map(a=>READING_AXIS[a]).join('과 ')}을 상황에 맞게 나누어 쓰는 거예요. 강점을 더 쓰기 전에 본인이 정할 몫과 함께 맞출 몫을 구분해 보세요.`,action:young?readingAction(e,'core','core').text:READING_ACTION.core[e.primary]};
 return {resolution,system:'saju',product:'life',question:storyQuestion(meta,'life'),signals,relations,chapters,snapshot:{nodes:e.nodes,flow:e.flow,decade:e.decade,hourKnown:e.hourKnown},
  settings:{calculation:'기존 만세력·대운·세운 결과 재사용',interpretation:'기존 십신 축·지지 관계의 상징적 해석',birth_time_known:e.hourKnown},
  limitations:['격국·조후·용신의 정밀 학파 판정을 새로 수행하지 않아요.','같은 사주라도 실제 과거 사건과 삶의 환경은 달라요.'].concat(e.hourKnown?[]:['출생시간 미상: 시주는 제외하고 대운 시작 시점도 기존 엔진의 미상 처리 범위로 읽어요.']),
  userStatements:storyStatements(meta)};
}
function storyQuestion(meta,cat){return String(meta?.ctx?.text||meta?.counsel?.answers?.filter(a=>['focus','concern','goal'].includes(a.key)).map(a=>a.value).join(' / ')||'').slice(0,500);}
function storyStatements(meta){return {source:'user-stated',answers:(meta?.counsel?.source==='user-stated'?meta.counsel.answers||[]:[]).map(a=>({key:a.key,value:String(a.value||'').slice(0,300)})),marital:String(meta?.marital||'').slice(0,30)};}
function storyTarotInput(input,chapters){
 const P=tarotReadingPlan(input),signals=P.cards.map((c,i)=>storySignal('tarot',`${i}.${c.card.id}`,`cards.${i}`,{
  cardId:c.card.id,name:c.cardNameKo,orientation:c.orientation,position:c.positionLabel,role:c.role,keywords:c.keywords},c.meaning,{
   topic:['core',input.topic||input.questionCategory||'general'],label:`${c.positionLabel} · ${c.cardNameKo}${c.reversed?' 역방향':' 정방향'}`,
   scene:tarotTopicMeaning(c.card,input.topic||input.questionCategory),advice:c.advice,counterpoint:c.warning,priority:4})),relations=[];
 for(let i=0;i<P.cards.length-1;i++){
  const a=P.cards[i],b=P.cards[i+1],same=a.suit===b.suit;
  relations.push({id:'tarot-link-'+i,kind:same?'shared_context':'contrast',signal_ids:[signals[i].id,signals[i+1].id],source_value:{cards:[a.card.id,b.card.id],positions:[a.positionLabel,b.positionLabel]},
   meaning:`${a.positionLabel}의 ${a.cardNameKo}와 ${b.positionLabel}의 ${b.cardNameKo}를 함께 읽으면, ${same?`${TAROT_SUIT_THEME[a.suit]||'삶의 방향'}이라는 같은 무대 안에서 두 조건을 구분해야 해요.`:'처음 살필 조건과 다음 자리에서 살필 조건이 달라요.'} ${a.meaning} 이어지는 자리에서는 ${b.meaning}`});
 }
 const resolution={signal_ids:signals.length?[signals[0].id,signals.at(-1).id]:[],text:signals.length?`${P.cards[0].cardNameKo}에서 살핀 출발 조건을 ${P.cards.at(-1).cardNameKo}의 조언과 함께 판단해 보세요. 결과를 기다리기보다 본인이 바꿀 수 있는 조건을 하나 확인하는 것이 이 질문의 다음 걸음이에요.`:'',action:P.advice?.advice||''};
 return {resolution,system:'tarot',product:input.topic||input.questionCategory||'general',question:input.question,signals,relations,
  chapters:chapters.map((c,i)=>({...c,signalIds:i===2||i===3?signals.map(s=>s.id):i===4?[signals[P.cards.indexOf(P.outcome)]?.id].filter(Boolean):i===5?[signals[P.cards.indexOf(P.advice)]?.id].filter(Boolean):undefined})),
  snapshot:signals.map(s=>s.source_value),settings:{spread:input.spreadName,positions_fixed_before_draw:true,reading:'카드별 고유 정·역방향과 위치 역할',celtic_cross:'기존 서비스 배열을 유지'},
  limitations:['카드는 실제 속마음·과거 사건·미래 날짜를 확인하는 수단이 아니에요.'],userStatements:{question:input.question}};
}
function storyAstroInput(chart,transit,chapters,question,context={}){
 const unknown=chart.birthInfo?.birthTimeUnknown!==false,signals=[],relations=[];
 for(const p of chart.planets||[]){const theme=ASTRO_NATAL_THEME[p.planet];if(!theme)continue;
  const v={planet:p.planet,sign:p.sign,degree:p.degree};if(!unknown&&p.house)v.house=p.house;
  const sign=ZODIAC_SIGNS.find(s=>s.id===p.sign);if(!sign)continue;
  const topics=['sun','moon'].includes(p.planet)?['core']:p.planet==='venus'?['love','money']:p.planet==='mars'?['love','career']:['mercury','saturn','jupiter'].includes(p.planet)?['career','talent']:['core'];
  signals.push(storySignal('astrology','planet.'+p.planet,'planets.'+p.planet,v,`${planetNameKo(p.planet)}은 ${sign.nameKo}에 있어 ${theme}을 ${sign.keywords.slice(0,2).join('·')}의 방식으로 드러내요.`,{
   label:`${planetNameKo(p.planet)} · ${sign.nameKo}${v.house?' · '+v.house+'하우스':''}`,keyword:theme,topic:topics,scene:astroStyle(sign,p.planet,'life'),counterpoint:sign.caution,
   advice:(ASTRO_NEED_CHOICE[p.planet]||[])[0]?`${ASTRO_NEED_CHOICE[p.planet][0]}을 지금 생활에서 확인해 보세요.`:'',priority:p.planet==='sun'?5:p.planet==='moon'?4:2}));
 }
 if(!unknown&&chart.ascendant&&ZODIAC_SIGNS.some(s=>s.id===chart.ascendant.sign))signals.push(storySignal('astrology','ascendant','ascendant',chart.ascendant,`상승궁은 ${signNameKo(chart.ascendant.sign)}예요. 겉으로 드러나는 접근 방식을 살필 때 참고해요.`,{label:'상승궁 '+signNameKo(chart.ascendant.sign),priority:2}));
 for(const a of chart.aspects||[]){const aa=signals.find(s=>s.id==='astrology:planet.'+a.planetA),bb=signals.find(s=>s.id==='astrology:planet.'+a.planetB);if(!aa||!bb||!ASTRO_ASPECT_KO[a.aspectType]||!Number.isFinite(Number(a.orb)))continue;
  const id=`aspect.${a.planetA}.${a.planetB}.${a.aspectType}`,meaning=`${planetNameKo(a.planetA)}과 ${planetNameKo(a.planetB)}은 ${ASTRO_ASPECT_KO[a.aspectType]} 각도(${Number(a.orb).toFixed(1)}° 차이)예요. ${a.meaningType==='tense'?'두 욕구를 동시에 채울 때 조정이 필요한 관계로 읽어요.':'두 욕구가 만나는 방식을 함께 살펴요.'}`;
  const ss=storySignal('astrology',id,id,a,meaning,{label:meaning,keyword:planetNameKo(a.planetA)+'·'+planetNameKo(a.planetB)+'의 관계',topic:uniqStory(aa.topic.concat(bb.topic)),priority:3});signals.push(ss);
  relations.push({id:'astro-'+id,kind:a.meaningType==='tense'?'tension':'aspect',signal_ids:[aa.id,bb.id,ss.id],source_value:a,meaning});
 }
 if(transit&&Array.isArray(transit.planets)&&Number.isFinite(Date.parse(transit.date)))for(const a of calculateTransitAspects(chart,transit).filter(x=>x.transit!=='moon').slice(0,4)){
  const id=`transit.${a.transit}.${a.natal}.${a.aspectType}`,date=String(transit.date||'');
  signals.push(storySignal('astrology',id,id,a,`풀이 시점의 ${planetNameKo(a.transit)}과 출생 ${planetNameKo(a.natal)} 사이에 ${ASTRO_ASPECT_KO[a.aspectType]} 각도가 계산됐어요.`,{
   topic:['timing'],label:'현재 '+planetNameKo(a.transit)+'–'+planetNameKo(a.natal),priority:1,applicable_period:date?{computed:true,kind:'transit',date}:null}));
 }
 const product=context.productType||'life',needs=typeof ASTRO_TOPIC_NEEDS!=='undefined'?(ASTRO_TOPIC_NEEDS[product]||ASTRO_TOPIC_NEEDS.life):['sun','moon'];
 for(const signal of signals){const key=signal.source_value?.planet;if(needs.includes(key)){signal.priority+=3;signal.topic=uniqStory(signal.topic.concat([product]));}}
 if(product==='newyear')for(const row of context.yearTransits||[]){
  if(!Number.isInteger(row.month)||row.month<1||row.month>12||!Array.isArray(row.planets)||!row.planets.length)continue;
  const planets=row.planets.filter(p=>p&&Number.isFinite(p.longitude)).map(p=>({planet:p.planet,longitude:p.longitude,retrograde:!!p.retrograde}));if(!planets.length)continue;
  signals.push(storySignal('astrology','year.month.'+row.month,'yearTransits.'+row.month,{month:row.month,planets},`${row.month}월 기준일의 행성 위치를 앞뒤 달과 비교해 달라지는 생활 주제를 살펴봐요. 월 전체 사건을 확정한 자료는 아니에요.`,{topic:['timing'],label:row.month+'월 기준 행성 위치',priority:2,applicable_period:{computed:true,kind:'month-snapshot',year:context.targetYear,month:row.month}}));
 }
 if(product==='gunghap'&&context.partnerChart){
  for(const p of context.partnerChart.planets||[]){if(!ZODIAC_SIGNS.some(s=>s.id===p.sign))continue;const v={planet:p.planet,sign:p.sign};if(context.partnerChart.birthInfo?.birthTimeUnknown===false&&p.house)v.house=p.house;
   signals.push(storySignal('astrology','partner.planet.'+p.planet,'partnerChart.planets.'+p.planet,v,`상대방 ${planetNameKo(p.planet)}은 ${signNameKo(p.sign)}에 있어요. 본인의 배치와 구분해 두 사람의 다른 요구를 살펴봐요.`,{topic:['love','gunghap'],label:'상대방 '+planetNameKo(p.planet),priority:2}));
  }
  for(const a of context.synastryAspects||[]){if(!ASTRO_ASPECT_KO[a.aspectType]||!Number.isFinite(a.orb))continue;
   signals.push(storySignal('astrology','synastry.'+signals.length,'synastryAspects',a,'제공된 두 차트 사이의 실제 각도를 바탕으로 조율할 부분을 살펴봐요.',{topic:['love','gunghap'],label:'두 차트의 '+ASTRO_ASPECT_KO[a.aspectType],priority:3}));
  }
 }
 const anchors=needs.map(key=>signals.find(s=>s.id==='astrology:planet.'+key)).filter(Boolean).slice(0,2);
 const resolution={signal_ids:anchors.map(s=>s.id),text:anchors.length===2?`${anchors.map(s=>s.keyword).join('과 ')}을 어느 한쪽만 옳다고 정하지 않아도 돼요. 이번에 살핀 배치를 바탕으로, 중요한 선택 전에 두 요구를 각각 얼마나 채울지 정해 보세요.`:'계산된 행성의 성향을 실제 생활의 선택과 함께 살펴보세요.',action:anchors[0]?.advice||''};
 return {resolution,system:'astrology',product,question:question||'',signals,relations,chapters,
  snapshot:{planets:signals.filter(s=>s.source_reference.startsWith('planets.')).map(s=>s.source_value),aspects:chart.aspects||[],transit:signals.filter(s=>s.source_reference.startsWith('transit.')).map(s=>s.source_value),context:signals.filter(s=>/^(yearTransits|partnerChart|synastryAspects)/.test(s.source_reference)).map(s=>s.source_value)},
  settings:{calculation:'기존 출생차트·행성 각도·트랜짓 결과 재사용',birth_time_known:!unknown,solar_return:false},
  limitations:['솔라 리턴과 하우스 지배성 분석을 새로 계산하지 않아요.'].concat(unknown?['출생시간 미상: 상승궁·하우스를 사용하지 않으며 달의 세부 위치도 시간 오차가 있어요.']:[])};
}
function uniqStory(xs){return [...new Set(xs)];}
function storyZiweiInput(saju,meta,chapters){
 const ev=zwEvidenceRefs(saju,meta),ch=ev.ch,signals=[],relations=[];
 for(const r of ev.refs){
  const period=/^zw.decade./.test(r.id)?ch.decades.find(d=>r.id==='zw.decade.'+d.from):null;
  const p=/^zw.palace./.test(r.id)?ch.palaces.find(p=>r.id==='zw.palace.'+p.name):null;
  signals.push(storySignal('ziwei',r.id,r.id,p||period?{label:r.label,...(p?{palace:p.name,branch:p.branch,stars:p.stars}:{}),...(period?{from:period.from,to:period.to,palace:period.palace.name}:{})}:{label:r.label},p&&p.stars.length?p.stars.map(star=>ZW_STARS[star]?.[p.name==='재백궁'?3:p.name==='관록궁'?4:p.name==='부부궁'?2:1]||'').filter(Boolean).join(' '):period?`${period.from}~${period.to}세에는 ${ZW_DECADE_THEME[period.palace.name]}으로 읽어요.`:r.label+'를 기준으로 이 영역의 주제를 읽어요.',{
   topic:period?['timing']:p?.name==='재백궁'?['money']:p?.name==='관록궁'?['career']:p?.name==='부부궁'?['love']:['core'],label:r.label,
   priority:p?.name==='명궁'?5:r.id==='zw.shen'?4:period===ch.curDecade?4:1,
   applicable_period:period?{computed:true,kind:'decade',from_age:period.from,to_age:period.to}:null,
   limitations:['서비스 내장 간이 자미두수 규칙의 범위 안에서 읽어요.']}));
 }
 for(const p of ch.palaces){const opposite=ch.palaces.find(q=>q.branch===(p.branch+6)%12);if(!opposite||p.branch>opposite.branch)continue;
  relations.push({id:'zw-opposite-'+p.branch,kind:'opposite_palaces',signal_ids:['ziwei:zw.palace.'+p.name,'ziwei:zw.palace.'+opposite.name],source_value:{branches:[p.branch,opposite.branch],palaces:[p.name,opposite.name]},
   interpretation_method:'기존 명반 지지 위치의 대궁 대조(삼방사정 전체 분석 아님)',meaning:`명반에서 ${p.name}과 ${opposite.name}은 마주 보는 위치예요. 한 궁의 설명만으로 전체를 확정하지 않고 두 영역의 실제 배치를 함께 살펴요.`});
 }
 const ming=signals.find(s=>s.source_reference==='zw.palace.명궁'),cur=signals.find(s=>s.source_reference==='zw.decade.'+ch.curDecade?.from);
 const resolution={signal_ids:[ming?.id,cur?.id].filter(Boolean),text:`명궁의 기본 성향을 현재 대한에서 강조되는 ${ch.curDecade?.palace?.name||'생활 영역'}에 어떻게 쓸지 살펴보세요. 한 궁만으로 결론 내리기보다, 관련된 생활의 몫을 나누어 보는 것이 이 풀이의 활용 기준이에요.`,action:''};
 return {resolution,system:'ziwei',product:'life',question:storyQuestion(meta,'ziwei'),signals,relations,chapters,snapshot:{palaces:ch.palaces,shen:ch.shen,decades:ch.decades},
  settings:{school:'서비스 내장 간이 명반 규칙; 특정 학파의 완전한 구현으로 표방하지 않음',birth_time_known:!!saju.hp,relationships:'실제 지지 위치의 대궁 비교만',year_fortune_calculated:false},
  limitations:['유년·유월·삼방사정 전체 분석은 계산하지 않았어요.','보조성·살성 전 체계와 특정 학파의 완전한 명반을 구현한 것은 아니에요.']};
}
function storyBuild(system,product,input,chapters){
 if(!storyEnabled(system,product))return null;
 try{
  const data=system==='saju'?storySajuInput(input.saju,input.meta,chapters):system==='tarot'?storyTarotInput(input,chapters):system==='astrology'?storyAstroInput(input.chart,input.transit,chapters,input.question,{...input,productType:product}):storyZiweiInput(input.saju,input.meta,chapters);
  if(system==='ziwei'&&!data.settings.birth_time_known)return null;
  data.product=product;if(['manse','daily'].includes(product)){data.signals=data.signals.filter(s=>!s.applicable_period);data.relations=[];}const plan=FortuneStory.createPlan(data);return FortuneStory.validatePlan(plan).ok?plan:null;
 }catch(e){console.warn('Story plan unavailable; keeping existing reading',e.message);return null;}
}
function interpretationEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function storyTopic(id,title){const t=id+' '+title;return /children|임신|가족계획/.test(t)?'children':/child|아이|자녀|양육/.test(t)?'child':/reunion|재회|이별/.test(t)?'reunion':/marriage|결혼|부부/.test(t)?'marriage':/health|건강|수면|휴식/.test(t)?'health':/study|학업|시험|공부/.test(t)?'study':/money|재물|재백/.test(t)?'money':/career|work|직업|관록/.test(t)?'career':/love|연애|관계/.test(t)?'love':/now|future|대운|대한|세운|현재 흐름/.test(t)?'timing':/talent|재능/.test(t)?'talent':'core';}
function interpretationText(s){const t=interpretationEsc(s);return typeof lv4Text==='function'?lv4Text(t):t;}
function storyEvidenceHTML(plan,chapter){
 const ids=chapter?.supporting_signal_ids||plan.selected_signals.filter(s=>!s.applicable_period).slice(0,4).map(s=>s.id);
 const selected=plan.selected_signals.filter(s=>ids.includes(s.id));
 return `<details class="story-evidence"><summary>이 해석이 나온 이유</summary><ul>${selected.map(s=>`<li data-signal-id="${interpretationEsc(s.id)}"><b>${interpretationEsc(s.label||s.source_reference)}</b><span>${interpretationText(s.meaning)}</span></li>`).join('')}</ul><p>계산된 배치와 그 배치에 대한 상징적 해석을 함께 표시했어요.</p>${plan.limitations.map(l=>`<p>${interpretationText(l)}</p>`).join('')}</details>`;
}
function storyHeaderHTML(plan){
 const qs={saju:'타고난 방식은 지금의 선택과 어떻게 이어질까요?',tarot:plan.user_question||'이 고민에서 먼저 확인할 조건은 무엇일까요?',astrology:'본인 안의 서로 다른 욕구를 어떻게 함께 살릴까요?',ziwei:'지금 중심이 되는 삶의 무대는 어디일까요?'};
 return `<section class="story-overview" data-story-version="${plan.version}"><h3>${interpretationText(qs[plan.system])}</h3><p>${interpretationText(plan.main_theme)}</p></section>`;
}
function storyEnrichHTML(html,system,product,input){
 if(!storyEnabled(system,product))return html;
 const box=document.createElement('div');box.innerHTML=html;
 const root=box.querySelector('[data-deep]')||box;
 const sections=[...root.querySelectorAll('.lv4-sec,[data-editorial-domain]')].filter(s=>s.id&&!(s.matches('.lv4-sec')&&s.querySelector('[data-editorial-domain]')));
 const chapters=sections.map(s=>({id:s.id,title:s.querySelector('h2,h3')?.textContent||s.id,topic:storyTopic(s.id,s.textContent.slice(0,80))}));
 const plan=storyBuild(system,product,input,chapters);if(!plan||!chapters.length)return html;
 root.dataset.storyPlan=encodeURIComponent(JSON.stringify(plan));
 const hero=root.querySelector(':scope > .lv4-hero');if(hero)hero.insertAdjacentHTML('afterend',storyHeaderHTML(plan));else root.insertAdjacentHTML('afterbegin',storyHeaderHTML(plan));
 for(const sec of sections){const chapter=plan.chapter_outline.find(c=>c.id===sec.id);if(!chapter)continue;
  sec.dataset.storyChapter=chapter.id;
  const narrative=sec.querySelector('.reading-narrative');if(narrative){const map={scene:'recognition',conclusion:'recognition',counterpoint:'reversal',period:'timing',advice:'choice'},steps=uniqStory(FortuneStory.LIBRARY[plan.primary_storytelling_type].steps.map(k=>map[k]).concat(['recognition','reversal','timing','choice']));for(const step of steps){const p=narrative.querySelector('[data-reading-step="'+step+'"]');if(p)narrative.appendChild(p);}}
  sec.insertAdjacentHTML('beforeend',storyEvidenceHTML(plan,chapter));
  // Connections belong in the authored prose; retain dependencies only in the internal plan.
 }
 const tail=plan.chapter_outline.at(-1),advice=tail?.practical_advice[0]||plan.selected_signals.find(s=>s.advice)?.advice;
 if(plan.resolution?.text||advice)root.insertAdjacentHTML('beforeend',`<p class="story-resolution">${interpretationText(plan.resolution?.text||'풀이를 생활에 연결할 때는 이 기준부터 확인해 보세요.')} ${interpretationText(plan.resolution?.action||advice||'')}</p>`);
 return typeof preventOrphan==='function'?preventOrphan(box.innerHTML):box.innerHTML;
}
function storyFromElement(root){try{const el=root?.matches('[data-story-plan]')?root:root?.querySelector('[data-story-plan]');return el?JSON.parse(decodeURIComponent(el.dataset.storyPlan)):null;}catch(e){return null;}}
function storyMdPlan(md,system,input,product){
 const sections=mdSections(md),chapters=sections.map((s,i)=>({id:`${system}-story-${i+1}`,title:s.title,topic:storyTopic('',s.title)}));
 return storyBuild(system,product||'life',input,chapters);
}
function storyMarkdown(md,system,input,product){
 const plan=storyMdPlan(md,system,input,product);if(!plan)return md;
 const sections=mdSections(md);
 const opening=FortuneStory.compose(plan,plan.chapter_outline[0]);if(opening.length&&sections[0])sections[0].body=opening.join('\n\n');
 // The actual card combination, not merely suit counts, drives the transition chapter.
 if(system==='tarot'&&sections[3]&&plan.relations.length){sections[3].body=plan.relations.slice(0,3).map(r=>r.meaning).join('\n\n')+'\n\n각 자리의 단서를 함께 살피되, 이를 이미 일어난 사건으로 확인한 것은 아니에요.';}
 if(plan.resolution&&sections.at(-1)){sections.at(-1).body+='\n\n'+plan.resolution.text+' '+plan.resolution.action;}
 if(system==='astrology'&&sections[4]){const rel=plan.relations.find(r=>r.kind==='tension');if(rel)sections[4].body=rel.meaning+'\n\n'+sections[4].body;}
 return sections.map(s=>`# ${s.title}\n\n${s.body}`).join('\n\n');
}
function storyMarkdownView(md,system,input,product){
 const plan=storyMdPlan(md,system,input,product);if(!plan)return '';
 return `<div class="story-reading-context" data-story-plan="${encodeURIComponent(JSON.stringify(plan))}">${storyHeaderHTML(plan)}${storyEvidenceHTML(plan)}</div>`;
}
function storyPayload(plan){return plan?FortuneStory.prompt(plan):null;}
// Validate claims at the adoption boundary. Existing calculators remain the authority.
function storyAcceptDeep(root,section){
 const plan=storyFromElement(root);if(!plan)return true;
 const chapter=plan.chapter_outline.find(c=>c.id===section.id);if(!chapter)return false;
 const proof=section.story;
 if(!proof||proof.planId!==plan.id||!Array.isArray(proof.signalIds)||!proof.signalIds.length||!Array.isArray(proof.claims)||!proof.claims.length)return false;
 const checked=FortuneStory.validateChapters(plan,[{id:section.id,supporting_signal_ids:proof.signalIds,claims:proof.claims,paragraphs:section.paragraphs}]);
 return checked.ok&&proof.claims.some(c=>proof.signalIds.includes(c.signal_id));
}
function storyValidateMarkdown(md,system,input){
 const product=system==='tarot'?(input.topic||input.questionCategory):system==='astrology'?canonicalAstroProduct(input.productType||'life'):'life';
 if(!storyEnabled(system,product))return true;
 const plan=storyMdPlan(md,system,input,product);if(!plan)return false;
 const sections=mdSections(md),out=sections.map((s,i)=>({id:plan.chapter_outline[i].id,paragraphs:[s.body],supporting_signal_ids:plan.chapter_outline[i].supporting_signal_ids}));
 // Markdown protocol cannot prove entailment; validate repeated prose, dates and domain claims separately.
 const structural=FortuneStory.validateChapters(plan,out);
 if(structural.issues.some(x=>/repeated_sentence|unsafe_assertion/.test(x)))return false;
 if(system==='tarot'){
  const cards=(input.cards||[]),drawn=new Set(cards.map(c=>c.cardNameKo));
  for(const c of TAROT_CARDS){const re=new RegExp(c.nameKo+'(?:\\s*\\([^)]*\\))?\\s*카드');if(re.test(md)&&!drawn.has(c.nameKo))return false;}
  for(const c of cards){const re=new RegExp(c.cardNameKo+'[^.!?\\n]{0,16}(정방향|역방향)');for(const match of md.matchAll(new RegExp(re.source,'g')))if(match[1]!== (c.orientation==='reversed'?'역방향':'정방향'))return false;}
 }else if(system==='astrology'){
  const chart=input.chart;if(!chart)return false;
  const names={태양:'sun',달:'moon',수성:'mercury',금성:'venus',화성:'mars',목성:'jupiter',토성:'saturn'};
  for(const sent of String(md).split(/(?<=[.!?])\s+/)){
   if(/지금 하늘|트랜짓|현재 하늘/.test(sent))continue;
   for(const m of sent.matchAll(/(?:(본인(?:의)?|당신(?:의)?|출생|상대방(?:의)?)\s*)?(태양|달|수성|금성|화성|목성|토성)(?:은|는|이|가)?\s*([가-힣]{1,3}자리)/g)){
    const partner=m[1]?.startsWith('상대방')||(!m[1]&&/상대방/.test(sent)&&!/본인|당신|출생/.test(sent)),source=partner?input.partnerChart:chart;
    if(!source)return false;const p=findPlanet(source,names[m[2]]);if(!p||signNameKo(p.sign)!==m[3])return false;
   }
  }
 }
 return true;
}
function storyBatchIssues(root,data){
 const plan=storyFromElement(root);if(!plan)return new Set();
 const candidates=(data.sections||[]).filter(s=>s?.story).map(s=>({id:s.id,paragraphs:s.paragraphs,supporting_signal_ids:s.story.signalIds,claims:s.story.claims}));
 const prior=Object.values(root._storyAccepted||{}).filter(s=>!candidates.some(c=>c.id===s.id));
 const check=FortuneStory.validateChapters(plan,prior.concat(candidates));
 return new Set(check.issues.map(s=>s.split(':').slice(1).join(':')).filter(Boolean));
}
function storyBindMarkdownView(root){
 const plan=storyFromElement(root);if(!plan)return;
 const chapters=[...root.querySelectorAll('.lv4-sec')];
 chapters.slice(0,plan.chapter_outline.length).forEach((sec,i)=>{
  const c=plan.chapter_outline[i];if(sec.dataset.storyChapter)return;
  sec.dataset.storyChapter=c.id;
  sec.insertAdjacentHTML('afterbegin',`<span id="${interpretationEsc(c.id)}" class="story-anchor" aria-hidden="true"></span>`);
  sec.insertAdjacentHTML('beforeend',storyEvidenceHTML(plan,c));
  const dep=plan.chapter_dependencies.find(d=>d.to===c.id);if(dep){const prev=plan.chapter_outline.find(p=>p.id===dep.from);sec.insertAdjacentHTML('afterbegin',`<p class="story-connection">‘${interpretationEsc(prev.title)}’에서 살핀 단서를 이번 장의 질문으로 이어 읽어요.</p>`);}
 });
}

function storyFreeHTML(html,saju,meta,product){
 const plan=storyBuild('saju',product,{saju,meta},[{id:'free-reflection',title:'생활에서 확인할 한 가지',topic:'core'}]);if(!plan)return html;
 const c=plan.chapter_outline[0],advice=c.practical_advice[0]||'';
 return html+`<section class="story-overview" id="free-reflection" data-story-version="${plan.version}"><h3>생활에서 확인할 한 가지</h3><p>${interpretationText(c.conclusion)}</p>${advice?`<p>${interpretationText(advice)}</p>`:''}${storyEvidenceHTML(plan,c)}</section>`;
}
