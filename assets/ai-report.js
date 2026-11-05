/* Paid prose is authored from calculated facts. No new fortune calculations or free inference. */
(function(g){
'use strict';
g.AIReportConfig=Object.assign({enabled:true},g.AIReportConfig||{});
const VERSION='ai-full-v1',CAT={life:'인생총운',newyear:'신년운세',gunghap:'궁합',name:'이름풀이·작명',ziwei:'자미두수','topic-love':'연애운','topic-marriage':'결혼운','topic-reunion':'재회운','topic-money':'재물운','topic-career':'직업운','topic-study':'학업·시험운','topic-child':'우리 아이 운','topic-children':'자녀(임신)운','topic-health':'건강·생활운'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique=a=>[...new Set(a)],compact=s=>String(s||'').replace(/[\s\u200b\u00a0]/g,'');
function category(el){return String(el?.getAttribute('data-deep')||'').split(':')[0];}
function enabled(el){return !!el&&g.AIReportConfig.enabled===true&&!!CAT[category(el)]&&!el.closest('.lk-preview');}
// 보고서 뼈대: 프롤로그 → 원국 → 본성 → 대운별 인생의 장 → 미래 10년 → 영역별 운 → 하나의 이야기 → 에필로그 → 활용 설명서.
// mode: fixed(제목 고정) · ai(AI가 명식에 맞춘 제목) · prefix('직업운 — ' 뒤에 AI 제목). tag는 목차·제목 옆 괄호 운 이름.
const HJ_S='甲乙丙丁戊己庚辛壬癸',HJ_B='子丑寅卯辰巳午未申酉戌亥',ORD=['첫 번째','두 번째','세 번째','네 번째','다섯 번째','여섯 번째','일곱 번째','여덟 번째'];
const NOUN={life:'인생',newyear:'',gunghap:'관계',name:'이름',ziwei:'명반','topic-love':'연애','topic-marriage':'결혼','topic-reunion':'재회','topic-money':'재물','topic-career':'일','topic-study':'공부','topic-child':'아이','topic-children':'자녀운','topic-health':'생활과 건강'};
const TOPICS={
 'topic-love':['사랑에서 중요하게 여기는 것','누구에게 왜 끌리는가','마음을 표현하는 방식','관계에서 갈등이 생기는 이유','현재 관계와 생활 조건'],
 'topic-marriage':['결혼을 대하는 태도','배우자에게 기대하는 것과 그 이유','생활을 함께할 때 맞춰야 할 점','다툼이 반복되는 조건','경제생활과 가족의 경계'],
 'topic-reunion':['다시 만나고 싶은 마음의 뿌리','관계에서 반복되기 쉬운 갈등','그리움과 실제 관계의 차이','달라져야 할 조건','당신이 바꿀 수 있는 부분'],
 'topic-money':['돈을 대하는 방식과 그 이유','수입을 만드는 강점','일과 수입이 연결되는 조건','돈이 새기 쉬운 선택','함께 쓰는 돈과 책임'],
 'topic-career':['일하는 방식과 그 이유','재능이 드러나는 업무','조직과 협업에서의 모습','지금 하는 일과 고민','실력이 소모되지 않는 환경','장기적으로 쌓아 갈 전문성'],
 'topic-study':['이해하고 배우는 방식','잘 맞는 학습 환경과 그 이유','집중이 흐트러지는 조건','노력이 실력으로 남는 방법','시험과 평가를 대하는 마음'],
 'topic-child':['아이의 타고난 기질','아이가 편안해하는 환경','배움과 놀이에서의 모습','친구와 어른을 대하는 방식','부담이 커질 때 살필 반응','양육 환경에서 조정할 점'],
 'topic-children':['돌봄과 가족을 대하는 방식','자녀에게 기대하는 것과 그 이유','자녀와 거리를 맞추는 과정','가족의 역할과 생활 조건','지금 상황에 맞는 자녀 계획'],
 'topic-health':['전통 해석에서 보는 생활 균형','긴장과 휴식의 습관','일과 관계가 생활에 미치는 영향'],
 gunghap:['서로에게 끌리는 이유','감정과 대화 방식의 차이','갈등이 커지는 조건','돈과 일상을 함께하는 방식'],
 name:['실제 글자의 뜻과 소리','소리 오행과 사주의 관계','한자와 획수에서 보는 차이','현재 이름의 장점과 부담','후보가 있다면 무엇이 달라지는지','실제 사용성과 당신의 선호']};
// Shared editorial contract; evidence and product-specific outline remain unchanged.
function consultationQuestion(chapter){return chapter.kind==='chart'?'':' 이 장의 질문에 대한 핵심 해석을 먼저 말한 뒤, 실제 근거의 상호작용과 생활에서 나타나는 모습을 이어 설명하세요. 독자가 궁금해할 왜와 어떤 조건에서에 답하고, 다른 장과 상반되는 조언은 적용 조건을 구분하세요. 이 집필 순서를 용어 설명 우선 지시보다 우선합니다. 매 장 확인 질문이나 같은 조언으로 끝내지 마세요.';}
const ASK={
 prologue:noun=>`${noun?noun+'에서 ':''}가장 두드러진 세 가지 모습을 실제 근거에 맞는 명확한 세 문단으로 보여 주세요. 성향 해석을 확인된 경험처럼 단정하지 마세요. 이어서 이 세 모습이 사주에서 하나의 구조로 연결되며 시기에 따라 다르게 해석된다는 예고로 마무리하고, 마지막 문단은 **굵은 한 문장**으로 쓰세요. 근거 설명은 뒤의 장들이 맡습니다. 분량은 공백 포함 300~600자입니다. headline은 당신에게 건네는 짧은 인용구 한 문장이에요. basis와 advice는 비우세요.`,
 chart:'화면에는 사주판(네 기둥의 천간·지지·십성·지장간)과 구조 도식(일간과 태어난 계절, 실제로 계산된 합·충·형, 겉글자 오행 개수)이 먼저 나옵니다. 본문은 그 도식을 읽는 법만 사실 위주로 안내하세요: 일간과 월지(계절), 여러 번 나오는 글자와 십성, 자료에 있는 합·충·형, 오행 개수를 각각 한두 문단으로 씁니다. 분량은 공백 포함 400~700자입니다. 이 글자들이 성격·일·관계에서 무슨 뜻인지는 다음 세 장이 나눠 설명하므로 여기서 해석하지 마세요. 자리 이름(연지·월지·일지·시지)은 자료 그대로 쓰고 목록·표·소제목은 쓰지 마세요. 출생시간·대운 기준도 화면이 따로 보여 줍니다. advice는 비우세요.',
 nature:['이 장은 일간과 태어난 계절을 근거로 타고난 성향과 감정 반응을 다룹니다. 혼자 쉬는 시간, 낯선 모임, 좋아하는 취미 중 실제 근거와 맞는 일상 장면 하나로 본성을 설명하세요. 어떤 때 자연스럽게 자신다워지는지, 같은 장점이 피곤함으로 바뀌는 조건을 연결하고 **굵은 한 문장**으로 정리하세요. 입력 직업을 사례로 쓰거나 성과·평가로 귀결하지 마세요. 책임의 십성과 충·합은 다음 장에서 다루므로 쓰지 마세요. 분량은 공백 포함 500~900자입니다.','이 장은 원국에서 실제로 강하거나 상반되는 십성 관계 하나를 근거로 마음이 편해지는 조건과 불편해지는 이유를 설명합니다. 용어의 뜻을 짧게 설명한 뒤 관심을 받는 방식, 새로 배우는 즐거움, 도움을 받거나 부탁하는 태도 중 근거가 맞는 장면으로 연결하세요. 책임의 기운이 중요하더라도 업무 압박 대신 가까운 사람의 부탁을 어디까지 받아들이는지처럼 생활에서 풀어 주세요. 즐거움이나 만족을 느끼는 조건도 함께 다루되 없는 성향은 만들지 마세요. **굵은 질문 한 문장**을 넣으세요. 일간·계절과 충·합은 되풀이하지 마세요. 분량은 공백 포함 500~900자입니다.','이 장은 원국의 실제 충·합이나 서로 부딪히는 두 십성을 근거로 가까워지고 싶은 마음과 자기 시간을 지키고 싶은 마음을 다룹니다. 이 긴장이 자료에 없으면 억지로 만들지 말고 실제 확인된 관계에 맞춰 친밀감·감정 표현·생활 속 선택의 갈등을 설명하세요. 친구·가족·배우자 중 현재 나이와 관계 상태에 맞는 장면을 하나 쓰세요. 갈등뿐 아니라 서로 편안하게 지내는 조건과 관계에서 얻는 기쁨으로 이어 가세요. 직장 갈등·업무 책임·성과로 다시 돌아가지 마세요. 앞 두 장의 근거는 필요한 이름만 짚고 새 질문에 답하세요. 분량은 공백 포함 500~900자입니다.'],
 decade:(d,stage)=>`${d.from}~${d.from+10}세 무렵(${d.y1}~${d.y2}년) ${d.stem}${d.branch}대운을 그 나이대의 인생 단계 언어로 풀어 주세요(${stage}). 천간·지지의 십성과 지장간, 원국과의 합·충을 근거로 이 시기의 핵심 주제를 설명하고, 이 시기에 돌아볼 **굵은 질문 한 문장**을 넣으세요. 원국의 기본 성향(일간의 이미지·태어난 계절)과 앞 장에서 풀이한 용어는 다시 설명하지 말고 이 대운이 새로 가져오는 글자와 관계만 쓰세요. ${d.when==='past'?'지난 시기이므로 실제 사건은 단정하지 말고 "사주만으로 알 수 없습니다"처럼 한계를 밝히세요. 분량은 공백 포함 300~600자입니다.':d.when==='now'?'지금의 대운이므로 앞선 대운과 무엇이 달라졌는지, 지금의 성장 과제를 "### 소제목"으로 나눠 쓰세요. 해마다의 흐름은 앞의 미래 운세 장에서 다뤘으니 연도별로 다시 풀지 마세요. 분량은 공백 포함 600~1000자입니다.':'앞으로의 대운이므로 준비할 방향과 그 시기의 현실적인 선택지를 쓰세요. 분량은 공백 포함 400~700자입니다.'} headline은 그 대운을 한 문장으로 요약하는 말이에요.`,
 future:y=>`현재 대운이 언제까지 이어지는지 먼저 짚고, ${y}~${y+9}년의 10개 연도를 빠짐없이 시간순으로 설명하세요. 각 해마다 "### 연도년 실제 간지 — 주제" 소제목을 하나 쓰고, 그 아래 원국·대운과 해당 세운의 관계 및 생활에서 확인할 조건을 1~2문장으로 설명하세요. 분량은 공백 포함 900~1500자입니다. 간지는 반드시 그해 year 자료 그대로 사용하세요. 표에 연도가 있다는 이유로 본문을 생략하지 마세요. 중요한 해만 골라 쓰거나 여러 해를 한 소제목으로 묶지 마세요. 어떤 해도 사고·이직·승진을 확정하지 마세요. 연도별 표는 화면이 따로 보여 줘요.`,
 domain:(t,extra)=>`${josa(t,'을/를')} 가장 중요한 특징부터 말하고 원국과 대운의 관계로 그 이유를 설명하세요. 원국의 기본 성향(일간의 이미지·태어난 계절)과 앞 장에서 풀이한 용어는 다시 설명하지 말고 이 영역에 새로 필요한 근거만 쓰세요. 새 용어는 처음 나올 때 뜻을 풀고, 구체적인 생활 장면과 반대 조건을 쓰세요. 분량은 공백 포함 500~900자입니다. ${extra||''} advice에는 "~하십시오"로 끝나는 핵심 조언 한 문장을 쓰세요.`,
 story:'프롤로그의 세 가지 특징이 각각 어떤 원국 관계에서 나오는지 한 문장씩 연결하고, 대운이 바뀌면서 같은 특징이 어떤 다른 주제로 이어지는지 대운별로 한 줄씩 정리하세요. 앞 장의 설명을 다시 풀지 마세요. 분량은 공백 포함 400~700자입니다.',
 epilogue:'프롤로그의 세 특징을 같은 문장을 옮기지 말고 한 문단으로 짧게 되짚은 뒤, 지금 대운을 어떻게 활용할지, 앞으로 생각해 볼 질문 세 개를 큰따옴표 문장으로 제시하세요. 분량은 공백 포함 400~700자입니다. 사주는 답을 대신 정해 주지 않는다는 점을 짧게 덧붙이세요. headline은 리포트 전체를 닫는 인용구 한 문장이에요.',
 guide:'"### 살려야 할 강점", "### 주의할 패턴", "### 발전시킬 방향" 세 소제목 아래에 각각 "- " 목록 3~5개를 짧은 명사형 문장으로 쓰세요. basis와 advice는 비우세요.'};
const josa=(w,pair)=>{const c=String(w).charCodeAt(String(w).length-1)-44032,has=c>=0&&c<11172&&c%28>0;const [a,b]=pair.split('/');return w+(has?a:b);};
function premiumOutline(cat,year,meta,extra){
 const spec=g.PremiumSaju?.products[cat];if(!spec)return null;
 const ds=extra.daeuns||[],now=ds.find(d=>d.y1<=year&&year<d.y2),baseRefs=now?['decade.'+now.age]:[];
 const count=spec.chapters.length+2+spec.chapters.filter(c=>/12개월|달마다/.test(c.title)).length*2,per=Math.round(spec.range[1]/count);
 const result=spec.chapters.map((part,i)=>{const monthly=/12개월|달마다/.test(part.title),future=/앞으로 3년|향후 5년|앞으로 5년/.test(part.title),flow=/대운/.test(part.title),horizon=/3년/.test(part.title)?3:5;
 const refs=cat==='gunghap'?['pair.chart.self','pair.chart.partner','pair.self.decades','pair.partner.decades',...Array.from({length:2},(_,k)=>[`pair.self.year.${year+k}`,`pair.partner.year.${year+k}`]).flat()]:cat==='name'?['name.chart','name.sound']:['year.'+year,...baseRefs,...(monthly?Array.from({length:12},(_,k)=>`mw.${year}.${k+1}`):[]),...(future?Array.from({length:horizon},(_,k)=>`year.${year+k}`):[])];
 return {kind:i===0?'prologue':flow?'flow':monthly?'topic-months':future?'topic-future':'topic',title:part.title,mode:'fixed',refs,months:[],ask:`${part.focus}.${i===0?'프롤로그는 사용자의 핵심 고민을 질문으로 열고 이 보고서에서 답할 문제를 소개하세요. 가상의 과거 사건이나 세 가지 성향을 단정하지 마세요.':'질문에 대한 핵심 답 → 실제 근거의 상호작용과 그 이유 → 구체적인 생활 모습 → 해당하는 조건과 현재 선택으로 자연스럽게 전개하세요.'} ${monthly?'자료 mw의 절기별 12개월을 모두 각각 ### N월운 — 주제 소제목과 실제 설명으로 구분하고 키워드·근거·생활 영역·활용 조건·주의·행동을 짧은 문단으로 녹이세요. 달력 월과 명리월을 혼동하지 마세요.':''} ${future?'배정된 모든 연도를 빠짐없이 시간순으로, 각 연도별 소제목(### 연도년 — 주제)과 2~3문장의 실제 설명으로 나누세요. 배정된 연도 범위 밖의 해를 추가하지 마세요.':''} 웹은 공백 포함 약 ${monthly?per*3:per}자 중심으로 쓰되 근거가 부족하면 줄이세요. PDF는 장마다 900~2400자로 근거와 현실 조건을 더 자세히 설명하세요. 장 제목의 답변과 다음 장의 질문이 이어져야 합니다.`};
 });
 result.splice(1,0,{kind:'chart',title:cat==='gunghap'?'두 사람의 원국을 읽는 기준':cat==='name'?'이름과 사주의 분석 범위':'이 주제를 설명하는 원국의 구조',mode:'fixed',refs:cat==='gunghap'?['pair.chart.self','pair.chart.partner']:cat==='name'?['name.chart','name.sound']:['natal.day.stem','natal.month.branch','natal.relations'],months:[],ask:'실제 원국의 주제 관련 글자 두세 개와 상호작용을 설명하고 왜 이 상담에서 중요한지 생활 언어로 연결하세요. 원국 표는 화면이 표시합니다. 한자를 모르는 이름이면 음성 분석 범위만 밝히세요.'});
 result.push({kind:'guide',title:'이 상담을 생활에 적용하는 방법',mode:'fixed',refs:baseRefs,months:[],ask:'도입에서 제기한 질문에 직접 답하고, 앞 장의 근거가 어떤 선택 기준으로 연결되는지 정리하세요. 살릴 강점·조정할 조건·다음 행동을 짧게 쓰세요. 새로운 사건·날짜·반전은 추가하지 마세요.'});
 // 인생총운과 같은 순서: 주제별 풀이 → 앞으로의 흐름(12개월·N년) → 대운. 장마다 맡은 내용만 쓰고 분량을 정한다.
 const later=result.filter(c=>['topic-months','topic-future'].includes(c.kind)),flows=result.filter(c=>c.kind==='flow');let ordered=result;
 if(later.length&&flows.length&&result.indexOf(flows[0])<result.indexOf(later.at(-1))){const rest=result.filter(c=>c.kind!=='flow'),at=rest.indexOf(later.at(-1))+1;ordered=[...rest.slice(0,at),...flows,...rest.slice(at)];}
 return ordered.map((c,i)=>({id:'ai-'+(i+1),...c,question:c.ask+' '+(PREMIUM_TRIM[c.kind]||PREMIUM_TRIM.topic)+consultationQuestion(c)}));
}
const PREMIUM_TRIM={prologue:'근거 설명은 뒤 장들이 맡습니다. 분량은 공백 포함 300~600자입니다.',chart:'원국 구조는 사실 위주로 짚고 성향 해석은 뒤 장에 맡기세요. 분량은 공백 포함 400~700자입니다.',topic:'앞 장에서 설명한 원국의 기본 성향과 용어 뜻은 다시 풀지 말고 이 장의 질문에 새로 필요한 근거만 쓰세요. 같은 뜻을 표현만 바꿔 두 번 쓰지 마세요.',flow:'앞의 월별·연도별 장에서 다룬 내용을 다시 풀지 말고, 대운이 바꾸는 큰 주제만 쓰세요. 같은 뜻을 두 번 쓰지 마세요.','topic-months':'앞 장에서 설명한 원국의 기본 성향과 용어 뜻은 다시 풀지 말고 달마다 새로 생기는 조건만 쓰세요.','topic-future':'앞 장에서 설명한 원국의 기본 성향과 용어 뜻은 다시 풀지 말고 해마다 새로 생기는 조건만 쓰세요.',guide:'앞 장의 설명을 다시 풀지 말고 정리하세요. 분량은 공백 포함 400~700자입니다.'};
function outline(cat,year,meta={},extra={}){
 const premium=premiumOutline(cat,year,meta,extra);if(premium)return premium;
 const age=Number(meta.sy)?year-Number(meta.sy):30,minor=age<19,st=meta.marital||'',noun=cat==='newyear'?`${year}년`:NOUN[cat]||'';
 const saju=!['ziwei','name','gunghap'].includes(cat),list=[];
 const push=(kind,title,o={})=>list.push({kind,title,mode:o.mode||'fixed',...o});
 push('prologue',cat==='newyear'?`${year}년, 당신의 인생에 던져지는 하나의 질문`:cat==='life'?'당신의 인생을 관통하는 세 가지 특징':cat==='topic-child'?'아이를 관통하는 세 가지 특징':cat==='gunghap'?'두 사람을 관통하는 세 가지 특징':`당신의 ${josa(noun,'을/를')} 관통하는 세 가지 특징`,{ask:cat==='newyear'?`지금까지 당신이 살아온 방식(원국의 성향)을 짧게 짚고, ${year}년의 운이 던지는 다른 질문을 대운·세운의 십성과 그로써 성립하는 구조로 설명하세요. 마지막에 이 해 전체를 관통하는 **굵은 큰따옴표 질문** 한 문단을 쓰세요. headline은 당신에게 던지는 질문형 인용구예요. basis와 advice는 비우세요.`:ASK.prologue(cat==='life'?'':noun)+(cat==='life'?' 세 특징은 타고난 성격·감정, 가까운 사람과의 관계, 즐거움·생활에서 각각 고르세요. 실제 원국 근거가 맞는 특징만 선택하고 입력 직업이나 업무 성과를 세 특징의 공통 주제로 삼지 마세요. 특정 과거 경험을 확인한 것처럼 단정하지 마세요.':'')});
 if(saju&&cat!=='newyear')push('chart','당신의 운명을 구성하는 여덟 글자',{ask:ASK.chart+(cat==='life'?'':` 이 보고서의 주제인 ${josa(noun||CAT[cat],'과/와')} 관련해 특히 중요한 글자를 강조하세요.`)});
 else if(cat==='gunghap')push('chart','두 사람의 사주 원국',{ask:'두 사람의 일간과 일지, 서로의 원국 사이에 실제로 계산된 합·충을 "- " 목록으로 정리하고 왜 중요한지 설명하세요. advice는 비우세요.'});
 else if(cat==='ziwei')push('chart','명궁과 신궁으로 보는 당신의 명반',{ask:'명궁·신궁과 주요 별을 "- " 목록으로 정리하고 이 명반의 기본 모습을 설명하세요. advice는 비우세요.'});
 else if(cat==='name')push('chart','이름을 해석하는 기준과 범위',{ask:'이름의 한글 소리 오행, 한자, 획수(원형이정 4격) 가운데 실제로 계산된 것을 "- " 목록으로 정리하고, 이 리포트가 무엇을 근거로 이름을 보는지 설명하세요. advice는 비우세요.'});
 if(cat==='life'){
  ['당신다운 모습이 드러나는 순간','당신의 마음이 편해지는 조건','가까운 사람과 거리를 맞추는 방식'].forEach((t,i)=>push('nature',t,{mode:'ai',ask:ASK.nature[i]}));
  const love=minor?['교우운','친구와 마음을 나누는 방식','친구 관계와 첫 마음']:st==='married'?['결혼운','배우자와 함께 사는 방식','배우자와의 생활과 대화']:st==='dating'?['결혼운','지금의 연애가 결혼으로 이어지는 조건','지금 연인과 결혼을 이야기할 조건']:['연애운','끌리는 사람과 인연이 오는 시기','끌리는 사람의 유형과 인연이 오는 시기'];
  [[minor?'학업·진로운':'직업운',minor?'공부와 진로':'일과 직업',minor?'':'원국에서 읽는 일하는 방식과 맞는 환경을 먼저 설명하세요. 입력 직업은 결론을 정하는 근거가 아니라 적용 예시 한 문단으로만 쓰세요.'],[ '재물운',minor?'돈을 대하는 감각':'돈을 버는 것과 지키는 것','수입의 안정성·변동성, 소비·저축·공동 지출의 판단 기준을 실제 명리 근거에서 설명하세요. 입력 직업에 맞춰 정재를 고객 계약, 편재를 거래처로 치환하지 마세요. 실제 소득 형태나 재정 상태를 제공하지 않았다면 가정하지 마세요. 실제 재정 결정은 수입·부채·자산 같은 현실 정보로 내려야 한다는 점을 한 줄 덧붙이세요.'],[love[0],love[2],'일지(배우자 자리)를 근거로 쓰고, 충 하나로 이별이나 결혼 불안정을 단정하지 마세요. 관계에서 돌아볼 질문을 "### 관계에서 돌아볼 질문" 소제목 아래 쓰세요.'],['인간관계','신뢰와 경계의 균형','도움을 주고받는 사람(귀인)과 거리를 둘 관계를 원국 근거로 설명하세요. 실제 인물을 특정하지 마세요.'],[minor?'가족운':'자녀·가족운',minor?'부모·형제와의 관계':'자녀와 가족','시주(자녀 자리)와 연주(집안 자리)를 근거로 쓰고, 출산이나 자녀의 성패를 단정하지 마세요.'],['건강운','건강과 생활 — 책임과 휴식의 균형','사주로 질병을 진단할 수 없다는 점을 밝히고 생활 습관을 돌아볼 질문으로 쓰세요.']].forEach(([tag,t,x],i)=>push('domain',t,{mode:i===5?'fixed':'prefix',prefix:tag,tag,people:tag==='인간관계',ask:ASK.domain(tag,x)}));
  // 인생총운 순서: 영역별 운 → 미래 10년 → 대운별 인생의 장
  push('future',`${year}~${year+9}년 미래 운세`,{tag:'앞으로 10년',refs:Array.from({length:10},(_,i)=>'year.'+(year+i)),ask:ASK.future(year)});
  const ds=extra.daeuns||[],cur=Math.max(0,ds.findIndex(d=>d.y1<=year&&year<d.y2)),last=Math.min(ds.length-1,Math.max(cur+2,ds.findIndex(d=>d.from>=54)),cur+4);
  ds.slice(0,last+1).slice(-8).forEach((d,k)=>{const when=d.y2<=year?'past':d.y1<=year?'now':'future',stage=d.from<7?'유년기: 기질·건강·부모와의 인연':d.from<17?'학동기: 학업·교우·재능, 승진·취업으로 풀지 말 것':d.from<27?'청년 초기: 진학·첫 연애·진로·자립':d.from<37?'청년기: 취업·이직·결혼·기반':d.from<47?'장년기: 도약·자녀·재테크':d.from<57?'중년기: 정점·건강 관리·자녀 독립':d.from<67?'장노년기: 은퇴 설계·노후':'노년기: 건강·마음의 평안';
   push('decade',`${ORD[k]} 인생의 장: ${d.y1}~${d.y2}년 ${d.stem}${d.branch}대운`,{tag:when==='past'?'지난 운':when==='now'?'지금의 운':'앞으로의 운',decade:{...d,when},refs:['decade.'+d.age],ask:ASK.decade({...d,when},stage)});});
 }else if(cat==='newyear'){
  // 신년운세 예시 리포트 구성: 총운 → 작년과 올해 → 영역별 운 → 상반기·하반기 → 12개 명리월 → 주목할 시기 → 전략 → 핵심 질문.
  const mw=Array.from({length:12},(_,k)=>`mw.${year}.${k+1}`),y0=year-1;
  push('total',`${year}년 총운`,{refs:['ny.frame'],ask:`현재 대운과 ${year}년 세운의 천간·지지 십성, 대운과 세운 사이의 생극(예: 목생화)과 그로써 성립하는 구조(예: 식신생재)를 근거로 올해의 중심 주제를 설명하세요. "### 소제목"으로 나누고, 기회와 함께 놓치면 안 되는 부분(지장간의 다른 십성)을 쓰세요. 이어서 "### ${year}년 핵심 키워드" 아래 "1. " 형식의 키워드 세 개, "### 올해의 핵심 조언" 아래 "- " 확인 질문 세 개를 쓰세요. headline은 이 해를 요약하는 한 문장이에요. 대운·세운의 구조 설명은 이 장에서 한 번만 합니다. 분량은 공백 포함 700~1100자입니다.`});
  push('compare',`${y0}년과 ${year}년은 무엇이 다를까?`,{refs:['year.'+y0,'year.'+year],ask:`${y0}년과 ${year}년 세운의 십성 차이를 설명하고 "### ${y0}년의 질문", "### ${year}년의 질문", "### 두 해를 연결하는 이야기" 소제목으로 나누세요. 마지막은 **굵은 한 문장**으로 정리하세요. 직장을 옮기거나 사업을 시작해야 한다고 단정하지 마세요. 총운 장에서 설명한 대운·세운의 기본 구조와 용어 뜻은 다시 풀지 말고 두 해의 차이만 쓰세요. 분량은 공백 포함 500~800자입니다.`});
  const nyLove=minor?['교우운','친구와 사람 사이를 세운과 일지로 설명하세요.']:['연애·결혼운',st==='married'?'기혼자이므로 배우자와의 관계만 쓰세요(새 인연 금지).':st==='dating'?'연애 중이므로 지금 관계와 결혼 이야기만 쓰세요.':'미혼이므로 새 인연과 연애만 쓰세요.'];
  [[minor?'학업운':'직업운','원국과 올해 운에서 읽는 직업 과제를 먼저 설명하고, 입력 직업은 적용 사례 한 문단으로만 쓰세요. 이 장에서 확인할 과제 세 개를 "#### 첫 번째. …?" 대신 "### 첫 번째. …?" 소제목으로 쓰세요.'],['재물운','"### 올해 재물 관리에서 생각해 볼 질문" 아래 "- " 질문 다섯 개를 넣고, 투자·사업 결정은 실제 자금 상황으로 판단해야 한다는 점을 덧붙이세요.'],...(minor?[]:[['사업·부업운','능력을 경제활동으로 연결하는 조건을 "1. " 목록 세 개로 정리하고, 편재가 있다는 이유만으로 창업에 적합하다고 단정하지 마세요.']]),nyLove,['인간관계운','"### 올해 인간관계에서 필요한 태도" 아래 "- " 목록 다섯 개를 쓰세요.'],['건강·생활운','질병을 예언하지 말고 "### 올해 확인할 생활 습관" 아래 "- " 질문 다섯 개를 쓰세요.']].forEach(([tag,x])=>push('domain',tag,{tag,people:tag==='인간관계운',refs:['ny.frame'],ask:`${year}년의 ${tag}을 현재 대운·세운과 원국을 근거로 설명하세요. 총운 장에서 설명한 대운·세운의 기본 구조와 용어 뜻은 다시 풀지 말고 이 영역에 새로 필요한 근거만 쓰세요. 분량은 공백 포함 450~800자입니다. headline은 이 운의 핵심을 담은 한 문장(질문형도 좋음)이에요. ${x} advice에는 "${tag}의 결론"으로 보여 줄 굵은 한 문장을 쓰세요.`}));
  push('half','상반기와 하반기의 흐름',{refs:mw,ask:'"### 상반기: …"와 "### 하반기: …" 두 소제목으로 나누어 각 시기에 나타나는 월운의 오행과 원국·대운의 관계를 설명하고, 각 시기의 핵심 질문을 큰따옴표 문장으로 쓰세요. 상반기가 좋고 하반기가 나쁘다는 식으로 단정하지 마세요. 달마다의 설명은 월별 장이 하므로 두 시기의 차이만 쓰세요. 분량은 공백 포함 400~700자입니다.'});
  for(let k=0;k<12;k++)push('mw',`${k+1}월운`,{mw:k+1,refs:[mw[k],'ny.frame'],ask:`${k+1}월운(자료 mw.${year}.${k+1})의 천간·지지 십성과 지장간, 원국·세운·대운과의 실제 관계(sameAs가 있으면 복음, relations의 충·합)를 근거로 이 달을 설명하세요. headline은 이 달의 조언을 담은 한 문장이에요. 본문 끝에 "**직업운:** …", "**재물운:** …", "**관계운:** …", "**이번 달의 조언:** …" 네 줄을 각각 한 문단으로 쓰세요. 이 달에 어떤 사건이 반드시 생긴다고 쓰지 마세요. 총운 장에서 설명한 대운·세운의 기본 구조와 용어 뜻은 다시 풀지 말고 이 달에 새로 생기는 조건만 쓰세요. 분량은 공백 포함 300~550자입니다.`});
  push('watch',`${year}년 주목할 시기`,{refs:mw,ask:'월운 흐름에서 주목할 시기 네 개를 "### 1. 주제" 소제목과 "기간: 2027년 4월~6월 무렵"처럼 기간 문단으로 나누어 설명하세요. 기간은 제공된 월운 시작·끝 날짜 안에서만 쓰고, 반드시 변화가 생긴다는 예언으로 쓰지 마세요. 월별 장의 설명을 되풀이하지 말고 시기와 이유만 쓰세요. 분량은 공백 포함 400~700자입니다.'});
  push('strategy',`${year}년을 잘 활용하기 위한 다섯 가지 전략`,{refs:['ny.frame'],ask:'"### 전략 1. …하십시오"부터 "### 전략 5"까지 다섯 소제목과 각각 한두 문단의 설명을 쓰세요. 앞 장의 설명을 반복하지 마세요. 분량은 공백 포함 600~1000자입니다.'});
  push('questions','올해의 핵심 질문 세 가지',{refs:['ny.frame'],ask:'"### 첫 번째 질문", "### 두 번째 질문", "### 세 번째 질문" 소제목 아래 각각 **굵은 큰따옴표 질문** 한 문단과 원국·운의 근거 한두 문장을 쓰세요. 분량은 공백 포함 400~700자입니다.'});
 }else{
  (TOPICS[cat]||[]).forEach((t,i)=>push('topic',t,{mode:'ai',people:['topic-love','topic-marriage','topic-reunion'].includes(cat)&&i===1,ask:`"${t}"에 대해 원국과 실제 운을 근거로 설명하세요. 앞 장에서 설명한 원국의 기본 성향과 용어 뜻은 다시 풀지 말고 이 장의 질문에 새로 필요한 근거만 쓰세요. 분량은 공백 포함 500~900자입니다. 새 용어는 처음 나올 때 뜻을 풀고 구체적인 장면, 반대 조건, **굵은 한 문장**의 정리를 넣으세요. advice에는 "~하십시오"로 끝나는 핵심 조언 한 문장을 쓰세요.`}));
  if(cat==='ziwei')[['직업운','직업과 사회적 역할'],['재물운','재물과 생활의 안정'],[st==='married'||st==='dating'?'결혼운':'연애·결혼운','배우자와 가까운 관계'],['인간관계','가족과 주변 사람들'],['주거운','주거와 생활 기반'],['건강운','마음의 만족과 휴식']].forEach(([tag,t])=>push('domain',t,{mode:'prefix',prefix:tag,tag,people:tag==='인간관계',ask:ASK.domain(tag,'해당 궁의 실제 별을 근거로 쓰고, 앞 장에서 설명한 별의 기본 뜻은 다시 풀지 마세요.')}));
  if(saju||cat==='gunghap'){const ds=extra.daeuns||[],now=ds.find(d=>d.y1<=year&&year<d.y2),next=ds[ds.indexOf(now)+1];push('future',cat==='gunghap'?'앞으로 함께 살펴볼 해':`${year}~${year+9}년 ${noun} 흐름`,{tag:'앞으로 10년',refs:cat==='gunghap'?[]:Array.from({length:10},(_,i)=>'year.'+(year+i)),ask:ASK.future(year)});
   push('flow',cat==='gunghap'?'각자의 대운과 관계의 과제':`대운으로 본 ${noun}의 흐름`,{tag:'대운',refs:[now,next].filter(Boolean).map(d=>'decade.'+d.age),ask:`지난 대운에서 지금 대운으로 바뀌며 ${noun||'관계'}의 주제가 어떻게 달라졌는지, 다음 대운에서 무엇을 준비할지 "### 소제목"으로 나누어 설명하세요.`});}
  if(cat==='ziwei'){push('flow','현재 대한에서 강조되는 영역',{tag:'지금의 운',ask:'현재 대한의 궁과 별을 근거로 지금 강조되는 영역을 설명하세요. 앞 장에서 설명한 명궁·별의 기본 뜻은 다시 풀지 마세요. 분량은 공백 포함 500~900자입니다.'});push('flow','다음 대한과 준비할 과제',{tag:'앞으로의 운',ask:'다음 대한의 궁과 별을 근거로 준비할 과제를 설명하세요. 앞 장에서 설명한 명궁·별의 기본 뜻은 다시 풀지 마세요. 분량은 공백 포함 400~700자입니다.'});}
 }
 if(cat!=='newyear')push('story',cat==='life'?'당신의 인생을 하나의 이야기로 연결한다면':`당신의 ${josa(noun||'이야기','을/를')} 하나로 연결한다면`,{ask:ASK.story});
 push('epilogue',cat==='newyear'?`${year}년이 당신에게 남기는 메시지`:'앞으로 당신에게 가장 중요한 질문',{ask:cat==='newyear'?`${year}년의 운을 대운·세운·지장간으로 한 번에 정리하고, 새로운 기회가 반드시 온다는 예언이 아니라는 점을 밝힌 뒤, 당신이 생각해 볼 질문으로 마무리하세요. 앞 장의 내용을 다시 풀지 마세요. 분량은 공백 포함 400~700자입니다. headline은 리포트를 닫는 인용구 한 문장이에요.`:ASK.epilogue});
 push('guide',cat==='life'?'당신의 인생 활용 설명서':cat==='newyear'?`${year}년 인생 활용 설명서`:`당신의 ${noun||CAT[cat]} 활용 설명서`,{ask:cat==='newyear'?'"### 올해 살려야 할 강점", "### 올해 주의할 패턴", "### 올해 추천하는 실천 방법" 세 소제목 아래 각각 "- " 목록 3~4개를 짧은 명사형으로 쓰세요. basis와 advice는 비우세요.':ASK.guide});
 // 천기가 말풍선으로 다음 이야기를 여는 자리
 const at=k=>list.findIndex(c=>c.kind===k);
 [[['future','decade','flow'].map(at).filter(i=>i>0).sort((x,y)=>x-y)[0]??-1,'이제 시간의<br>흐름을 따라<br>짚어 보겠습니다.'],[at('domain'),'이제 일과 돈,<br>사람의 이야기로<br>넘어가<br>보겠습니다.'],[at('half'),'이제 달마다<br>달라지는<br>흐름을<br>보겠습니다.'],[at('strategy'),'올해를 잘<br>쓰는 방법을<br>정리해<br>보겠습니다.'],[at('story'),'지금까지의<br>이야기를<br>하나로<br>이어 보겠습니다.']].forEach(([i,t])=>{if(i>0&&!list[i].cue)list[i].cue=t;});
 // 올해 세운은 어느 장에서든 언급할 수 있게 근거로 함께 붙인다(자료에 있을 때만 쓰인다).
 return list.map((c,i)=>({id:'ai-'+(i+1),...c,months:c.months||[],refs:unique([...(c.refs||[]),'year.'+year]),question:c.ask+consultationQuestion(c)+(c.mode!=='fixed'?' plan의 title에는 이 명식에만 맞는 장 제목(12~32자, 비유보다 핵심 메시지)을 쓰세요.':'')}));
}
// 장 번호: 프롤로그·에필로그는 이름으로, 활용 설명서는 번호 없이, 나머지는 1장부터.
function chapterLabels(chapters){let n=0;const ny=chapters.some(c=>c.kind==='mw');return chapters.map((c,i)=>c.kind==='prologue'?'프롤로그':c.kind==='epilogue'?'에필로그':c.kind==='guide'?'':c.kind==='mw'?(chapters[i-1]?.kind==='mw'?'':`${ny?'제':''}${++n}장`):`${ny?'제':''}${++n}장`);}
function chapterTitleText(c,plan){const p=plan?.chapters?.find(x=>x.id===c.id),t=typeof p?.title==='string'&&p.title.trim().length>=4&&p.title.length<=60&&!wordingIssues(p.title).length?readerText(p.title.trim()):'';return c.mode==='ai'?(t||c.title):c.mode==='prefix'?`${c.prefix} — ${t||c.title}`:c.title;}
function chapterTitle(c,plan){const text=esc(chapterTitleText(c,plan)),title=typeof _glueOrphanSegment==='function'?_glueOrphanSegment(text):text;return title+(c.tag&&c.mode!=='prefix'&&c.kind!=='future'&&!c.title.includes(c.tag)?` <small class="ai-chapter-tag">(${esc(c.tag)})</small>`:'');}
function sources(cat,s,meta){
 const ledger=[],sourceLimits=[],add=(id,label,value,anchors=[])=>{ledger.push({id,label,value,anchors:unique(anchors.filter(v=>typeof v==='string'&&v.length))});};
 let daeuns=[],timeline=null,newyearFrame=null;const chart=buildChartAnalysis(s),year=cat==='newyear'?Number(meta.nyExtra?.y)||new Date().getFullYear():new Date().getFullYear();
 if(!['ziwei','name','gunghap'].includes(cat)){
  const ids=['year','month','day','hour'];chart.pillars.forEach((p,i)=>{const id=ids[['연주','월주','일주','시주'].indexOf(p.place)];add('natal.'+id+'.stem',p.place+' 천간',{glyph:p.stem,god:p.stemGod},[p.stem,p.stemGod]);add('natal.'+id+'.branch',p.place+' 지지',{glyph:p.branch,god:p.branchGod,hidden:p.hidden},[p.branch,p.branchGod,...p.hidden.map(h=>h.stem)]);});
  add('natal.season','월지에서 확인한 계절',{season:chart.season,monthBranch:BRCHKO[s.mp.branch],limits:chart.limits},[chart.season,BRCHKO[s.mp.branch]]);
  add('natal.relations','실제로 계산한 원국의 관계',chart.relations,unique(chart.relations.flatMap(r=>[r.left,r.right,r.kind])));
  if(chart.sinsal.length)add('natal.sinsal','실제로 계산한 신살',chart.sinsal.map(x=>({...x,place:String(x.place||'').replace(/^년/,'연')})),chart.sinsal.map(x=>x.name));
  const oh=ohCount(s),max=Math.max(...oh);add('natal.elements','겉글자 오행 개수',{counts:oh,names:OHNAME,tiedMax:oh.map((v,i)=>v===max?OHNAME[i]:null).filter(Boolean),limitation:'개수는 계절의 힘이나 신강약·용신 판정이 아님'},OHNAME);
  const dq=calcDaeun(s,meta.sy,meta.sm,meta.sd,Number(meta.hour)>=0?meta.hour:12,meta.min||0,meta.gender||gender);
  timeline={forward:!!dq.forward,startYears:dq.startYears,startMonths:dq.startMonths};daeuns=dq.daeuns.map(d=>{const y1=Math.round(Number(meta.sy)+(Number(meta.sm)-1)/12+d.age+(Number(dq.startMonths)||0)/12);return {age:d.age,from:d.age,stem:STEMKO[d.stem],branch:BRCHKO[d.branch],y1,y2:y1+10};});
  dq.daeuns.forEach((d,k)=>add('decade.'+d.age,d.age+'~'+(d.age+9)+'세 대운',{from:d.age,to:d.age+9,approxYears:[daeuns[k].y1,daeuns[k].y2],stem:STEMKO[d.stem],branch:BRCHKO[d.branch],stemGod:tenGod(s.dp.stem,d.stem),branchGod:tenGod(s.dp.stem,BR_MAIN_STEM[d.branch]),timeKnown:!!s.hp},[STEMKO[d.stem],BRCHKO[d.branch],String(d.age)+'세']));
  for(let y=year-3;y<=year+10;y++){const v=_lifeV2YearInfo(s,y),relations=['yp','mp','dp','hp'].filter(k=>s[k]).map((k,i)=>({place:({yp:'연지',mp:'월지',dp:'일지',hp:'시지'})[k],glyph:BRCHKO[s[k].branch],kind:brRel(s[k].branch,v.yp.branch).kind}));add('year.'+y,y+'년 세운',{year:y,stem:STEMKO[v.yp.stem],branch:BRCHKO[v.yp.branch],stemGod:v.tg,branchGod:v.btg,relations},[y+'년',STEMKO[v.yp.stem],BRCHKO[v.yp.branch],...relations.filter(r=>r.kind!=='평').map(r=>r.kind)]);}
  for(let m=1;m<=12;m++){const yp=yearPillar(year,m,15,12,0),mp=monthPillar(yp.stem,monthIdx(year,m,15,12,0));add(`month.${year}.${m}`,`${year}년 ${m}월의 대표 월주`,{year,month:m,representativeDate:`${year}-${m}-15`,stem:STEMKO[mp.stem],branch:BRCHKO[mp.branch],stemGod:tenGod(s.dp.stem,mp.stem),branchGod:tenGod(s.dp.stem,BR_MAIN_STEM[mp.branch]),limits:'절기 기준 월운의 대표일이며 달력상 월 전체의 정확한 경계가 아님'},[m+'월',STEMKO[mp.stem],BRCHKO[mp.branch]]);}
  if(cat==='newyear'||(g.PremiumSaju?.products[cat]&&cat.startsWith('topic-'))){
   // 신년운세는 입춘부터 다음 입춘 전까지 절기로 나눈 12개 명리월을 쓴다. 절입 시각은 KST.
   const pad=n=>String(n).padStart(2,'0'),at=(y,lon)=>findTermUT(y,lon)+KST,fmt=jd=>{const g=jdToG(jd),t=Math.round(g.hour*60);return `${g.year}-${pad(g.month)}-${pad(g.day)} ${pad(Math.floor(t/60)%24)}:${pad(t%60)}`;};
   const hidden=b=>(AI_COPY_HIDDEN_STEMS[b]||[]).map(h=>({stem:STEMKO[h],god:tenGod(s.dp.stem,h)}));
   const yp=yearPillar(year,6,1,12,0),cur=daeuns.find(d=>d.y1<=year&&year<d.y2),curB=cur?BRCHKO.indexOf(cur.branch):-1,curS=cur?STEMKO.indexOf(cur.stem):-1;
   const natal=[['연지','yp'],['월지','mp'],['일지','dp'],['시지','hp']].filter(([,k])=>s[k]);
   const same=(st,br)=>[...[['연주','yp'],['월주','mp'],['일주','dp'],['시주','hp']].filter(([,k])=>s[k]&&s[k].stem===st&&s[k].branch===br).map(([n])=>'원국 '+n),...(st===yp.stem&&br===yp.branch?['세운']:[]),...(st===curS&&br===curB?['대운']:[])];
   const rels=(br,extra)=>[...natal.map(([n,k])=>({with:n,glyph:BRCHKO[s[k].branch],kind:brRel(s[k].branch,br).kind})),...extra].filter(r=>r.kind&&r.kind!=='평');
   const frame={year,yearPillar:{stem:STEMKO[yp.stem],branch:BRCHKO[yp.branch],stemGod:tenGod(s.dp.stem,yp.stem),branchGod:tenGod(s.dp.stem,BR_MAIN_STEM[yp.branch]),hidden:hidden(yp.branch),sameAs:same(yp.stem,yp.branch).filter(x=>x!=='세운'),relations:rels(yp.branch,curB>=0?[{with:'대운 지지',glyph:cur.branch,kind:brRel(curB,yp.branch).kind}]:[])},daeun:cur?{...cur,stemGod:tenGod(s.dp.stem,curS),branchGod:tenGod(s.dp.stem,BR_MAIN_STEM[curB]),hidden:hidden(curB)}:null,ipchun:fmt(at(year,315)),nextIpchun:fmt(at(year+1,315))};
   add('ny.frame',`${year}년 세운과 현재 대운`,frame,[STEMKO[yp.stem]+BRCHKO[yp.branch],STEMKO[yp.stem],BRCHKO[yp.branch],...(cur?[cur.stem+cur.branch,cur.stem,cur.branch]:[])]);newyearFrame=frame;
   for(let k=0;k<12;k++){const start=at(k===11?year+1:year,MON_LON[k]),end=k<11?at(k+1===11?year+1:year,MON_LON[k+1]):at(year+1,315),mp=monthPillar(yp.stem,k);
    add(`mw.${year}.${k+1}`,`${year}년 ${k+1}월운(${STEMKO[mp.stem]}${BRCHKO[mp.branch]}월)`,{order:k+1,start:fmt(start),end:fmt(end),stem:STEMKO[mp.stem],branch:BRCHKO[mp.branch],stemGod:tenGod(s.dp.stem,mp.stem),branchGod:tenGod(s.dp.stem,BR_MAIN_STEM[mp.branch]),hidden:hidden(mp.branch),sameAs:same(mp.stem,mp.branch),relations:rels(mp.branch,[{with:'세운 지지',glyph:BRCHKO[yp.branch],kind:brRel(yp.branch,mp.branch).kind},...(curB>=0?[{with:'대운 지지',glyph:cur.branch,kind:brRel(curB,mp.branch).kind}]:[])])},[`${k+1}월운`,STEMKO[mp.stem]+BRCHKO[mp.branch],STEMKO[mp.stem],BRCHKO[mp.branch]]);}
  }
 }else if(cat==='ziwei'){
  if(!s.hp)sourceLimits.push('출생시각 미상: 명궁·신궁과 별 배치는 임시 기준 명반이며 확정된 배치가 아님. 본문은 이 가정과 실제 출생시각 확인 필요성을 명시해야 함');
  const z=zwEvidenceRefs(s,meta);z.refs.forEach(r=>add(r.id,r.label,{description:r.label},[r.label.match(/[가-힣]+/g)?.[0]||r.label]));
  const ch=buildZiweiChart(s,meta);add('zw.chart','현재 엔진이 산출한 명반',{palaces:ch.palaces.map(p=>({name:p.name,branch:BRCHKO[p.branch],branchIndex:p.branch,stars:p.stars})),shen:ch.shenPalace.name,decades:ch.decades.map(d=>({from:d.from,to:d.to,palace:d.palace.name})),limits:'내장 간이 명반. 유년·유월·삼방사정·보조성 전체는 미계산'},ch.palaces.flatMap(p=>[p.name,...p.stars]));
 }else if(cat==='gunghap'){
  const p=rpPartnerSaju(meta.gnExtra);if(!p)throw Error('상대방 정보가 필요해요.');if(!p.saju.hp)sourceLimits.push('상대방 출생시각 미상: 상대 시주는 제외하며 상대 대운의 시작 시기는 대략적인 참고 범위.');const r=pairEvidenceRefs(s,p.saju,p.ctx);r.refs.forEach(v=>add(v.id,v.label,{description:v.label},v.label.match(/[가-힣]{2,}/g)||[]));add('pair.chart.self','본인 사주 원국',chart,chart.pillars.flatMap(p=>[p.stem,p.branch]));const c=buildChartAnalysis(p.saju);add('pair.chart.partner','상대방 사주 원국',c,c.pillars.flatMap(p=>[p.stem,p.branch]));
  let birth={sy:meta.gnExtra.gy,sm:meta.gnExtra.gm,sd:meta.gnExtra.gd,hour:meta.gnExtra.gh,min:meta.gnExtra.gmin||0,gender:meta.gnExtra.gender};
  if(meta.gnExtra.cal==='lunar'){const v=l2s(birth.sy,birth.sm,birth.sd,!!meta.gnExtra.leap);Object.assign(birth,{sy:v.y,sm:v.m,sd:v.d});}
  if(birth.hour>=0&&!meta.gnExtra.dstAsIs&&typeof krDstActive==='function'&&krDstActive(birth.sy,birth.sm,birth.sd,birth.hour,birth.min)){const t=krDstShift(birth.sy,birth.sm,birth.sd,birth.hour,birth.min);Object.assign(birth,{sy:t.y,sm:t.m,sd:t.d,hour:t.h,min:t.mi});}
  if(birth.hour>=0&&meta.gnExtra.cityKey){const offset=Math.round(getTrueSolarOffsetMin(meta.gnExtra.cityKey)||0),t=((birth.hour*60+birth.min+offset)%1440+1440)%1440;birth.hour=Math.floor(t/60);birth.min=t%60;}
  [[s,meta,'self'],[p.saju,birth,'partner']].forEach(([chart,ctx,who])=>{
   const d=calcDaeun(chart,ctx.sy,ctx.sm,ctx.sd,Number(ctx.hour)>=0?ctx.hour:12,ctx.min||0,ctx.gender||gender);
   add('pair.'+who+'.decades',who==='self'?'본인 대운':'상대방 대운',d.daeuns.map(v=>({from:v.age,to:v.age+9,stem:STEMKO[v.stem],branch:BRCHKO[v.branch],stemGod:tenGod(chart.dp.stem,v.stem),timeKnown:!!chart.hp})),['대운']);
   for(let y=year-1;y<=year+5;y++){const v=_lifeV2YearInfo(chart,y);add(`pair.${who}.year.${y}`,`${who==='self'?'본인':'상대방'} ${y}년 세운`,{year:y,stem:STEMKO[v.yp.stem],branch:BRCHKO[v.yp.branch],stemGod:v.tg,relations:['yp','mp','dp','hp'].filter(k=>chart[k]).map(k=>({place:k,kind:brRel(chart[k].branch,v.yp.branch).kind}))},[y+'년',STEMKO[v.yp.stem],BRCHKO[v.yp.branch]]);}
  });

 }else{
  const refs=nameEvidenceRefs(s,meta.nmExtra);refs.refs.filter(r=>r.id!=='name.yongsin').forEach(r=>add(r.id,r.label,{description:r.label},r.label.match(/[가-힣一-龥]{1,}/g)||[]));const nm=nameModel(s,meta.nmExtra);const hanjaStatus=meta.counsel?.answers?.find(a=>a.key==='hanjaStatus')?.value,hanjaUnknown=hanjaStatus==='한자를 모름·한글 이름';if(hanjaStatus!=='실제 사용하는 한자 확인')sourceLimits.push('한자 미확인 또는 검토 후보: 실제 사용 이름이라고 단정하지 않으며 등록 가능 여부도 미검증.');if(hanjaUnknown){for(let i=ledger.length-1;i>=0;i--)if(!['name.sound'].includes(ledger[i].id))ledger.splice(i,1);sourceLimits.push('한자 미확인: 한자 뜻·자원오행·획수·수리격은 해석에서 제외. 한글 이름과 발음만 분석.');}add('name.sound','소리 오행의 실제 분포',nm.nameOh,LV4_OH);if(!hanjaUnknown)add('name.hanja','입력 또는 자동 후보로 선택된 한자',Object.fromEntries(['surname','given1','given2'].map(k=>[k,{glyph:nm.han[k],strokes:nm.strokes[k],meaning:nm.han[k]?getHanMeaning(nm.han[k]):'',element:nm.han[k]?getHanZawonOh(nm.han[k]):null,autoCandidate:hanjaStatus!=='실제 사용하는 한자 확인'||!!nm.auto}])),Object.values(nm.han));if(nm.suri&&!hanjaUnknown)add('name.suri','현재 방식의 4격 획수',Object.fromEntries(['won','hyeong','i','jeong'].map(k=>[k,{stroke:nm.suri[k].stroke,element:nm.suri[k].oh,classification:nm.suri[k].good}])),['원격','형격','이격','정격','획수']);add('name.chart','이름과 대조하는 실제 사주 원국',chart,chart.pillars.flatMap(p=>[p.stem,p.branch]));
 }
 const storytelling=selectStory(cat,ledger);
 const spec=g.PremiumSaju?.products[cat],productGuide=spec?{version:g.PremiumSaju.version,title:spec.title,targetCharacters:spec.range,rules:spec.rules,structure:'질문 프롤로그 → 주제별 원국 → 강점과 갈등 → 실제 대운·세운·필요한 월운 → 사용자 상황과 선택 → 질문을 회수하는 결론',sources:{calculation:'CALCULATED',interpretation:'INTERPRETED',user:'USER_PROVIDED',advice:'ADVICE',missing:'UNKNOWN'}}:null;
 return {version:VERSION,contextPolicy:'consultation-v2-occupation-scoped',productGuide,storytelling,product:cat,label:CAT[cat],year,age:year-Number(meta.sy)+1,birthTimeKnown:!!s.hp,limits:chart.limits.concat(sourceLimits),ledger,timeline,frame:newyearFrame,chapters:outline(cat,year,meta,{daeuns}),userStatements:{source:'user-stated',marital:meta.marital||'',counsel:meta.counsel||null,question:ctxSituationText()||''},executionProfile:'compact-v1'};
}
function selectStory(cat,ledger){
 const primary=g.PremiumSaju?.products[cat]?.story||(cat==='ziwei'?'STORY_09':cat==='newyear'?'STORY_04':cat==='gunghap'?'STORY_02':['topic-money','topic-career','topic-reunion'].includes(cat)?'STORY_05':cat==='topic-health'?'STORY_10':cat.startsWith('topic-')?'STORY_03':'STORY_01');
 const relation=ledger.find(s=>s.id==='natal.relations'&&s.value.some(r=>['충','형','해','원진'].includes(r.kind)));
 return {primary,secondary:unique([...(relation?['STORY_02']:[]),...(['life','newyear','ziwei'].includes(cat)||g.PremiumSaju?.products[cat]?['STORY_06']:[])]).filter(x=>x!==primary),conflictSource:relation?.id||null,rule:'상품 목적을 우선하고, 상충 서사는 실제 관계 신호가 있을 때만 선택'};
}
function parse(text){try{const t=String(text||''),a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(t.slice(a,b+1));}catch(e){return null;}}
const inflight=new Map();
function reportError(code,message,status=0){return Object.assign(new Error(message),{code,status,permanent:['NEED_PAYMENT','PAID_LIMIT','INVALID_REPORT_SOURCE'].includes(code)||[400,401,403,404].includes(status)});}
function diagnostic(report,event,details={}){const row={at:Date.now(),product:report.product,event,...details};try{const rows=JSON.parse(localStorage.getItem('ai-report-diagnostics-v2')||'[]');rows.push(row);localStorage.setItem('ai-report-diagnostics-v2',JSON.stringify(rows.slice(-40)));}catch(e){}}
function normalizePlan(raw,report){
 if(!raw||!raw.profile||!Array.isArray(raw.chapters))return raw;
 const plan=JSON.parse(JSON.stringify(raw)),by=new Map(plan.chapters.map(c=>[c.id,c]));
 plan.chapters=report.chapters.map(c=>by.get(c.id)).filter(Boolean);
 if(report.executionProfile==='compact-v1')for(const c of report.chapters){const p=by.get(c.id);if(p){if(typeof p.focus!=='string')p.focus=c.title;if(typeof p.title!=='string')p.title='';if(typeof p.connection!=='string')p.connection=(plan.links||[]).find(l=>l.to===c.id)?.development||p.conclusion;}}
 // Attach the exact requested months already present in the calculation ledger; no prose or facts are invented.
 for(const c of report.chapters){const p=by.get(c.id);if(p&&Array.isArray(p.evidenceRefs))p.evidenceRefs=unique([...(c.refs||[]),...c.months.map(m=>`month.${report.year}.${m}`),...p.evidenceRefs].filter(id=>report.ledger.some(x=>x.id===id))).slice(0,16);}
 if(!Array.isArray(plan.links))plan.links=[];
 plan.links=plan.links.filter(l=>{const a=by.get(l.from),b=by.get(l.to);return a&&b&&report.chapters.findIndex(c=>c.id===l.from)<report.chapters.findIndex(c=>c.id===l.to)&&typeof l.development==='string'&&l.development.length>=15&&Array.isArray(l.evidenceRefs)&&l.evidenceRefs.length&&l.evidenceRefs.every(id=>a.evidenceRefs?.includes(id)&&b.evidenceRefs?.includes(id));});
 if(!plan.links.length&&plan.chapters.length>=8){for(let i=1;i<plan.chapters.length;i++){const a=plan.chapters[i-1],b=plan.chapters[i],shared=(a.evidenceRefs||[]).filter(id=>(b.evidenceRefs||[]).includes(id));if(shared.length&&typeof b.connection==='string'&&b.connection.length>=15){plan.links.push({from:a.id,to:b.id,evidenceRefs:shared,development:b.connection});break;}}}
 return plan;
}
function normalizeSection(raw){
 if(!raw||!Array.isArray(raw.paragraphs))return raw;
 return {...raw,paragraphs:raw.paragraphs.filter(t=>typeof t==='string').map(t=>t.trim()).filter(Boolean)};
}
function validRefs(refs,report,min=2){return Array.isArray(refs)&&unique(refs).length>=min&&refs.every(id=>report.ledger.some(s=>s.id===id));}
function validLinks(plan,report){const links=plan?.links;if(!Array.isArray(links)||(report.chapters.length>=8&&!links.length))return false;return links.every(l=>{const from=plan.chapters?.find(c=>c.id===l.from),to=plan.chapters?.find(c=>c.id===l.to);return from&&to&&report.chapters.findIndex(c=>c.id===l.from)<report.chapters.findIndex(c=>c.id===l.to)&&typeof l.development==='string'&&l.development.length>=15&&Array.isArray(l.evidenceRefs)&&l.evidenceRefs.length>0&&l.evidenceRefs.every(id=>from.evidenceRefs.includes(id)&&to.evidenceRefs.includes(id));});}
function planQuality(plan,report){return !!(plan&&plan.profile&&typeof plan.profile.theme==='string'&&plan.profile.theme.length>=8&&plan.profile.theme.length<=100&&typeof plan.profile.mainConclusion==='string'&&plan.profile.mainConclusion.length>=15&&['strength','challenge','action','closing'].every(k=>typeof plan.profile[k]==='string'&&plan.profile[k].trim().length>0)&&Array.isArray(plan.profile.keywords)&&plan.profile.keywords.length>=1&&plan.profile.keywords.length<=5&&validRefs(plan.profile.evidenceRefs,report)&&!factIssues(Object.values(plan.profile).filter(v=>typeof v==='string').join(' '),report,plan.profile.evidenceRefs).length&&Array.isArray(plan.chapters)&&plan.chapters.length===report.chapters.length&&validLinks(plan,report)&&new Set(plan.chapters.map(c=>compact(c.conclusion))).size===report.chapters.length&&report.chapters.every(c=>{const p=plan.chapters.find(x=>x.id===c.id);return p&&typeof p.conclusion==='string'&&p.conclusion.length>=15&&validRefs(p.evidenceRefs,report)&&typeof p.focus==='string'&&!factIssues(p.conclusion,report,p.evidenceRefs).length&&c.months.every(m=>p.evidenceRefs.includes(`month.${report.year}.${m}`))&&(c.kind!=='topic-months'||c.refs.filter(id=>id.startsWith('mw.')).every(id=>p.evidenceRefs.includes(id)));}));}
function natalClaimsConsistent(body,report){
 if(['ziwei','gunghap'].includes(report.product))return true;
 const chart=report.ledger.find(x=>x.id==='name.chart')?.value;
 const places=[['연주','연간','연지','year'],['월주','월간','월지','month'],['일주','일간','일지','day'],['시주','시간','시지','hour']];
 const end=String.raw`(?=[\s“”‘’'".,，。·]|$|이(?:에요|므로|라|고|며|다)|예요|으로|로|[목화토금수])`;
 for(const [place,stemLabel,branchLabel,key]of places){
  const p=chart?.pillars?.find(p=>p.place===place),stem=report.ledger.find(x=>x.id===`natal.${key}.stem`)?.value.glyph||p?.stem,branch=report.ledger.find(x=>x.id===`natal.${key}.branch`)?.value.glyph||p?.branch;
  const tail=String.raw`(?:은|는|이|가|의|에는|에)?\s*[“‘'"]?`;
  for(const [label,actual,chars]of [[stemLabel,stem,'갑을병정무기경신임계'],[branchLabel,branch,'자축인묘진사오미신유술해']]){
   // '시간' in everyday Korean is not a claim about the hour's stem.
   if(label==='시간')continue;
   const regex=new RegExp(label+tail+'(['+chars+'])'+end,'g');for(const m of body.matchAll(regex))if(!actual||m[1]!==actual)return false;
  }
  const full=new RegExp(place+tail+'([갑을병정무기경신임계])([자축인묘진사오미신유술해])'+end,'g');for(const m of body.matchAll(full))if(!stem||m[1]!==stem||m[2]!==branch)return false;
 }
 return true;
}
function factIssues(body,report,refs){
 const issues=[],source=report.ledger.filter(s=>refs?.includes(s.id));
 const years=new Set(source.flatMap(s=>JSON.stringify(s.value).match(/(?:19|20|21)\d{2}/g)||[]));
 for(const y of String(body).match(/(?:19|20|21)\d{2}년/g)||[])if(!years.has(y.slice(0,4)))issues.push('unsupported_year');
 if(!natalClaimsConsistent(body,report))issues.push('wrong_natal_claim');
 if(!readingProvenanceQuality(body)||/(?:반드시|무조건).{0,15}(?:성공|합격|재회|결혼)|100\s?%|(?:암|사망|큰 병).{0,8}(?:생겨|걸려|찾아와)/.test(body))issues.push('unsupported_assertion');
 const chart=report.ledger.find(x=>x.id==='zw.chart')?.value;
 if(report.product==='ziwei'&&chart&&!zwClaimsConsistent(body,{palaces:chart.palaces.map(p=>({...p,branch:p.branchIndex}))}))issues.push('wrong_palace');
 return issues;
}
// Remove verbatim cross-chapter boilerplate before validation; never invent replacement prose.
function editDuplicateSentences(section,accepted,report){
 if(!section?.paragraphs||['prologue','guide','epilogue','story'].includes(report.chapters.find(c=>c.id===section.id)?.kind))return section;
 const prior=compact(Object.values(accepted).filter(c=>c.id!==section.id).flatMap(c=>c.paragraphs||[]).join(' '));
 if(!prior)return section;
 const paragraphs=section.paragraphs.map(p=>p.split(/(?<=[.!?])\s+/).filter(sentence=>compact(sentence).length<35||!prior.includes(compact(sentence))).join(' ')).filter(Boolean);
 return {...section,paragraphs};
}
function chapterIssues(section,report,plan,accepted={}){
 const issues=[];if(!section||!report.chapters.some(c=>c.id===section.id))return ['unknown_chapter'];
 const target=report.chapters.find(c=>c.id===section.id),p=plan?.chapters.find(c=>c.id===section.id),ps=section.paragraphs,refs=section.evidenceRefs;
 if(!validRefs(refs,report))issues.push('unassigned_evidence');
 if(!Array.isArray(ps)||ps.length<2||ps.length>48||ps.some(x=>typeof x!=='string'||x.trim().length<2)||ps.join('').length<240||ps.join('').length>(report.depth==='pdf'?(target.pdfMaxCharacters||Math.min(6000,Math.floor(45000/report.chapters.length))):4500))return issues.concat('insufficient_explanation');
 const body=ps.join(' '),analysis=section.analysis;
 // A ten-year table is not a substitute for ten individual prose readings.
 if(['future','topic-future'].includes(target.kind)&&(target.refs||[]).some(id=>/^year\.\d{4}$/.test(id))){
  const lines=ps.flatMap(t=>t.split(/\n+/)),headings=lines.map((text,i)=>({text,i})).filter(x=>/^#{2,4}\s+/.test(x.text.trim()));
  const years=unique(target.refs.filter(id=>/^year\.\d{4}$/.test(id)).map(id=>id.slice(5)));
  if(years.some(year=>!refs?.includes('year.'+year)))issues.push('missing_year_evidence');
  let previous=-1;
  for(const year of years){const matches=headings.filter(h=>new RegExp('^#{2,4}\\s+'+year+'년(?:\\s|$)').test(h.text.trim()));
   if(matches.length!==1){issues.push('missing_year_'+year);continue;}
   const at=matches[0].i,next=headings.find(h=>h.i>at)?.i??lines.length;
   if(at<=previous)issues.push('year_order');previous=at;
   if(compact(lines.slice(at+1,next).join(' ')).length<35)issues.push('missing_year_explanation_'+year);
  }
 }
 const web=report.depth==='pdf'&&report.webBasis?.chapters?.find(c=>c.id===section.id);
 if(web&&compact(web.paragraphs.join(' '))===compact(body))issues.push('pdf_not_expanded');
 // Causal reasoning belongs in prose. Internal analysis strings need not be verbatim duplicates.
 // 프롤로그·활용 설명서·에필로그는 앞뒤 장을 요약하고 되짚는 장이라 근거 글자 인용과 반복 검사를 하지 않는다.
 const recap=['prologue','guide','epilogue','story'].includes(target.kind);
 if(!recap&&!/(?:때문|그래서|따라|이유|조건|반면|다만|경우|때는|다면|이에 따라|연결|이어|으로|에서|because|therefore|when|if )/i.test(body))issues.push('missing_causal_chain');
 const anchors=report.ledger.filter(s=>refs?.includes(s.id)).flatMap(s=>s.anchors);if(!recap&&!anchors.some(a=>body.includes(a)))issues.push('basis_not_in_body');
 issues.push(...factIssues(body,report,refs));
 if(!report.birthTimeKnown&&refs?.some(id=>id.startsWith('decade.'))&&!/대략|가정|참고|달라|불확실|확인|approx|uncertain/i.test(body))issues.push('unknown_decade_boundary');
 if(report.userStatements.marital==='married'&&/(?:새|새로운)\s*(?:연인|애인)을\s*만나/.test(body))issues.push('marital_context');
 if(report.age<16&&/이직|승진|대출|창업|배우자를/.test(body))issues.push('age_context');
 if(!report.birthTimeKnown&&/본인(?:의)?\s*시주(?:는|가|에)/.test(body))issues.push('unknown_hour');
 if(report.product==='ziwei'&&!report.birthTimeKnown&&!/가정|임시|시각.*확인|시간.*확인/.test(body))issues.push('unknown_ziwei_time');
 if(target.kind==='topic-months'&&target.refs.filter(id=>id.startsWith('mw.')).some(id=>!refs?.includes(id)))issues.push('missing_month_evidence');
 if(target.kind==='topic-months'&&g.ReadingVoice){const months=target.refs.filter(id=>/^mw\.\d{4}\.\d+$/.test(id)).map(id=>Number(id.split('.').at(-1)));issues.push(...g.ReadingVoice.periodIssues(ps.join('\n'),months,'월'));}
 if(target.months.some(m=>!refs.includes(`month.${report.year}.${m}`)||!body.includes(m+'월')))issues.push('missing_month');
 const others=Object.values(accepted).filter(x=>x.id!==section.id).flatMap(x=>x.paragraphs||[]).join(' ');const normOthers=compact(others);
 if(!recap)for(const sentence of body.split(/(?<=[.!?])\s+/)){if(compact(sentence).length>=35&&normOthers.includes(compact(sentence)))issues.push('repeated_explanation');}
 return unique(issues);
}
// 독자에게 그대로 보이면 안 되는 표현: 자료 ID·영어 단어, 뜻이 바로 안 잡히는 은유, 직업을 주제로 세운 제목.
const INTERNAL_ID=/\b(?:natal|decade|year|month|zw|pair|name)(?:\.[A-Za-z0-9가-힣_-]+)+|\b(?:ledger|evidenceRefs?)\b/;
const VAGUE=/(?:말|약속|관계|돈|일|마음|사람|생활)의 (?:결|모양|온도|색깔|무게|그릇|축)|(?:^|[\s(])결(?:이나|이|을|은|에|로)\s|을 거쳐 (?:손에 )?들어오는|흐름으로 읽(?:힙니다|혀요)|힘의 (?:축|작용)|무게(?:중심|가 실리)/;
const STYLE_FIX="본문에서 자료 ID(natal.relations 같은 것)와 영어 단어를 빼세요. '약속의 모양', '말의 결', '일과 책임을 거쳐 손에 들어오는 흐름'처럼 뜻이 바로 안 잡히는 비유는 '약속을 잘 지키는 사람인지 먼저 봅니다', '맡은 일을 해내고 받는 월급 같은 돈이 잘 맞습니다'처럼 누구나 한 번에 알아듣는 말로 바꾸세요.";
function wordingIssues(body){
 const t=String(body||''),issues=[];if(!/[가-힣]/.test(t))return issues;
 if(INTERNAL_ID.test(t)||/[A-Za-z]{4,}/.test(t.replace(/\bMBTI\b/g,'')))issues.push('internal_or_english_word');
 if(VAGUE.test(t))issues.push('vague_metaphor');
 return issues;
}
function statedWords(report){return (report.userStatements?.counsel?.answers||[]).map(a=>String(a.value||'').trim()).filter(v=>v.length>=2);}
function themeIssues(plan,report){const t=String(plan?.profile?.theme||''),jobs=(report.userStatements?.counsel?.answers||[]).filter(a=>a.key==='occupation').map(a=>String(a.value||'').trim()).filter(v=>v.length>=2);return jobs.some(v=>t.includes(v)||t.includes(v.split(/\s/)[0]))||/영업|직장인|자영업|공무원|프리랜서|사무직|주부|취준|구직/.test(t)?['occupation_as_theme']:[];}
// 검증을 두 번 거친 뒤에도 남은 자료 ID는 화면에서 지운다.
function readerText(t){return (g.ReadingVoice?g.ReadingVoice.cleanText(String(t||'')):String(t||'')).replace(/\b(?:natal|decade|year|month|zw|pair|name)(?:\.[A-Za-z0-9가-힣_-]+)+\s*(?:에서|에|의|을|를|은|는|이|가|와|과)?\s*/g,'').replace(/\b(?:ledger|evidenceRefs?)\b\s*/g,'');}
function reportFingerprint(report){const {executionProfile,...semantic}=report;return JSON.stringify(semantic);}
function execution(report,opts={}){return report.executionProfile==='compact-v1'&&report.depth!=='pdf'&&opts.kind!=='report-tpl'?{batch:2,concurrency:6}:{batch:4,concurrency:opts.kind==='report-tpl'?2:4};}
// PDF is an on-demand expansion. Reading a web cache never starts web authorship.
// PDF는 웹보다 자세히 쓰는 판이다. 장 지시문의 웹 분량 문장("분량은 …자입니다")만 빼고, 중복 금지 지시는 그대로 둔다.
function pdfQuestion(q){return String(q||'')
 .replace(/ ?분량은 공백 포함 \d+~\d+자입니다\./g,'').replace(/ ?웹은 공백 포함 약 \d+자 중심으로 쓰되 근거가 부족하면 줄이세요\./g,'')
 .replace(/1~2문장으로 설명하세요/g,'2~3문장으로 설명하세요').replace(/각각 한두 문단의 설명/g,'각각 두세 문단의 설명').replace(/목록 3~4개를/g,'목록 4~5개를');}
function preparePdf(report,info={}){
 const baseFingerprint=reportFingerprint(report);let web=null;
 try{const c=JSON.parse(localStorage.getItem(cacheKey(report))||'null');
  if(c&&c.exp>Date.now()&&c.complete&&c.fingerprint===baseFingerprint){const plan=normalizePlan(c.plan,report);
   if(planQuality(plan,report)&&report.chapters.every(ch=>c.accepted?.[ch.id]&&!chapterIssues(c.accepted[ch.id],report,plan).length))web={...c,plan};
  }
 }catch(e){}
 const pdf={...report,depth:'pdf',pdfEdition:'web-expansion-v1',userStatements:{...report.userStatements},webBasis:web?{plan:web.plan,chapters:report.chapters.map(c=>({id:c.id,title:chapterTitleText(c,web.plan),paragraphs:web.accepted[c.id].paragraphs,conclusion:web.plan.chapters.find(x=>x.id===c.id)?.conclusion||''}))}:null};
 const weights=report.chapters.map(c=>Math.max(400,web?.accepted[c.id]?.paragraphs.join('').length||400)),total=weights.reduce((a,b)=>a+b,0);
 pdf.chapters=report.chapters.map((c,i)=>({...c,question:pdfQuestion(c.question),pdfMaxCharacters:Math.min(6000,Math.floor(45000*weights[i]/total))}));
 if(Object.keys(info).length)pdf.userStatements.pdfInfo={source:'user-stated',...info};
 return pdf;
}
function cacheKey(report){return aiReadingCacheKey('reading-deep',VERSION+':'+report.product+':'+report.year,currentLanguage());}
function visuals(el){
 const controls=[...el.querySelectorAll('.chat-card,.pdf-cta,.next-actions')].filter(x=>!x.parentElement.closest('.chat-card,.pdf-cta,.next-actions'));
 const diagrams=[...el.querySelectorAll('.lc-graph,[id="lv4-lc-bars"]')].map(x=>{
  const parts=[...x.querySelectorAll('.lc-bars,.lc-area,.lc-curve,.lc-radar')].map(p=>{const y=p.cloneNode(true);y.querySelectorAll('.badge-t').forEach(t=>t.textContent='지수 최고');return y.outerHTML;});
  return parts.length?'<section class="lc-card lc-graph"><h3 class="lc-card-title">'+esc(x.querySelector('h3')?.textContent||'계산 지표')+'</h3>'+parts.join('')+'<small>기존 계산식의 비교 지표예요. 사건의 발생 확률이나 확정된 미래를 뜻하지 않아요.</small></section>':'';
 }).filter(Boolean);
 return {controls,diagrams,boards:[...el.querySelectorAll('.zw-board')].slice(0,1).map(x=>x.outerHTML),orbs:[...el.querySelectorAll('.lc-orbs')].filter(x=>!x.closest('.lc-pcard')).slice(0,category(el)==='gunghap'?2:1).map(x=>x.outerHTML),people:[...el.querySelectorAll('.lc-people')].filter(x=>!x.parentElement.closest('.lc-people')).slice(0,1).map(x=>{const y=x.cloneNode(true);y.removeAttribute('id');y.querySelectorAll('.lc-scene').forEach((f,i)=>{if(i)f.remove();});y.querySelectorAll('.lc-pcard').forEach(c=>{delete c.dataset.portraitDone;});const foot=y.querySelector('.lc-foot');if(foot)foot.textContent='* 인물 이미지는 AI가 그린 대표 인상이며 실존 인물이 아니에요. 출생년도·초성은 참고 예시예요.';return y.outerHTML;})};
}
// 본문 표기: 년→연 통일, 단독 '결' 금지, 자료 ID 제거, 줄 끝 고아 글자 방지. 십신 이름은 일상어로 바꾸지 않는다(용어 + 풀이 방식).
function aiText(t){
 let h=esc(readerText(t)).replace(/(?<![0-9가-힣])년(주|지|간)(?=[\s은는이가의을를에과와도,.)·(]|$)/g,'연$1').replace(/(^|[\s(])결(이에요|이라|이나|이|을|은|에서|에|대로)(?=[\s.,!?)]|$)/g,(x,a,j)=>a+'분위기'+(({이에요:'예요',이라:'라',이나:'나',이:'가',을:'를',은:'는'})[j]||j));
 h=h.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/·(?![^<]*>)/g,'·​');
 return typeof _glueOrphanSegment==='function'?_glueOrphanSegment(h):h;
}
// 문단 안 가벼운 표시: '### 소제목', '- 목록', '> 인용', 문단 전체 '**강조**'.
function aiBody(paragraphs){return aiBlocks(paragraphs).join('');}
// PDF 쪽 나눔을 위해 문단·소제목·목록을 한 덩어리씩 돌려준다.
function aiBlocks(paragraphs){
 const out=[];let items=[];const flush=()=>{if(items.length){out.push('<ul class="ai-list">'+items.map(x=>'<li>'+aiText(x)+'</li>').join('')+'</ul>');items=[];}};
 for(const line of (paragraphs||[]).flatMap(p=>String(p).split(/\n+/)).map(x=>x.trim()).filter(Boolean)){
  if(/^(?:[-•·]|\d+\.)\s+/.test(line)){items.push(line.replace(/^[-•·]\s+/,''));continue;}flush();
  if(/^#{2,4}\s*/.test(line))out.push('<h3 class="ai-subhead">'+aiText(line.replace(/^#{2,4}\s*/,''))+'</h3>');
  else if(/^>\s*/.test(line))out.push('<blockquote class="ai-quote">'+aiText(line.replace(/^>\s*/,''))+'</blockquote>');
  else if(/^\*\*[^*]+\*\*[.!?]?$/.test(line))out.push('<p class="ai-key"><strong>'+aiText(line.replace(/^\*\*|\*\*(?=[.!?]?$)/g,''))+'</strong></p>');
  else out.push('<p>'+aiText(line)+'</p>');
 }
 flush();return out;
}
// PDF처럼 표시가 없는 매체에는 기호를 떼고 보낸다.
function plain(t){return readerText(t).replace(/^#{2,4}\s*|^[-•]\s+|^>\s*/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1');}
const SEUN_THEME={정재:'경제적 성과와 책임',편재:'새로운 기회와 활동',정관:'역할과 조직 내 책임',편관:'압박과 기존 방식의 재검토',정인:'배움과 기반 정비',편인:'지식과 방향의 재정비',비견:'자신의 기준과 기반',겁재:'경쟁과 새로운 출발',식신:'실행과 결과물',상관:'표현·기획·주도권'};
const gz=(s,b)=>`${s}${b}(${HJ_S[STEMKO.indexOf(s)]||''}${HJ_B[BRCHKO.indexOf(b)]||''})`;
function ledgerValue(report,id){return report.ledger.find(x=>x.id===id)?.value;}
// 사주판: 네 기둥을 천간·지지 칸으로 그리고 오행 색, 일간 기준 십성, 지장간을 함께 보인다(웹·PDF 공통).
const OH_HEX=['#4e9a6a','#d2604e','#c99a3e','#9d9b92','#4b7bb5'],OH_HJ=['木','火','土','金','水'];
const ohRGBA=(i,a)=>{const n=parseInt(OH_HEX[i].slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;};
function natalPillars(report){return [['year','연주'],['month','월주'],['day','일주'],['hour','시주']].map(([k,place])=>{const st=ledgerValue(report,`natal.${k}.stem`),br=ledgerValue(report,`natal.${k}.branch`);return st&&br?{key:k,place,stem:st.glyph,branch:br.glyph,stemGod:k==='day'?'일간':st.god,branchGod:br.god,hidden:br.hidden||[]}:{key:k,place,unknown:true};});}
function chartPillars(chart){return ['연주','월주','일주','시주'].map((place,i)=>{const p=(chart?.pillars||[]).find(x=>x.place===place);return p?{key:['year','month','day','hour'][i],place,stem:p.stem,branch:p.branch,stemGod:place==='일주'?'일간':p.stemGod,branchGod:p.branchGod,hidden:p.hidden||[]}:{key:['year','month','day','hour'][i],place,unknown:true};});}
function boardHTML(pillars,caption){
 const cell=(g,isStem,god)=>{const i=isStem?STEMKO.indexOf(g):BRCHKO.indexOf(g),oh=isStem?SOH[i]:BOH[i];return `<div class="ai-bcell" style="background:${ohRGBA(oh,.15)};border-color:${ohRGBA(oh,.6)}"><b>${isStem?HJ_S[i]:HJ_B[i]}</b><span class="ai-bko">${esc(g)} · ${OH_HJ[oh]}</span><small>${esc(god||'')}</small></div>`;};
 const ordered=typeof manseOrdered==='function'?manseOrdered(pillars):pillars;
 return `<figure class="ai-board"><figcaption>${esc(caption||'사주 원국')}</figcaption><div class="ai-board-grid">${ordered.map(p=>p.unknown?`<div class="ai-bcol unknown"><span class="ai-bplace">${p.place}</span><div class="ai-bcell"><b>?</b><small>시간 미상</small></div><div class="ai-bcell"><b>?</b><small>&nbsp;</small></div><span class="ai-bhid">&nbsp;</span></div>`:`<div class="ai-bcol${p.key==='day'?' day':''}"><span class="ai-bplace">${p.place}</span>${cell(p.stem,true,p.stemGod)}${cell(p.branch,false,p.branchGod)}<span class="ai-bhid">${p.hidden.map(h=>esc(h.stem)).join('·')}</span></div>`).join('')}</div><p class="ai-board-legend">위 칸 천간 · 아래 칸 지지 · 맨 아래 지장간 · 칸 안 작은 글씨는 일간 기준 십성</p></figure>`;
}
// 원국 구조 도식: 일간·계절 → 실제 계산된 합·충·형 → 겉글자 오행 개수.
const REL_COLOR={충:'#d2604e',합:'#4e9a6a',반합:'#4e9a6a',삼합:'#4e9a6a',방합:'#4e9a6a',형:'#c99a3e',자형:'#c99a3e',원진:'#8e6bb5',파:'#9d9b92',해:'#9d9b92'};
function structureHTML(report){
 const ps=natalPillars(report).filter(p=>!p.unknown),rel=ledgerValue(report,'natal.relations')||[],season=ledgerValue(report,'natal.season'),el=ledgerValue(report,'natal.elements'),day=ps.find(p=>p.key==='day');
 const chip=(place,type)=>{const p=ps.find(x=>x.place===place);if(!p)return esc(place);const g=type==='stem'?p.stem:p.branch,i=type==='stem'?STEMKO.indexOf(g):BRCHKO.indexOf(g),oh=type==='stem'?SOH[i]:BOH[i];return `<span class="ai-chip" style="border-color:${OH_HEX[oh]};background:${ohRGBA(oh,.12)}">${esc(place.replace('주',type==='stem'?'간':'지'))} ${type==='stem'?HJ_S[i]:HJ_B[i]}(${esc(g)})</span>`;};
 const rows=rel.map(r=>`<div class="ai-rel">${chip(r.left,r.type)}<span class="ai-rel-line" style="border-color:${REL_COLOR[r.kind]||'#9d9b92'}"><em style="color:${REL_COLOR[r.kind]||'#9d9b92'}">${esc(r.kind)}</em></span>${chip(r.right,r.type)}</div>`).join('');
 const counts=el?.counts||[],max=Math.max(1,...counts);
 const bars=counts.map((n,i)=>`<div class="ai-oh"><span>${OH_HJ[i]} ${OHNAME[i]}</span><span class="ai-oh-track"><i style="width:${Math.round(n/max*100)}%;background:${OH_HEX[i]}"></i></span><b>${n}</b></div>`).join('');
 const di=day?STEMKO.indexOf(day.stem):-1;
 return `<figure class="ai-diagram"><figcaption>원국의 구조 한눈에</figcaption><div class="ai-dia-top">${day?`<span class="ai-pill" style="border-color:${OH_HEX[SOH[di]]}">일간 ${HJ_S[di]}(${esc(day.stem)}) · ${OH_HJ[SOH[di]]}</span>`:''}${season?`<span class="ai-pill">${esc(season.season)}에 태어남 · 월지 ${esc(season.monthBranch)}</span>`:''}</div>${rows?`<div class="ai-rels"><b>실제로 계산된 합·충·형</b>${rows}</div>`:''}${bars?`<div class="ai-ohs"><b>겉글자 오행 개수</b>${bars}<small>개수는 계절의 힘이나 신강약 판정이 아닙니다.</small></div>`:''}</figure>`;
}
function chartTable(report){
 const rows=[['hour','시주'],['day','일주'],['month','월주'],['year','연주']].map(([k,place])=>{const s=ledgerValue(report,`natal.${k}.stem`),b=ledgerValue(report,`natal.${k}.branch`);if(!s||!b)return '';
  return `<tr><th>${place}</th><td>${HJ_S[STEMKO.indexOf(s.glyph)]||''}(${esc(s.glyph)})</td><td>${HJ_B[BRCHKO.indexOf(b.glyph)]||''}(${esc(b.glyph)})</td><td>${k==='day'?'일간':esc(s.god||'')} / ${esc(b.god||'')}</td></tr>`;}).join('');
 return rows?`<div class="ai-table-wrap"><table class="ai-table"><caption>사주 원국</caption><thead><tr><th>구분</th><th>천간</th><th>지지</th><th>십성(천간/지지 본기)</th></tr></thead><tbody>${rows}</tbody></table></div>${report.birthTimeKnown?'':'<p class="ai-note">출생시각을 몰라 시주는 비워 두었습니다.</p>'}`:'';
}
function timeBasis(report){
 const t=typeof birthTimeReference==='function'?birthTimeReference(_meta):null,tl=report.timeline;
 const note=!t||!t.known?'출생시각을 몰라 시주 없이 사주를 세웠습니다.':t.applied?`출생기록의 ${t.input}을 ${t.dst?'서머타임 기간이라 1시간 앞당기고'+(t.delta?', ':' '):''}${t.delta?`출생 지역의 경도에 맞춰 ${Math.abs(t.delta)}분 ${t.delta<0?'앞당긴':'늦춘'} `:''}${t.corrected}를 기준으로 사주를 세웠습니다.`:_meta?.dstAsIs?`서머타임 시각을 입력한 그대로(${t.input}) 사주에 적용했습니다.`:`입력한 출생시각 ${t.input}을 그대로 사주에 적용했습니다.`;
 const lines=[note,tl?`대운은 ${tl.forward?'순행':'역행'}으로 계산했고, 첫 대운은 태어나고 약 ${tl.startYears}년${tl.startMonths?' '+tl.startMonths+'개월':''} 뒤에 시작합니다.`:'','대운 시작 시점은 절입 시각과 계산 방법에 따라 조금 달라질 수 있으므로 아래의 연도는 근사치입니다.'].filter(Boolean);
 return `<h3 class="ai-subhead">출생시간 및 대운 기준</h3>${lines.map(x=>'<p>'+aiText(x)+'</p>').join('')}`;
}
function yearTable(report,c){
 const rows=c.refs.map(id=>ledgerValue(report,id)).filter(Boolean).map(v=>{const rel=(v.relations||[]).filter(r=>r.kind&&r.kind!=='평').map(r=>`${r.place} ${r.kind}`).join(' · ');return `<tr><td>${v.year}</td><td>${gz(v.stem,v.branch)}</td><td>${esc(SEUN_THEME[v.stemGod]||v.stemGod||'')}${rel?`<small> · ${esc(rel)}</small>`:''}</td></tr>`;}).join('');
 return rows?`<div class="ai-table-wrap"><table class="ai-table"><thead><tr><th>연도</th><th>세운</th><th>핵심 주제</th></tr></thead><tbody>${rows}</tbody></table></div>`:'';
}
function monthTable(report){
 const rows=Array.from({length:12},(_,i)=>ledgerValue(report,`month.${report.year}.${i+1}`)).filter(Boolean).map(v=>`<tr><td>${v.month}월</td><td>${gz(v.stem,v.branch)}</td><td>${esc(SEUN_THEME[v.stemGod]||v.stemGod||'')}</td></tr>`).join('');
 return rows?`<div class="ai-table-wrap"><table class="ai-table"><caption>${report.year}년 열두 달 한눈에</caption><thead><tr><th>달</th><th>월운</th><th>핵심 주제</th></tr></thead><tbody>${rows}</tbody></table></div>`:'';
}
function stated(report,key){return (report.userStatements?.counsel?.answers||[]).find(a=>a.key===key)?.value||'';}
function heroHTML(report,state){
 const m=_meta||{},t=typeof birthTimeReference==='function'?birthTimeReference(m):null,job=stated(report,'occupation');
 const school=report.product==='ziwei'?'정통 자미두수':report.product==='name'?'성명학·사주':'정통 사주명리';
 const time=t&&t.known?(()=>{const [h,mm]=t.input.split(':').map(Number);return `${h<12?'오전':'오후'} ${h%12||12}시${mm?' '+mm+'분':''}${t.applied?` (풀이 기준 ${t.corrected})`:''}`;})():'모름';
 const rows=[['이름',m.userName?esc(m.userName):''],['생년월일',`${m.sy}년 ${m.sm}월 ${m.sd}일 (양력)`],['출생시간',esc(time)],['출생지역',typeof cityLabelOf==='function'&&m.cityKey?esc(cityLabelOf(m.cityKey)):''],['성별',(m.gender||gender)==='female'?'여성':'남성'],['직업',esc(job)]].filter(r=>r[1]);
 if(report.product==='newyear'&&report.frame){const f=report.frame,yg=gz(f.yearPillar.stem,f.yearPillar.branch),dg=f.daeun?gz(f.daeun.stem,f.daeun.branch):'',il=ledgerValue(report,'natal.day.stem'),ib=ledgerValue(report,'natal.day.branch');
  const pillars=['year','month','day','hour'].map(k=>{const a=ledgerValue(report,`natal.${k}.stem`),b=ledgerValue(report,`natal.${k}.branch`);return a&&b?`${HJ_S[STEMKO.indexOf(a.glyph)]}${HJ_B[BRCHKO.indexOf(b.glyph)]}${({year:'年',month:'月',day:'日',hour:'時'})[k]}`:'';}).filter(Boolean).join(' ');
  const sub=themeIssues(state.plan,report).length?'':' · '+esc(readerText(state.plan.profile.theme));
  const who=[...rows,['일주',il&&ib?esc(gz(il.glyph,ib.glyph).replace('(','일주(').replace(')','日柱)')):''],['현재 대운',dg?esc(dg.replace('(','대운(').replace(')','大運)')):''],['분석 세운',esc(`${f.year}년 ${yg.replace('(','년(').replace(')','年)')}`)]].filter(r=>r[1]&&r[0]!=='이름');
  const basis=[['원국',esc(pillars)],['현재 대운',dg?esc(dg.replace(/.*\(|\)/g,'')):''],[`${f.year}년 세운`,esc(yg.replace(/.*\(|\)/g,''))],['연운 기간',esc(`${f.ipchun.replace(/^(\d+)-0?(\d+)-0?(\d+) /,'$1년 $2월 $3일 ')}부터 ${f.year+1}년 입춘 직전까지`)],['월운','절기 기준 12개월']].filter(r=>r[1]);
  return `<header class="lv4-hero ai-report-hero"><h1>${f.year}년 신년운세</h1><p class="ai-hero-sub ai-hero-q">${esc(yg.replace('(','년(').replace(')','年)'))}${sub}</p><p class="ai-hero-sub">정통 사주명리 · ${f.year}년 신년운세 심층 리포트</p><dl class="ai-birth"><dt class="ai-birth-head">상담 대상</dt>${who.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><dl class="ai-birth"><dt class="ai-birth-head">분석 기준</dt>${basis.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${boardHTML(natalPillars(report))}<p class="ai-note">※ 본 리포트는 전통 명리학의 상징적 해석을 활용한 상담 자료입니다. 미래 사건이나 개인의 실제 행동을 확정하는 예측은 아닙니다.</p></header>`;}
 const title=themeIssues(state.plan,report).length?`${m.userName?esc(m.userName)+'님의 ':''}${esc(report.label)}`:esc(readerText(state.plan.profile.theme));
 return `<header class="lv4-hero ai-report-hero"><h1>${title}</h1><p class="ai-hero-sub">${school} ${esc(report.label)} · 심층 상담 리포트</p><dl class="ai-birth"><dt class="ai-birth-head">출생정보</dt>${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></header>`;
}
function chapterHTML(report,state,c,label){
 const a=state.accepted[c.id],title=chapterTitle(c,state.plan),d=c.decade;
 const mv=c.kind==='mw'?ledgerValue(report,c.refs[0]):null;
 const head=mv?`<div class="ai-ch-head ai-mw-head"><h3>${c.mw}월운. ${esc(mv.stem+mv.branch)}월(${HJ_S[STEMKO.indexOf(mv.stem)]}${HJ_B[BRCHKO.indexOf(mv.branch)]}月)</h3><p class="ai-span">${esc(mv.start.replace(/^(\d+)-0?(\d+)-0?(\d+)/,'$1년 $2월 $3일'))} ~ ${c.mw===12?esc(String(report.frame?.year+1))+'년 입춘 직전':esc(mv.end.replace(/^(\d+)-0?(\d+)-0?(\d+)/,'$1년 $2월 $3일'))}</p></div>`:`<div class="ai-ch-head">${label?`<span class="ai-ch-label">${label}</span>`:''}<h2>${title}</h2></div>`;
 if(!a)return `<section class="lv4-sec ai-authored-chapter ai-ch-${c.kind}" id="${c.id}" data-ai-authored="false">${head}<p class="ai-chapter-pending" role="status">풀이 중입니다</p></section>`;
 const quote=typeof a.headline==='string'&&a.headline.trim().length>=6?`<blockquote class="ai-headline">“${aiText(a.headline.trim().replace(/^["“]|["”]$/g,''))}”</blockquote>`:'';
 const basis=(Array.isArray(a.basis)?a.basis:[]).map(x=>String(x).trim()).filter(x=>x.length>=2).slice(0,6);
 const advice=typeof a.advice==='string'&&a.advice.trim().length>=8?`<div class="ai-advice"><b>${report.product==='newyear'?esc(c.tag||'')+'의 결론':esc(c.tag||'이 장의')+' 핵심 조언'}</b><p><strong>${aiText(a.advice.trim().replace(/^\*\*|\*\*$/g,''))}</strong></p></div>`:'';
 return `<section class="lv4-sec ai-authored-chapter ai-ch-${c.kind}" id="${c.id}" data-ai-authored="true">${head}${d?`<p class="ai-span">대략 만 ${d.from}~${d.from+10}세</p>`:''}${c.kind!=='epilogue'?quote:''}${c.kind==='chart'?(ledgerValue(report,'natal.day.stem')?boardHTML(natalPillars(report))+structureHTML(report):report.product==='gunghap'?boardHTML(chartPillars(ledgerValue(report,'pair.chart.self')),'본인 사주판')+boardHTML(chartPillars(ledgerValue(report,'pair.chart.partner')),'상대방 사주판'):''):''}${c.kind==='future'?yearTable(report,c):''}${c.monthTable?monthTable(report):''}${aiBody(a.paragraphs)}${c.kind==='chart'&&ledgerValue(report,'natal.day.stem')?timeBasis(report):''}${advice}${c.kind==='epilogue'?quote:''}${basis.length&&!['prologue','guide','epilogue','story'].includes(c.kind)?`<div class="ai-basis"><b>${report.product==='ziwei'?'자미두수 근거':report.product==='name'?'성명학 근거':'명리학적 근거'}</b><ul>${basis.map(x=>'<li>'+aiText(x)+'</li>').join('')}</ul></div>`:''}</section>`;
}
// PDF: 웹 전체 풀이와 같은 장·순서·문장을 쪽 나눔이 가능한 블록 묶음으로 돌려준다.
function pdfDoc(report,state){
 const labels=chapterLabels(report.chapters),split=html=>{const box=document.createElement('div');box.innerHTML=html;return [...box.children].map(x=>x.outerHTML);};
 const parts=[],hero=document.createElement('div');hero.innerHTML=heroHTML(report,state);const h=hero.firstElementChild;
 const title=h.querySelector('h1')?.textContent||report.label,subs=[...h.querySelectorAll('.ai-hero-sub')].map(x=>x.textContent);
 parts.push({label:'',title:'기본 정보와 풀이 기준',blocks:[...h.querySelectorAll('dl,.ai-board,.ai-note')].map(x=>x.outerHTML)});
 let group=null;
 report.chapters.forEach((c,i)=>{const a=state.accepted[c.id];if(!a)return;
  const sec=document.createElement('div');sec.innerHTML=chapterHTML(report,state,c,labels[i]);const el=sec.firstElementChild;el.querySelector('.ai-ch-head')?.remove();
  const blocks=[...el.children].flatMap(x=>x.matches('.ai-table-wrap,.ai-advice,.ai-basis,blockquote,ul,h3,p,.ai-span')?[x.outerHTML]:split(x.outerHTML));
  if(c.kind==='mw'){const mv=ledgerValue(report,c.refs[0]);const head=`<div class="ai-mw-head"><h3>${c.mw}월운. ${esc(mv.stem+mv.branch)}월(${HJ_S[STEMKO.indexOf(mv.stem)]}${HJ_B[BRCHKO.indexOf(mv.branch)]}月)</h3><p class="ai-span">${esc(mv.start.replace(/^(\d+)-0?(\d+)-0?(\d+)/,'$1년 $2월 $3일'))} ~ ${c.mw===12?esc(String(report.frame?.year+1))+'년 입춘 직전':esc(mv.end.replace(/^(\d+)-0?(\d+)-0?(\d+)/,'$1년 $2월 $3일'))}</p></div>`;
   if(!group){group={label:labels[i],title:`${report.year}년 월별 운세`,blocks:[`<p class="ai-note">※ 사주 월운은 양력 매월 1일이 아니라 절기부터 시작합니다. 아래 월운은 입춘부터 다음 입춘 전까지의 12개 명리월입니다.</p>`]};parts.push(group);}
   group.blocks.push(head,...blocks);return;}
  parts.push({label:labels[i],title:chapterTitleText(c,state.plan)+(c.tag&&c.mode!=='prefix'&&c.kind!=='future'&&!c.title.includes(c.tag)?` (${c.tag})`:''),blocks});
 });

 return {title,subs,intro:state.plan?.profile?.mainConclusion||'',parts};
}
function render(report,state,visual){
 const labels=chapterLabels(report.chapters);
 const uncertainty=!report.birthTimeKnown?'<p class="birth-time-reference">'+esc(report.product==='ziwei'?'출생시각을 몰라 명궁·신궁과 별 배치는 임시 명반 기준으로 살펴봅니다. 시각을 확인하면 풀이가 달라질 수 있습니다.':'출생시각을 몰라 시주는 해석에서 제외했습니다. 대운의 시작 시기는 참고 범위로 살펴봅니다.')+'</p>':'';
 const groupHead=(c,i)=>c.kind==='mw'&&report.chapters[i-1]?.kind!=='mw'?`<div class="ai-group-head" id="ai-months"><span class="ai-ch-label">${labels[i]}</span><h2>${report.year}년 월별 운세</h2><p class="ai-note">※ 사주 월운은 양력 매월 1일이 아니라 절기부터 시작합니다.<br>※ 아래 월운은 ${esc(report.frame?gz(report.frame.yearPillar.stem,report.frame.yearPillar.branch).replace(/\(.*/,''):'')}년 입춘부터 다음 입춘 전까지의 12개 명리월입니다.</p></div>`:'';
 const nav=`<nav class="lv4-toc" aria-label="전체 풀이 목차"><b>전체 풀이 목차</b>${report.chapters.map((c,i)=>c.kind==='mw'&&report.chapters[i-1]?.kind==='mw'?'':c.kind==='mw'?`<a href="#ai-months"><span>${labels[i].replace(/\D/g,'')}</span><em class="ai-toc-text">${report.year}년 월별 운세</em></a>`:`<a href="#${c.id}"><span>${/장$/.test(labels[i])?labels[i].replace(/\D/g,''):'·'}</span><em class="ai-toc-text">${labels[i]&&!/장$/.test(labels[i])?labels[i]+'. ':''}${chapterTitle(c,state.plan)}</em></a>`).join('')}</nav>`;
 const cue=(c,i)=>c.cue&&typeof lcScene==='function'?lcScene(_saju,c.cue,i%2===1).replace('<figure class="lc-scene','<figure data-ai-cue="'+c.id+'" class="lc-scene'):'';
 const graphAt=(k=>k<0?1:k)(report.chapters.findIndex(c=>c.kind==='future'));
 return heroHTML(report,state)+uncertainty+visual.orbs.join('')+(visual.boards||[]).join('')+nav+report.chapters.map((c,i)=>`${cue(c,i)}${i===graphAt?(visual.diagrams||[]).join(''):''}${groupHead(c,i)}${chapterHTML(report,state,c,labels[i])}${c.people&&(visual.people||[]).length?visual.people[0].replace('<section class="lc-people','<section data-ai-people class="lc-people'):''}`).join('');
}
function showError(el,error,retry,hasContent=false){
 if(typeof ReportProgress==='object')ReportProgress.stop(el,'응답을 확인하고 있어요');
 el.classList.remove('reading-pending');el.removeAttribute('aria-busy');el.querySelector(':scope > .reading-wait')?.remove();el.querySelector(':scope > .ai-report-notice')?.remove();
 const auth=error?.code==='NEED_PAYMENT',limit=error?.code==='PAID_LIMIT',validation=/VALIDATION/.test(error?.code||'');
 const message=/^(WEB_|DEVICE_)/.test(error?.code||'')?error.message:auth?'결제 정보를 확인하지 못했어요. 결제한 기기와 이용 기간을 확인해 주세요.':limit?'이 결제의 생성 요청 한도에 도달했어요. 결제 내역과 함께 고객센터로 문의해 주세요.':validation?'계산 자료와 맞지 않는 내용은 표시하지 않았어요. 완성된 내용과 입력 정보는 저장돼 있어요.':hasContent?'받은 풀이는 저장했어요. 남은 부분은 서버 연결을 확인한 뒤 이어서 받을 수 있어요.':'서버 연결을 확인하고 있어요. 입력 정보는 유지돼요.';
 const box=document.createElement('div');box.className='ai-report-notice';box.setAttribute('role','status');box.innerHTML='<p>'+message+'</p>';
 if(!auth&&!limit){const button=document.createElement('button');button.type='button';button.textContent='이어서 불러오기';button.onclick=retry;box.appendChild(button);}el.appendChild(box);
 if(!auth&&!limit&&g.addEventListener){const resume=()=>{if(el.isConnected)retry();};g.addEventListener('online',resume,{once:true});}
}
function chapterPayload(report,plan,requested){
 const wanted=new Set((requested||[]).map(c=>c.id)),links=(plan?.links||[]).filter(l=>wanted.has(l.from)||wanted.has(l.to));
 const related=new Set([...wanted,...links.flatMap(l=>[l.from,l.to])]);
 const planChapters=(plan?.chapters||[]).map(c=>related.has(c.id)?c:{id:c.id,focus:c.focus,conclusion:c.conclusion,connection:'',evidenceRefs:[]});
 const keep=new Set([...planChapters.flatMap(c=>c.evidenceRefs||[]),...(requested||[]).flatMap(c=>c.refs||[]),...links.flatMap(l=>l.evidenceRefs||[]),...(plan?.profile?.evidenceRefs||[])]);
 const ledger=report.ledger.filter(s=>keep.has(s.id)||/^(?:natal\.|pair\.chart\.|name\.)/.test(s.id));
 return {...report,webBasis:report.webBasis?{chapters:report.webBasis.chapters.filter(c=>wanted.has(c.id))}:null,ledger,chapters:report.chapters.map(c=>({id:c.id,title:c.title,pdfMaxCharacters:c.pdfMaxCharacters,question:wanted.has(c.id)?c.question:'',months:wanted.has(c.id)?c.months:[]})),plan:{...plan,chapters:planChapters,links}};
}
async function request(report,phase,plan,chapters,feedback,opts={}){
 const payload=buildAIReadingPayload(opts.kind||'reading-deep',{source:opts.kind==='report-tpl'?'paid-report':'paid-deep'});if(!payload)throw Error('풀이 정보를 확인해 주세요.');
 // No calculated prose, old axes-based draft or fictional person details are sent as an interpretation.
 payload.sajuContext.detailedReading='';payload.sajuContext.gyeokguk='별도 종합 판정 없음';payload.sajuContext.yongsin='별도 종합 판정 없음';payload.sajuContext.strength='별도 종합 판정 없음';payload.sajuContext.persona='';
 if(opts.token)payload.paidToken=opts.token;
 if(report.depth==='pdf'&&typeof ReportAccess==='object')Object.assign(payload,await ReportAccess.pdfMeta(report.product));
 const wire=phase==='chapters'?chapterPayload(report,plan,chapters):report;
 payload.meta={...payload.meta,reportName:report.label,readingKind:report.product,synthesis:true,aiReport:{...wire,chapters:wire.chapters.map(c=>({id:c.id,title:c.title,pdfMaxCharacters:c.pdfMaxCharacters,question:c.question,months:c.months})),clientProtocol:'incremental-v2',phase,plan:wire.plan||plan||null,requestedChapters:(chapters||[]).map(c=>({id:c.id,title:c.title,pdfMaxCharacters:c.pdfMaxCharacters,question:c.question,months:c.months})),feedback:feedback||[]}};
 const started=performance.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),opts.timeoutMs||(opts.kind==='report-tpl'?150000:100000));
 try{
  const resp=await fetch((opts.endpoint||WORKER_URL).replace(/\/$/, '')+'/reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
  const data=await resp.json().catch(()=>null);
  diagnostic(report,'response',{phase,status:resp.status,ms:Math.round(performance.now()-started),code:data?.code||''});
  if(!resp.ok)throw reportError(data?.code||'HTTP_ERROR',data?.error||'서버 연결 오류',resp.status);
  if(data?.truncated)throw reportError('TRUNCATED','AI 응답이 중간에 끊겼어요.');const out=parse(data?.text||'');if(!out)throw reportError('INVALID_JSON','AI 응답 형식을 확인해야 해요.');return out;
 }catch(e){diagnostic(report,'request_error',{phase,code:e.code||(controller.signal.aborted?'TIMEOUT':'NETWORK'),ms:Math.round(performance.now()-started)});if(e.code)throw e;throw reportError(controller.signal.aborted?'TIMEOUT':'NETWORK','서버 응답을 받지 못했어요.');}finally{clearTimeout(timer);}
}
async function author(report,opts={}){
 const key=JSON.stringify([reportFingerprint(report),opts.kind||'reading-deep',opts.endpoint||WORKER_URL]);let entry=inflight.get(key);
 if(!entry){entry={listeners:new Set(),state:null};inflight.set(key,entry);entry.promise=authorCore(report,{...opts,onState:state=>{entry.state=state;for(const listener of entry.listeners)listener(state);}}).finally(()=>{if(inflight.get(key)===entry)inflight.delete(key);});}
 if(opts.onState){entry.listeners.add(opts.onState);if(entry.state)opts.onState(entry.state);}
 try{return await entry.promise;}finally{if(opts.onState)entry.listeners.delete(opts.onState);}
}

async function authorCore(report,opts={}){
 const started=performance.now(),policy=execution(report,opts),fingerprint=reportFingerprint(report),storageKey=cacheKey(report)+(opts.kind==='report-tpl'?':pdf':'');
 let old=null;try{old=JSON.parse(localStorage.getItem(storageKey)||'null');}catch(e){}
 const state=old&&old.exp>Date.now()&&old.fingerprint===fingerprint?old:{fingerprint,accepted:{},plan:null};
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify({...state,exp:Date.now()+AI_READING_TTL_MS}));}catch(e){}};
 const notify=()=>opts.onState?.(state);
 let plan=normalizePlan(state.plan||(report.depth==='pdf'?report.webBasis?.plan:null),report);
 if(!planQuality(plan,report)){
  plan=null;let usable=null,themeBad=false;for(let attempt=0;attempt<2&&!plan;attempt++){try{const fix=[...(attempt?['profile의 모든 문장과 chapters 전체를 반환하고 실제 근거 ID 두 개 이상을 배정하세요.']:[]),...(themeBad?['profile.theme은 사주 자체의 특징으로 쓰세요. 사용자가 적은 직업·상황은 풀이에 참고할 정보일 뿐 제목이나 주제가 되면 안 돼요.']:[])];const out=normalizePlan(await request(report,'plan',null,null,fix,opts),report);if(planQuality(out,report)){usable=out;themeBad=!!themeIssues(out,report).length;if(!themeBad||attempt)plan=out;}else diagnostic(report,'plan_rejected',{attempt:attempt+1});}catch(e){if(e.permanent||(attempt&&!usable))throw e;}}
  plan=plan||usable;
  if(!plan)throw reportError('PLAN_VALIDATION','보고서 전체의 해석 방향을 다시 정리해야 해요.');state.plan=plan;save();
 }else state.plan=plan;
 // 예전에 저장된 장도 독자 말 기준을 한 번 거친다. 다시 쓴 뒤 받아들인 장(styleChecked)은 또 요청하지 않는다.
 for(const [id,value]of Object.entries(state.accepted))if(chapterIssues(value,report,plan).length||(!value.styleChecked&&wordingIssues((value.paragraphs||[]).join(' ')).length))delete state.accepted[id];
 notify();
 state.complete=report.chapters.every(c=>!!state.accepted[c.id]);
 const missing=report.chapters.filter(c=>!state.accepted[c.id]),groups=[];for(let i=0;i<missing.length;i+=policy.batch)groups.push(missing.slice(i,i+policy.batch));
 diagnostic(report,'generation_start',{chapters:report.chapters.length,missing:missing.length,batch:policy.batch,concurrency:policy.concurrency});
 let next=0,fatal=null,lastError=null;
 const worker=async()=>{while(next<groups.length&&!fatal){const group=groups[next++];let feedback=[];
  for(let attempt=0;attempt<2&&!fatal;attempt++){
   const remaining=group.filter(c=>!state.accepted[c.id]);if(!remaining.length)break;
   // A failed large response is retried as smaller pieces, never as another full report.
   const parts=attempt&&remaining.length>2?[remaining.slice(0,2),remaining.slice(2)]:[remaining];
   for(const part of parts){if(fatal)break;
    try{const out=await request(report,'chapters',plan,part,feedback,opts);feedback=[];
     for(const c of part){const section=editDuplicateSentences(normalizeSection(out.sections?.find(x=>x.id===c.id)),state.accepted,report),hard=chapterIssues(section,report,plan,state.accepted),issues=hard.length||attempt?hard:wordingIssues(section.paragraphs.join(' '));if(!issues.length){if(attempt)section.styleChecked=true;state.accepted[c.id]=section;save();notify();}else{feedback.push({id:c.id,issues,instruction:hard.length?'기존에 통과한 장은 쓰지 마세요. 실제 ledger의 글자·연도·근거 ID를 다시 대조하고, 이 장의 근거와 작용 이유 및 조건별 차이를 본문에서 설명하세요.':STYLE_FIX});diagnostic(report,'chapter_rejected',{id:c.id,issues,attempt:attempt+1,paragraphs:section?.paragraphs?.length||0,chars:(section?.paragraphs||[]).filter(p=>typeof p==='string').join('').length});}}
    }catch(e){lastError=e;if(e.permanent){fatal=e;break;}feedback=[{issues:[e.code||'NETWORK'],instruction:'요청한 장만 완결된 JSON으로 반환하세요.'}];diagnostic(report,'retry',{phase:'chapters',code:e.code||'NETWORK',attempt:attempt+1});}
   }
  }
  opts.onProgress?.(Object.keys(state.accepted).length,report.chapters.length);
 }};
 await Promise.all(Array.from({length:Math.min(policy.concurrency,groups.length)},worker));
 if(fatal)throw fatal;
 if(report.chapters.some(c=>!state.accepted[c.id]))throw lastError||reportError('CHAPTER_VALIDATION','일부 장을 이어서 작성해야 해요.');
 state.complete=true;save();notify();diagnostic(report,'generation_complete',{ms:Math.round(performance.now()-started),chapters:report.chapters.length,cache:missing.length===0});return state;
}
function ready(el){return (typeof ReportAccess!=='object'||el?._completedWebOrder===ReportAccess.order(category(el)))&&el?.dataset.aiComplete===VERSION&&el._completedReportIdentity===JSON.stringify({meta:_meta,lang:currentLanguage()})&&!!el.querySelector('[data-ai-authored="true"]');}
async function run(el){
 if(el._fullReportTask)return el._fullReportTask;if(ready(el))return;
 const task=async()=>{
  const cat=category(el),report=sources(cat,_saju,{..._meta,gender:_meta.gender||gender});
  const identity=JSON.stringify({meta:_meta,lang:currentLanguage()}),stillCurrent=()=>el.isConnected&&identity===JSON.stringify({meta:_meta,lang:currentLanguage()});
  const visual=el._fullReportVisual||visuals(el);el._fullReportVisual=visual;
  const stage=typeof ReadingStage==='object'&&ReadingStage.shouldStage(el)?ReadingStage.begin(el,report):null;
  delete el.dataset.aiComplete;delete el.dataset.deepDone;el._reportSnapshot=null;el.innerHTML=stage?'':(typeof ReadingStage==='object'?ReadingStage.markup(_saju,_meta,report.label):readingLoadingHTML());el.classList.add('reading-pending');el.setAttribute('aria-busy','true');
  if(!stage&&typeof ReportProgress==='object')ReportProgress.start(el,{key:'web-'+report.product});
  try{
   const access=typeof ReportAccess==='object'?await ReportAccess.startWeb(report):null;
   const state=await author(report,{onState:s=>{if(!stillCurrent())return;const n=Object.keys(s.accepted||{}).length,percent=s.plan?5+90*n/report.chapters.length:0,text=s.plan?`전체 ${report.chapters.length}장 중 ${n}장 작성 완료`:'풀이의 흐름을 정리하고 있어요';if(stage)ReadingStage.progress(stage,percent,text);else if(typeof ReportProgress==='object')ReportProgress.update(el,percent,text);}});if(!stillCurrent())return;
   if(access)await ReportAccess.finishWeb(access);if(!stillCurrent())return;
   // Commit one complete, validated document. No chapter-level display during generation.
   const content=document.createElement('div');content.className='ai-report-content';content.innerHTML=render(report,state,visual);content.append(...(visual.controls||[]));
   el.replaceChildren(content);el.classList.remove('reading-pending');el.removeAttribute('aria-busy');
   if(typeof ReportAccess==='object')el._completedWebOrder=ReportAccess.order(cat);
   el._aiReportEvidence={ledger:report.ledger,plan:state.plan,chapters:state.accepted};el.dataset.aiComplete=VERSION;el.dataset.deepDone='1';el._completedReportIdentity=identity;
   const active=typeof ReadingStage==='object'?ReadingStage.active:null;if(active?.root===el)ReadingStage.complete(active);
   el.querySelectorAll('.lc-pcard[data-portrait]').forEach(card=>hydratePortrait(card));
  }catch(error){if(!stillCurrent())return;
   const active=typeof ReadingStage==='object'?ReadingStage.active:null;
   if(active?.root===el)ReadingStage.fail(active,error,()=>run(el));
   else{el.innerHTML='';showError(el,error,()=>run(el),false);}
  }
 };
 el._fullReportTask=task().catch(error=>{el.innerHTML='';showError(el,error,()=>run(el));}).finally(()=>{el._fullReportTask=null;});return el._fullReportTask;
}

g.AIReport={pdfQuestion,VERSION,CAT,enabled,category,ready,outline,chapterTitle,chapterLabels,aiBody,aiBlocks,plain,pdfDoc,preparePdf,reportFingerprint,execution,wordingIssues,themeIssues,readerText,sources,selectStory,natalClaimsConsistent,factIssues,parse,normalizePlan,normalizeSection,planQuality,editDuplicateSentences,chapterIssues,render,chapterPayload,request,author,run};
})(globalThis);
