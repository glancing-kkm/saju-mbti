'use strict';
const assert=require('node:assert/strict');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const clean=s=>rt.clean(s);
try{
 const cards=run('TAROT_CARDS');
 assert.equal(cards.length,78);assert.equal(new Set(cards.map(c=>c.id)).size,78);
 // Semantic anchors are independent expectations: same ranks in different suits must differ.
 const anchors={
  wands:[/시작|의욕/,/계획/,/반응|기회/,/축하|소속감/,/의견|부딪/,/인정/,/입장|지키/,/빠르게|소식/,/버텨|경계/,/책임|부담/,/가능성|배울/,/추진|뛰어/,/확신|당당/,/비전|방향/],
  cups:[/감정/,/서로|오가/,/모임|지지/,/권태/,/잃은|슬픔/,/기억|호의/,/가능성|가려/,/떠나|의미/,/만족/,/정서적|소속감/,/상상|감정/,/제안/,/공감|감정/,/중심|반응/],
  swords:[/사실|기준/,/결정|멈춘/,/상처|아픈/,/쉬는|회복/,/다툼|대가/,/옮겨|회복/,/계획|정보/,/제약|한계/,/걱정/,/한계|끝난/,/정보|단서/,/돌진|행동/,/사실|기준/,/공정|결정/],
  pentacles:[/자원|기회/,/조율/,/기술|협력/,/지키|잃을/,/부족|고립/,/주고받|조건/,/성과|점검/,/반복|실력/,/여유|성과/,/기반|책임/,/배워|기술/,/꾸준/,/돌보|일상/,/자원|운용/]
 };
 for(const [suit,expected] of Object.entries(anchors)){
  const set=cards.filter(c=>c.id.startsWith(suit+'-'));assert.equal(set.length,14);
  set.forEach((c,i)=>assert(expected[i].test(c.uprightMeaning),c.id+' semantic anchor'));
 }
 for(const key of ['uprightMeaning','reversedMeaning','loveMeaning','moneyMeaning','careerMeaning','advice','warning']){
  assert.equal(new Set(cards.map(c=>c[key])).size,78,key+' must be authored for each card');
  for(const c of cards)assert(c[key]&&c[key].length>8,c.id+' missing '+key);
 }
 const topics=['life','newyear','love','marriage','reunion','gunghap','money','career','study','child','children','health'];
 let cases=0;
 for(const card of cards){
  w.card=card;
  const free=clean(rt.text(run('todayTarotResultHTML(window.card)')));
  assert(free.includes(clean(card.uprightMeaning)),card.id+' free core');
  assert(free.includes(clean(card.advice)),card.id+' free advice');
  for(const orientation of ['upright','reversed'])for(const topic of topics){
   w.testFlow={question:'지금 이 선택을 어떻게 살펴볼까요?',topic,questionCategory:topic,spreadName:'3장',positions:[{index:0,label:'지금 상황',meaning:'현재'},{index:1,label:'걸림돌',meaning:'장애'},{index:2,label:'앞으로의 흐름',meaning:'결과'}],selectedCards:[0,1,2].map(positionIndex=>({positionIndex,cardId:card.id,orientation}))};
   const input=run('buildAIReadingInput(window.testFlow)');w.testInput=input;
   const meaning=orientation==='reversed'?card.reversedMeaning:card.uprightMeaning;
   assert.equal(input.cards[0].baseMeaning,meaning,card.id+' orientation payload');
   const md=run('generateTemplateReading(window.testInput)');
   assert(md.includes(meaning),card.id+' computed core');
   assert(md.includes(input.cards[0].categoryMeaning),card.id+' category payload/render consistency');
   assert(md.includes(card.advice),card.id+' computed advice');
   assert(!/원하는 쪽으로 움직일 여지가|기운이 약해지거나 반대로|속도가 어긋나 있다는 신호/.test(md));
   if(orientation==='reversed')assert(!md.includes(card.uprightMeaning),card.id+' reversed must not reuse upright core');
   cases++;
  }
 }
 for(const id of ['swords-03','swords-08','swords-09','cups-08']){
  w.card=cards.find(c=>c.id===id);const free=rt.text(run('todayTarotResultHTML(window.card)'));
  assert(!/속도와 숙련|성취와 정리|확장과 협력|손에 익으며 속도/.test(free),id+' former meaning leaked');
 }
 assert(/풀 수|시야가 열/.test(cards.find(c=>c.id==='swords-08').reversedMeaning),'reversed Swords 8 includes release, not generic delay');
 // Existing unpaid cached previews are regenerated from the same selection, without AI.
 w.fetch=async()=>{throw Error('No network permitted in cached preview refresh');};
 w.legacyFlow={...w.testFlow,paymentStatus:'none',previewTemplate:true,resultMarkdown:'OLD NUMERIC MEANING'};
 run('_tarotFlow=window.legacyFlow');const root=d.createElement('div');d.body.append(root);w.resultRoot=root;
 run('renderTarotResult(window.resultRoot)');assert(!run('_tarotFlow.resultMarkdown').includes('OLD NUMERIC MEANING'));assert.equal(run('_tarotFlow.meaningVersion'),run('TAROT_MEANING_VERSION'));
 const oldPaid='EXISTING PAID READING';w.legacyFlow={...w.testFlow,paymentStatus:'paid',previewTemplate:false,resultMarkdown:oldPaid};
 run('_tarotFlow=window.legacyFlow;renderTarotResult(window.resultRoot)');assert.equal(run('_tarotFlow.resultMarkdown'),oldPaid,'Do not overwrite historical paid reading');
 console.log(`Tarot meaning checks passed: 78 cards, 56 minor semantic anchors, ${cases} card/direction/topic cases, cached preview refresh.`);
}finally{rt.close();}
