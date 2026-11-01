/* Paid prose is authored from calculated facts. No new fortune calculations or free inference. */
(function(g){
'use strict';
g.AIReportConfig=Object.assign({enabled:true},g.AIReportConfig||{});
const VERSION='ai-full-v1',CAT={life:'인생총운',newyear:'신년운세',gunghap:'궁합',name:'이름풀이·작명',ziwei:'자미두수','topic-love':'연애운','topic-marriage':'결혼운','topic-reunion':'재회운','topic-money':'재물운','topic-career':'직업운','topic-study':'학업·시험운','topic-child':'우리 아이 운','topic-children':'자녀(임신)운','topic-health':'건강·생활운'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique=a=>[...new Set(a)],compact=s=>String(s||'').replace(/[\s\u200b\u00a0]/g,'');
function category(el){return String(el?.getAttribute('data-deep')||'').split(':')[0];}
function enabled(el){return !!el&&g.AIReportConfig.enabled===true&&!!CAT[category(el)]&&!el.closest('.lk-preview');}
function outline(cat,year){
 const life=['인생을 관통하는 성향과 그 이유','남에게 보이는 모습과 속마음','반복되는 선택과 갈등','재능이 실력이 되는 조건','일과 사회적 역할','돈을 벌고 지키는 방식','사랑과 공동생활','도움을 주고받는 사람들','생활 리듬과 회복','지나온 운과 지금의 변화','앞으로의 대운과 세운','본인에게 맞는 선택의 기준'];
 const common={
  'topic-love':['사랑에서 중요하게 여기는 것','누구에게 왜 끌리는가','마음을 표현하는 방식','관계에서 갈등이 생기는 이유','현재 관계와 생활 조건','현재 운이 관계에 더하는 과제','시기별로 살펴볼 변화','관계를 위한 판단 기준'],
  'topic-marriage':['결혼을 대하는 태도','배우자에게 기대하는 것과 그 이유','생활을 함께할 때 맞춰야 할 점','다툼이 반복되는 조건','경제생활과 가족의 경계','현재 운과 공동생활의 과제','시기별로 준비할 부분','함께 결정할 기준'],
  'topic-reunion':['다시 만나고 싶은 마음의 구조','관계에서 반복되기 쉬운 갈등','그리움과 실제 관계의 차이','달라져야 할 조건','본인이 바꿀 수 있는 부분','현재 운의 관계 주제','연락과 기다림을 검토할 때','재회보다 먼저 확인할 기준'],
  'topic-money':['돈을 대하는 방식과 그 이유','수입을 만드는 강점','일과 수입이 연결되는 조건','돈이 새기 쉬운 선택','함께 쓰는 돈과 책임','현재 대운과 세운의 재물 주제','시기별로 점검할 지출과 계획','실제 재무자료로 판단할 기준'],
  'topic-career':['일하는 방식과 그 이유','재능이 드러나는 업무','조직과 협업에서의 모습','현재 활동과 고민의 구조','실력이 소모되지 않는 환경','이직·독립을 검토할 운의 흐름','선택할 때 확인할 실제 조건','장기적으로 쌓아 갈 전문성'],
  'topic-study':['이해하고 배우는 방식','잘 맞는 학습 환경과 그 이유','집중이 흐트러지는 조건','노력이 실력으로 남는 방법','시험과 평가를 대하는 마음','현재 운과 학습의 과제','시기별 준비와 점검','본인에게 맞는 공부 기준'],
  'topic-child':['아이의 기질을 읽는 근거','아이가 편안해하는 환경','배움과 놀이에서의 모습','친구와 어른을 대하는 방식','부담이 커질 때 살필 반응','성장 단계와 현재 운','양육 환경에서 조정할 점','관찰하고 다시 확인할 기준'],
  'topic-children':['돌봄과 가족을 대하는 방식','자녀에게 기대하는 것과 그 이유','자녀와 거리를 맞추는 과정','가족의 역할과 생활 조건','현재 상황에 맞는 자녀 계획','현재 운이 가족에게 더하는 주제','시기별로 준비할 생활 기반','의료 판단과 구분할 상담 기준'],
  'topic-health':['전통 해석에서 보는 생활 균형','긴장과 휴식의 습관','일과 관계가 생활에 미치는 영향','현재 운과 생활 리듬 점검','실제로 기록하고 조정할 기준'],
  gunghap:['두 사람을 함께 읽는 핵심 근거','서로에게 끌리는 이유','감정과 대화 방식의 차이','갈등이 커지는 조건','돈과 일상을 함께하는 방식','각자의 대운과 관계의 과제','시기별로 함께 점검할 부분','서로 합의할 생활 기준'],
  name:['이름을 해석하는 기준과 범위','실제 글자의 뜻과 소리','소리 오행과 사주의 관계','한자와 획수에서 보는 차이','현재 이름의 장점과 부담','후보가 있다면 무엇이 달라지는지','실제 사용성과 본인의 선호','유지·변경을 판단할 기준'],
  ziwei:['명궁과 신궁으로 보는 기본 모습','명반에서 함께 나타나는 성향','안과 밖에서 달라지는 태도','직업과 사회적 역할','재물과 생활의 안정','배우자와 가까운 관계','가족과 주변 사람들','주거와 생활 기반','마음의 만족과 휴식','현재 대한에서 강조되는 영역','다음 대한과 준비할 과제','여러 궁을 연결한 선택 기준']};
 let titles=cat==='life'?life:cat==='newyear'?['올해의 핵심 주제와 근거','작년과 올해의 차이','일과 사업에서 살펴볼 조건','돈을 벌고 관리할 때','연애·결혼과 공동생활','사람들과 역할을 맞추는 과정','생활 리듬과 회복','한 해를 운영할 기준',`${year}년 1~3월의 흐름`,`${year}년 4~6월의 흐름`,`${year}년 7~9월의 흐름`,`${year}년 10~12월의 흐름`]:common[cat];
 return (titles||[]).map((title,i)=>({id:'ai-'+(i+1),title,question:title+'에 대해 왜 그런지, 어떤 조건에서 달라지는지 설명하세요.',months:cat==='newyear'&&i>=8?Array.from({length:3},(_,k)=>(i-8)*3+k+1):[]}));
}
function sources(cat,s,meta){
 const ledger=[],sourceLimits=[],add=(id,label,value,anchors=[])=>{ledger.push({id,label,value,anchors:unique(anchors.filter(v=>typeof v==='string'&&v.length))});};
 const chart=buildChartAnalysis(s),year=cat==='newyear'?Number(meta.nyExtra?.y)||new Date().getFullYear():new Date().getFullYear();
 if(!['ziwei','name','gunghap'].includes(cat)){
  const ids=['year','month','day','hour'];chart.pillars.forEach((p,i)=>{const id=ids[['연주','월주','일주','시주'].indexOf(p.place)];add('natal.'+id+'.stem',p.place+' 천간',{glyph:p.stem,god:p.stemGod},[p.stem,p.stemGod]);add('natal.'+id+'.branch',p.place+' 지지',{glyph:p.branch,god:p.branchGod,hidden:p.hidden},[p.branch,p.branchGod,...p.hidden.map(h=>h.stem)]);});
  add('natal.season','월지에서 확인한 계절',{season:chart.season,monthBranch:BRCHKO[s.mp.branch],limits:chart.limits},[chart.season,BRCHKO[s.mp.branch]]);
  add('natal.relations','실제로 계산한 원국의 관계',chart.relations,unique(chart.relations.flatMap(r=>[r.left,r.right,r.kind])));
  if(chart.sinsal.length)add('natal.sinsal','실제로 계산한 신살',chart.sinsal,chart.sinsal.map(x=>x.name));
  const oh=ohCount(s),max=Math.max(...oh);add('natal.elements','겉글자 오행 개수',{counts:oh,names:OHNAME,tiedMax:oh.map((v,i)=>v===max?OHNAME[i]:null).filter(Boolean),limitation:'개수는 계절의 힘이나 신강약·용신 판정이 아님'},OHNAME);
  const dq=calcDaeun(s,meta.sy,meta.sm,meta.sd,Number(meta.hour)>=0?meta.hour:12,meta.min||0,meta.gender||gender);
  dq.daeuns.forEach(d=>add('decade.'+d.age,d.age+'~'+(d.age+9)+'세 대운',{from:d.age,to:d.age+9,stem:STEMKO[d.stem],branch:BRCHKO[d.branch],stemGod:tenGod(s.dp.stem,d.stem),timeKnown:!!s.hp},[STEMKO[d.stem],BRCHKO[d.branch],String(d.age)+'세']));
  for(let y=year-3;y<=year+10;y++){const v=_lifeV2YearInfo(s,y),relations=['yp','mp','dp','hp'].filter(k=>s[k]).map((k,i)=>({place:({yp:'연지',mp:'월지',dp:'일지',hp:'시지'})[k],glyph:BRCHKO[s[k].branch],kind:brRel(s[k].branch,v.yp.branch).kind}));add('year.'+y,y+'년 세운',{year:y,stem:STEMKO[v.yp.stem],branch:BRCHKO[v.yp.branch],stemGod:v.tg,branchGod:v.btg,relations},[y+'년',STEMKO[v.yp.stem],BRCHKO[v.yp.branch],...relations.filter(r=>r.kind!=='평').map(r=>r.kind)]);}
  for(let m=1;m<=12;m++){const yp=yearPillar(year,m,15,12,0),mp=monthPillar(yp.stem,monthIdx(year,m,15,12,0));add(`month.${year}.${m}`,`${year}년 ${m}월의 대표 월주`,{year,month:m,representativeDate:`${year}-${m}-15`,stem:STEMKO[mp.stem],branch:BRCHKO[mp.branch],stemGod:tenGod(s.dp.stem,mp.stem),branchGod:tenGod(s.dp.stem,BR_MAIN_STEM[mp.branch]),limits:'절기 기준 월운의 대표일이며 달력상 월 전체의 정확한 경계가 아님'},[m+'월',STEMKO[mp.stem],BRCHKO[mp.branch]]);}
 }else if(cat==='ziwei'){
  if(!s.hp)sourceLimits.push('출생시각 미상: 명궁·신궁과 별 배치는 임시 기준 명반이며 확정된 배치가 아님. 본문은 이 가정과 실제 출생시각 확인 필요성을 명시해야 함');
  const z=zwEvidenceRefs(s,meta);z.refs.forEach(r=>add(r.id,r.label,{description:r.label},[r.label.match(/[가-힣]+/g)?.[0]||r.label]));
  const ch=buildZiweiChart(s,meta);add('zw.chart','현재 엔진이 산출한 명반',{palaces:ch.palaces.map(p=>({name:p.name,branch:BRCHKO[p.branch],branchIndex:p.branch,stars:p.stars})),shen:ch.shenPalace.name,decades:ch.decades.map(d=>({from:d.from,to:d.to,palace:d.palace.name})),limits:'내장 간이 명반. 유년·유월·삼방사정·보조성 전체는 미계산'},ch.palaces.flatMap(p=>[p.name,...p.stars]));
 }else if(cat==='gunghap'){
  const p=rpPartnerSaju(meta.gnExtra);if(!p)throw Error('상대방 정보가 필요해요.');const r=pairEvidenceRefs(s,p.saju,p.ctx);r.refs.forEach(v=>add(v.id,v.label,{description:v.label},v.label.match(/[가-힣]{2,}/g)||[]));add('pair.chart.self','본인 사주 원국',chart,chart.pillars.flatMap(p=>[p.stem,p.branch]));const c=buildChartAnalysis(p.saju);add('pair.chart.partner','상대방 사주 원국',c,c.pillars.flatMap(p=>[p.stem,p.branch]));
  let birth={sy:meta.gnExtra.gy,sm:meta.gnExtra.gm,sd:meta.gnExtra.gd,hour:meta.gnExtra.gh,min:meta.gnExtra.gmin||0,gender:meta.gnExtra.gender};
  if(meta.gnExtra.cal==='lunar'){const v=l2s(birth.sy,birth.sm,birth.sd,!!meta.gnExtra.leap);Object.assign(birth,{sy:v.y,sm:v.m,sd:v.d});}
  if(birth.hour>=0&&meta.gnExtra.cityKey){const offset=Math.round(getTrueSolarOffsetMin(meta.gnExtra.cityKey)||0),t=((birth.hour*60+birth.min+offset)%1440+1440)%1440;birth.hour=Math.floor(t/60);birth.min=t%60;}
  [[s,meta,'self'],[p.saju,birth,'partner']].forEach(([chart,ctx,who])=>{
   const d=calcDaeun(chart,ctx.sy,ctx.sm,ctx.sd,Number(ctx.hour)>=0?ctx.hour:12,ctx.min||0,ctx.gender||gender);
   add('pair.'+who+'.decades',who==='self'?'본인 대운':'상대방 대운',d.daeuns.map(v=>({from:v.age,to:v.age+9,stem:STEMKO[v.stem],branch:BRCHKO[v.branch],stemGod:tenGod(chart.dp.stem,v.stem),timeKnown:!!chart.hp})),['대운']);
   for(let y=year-1;y<=year+5;y++){const v=_lifeV2YearInfo(chart,y);add(`pair.${who}.year.${y}`,`${who==='self'?'본인':'상대방'} ${y}년 세운`,{year:y,stem:STEMKO[v.yp.stem],branch:BRCHKO[v.yp.branch],stemGod:v.tg,relations:['yp','mp','dp','hp'].filter(k=>chart[k]).map(k=>({place:k,kind:brRel(chart[k].branch,v.yp.branch).kind}))},[y+'년',STEMKO[v.yp.stem],BRCHKO[v.yp.branch]]);}
  });

 }else{
  const refs=nameEvidenceRefs(s,meta.nmExtra);refs.refs.filter(r=>r.id!=='name.yongsin').forEach(r=>add(r.id,r.label,{description:r.label},r.label.match(/[가-힣一-龥]{1,}/g)||[]));const nm=nameModel(s,meta.nmExtra);add('name.sound','소리 오행의 실제 분포',nm.nameOh,LV4_OH);add('name.hanja','입력 또는 자동 후보로 선택된 한자',Object.fromEntries(['surname','given1','given2'].map(k=>[k,{glyph:nm.han[k],strokes:nm.strokes[k],meaning:nm.han[k]?getHanMeaning(nm.han[k]):'',element:nm.han[k]?getHanZawonOh(nm.han[k]):null,autoCandidate:!!nm.auto}])),Object.values(nm.han));if(nm.suri)add('name.suri','현재 방식의 4격 획수',Object.fromEntries(['won','hyeong','i','jeong'].map(k=>[k,{stroke:nm.suri[k].stroke,element:nm.suri[k].oh,classification:nm.suri[k].good}])),['원격','형격','이격','정격','획수']);add('name.chart','이름과 대조하는 실제 사주 원국',chart,chart.pillars.flatMap(p=>[p.stem,p.branch]));
 }
 const storytelling=selectStory(cat,ledger);
 return {version:VERSION,storytelling,product:cat,label:CAT[cat],year,age:year-Number(meta.sy)+1,birthTimeKnown:!!s.hp,limits:chart.limits.concat(sourceLimits),ledger,chapters:outline(cat,year),userStatements:{source:'user-stated',marital:meta.marital||'',counsel:meta.counsel||null,question:ctxSituationText()||''}};
}
function selectStory(cat,ledger){
 const primary=cat==='ziwei'?'STORY_09':cat==='newyear'?'STORY_04':cat==='gunghap'?'STORY_02':['topic-money','topic-career','topic-reunion'].includes(cat)?'STORY_05':cat==='topic-health'?'STORY_10':cat.startsWith('topic-')?'STORY_03':'STORY_01';
 const relation=ledger.find(s=>s.id==='natal.relations'&&s.value.some(r=>['충','형','해','원진'].includes(r.kind)));
 return {primary,secondary:unique([...(relation?['STORY_02']:[]),...(['life','newyear','ziwei'].includes(cat)?['STORY_06']:[])]).filter(x=>x!==primary),conflictSource:relation?.id||null,rule:'상품 목적을 우선하고, 상충 서사는 실제 관계 신호가 있을 때만 선택'};
}
function parse(text){try{const t=String(text||''),a=t.indexOf('{'),b=t.lastIndexOf('}');return JSON.parse(t.slice(a,b+1));}catch(e){return null;}}
function validRefs(refs,report,min=2){return Array.isArray(refs)&&unique(refs).length>=min&&refs.every(id=>report.ledger.some(s=>s.id===id));}
function validLinks(plan,report){const links=plan?.links;if(!Array.isArray(links)||(report.chapters.length>=8&&!links.length))return false;return links.every(l=>{const from=plan.chapters?.find(c=>c.id===l.from),to=plan.chapters?.find(c=>c.id===l.to);return from&&to&&report.chapters.findIndex(c=>c.id===l.from)<report.chapters.findIndex(c=>c.id===l.to)&&typeof l.development==='string'&&l.development.length>=15&&Array.isArray(l.evidenceRefs)&&l.evidenceRefs.length>0&&l.evidenceRefs.every(id=>from.evidenceRefs.includes(id)&&to.evidenceRefs.includes(id));});}
function planQuality(plan,report){return !!(plan&&plan.profile&&typeof plan.profile.theme==='string'&&plan.profile.theme.length>=8&&plan.profile.theme.length<=100&&['mainConclusion','strength','challenge','action','closing'].every(k=>typeof plan.profile[k]==='string'&&plan.profile[k].length>=15)&&Array.isArray(plan.profile.keywords)&&plan.profile.keywords.length===3&&validRefs(plan.profile.evidenceRefs,report)&&!factIssues(Object.values(plan.profile).filter(v=>typeof v==='string').join(' '),report,plan.profile.evidenceRefs).length&&Array.isArray(plan.chapters)&&plan.chapters.length===report.chapters.length&&validLinks(plan,report)&&new Set(plan.chapters.map(c=>compact(c.conclusion))).size===report.chapters.length&&report.chapters.every(c=>{const p=plan.chapters.find(x=>x.id===c.id);return p&&typeof p.conclusion==='string'&&p.conclusion.length>=20&&validRefs(p.evidenceRefs,report)&&typeof p.focus==='string'&&!factIssues(p.conclusion,report,p.evidenceRefs).length&&c.months.every(m=>p.evidenceRefs.includes(`month.${report.year}.${m}`));}));}
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
function chapterIssues(section,report,plan,accepted={}){
 const issues=[];if(!section||!report.chapters.some(c=>c.id===section.id))return ['unknown_chapter'];
 const target=report.chapters.find(c=>c.id===section.id),p=plan?.chapters.find(c=>c.id===section.id),ps=section.paragraphs,refs=section.evidenceRefs;
 if(!validRefs(refs,report)||refs.some(id=>!p?.evidenceRefs.includes(id)))issues.push('unassigned_evidence');
 if(!Array.isArray(ps)||ps.length<3||ps.length>6||ps.some(x=>typeof x!=='string'||x.length<35)||ps.join('').length<240||ps.join('').length>2400)return issues.concat('insufficient_explanation');
 const body=ps.join(' '),analysis=section.analysis;
 if(!analysis||['basis','mechanism','condition'].some(k=>typeof analysis[k]!=='string'||analysis[k].length<15||!body.includes(analysis[k])))issues.push('missing_causal_chain');
 const anchors=report.ledger.filter(s=>refs?.includes(s.id)).flatMap(s=>s.anchors);if(!anchors.some(a=>body.includes(a)))issues.push('basis_not_in_body');
 issues.push(...factIssues(body,report,refs));
 if(!report.birthTimeKnown&&refs?.some(id=>id.startsWith('decade.'))&&!/대략|가정|참고|달라|불확실|확인|approx|uncertain/i.test(body))issues.push('unknown_decade_boundary');
 if(report.userStatements.marital==='married'&&/(?:새|새로운)\s*(?:연인|애인)을\s*만나/.test(body))issues.push('marital_context');
 if(report.age<16&&/이직|승진|대출|창업|배우자를/.test(body))issues.push('age_context');
 if(!report.birthTimeKnown&&/본인(?:의)?\s*시주(?:는|가|에)/.test(body))issues.push('unknown_hour');
 if(report.product==='ziwei'&&!report.birthTimeKnown&&!/가정|임시|시각.*확인|시간.*확인/.test(body))issues.push('unknown_ziwei_time');
 if(target.months.some(m=>!refs.includes(`month.${report.year}.${m}`)||!body.includes(m+'월')))issues.push('missing_month');
 const others=Object.values(accepted).filter(x=>x.id!==section.id).flatMap(x=>x.paragraphs||[]).join(' ');const normOthers=compact(others);
 for(const sentence of body.split(/(?<=[.!?])\s+/)){if(compact(sentence).length>=35&&normOthers.includes(compact(sentence)))issues.push('repeated_explanation');}
 return unique(issues);
}
function cacheKey(report){return aiReadingCacheKey('reading-deep',VERSION+':'+report.product+':'+report.year,currentLanguage());}
function visuals(el){
 const controls=[...el.querySelectorAll('.chat-card,.pdf-cta,.next-actions')].filter(x=>!x.parentElement.closest('.chat-card,.pdf-cta,.next-actions'));
 const diagrams=[...el.querySelectorAll('.lc-graph,[id="lv4-lc-bars"]')].map(x=>{
  const parts=[...x.querySelectorAll('.lc-bars,.lc-area,.lc-curve,.lc-radar')].map(p=>{const y=p.cloneNode(true);y.querySelectorAll('.badge-t').forEach(t=>t.textContent='지수 최고');return y.outerHTML;});
  return parts.length?'<section class="lc-card lc-graph"><h3 class="lc-card-title">'+esc(x.querySelector('h3')?.textContent||'계산 지표')+'</h3>'+parts.join('')+'<small>기존 계산식의 비교 지표예요. 사건의 발생 확률이나 확정된 미래를 뜻하지 않아요.</small></section>':'';
 }).filter(Boolean);
 return {controls,diagrams,boards:[...el.querySelectorAll('.zw-board')].slice(0,1).map(x=>x.outerHTML),orbs:[...el.querySelectorAll('.lc-orbs')].filter(x=>!x.closest('.lc-pcard')).slice(0,category(el)==='gunghap'?2:1).map(x=>x.outerHTML),scenes:[...el.querySelectorAll('.lc-scene img')].slice(0,3).map(x=>x.outerHTML),portraits:[...el.querySelectorAll('.lc-pcard[data-portrait]')].map(x=>{const y=x.cloneNode(true);y.querySelector('.lc-pcard-body')?.remove();y.insertAdjacentHTML('beforeend','<div class="lc-pcard-body"><small>관계 유형을 표현한 AI 상상 이미지 · 실제 인물을 특정하지 않아요.</small></div>');delete y.dataset.portraitDone;return y.outerHTML;})};
}
function render(report,state,visual){
 const name=_meta?.userName?esc(_meta.userName)+'님 · ':'';const time=typeof birthTimeReference==='function'?birthTimeReference(_meta):null;
 const uncertainty=!report.birthTimeKnown?'<p class="birth-time-reference">'+esc(report.product==='ziwei'?'출생시각을 몰라 명궁·신궁과 별 배치는 임시 명반 기준으로 살펴봐요. 시각을 확인하면 풀이가 달라질 수 있어요.':'출생시각 미상으로 시주는 해석에서 제외했어요. 대운의 시작 시기는 참고 범위로 살펴봐요.')+'</p>':'';
 const head=`<header class="lv4-hero"><small>${esc(report.label)}</small><h1>${esc(state.plan.profile.theme)}</h1><p>${lv4Text(esc(state.plan.profile.mainConclusion))}</p><p>${name}${_meta.sy}년 ${_meta.sm}월 ${_meta.sd}일${time?' · '+esc(time.label):''}</p></header>`;
 const nav=`<nav class="lv4-toc" aria-label="전체 풀이 목차"><b>전체 풀이 목차</b>${report.chapters.map(c=>`<a href="#${c.id}">${esc(c.title)}</a>`).join('')}</nav>`;
 return head+uncertainty+visual.orbs.join('')+(visual.boards||[]).join('')+nav+report.chapters.map((c,i)=>`${(visual.diagrams||[]).filter((x,k)=>i===(k===0?0:Math.floor(report.chapters.length*2/3)+k-1)).join('')}${i&&i%4===0&&visual.scenes.length?'<figure class="lc-scene">'+visual.scenes[(i/4-1)%visual.scenes.length]+'</figure>':''}<section class="lv4-sec ai-authored-chapter" id="${c.id}" data-ai-authored="true"><div class="lv4-sec-head"><span class="lv4-no">${i+1}</span><h2>${esc(c.title)}</h2></div>${state.accepted[c.id].paragraphs.map(t=>'<p>'+lv4Text(esc(t))+'</p>').join('')}</section>`).join('')+(visual.portraits.length?'<section class="lc-card"><h3>관계 유형의 참고 이미지</h3>'+visual.portraits.join('')+'</section>':'');
}
function showError(el,message,retry){el.classList.add('reading-pending');el.removeAttribute('aria-busy');let wait=el.querySelector(':scope > .reading-wait');if(!wait){el.insertAdjacentHTML('afterbegin',readingLoadingHTML());wait=el.querySelector(':scope > .reading-wait');}wait.innerHTML='<p>'+esc(message)+'</p><button type="button" class="analyze-btn">다시 풀이하기</button>';wait.querySelector('button').onclick=retry;}
async function request(report,phase,plan,chapters,feedback,opts={}){
 const payload=buildAIReadingPayload(opts.kind||'reading-deep',{source:opts.kind==='report-tpl'?'paid-report':'paid-deep'});if(!payload)throw Error('풀이 정보를 확인해 주세요.');
 // No calculated prose, old axes-based draft or fictional person details are sent as an interpretation.
 payload.sajuContext.detailedReading='';payload.sajuContext.gyeokguk='별도 종합 판정 없음';payload.sajuContext.yongsin='별도 종합 판정 없음';payload.sajuContext.strength='별도 종합 판정 없음';payload.sajuContext.persona='';
 if(opts.token)payload.paidToken=opts.token;
 payload.meta={...payload.meta,reportName:report.label,readingKind:report.product,synthesis:true,aiReport:{...report,phase,plan:plan||null,requestedChapters:chapters||[],feedback:feedback||[]}};
 const {resp,data}=await fetchJsonWithRetry((opts.endpoint||WORKER_URL).replace(/\/$/,'')+'/reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},2);
 if(!resp?.ok||data?.truncated)throw Error('완성된 풀이를 받지 못했어요.');const out=parse(data.text||'');if(!out)throw Error('풀이 형식을 다시 확인해야 해요.');return out;
}
async function author(report,opts={}){
 const fingerprint=JSON.stringify(report),storageKey=cacheKey(report)+(opts.kind==='report-tpl'?':pdf':'');
 let old=null;try{old=JSON.parse(localStorage.getItem(storageKey)||'null');}catch(e){}
 const state=old&&old.exp>Date.now()&&old.fingerprint===fingerprint?old:{fingerprint,accepted:{},plan:null};
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify({...state,exp:Date.now()+AI_READING_TTL_MS}));}catch(e){}};
 let plan=state.plan;
 if(!planQuality(plan,report)){
  plan=null;for(let attempt=0;attempt<2&&!plan;attempt++){try{const out=await request(report,'plan',null,null,attempt?['실제 근거 ID와 모든 장을 빠짐없이 구성하세요.']:[],opts);if(planQuality(out,report))plan=out;}catch(e){if(attempt)throw e;}}
  if(!plan)throw Error('보고서 전체의 해석 방향을 다시 정리해야 해요.');state.plan=plan;save();
 }
 for(const [id,value]of Object.entries(state.accepted))if(chapterIssues(value,report,plan).length)delete state.accepted[id];
 const missing=report.chapters.filter(c=>!state.accepted[c.id]),groups=[];for(let i=0;i<missing.length;i+=4)groups.push(missing.slice(i,i+4));
 let next=0;const worker=async()=>{while(next<groups.length){const group=groups[next++];let feedback=[];
  for(let attempt=0;attempt<2;attempt++){
   const remaining=group.filter(c=>!state.accepted[c.id]);if(!remaining.length)break;
   try{const out=await request(report,'chapters',plan,remaining,feedback,opts);feedback=[];
    for(const c of remaining){const section=out.sections?.find(x=>x.id===c.id),issues=chapterIssues(section,report,plan,state.accepted);if(!issues.length){state.accepted[c.id]=section;save();}else feedback.push({id:c.id,issues});}
   }catch(e){feedback=[{issues:['일시 오류 또는 잘린 응답. 완성된 장만 작성하세요.']}];}
  }
  opts.onProgress?.(Object.keys(state.accepted).length,report.chapters.length);
 }};
 await Promise.all(Array.from({length:Math.min(2,groups.length)},worker));
 if(report.chapters.some(c=>!state.accepted[c.id]))throw Error('일부 장의 설명이 충분하지 않아 다시 정리해야 해요.');
 return state;
}
async function run(el){
 if(el._fullReportTask)return el._fullReportTask;
 const task=async()=>{
  const cat=category(el),report=sources(cat,_saju,{..._meta,gender:_meta.gender||gender});
  const identity=JSON.stringify({meta:_meta,lang:currentLanguage()}),stillCurrent=()=>identity===JSON.stringify({meta:_meta,lang:currentLanguage()});
  const visual=el._fullReportVisual||visuals(el);el._fullReportVisual=visual;
  el.querySelector(':scope > .reading-wait')?.remove();const finish=beginReadingWait(el);let completed=false;
  try{
   const state=await author(report);if(!stillCurrent())return;
   el.innerHTML=render(report,state,visual);(visual.controls||[]).forEach(node=>el.appendChild(node));el._aiReportEvidence={ledger:report.ledger,plan:state.plan,chapters:state.accepted};el.dataset.aiComplete=VERSION;completed=true;el.dataset.deepDone='1';
   el.querySelectorAll('.lc-pcard[data-portrait]').forEach(card=>hydratePortrait(card));
  }finally{finish();if(!completed)showError(el,stillCurrent()?'풀이를 완성하지 못했어요. 저장된 장은 유지하고 나머지를 다시 작성할 수 있어요.':'입력 정보가 바뀌었어요. 새 정보로 풀이를 다시 작성해 주세요.',()=>run(el));}
 };
 el._fullReportTask=task().catch(()=>{showError(el,'풀이를 완성하지 못했어요. 저장된 장은 유지하고 나머지를 다시 작성할 수 있어요.',()=>run(el));}).finally(()=>{el._fullReportTask=null;});return el._fullReportTask;
}
g.AIReport={VERSION,CAT,enabled,category,outline,sources,selectStory,natalClaimsConsistent,factIssues,parse,planQuality,chapterIssues,render,request,author,run};
})(globalThis);
