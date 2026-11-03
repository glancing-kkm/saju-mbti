'use strict';
// Deliberately synthetic prose for model plumbing/layout tests; never used in product output.
const profile={theme:'같은 장점이 부담으로 바뀌는 조건을 살펴봐요',mainConclusion:'본인의 선택을 이해하려면 원국의 서로 다른 작용을 함께 살펴봐야 해요.',strength:'맡은 일을 처리하는 방식과 생활 조건을 함께 비교하는 것이 중요해요.',challenge:'부담이 커질 때 어떤 조건에서 어려움이 생기는지 살펴봐야 해요.',action:'실제 업무와 생활에서 바꿀 수 있는 조건을 먼저 확인해 보세요.',closing:'앞에서 살펴본 성향을 지금의 선택에서 확인할 기준으로 정리해 보세요.',keywords:['선택의 조건','역할의 차이','판단 기준']};
function response(r){
 const base=r.ledger.slice(0,2).map(x=>x.id);
 if(r.phase==='plan')return {links:[{from:r.chapters[0].id,to:r.chapters[1].id,evidenceRefs:base,development:'앞에서 확인한 기준이 다음 영역에서 다른 역할로 나타나는 조건을 설명해요.'}],profile:{...profile,evidenceRefs:base},chapters:r.chapters.map(c=>({id:c.id,title:'',focus:c.question,conclusion:c.title+'에서는 실제 구조와 현재 생활 조건의 관계를 함께 살펴봐야 해요.',connection:'앞에서 살핀 기준이 이 영역에 어떤 차이로 나타나는지 비교해요.',evidenceRefs:[...new Set([...base,...c.months.map(m=>`month.${r.year}.${m}`)])]}))};
 if(r.phase==='fields')return {fields:r.fieldRequests.map(f=>({id:f.id,text:'기준 확인',evidenceRefs:base}))};
 return {sections:r.requestedChapters.map(c=>{
 const refs=r.plan.chapters.find(x=>x.id===c.id).evidenceRefs,anchor=r.ledger.find(x=>x.id===refs[0]).anchors[0];
 const month=c.months.map(m=>m+'월').join('·');
 const basis=`${c.title}의 실제 근거인 ${anchor}와 관련 자료는 혼자 떼어 읽기보다 서로 어떤 역할을 하는지 함께 살펴보는 것이 중요해요`;
 const mechanism=`${c.title}에서 중요한 이유는 같은 성향도 맡은 역할과 실제 생활 환경에 따라 장점으로 쓰이기도 하고 부담이 되기도 하기 때문이에요`;
 const condition=`${c.title}의 조건을 비교할 때는 지금 본인이 감당하는 일의 범위와 도움을 요청할 여지가 있는지 따로 확인해야 해요`;
 return {id:c.id,evidenceRefs:refs,analysis:{basis,mechanism,condition},headline:c.title+'의 핵심을 한 문장으로 정리한 모의 인용구입니다',basis:['모의 근거 하나','모의 근거 둘'],advice:'',paragraphs:(c.kind==='future'||/10개 연도/.test(c.question||''))&&refs.some(id=>/^year\.\d{4}$/.test(id))?refs.filter(id=>/^year\.\d{4}$/.test(id)).flatMap(id=>{const v=r.ledger.find(x=>x.id===id).value;return [`### ${v.year}년 ${v.stem}${v.branch} — 모의 주제`,`${v.year}년에는 ${anchor}와 그해 자료를 함께 살펴야 하기 때문이에요. 맡은 일의 범위와 생활 조건을 비교하고 실제 확인할 기준을 정리하는 모의 집필 문단이에요.`];}):[`${basis}. ${c.title}은 ${month}의 차이를 포함해 어떤 상황에서 이 작용을 확인할지 실제 자료와 함께 설명하는 모의 집필 문단이에요.`,`${mechanism}. ${c.title}에 관해서는 본인의 경험을 이미 확인한 일처럼 단정하지 않고 생활 조건별로 다르게 나타나는 가능성을 구분해요.`,`${condition}. ${c.title}에서 살핀 내용을 바탕으로 현재의 선택에서 무엇을 확인하고 어떤 조건을 바꿀지 정리하는 모의 집필 문단이에요.`]};})};
}

module.exports=response;
