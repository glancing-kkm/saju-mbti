'use strict';
// Review-only outline experiment. Does not change production products or PDF outlines.
module.exports=function compactReview(report,concise=false){
const unique=a=>[...new Set(a)],all=report.chapters,groups=[],put=(items,kind,title,question)=>{if(!items.length)return;groups.push({...items[0],kind,title,mode:'fixed',months:[],refs:unique(items.flatMap(c=>c.refs||[])),sourceChapterIds:items.map(c=>c.id),question});};
if(report.product==='life'){
 for(const c of all){if(['nature','decade','story','epilogue','guide'].includes(c.kind))continue;groups.push({...c});}
 const nature=all.filter(c=>c.kind==='nature');const n={...nature[0],title:'타고난 성향과 마음의 균형',mode:'fixed',question:'일간·계절, 실제 십성 관계, 실제 합충의 뜻을 함께 읽어 성향·감정·관계에서 반복되는 특징을 한 이야기로 설명하세요. 직업으로 치환하지 말고 이유와 생활 모습, 편안해지는 조건을 연결하세요. 분량은 공백 포함 600~850자입니다.',sourceChapterIds:nature.map(c=>c.id)};groups.splice(Math.min(2,groups.length),0,n);
 const decades=all.filter(c=>c.kind==='decade');for(const when of ['past','now','future']){const ds=decades.filter(c=>c.decade?.when===when);put(ds,'flow',when==='past'?'지나온 대운에서 읽는 변화의 주제':when==='now'?'현재 대운에서 달라지는 조건':'앞으로의 대운을 준비하는 방향',ds.map(c=>c.title).join(' / ')+' — 실제 배정된 대운을 빠뜨리지 말고 각 시기별 핵심 변화와 연결을 설명하세요. 지난 사건은 단정하지 마세요. 앞의 기본 성향을 반복하지 말고 대운이 바꾸는 주제만 설명하세요. 분량은 공백 포함 '+(when==='past'?'550~850':when==='now'?'450~650':'450~650')+'자입니다.');}
 put(all.filter(c=>['story','epilogue','guide'].includes(c.kind)),'guide','인생을 이해하고 지금 선택에 적용하는 방법','도입의 특징과 지금의 운을 짧게 연결하고, 가장 중요한 선택 기준 세 가지를 구체적으로 설명하세요. 앞 장의 문장을 반복하거나 새 사건을 만들지 마세요. 분량은 공백 포함 400~600자입니다.');
}else if(report.product==='newyear'){
 for(const c of all){if(['mw','strategy','questions','epilogue','guide'].includes(c.kind))continue;groups.push({...c});}
 const mw=all.filter(c=>c.kind==='mw'),at=groups.findIndex(c=>c.kind==='watch');let offset=at<0?groups.length:at;
 for(let i=0;i<mw.length;i+=3){const items=mw.slice(i,i+3),months=items.map(c=>c.mw),g={...items[0],kind:'topic-months',title:months[0]+'~'+months.at(-1)+'월운의 변화',mode:'fixed',refs:unique(items.flatMap(c=>c.refs||[])),months:[],sourceChapterIds:items.map(c=>c.id),question:months.map(m=>'### '+m+'월운 — 주제').join(' / ')+' 소제목을 각각 쓰고 해당 mw의 실제 절기·간지와 원국의 관계로 왜 다른지 설명하세요. 각 월의 일·돈·관계 중 자료에서 중요한 차이를 골라 생활 조건과 적용할 행동을 두세 문장으로 묶으세요. 달이나 근거를 생략하지 말고 같은 조언을 반복하지 마세요. 분량은 공백 포함 650~850자입니다.'};groups.splice(offset++,0,g);}
 put(all.filter(c=>['strategy','questions','epilogue','guide'].includes(c.kind)),'guide','올해의 우선순위와 실천 기준','올해 해석의 핵심을 짧게 연결하고, 지금 적용할 선택 기준과 조정할 조건을 다섯 가지 이내로 정리하세요. 앞 장의 조언을 복사하거나 다른 표현으로 반복하지 마세요. 분량은 공백 포함 450~650자입니다.');
}else return report;
if(concise){
 const short=c=>({...c,question:c.kind==='domain'?c.question.replace(/분량은 공백 포함 \d+~\d+자입니다\./g,'')+' 본문은 3문단, 각 문단 한두 문장으로 전체 380~550자입니다. 핵심 이유와 생활 조건만 쓰고 앞 장의 설명은 되풀이하지 마세요.':c.question});
 let final=groups.map(short);
 if(report.product==='life'){
 const intro=final.find(c=>c.kind==='nature'),basis=final.filter(c=>['prologue','chart'].includes(c.kind));intro.id=basis[0].id;intro.title='타고난 성향과 삶에서 반복되는 선택';intro.question='실제 원국의 핵심 특징을 먼저 말하고 일간·계절·십성·합충 중 관련 근거를 연결하여 감정과 관계에서 나타나는 모습을 설명하세요. 세 특징을 별도로 반복하거나 직업 중심으로 쓰지 마세요. 원국 표가 있으므로 글자 설명을 나열하지 마세요. 분량은 공백 포함 700~950자입니다.';
 final=final.filter(c=>!['prologue','chart'].includes(c.kind));const flows=final.filter(c=>c.kind==='flow');const flow={...flows[0],title:'대운으로 보는 지나온 변화와 지금의 방향',refs:unique(flows.flatMap(c=>c.refs||[])),question:all.filter(c=>c.kind==='decade').map(c=>c.title).join(' / ')+' — 실제 대운별 핵심 주제를 각 한 문장으로 빠뜨리지 않고 설명하고 현재와 다음 대운에서 달라지는 조건을 더 자세히 연결하세요. 지난 사건을 단정하지 마세요. 분량은 공백 포함 750~1100자입니다.'};const at=final.findIndex(c=>c.kind==='flow');final=final.filter(c=>c.kind!=='flow');final.splice(at,0,flow);
 }else if(report.product==='newyear'){
 const first=final.slice(0,3),intro={...first[0],title:'올해의 핵심과 작년부터 달라진 점',refs:unique(first.flatMap(c=>c.refs||[])),question:'올해의 핵심 해석을 먼저 말하고 원국·현재 대운·올해 세운의 관계, 작년과 달라지는 조건을 한 이야기로 연결하세요. 소개·총론·비교를 각각 다시 반복하지 마세요. 분량은 공백 포함 750~1000자입니다.'};final=[intro,...final.slice(3)];const end=final.filter(c=>['half','watch','guide'].includes(c.kind)),finish={...end.at(-1),title:'상하반기의 차이와 올해의 우선순위',refs:unique(end.flatMap(c=>c.refs||[])),question:'상하반기에서 실제로 달라지는 조건과 주목할 시기를 짧게 설명하고 올해 지킬 선택 기준 세 가지로 끝내세요. 월별 장의 내용을 다시 열거하지 마세요. 분량은 공백 포함 550~800자입니다.'};final=final.filter(c=>!['half','watch','guide'].includes(c.kind));final.push(finish);
 }
 return {...report,reviewOnly:true,reviewOutline:'compact-v2',chapters:final};
 }
return {...report,reviewOnly:true,reviewOutline:'compact-v1',chapters:groups};
};
