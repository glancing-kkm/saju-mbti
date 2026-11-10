#!/usr/bin/env node
'use strict';
// Independent cross-system QA. Reads a snapshot of production generators; never edits them.
// Deterministic mocks only: no live AI, payment, email, PDF rendering, or accuracy claims.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
const arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];};
const output=arg('--out')||'docs/reading-quality/codex-depth-current.json';
const topics=['life','newyear','gunghap','love','marriage','reunion','money','career','study','child','children','health'];
const sourceFiles=['index.html','assets/astrology.js','assets/report-pdf.js','worker/saju-chat-worker.js'];
const sourceText=Object.fromEntries(sourceFiles.map(p=>[p,fs.readFileSync(path.join(rt.root,p),'utf8')]));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
const report={schema:1,generatedAt:new Date().toISOString(),referenceDate:'2026-10-28',sources:Object.fromEntries(Object.entries(sourceText).map(([p,t])=>[p,sha(t)])),scope:'Deterministic cross-system generation, source wiring, repetition and counterfactual probes. Not a prediction accuracy score, semantic proof, model-output review, PDF character-limit proof or browser pagination QA.',records:[],findings:[],probes:[],pdf:[],sourceChecks:[]};
const norm=s=>String(s||'').replace(/[\u200b\u2060\u00a0]/g,' ').replace(/\s+/g,' ').trim();
const finding=(level,code,where,detail)=>report.findings.push({level,code,where,detail});
const sentenceCounts=text=>{const map=new Map();for(const s of (text.match(/[^.!?\n]+[.!?]/g)||[]).map(norm).filter(s=>s.length>=25))map.set(s,(map.get(s)||0)+1);return [...map];};
const textOf=html=>{const box=d.createElement('div');box.innerHTML=String(html||'');box.querySelectorAll('script,style,button,.lc-scene,.chat-card,.pdf-cta,.lv4-toc,.next-actions').forEach(e=>e.remove());return norm(box.textContent);};
const record=(system,category,fixture,format,result)=>{
 const html=format==='html',box=d.createElement('div');if(html)box.innerHTML=result;
 const text=html?textOf(result):String(result||''),repeated=sentenceCounts(text).filter(([,n])=>n>=3);
 const r={system,category,fixture,format,chars:text.length,sections:html?box.querySelectorAll('.lv4-sec,.nb-card,.lc-card,.astro-panel').length:(text.match(/^# /gm)||[]).length,structuredParagraphs:html?box.querySelectorAll('[data-reading-step],[data-editorial-step]').length:0,exactRepeatedSentences:repeated.map(([text,count])=>({text,count})),longSentenceOccurrences:sentenceCounts(text).filter(([s])=>s.length>50).reduce((n,[,count])=>n+count,0)};
 report.records.push(r);
 if(!text.trim()||/undefined|NaN|\[object Object\]/.test(text))finding('error','invalid-output',category+'/'+fixture,'Empty output or unresolved runtime value');
 if(repeated.length)finding('review','in-report-repetition',category+'/'+fixture,`${repeated.length} sentences of 25+ chars repeat 3+ times. This includes legitimate repeated supporting facts; inspect before deleting.`);
 if(fixture==='adult-married-known'&&['life','newyear','gunghap','ziwei','tarot-life','astro-life'].includes(category))r.sample=text.slice(0,2500);
 return text;
};
const safe=(where,fn)=>{try{return fn();}catch(e){finding('error','generation-exception',where,String(e.message));return null;}};
const fixture=(age,status='single',unknown=false)=>({...rt.fixture(age,7,status,unknown),id:`${age<20?'child':age>=66?'senior':age<26?'young-adult':'adult'}-${status}-${unknown?'unknown':'known'}`});
const fixtures=[fixture(9),fixture(22),fixture(40),fixture(40,'dating'),fixture(40,'married'),fixture(40,'married',true),fixture(70,'married')];
const routes={
 life:'renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)',newyear:'renderNewyearFortune(_saju,2027)',gunghap:'renderGunghapPaid(_saju,_meta.gnExtra)',name:'renderNamePaid(_saju,_meta.nmExtra)',ziwei:'renderZiweiPaid(_saju,_meta)',
 manse:'renderManseryeok(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min,s2l(_meta.sy,_meta.sm,_meta.sd))',daily:'renderDailyFortune(_saju)',vedic:'renderVedicFree(_saju,_meta)',mahabote:'renderMahaboteFree(_saju,_meta)'};
for(const key of topics.filter(k=>!['life','newyear','gunghap'].includes(k)))routes['topic-'+key]=`renderTopicPaid('topic-${key}',_saju,_meta)`;
const mdSection=(md,title)=>{const list=String(md||'').split(/^# /m).slice(1);return list.find(s=>s.split('\n')[0].includes(title))?.split('\n').slice(1).join('\n').trim()||'';};
const tarotInput=(topic,count=5)=>run(`({topic:${JSON.stringify(topic)},question:${JSON.stringify(topic==='career'?'이직 제안을 받았는데 현재 직장에 남을지 고민이에요.':'지금 무엇을 지키고 무엇을 바꾸면 좋을까요?')},topicTitle:${JSON.stringify(topic)},questionCategory:${JSON.stringify(topic)},spreadName:'검증용 스프레드',cards:TAROT_CARDS.slice(0,${count}).map((c,i)=>({positionIndex:i,positionLabel:['현재 상황','장애물','숨겨진 흐름','조언','결과'][i%5],positionMeaning:'이 질문의 선택과 조건',cardNameKo:c.nameKo,cardNameEn:c.nameEn,keywords:c.keywords,baseMeaning:c.uprightMeaning,categoryMeaning:${['love','marriage','reunion','gunghap'].includes(topic)?'c.loveMeaning':topic==='career'?'c.careerMeaning':topic==='money'?'c.moneyMeaning':'c.relationshipMeaning'},advice:c.advice,warning:c.warning,orientation:'upright'}))})`);
const getChart=unknown=>run(`calculateAstrologyChart({country:'대한민국',city:'서울특별시',year:1990,month:5,day:15,hour:9,minute:0,latitude:37.57,longitude:126.98,timezone:'Asia/Seoul',utcDateTime:'1990-05-15T00:00:00.000Z',birthTimeUnknown:${unknown}})`);
try{
 for(const meta of fixtures){
  rt.set(meta);
  for(const [cat,expr]of Object.entries(routes)){
   if(cat==='ziwei'&&meta.hour<0){report.probes.push({name:'ziwei-unknown-time',result:'excluded',reason:'Live form requires known birth time; do not fabricate a chart.'});continue;}
   run(`_category=${JSON.stringify(cat)}`);safe(cat+'/'+meta.id,()=>record(['ziwei','vedic','mahabote'].includes(cat)?cat:'saju',cat,meta.id,'html',run(expr)));
  }
 }
 rt.set(fixture(40,'married'));
 for(const topic of topics)for(const count of [3,5,10]){
  w.depthInput=tarotInput(topic,count);safe('tarot-'+topic+'/'+count,()=>record('tarot','tarot-'+topic,'cards-'+count,'markdown',run('generateTemplateReading(window.depthInput)')));
 }
 for(const unknown of [false,true]){
  w.depthChart=getChart(unknown);w.depthTransit=run("calculateTransit('2026-10-28T03:00:00.000Z')");
  for(const topic of topics){w.depthTopic=topic;safe('astro-'+topic,()=>record('astrology','astro-'+topic,unknown?'unknown-time':'known-time','markdown',run('astroPreviewTemplate(window.depthChart,window.depthTopic)')));}
  safe('astro-natal',()=>{const root=d.createElement('div');d.body.appendChild(root);w.depthNatalRoot=root;run('_astroFlow={chart:window.depthChart,birthInfo:window.depthChart.birthInfo};renderNatalChartResult(window.depthNatalRoot)');const text=record('astrology','astro-natal',unknown?'unknown-time':'known-time','html',root.innerHTML);root.remove();return text;});
  safe('astro-today',()=>record('astrology','astro-today',unknown?'unknown-time':'known-time','markdown',run('generateTodayAstrology(window.depthChart,window.depthTransit)')));
 }
 // Free tarot: measure whether all cards share identical practical sentences rather than personalizing by symbol.
 const freeTarotCounts=new Map();const cards=run('TAROT_CARDS.map(c=>c.id)');
 for(const id of cards){w.depthCardId=id;const html=safe('tarot-today/'+id,()=>run('todayTarotResultHTML(TAROT_CARDS.find(c=>c.id===window.depthCardId))'));if(!html)continue;const text=record('tarot','tarot-today',id,'html',html);for(const [s]of sentenceCounts(text))freeTarotCounts.set(s,(freeTarotCounts.get(s)||0)+1);}
 const widespread=[...freeTarotCounts].filter(([,n])=>n>=Math.ceil(cards.length/3)).sort((a,b)=>b[1]-a[1]);
 report.probes.push({name:'free-tarot-repeated-practical-text',cards:cards.length,sharedSentences:widespread.slice(0,10).map(([text,cards])=>({text,cards})),note:'Shared card-drawing instructions and disclosure are legitimate; repeated interpretive advice needs editorial review.'});
 // Counterfactuals change only one actual input while keeping everything else stable.
 for(const topic of topics){
  const a=getChart(false);const b=JSON.parse(JSON.stringify(a));b.planets=b.planets.map(p=>p.planet==='moon'?{...p,sign:p.sign==='aries'?'cancer':'aries'}:p);
  const c=JSON.parse(JSON.stringify(a));c.aspects=[{planetA:'sun',planetB:'moon',aspectType:'square',orb:0.5,meaningType:'tense'}];
  w.depthTopic=topic;w.depthChart=a;const base=run('astroPracticalReading(window.depthChart,window.depthTopic)');w.depthChart=b;const moon=run('astroPracticalReading(window.depthChart,window.depthTopic)');w.depthChart=c;const aspect=run('astroPracticalReading(window.depthChart,window.depthTopic)');
  report.probes.push({name:'astrology-multi-factor-sensitivity',topic,moonChangesText:base!==moon,aspectChangesText:base!==aspect,note:'Synthetic sensitivity probe, not a physically valid replacement chart. A single probe is not proof of missing interpretation; inspect live summary and paid AI separately.'});
 }
 // A valid saju reference must not be mistaken for proof of a ziwei star placement.
 run("_category='ziwei'");
 const ziweiPayload=run("buildAIReadingPayload('reading-deep',{source:'paid-deep'})"),ziweiRefs=Array.from(run("readingSynthesisReferences('ziwei')"));
 const actualStars=Array.from(run("zwStarsOf(buildZiweiChart(_saju,_meta),'명궁').stars"));
 const wrongStar=['자미','천부','파군','태음'].find(s=>!actualStars.includes(s));
 w.depthWrongParas=[`명궁에는 ${wrongStar}이 있어서 중요한 결정을 오래 검토하는 힘이 중심을 잡고 있어요. 준비가 충분한지 계속 확인하면서 쉽게 결론을 내리지 않는 모습으로 읽어요.`, '이 성향은 정확한 판단을 돕지만 검토해야 할 조건이 계속 늘어나면 시작이 늦어질 수 있어요. 무엇을 더 알면 판단이 달라질지 구분해 보세요.'];
 w.depthNatalRefs=Array.from(run("readingSynthesisReferences('saju')")).filter(x=>x.startsWith('natal.')).slice(0,2);w.depthZiweiRefs=ziweiRefs.slice(0,2);
 report.probes.push({name:'ziwei-system-specific-grounding',actualMingStars:actualStars,syntheticWrongMingStar:wrongStar,contextKeys:Object.keys(ziweiPayload.sajuContext),allowedRefs:ziweiRefs,hasZiweiReferenceNamespace:ziweiRefs.some(x=>/^(ziwei|zw|palace|star)[.:]/.test(x)),natalRefsAcceptedForZiwei:run("readingSynthesisQuality({evidenceRefs:window.depthNatalRefs,paragraphs:window.depthWrongParas},'ziwei')"),wrongStarPassesSystemQuality:run("readingSynthesisQuality({evidenceRefs:window.depthZiweiRefs,paragraphs:window.depthWrongParas},'ziwei')"),wrongStarProsePassesGenericQuality:run("readingDeepQuality(window.depthWrongParas,renderZiweiPaid(_saju,_meta),_meta)"),note:'Synthetic validator probe, not a real AI response. Plain-text section facts may contain correct stars; generic natal references alone do not validate a ziwei placement.'});
 // Source wiring checks are explicit observations, not claims about semantic quality.
 for(const [name,file,re]of [
  ['tarot-paid-freezes-first-two-sections','index.html',/keep=mdSections\(tpl\)\.slice\(0,2\)/],
  ['astrology-paid-freezes-first-sections','assets/astrology.js',/keep=mdSections\(tpl\)\.slice\(0,[12]\)/],
  ['pdf-all-groups-unbounded-promise-all','assets/report-pdf.js',/Promise\.all\(plan\.groups\.map\(one\)\)/],
  ['pdf-budget-forces-3000-even-if-over-ceiling','assets/report-pdf.js',/Math\.max\(3000,RP_MAX_CHARS-rpCount\(mainPages\)-600\)/]
 ])report.sourceChecks.push({name,file,present:re.test(sourceText[file])});
 // PDF fallback QA at the content-plan stage. Browser pagination must be checked separately.
 const exportMarker='window.TEMPLATE_REPORT_SPECS=SPECS;';
 if(!sourceText['assets/report-pdf.js'].includes(exportMarker))throw new Error('PDF audit export anchor changed; update this audit rather than silently skip PDF coverage.');
 run(sourceText['assets/report-pdf.js'].replace(exportMarker,'window.__depthPDF={collect:rpCollect,plan:rpPlan,fill:rpFill,facts:rpFacts,parse:rpParse,quality:rpSectionQuality,version:RP_VERSION,maxChars:RP_MAX_CHARS};'+exportMarker));
 rt.set(fixture(40,'married'));run("_category='life'");
 w.depthFiller=['지금 본인의 상황을 충분히 살펴보고 선택의 방향을 정리하는 것이 중요해요. '.repeat(5),'새로운 기회를 활용하며 본인의 상황을 살펴보고 방향을 정리하는 것이 좋아요. '.repeat(5)];
 report.probes.push({name:'pdf-quality-repetitive-filler-accepted',accepted:run('window.__depthPDF.quality(window.depthFiller)'),note:'Synthetic shallow text. Passing length checks does not prove editorial quality.'});
 for(const cat of Object.keys(w.TEMPLATE_REPORT_SPECS))safe('pdf-'+cat,()=>{
  w.depthCategory=cat;
  const data=run('window.__depthPDF.collect(window.depthCategory)');data.info={};w.depthPDFData=data;
  const spec=w.TEMPLATE_REPORT_SPECS[cat];w.depthPDFSpec=spec;
  const plan=run('window.__depthPDF.plan(window.depthPDFSpec,window.depthPDFData)');w.depthPDFPlan=plan;
  const filled=run('window.__depthPDF.fill(window.depthPDFPlan,{secs:{},fields:{}},window.depthPDFData,window.depthPDFSpec,window.__depthPDF.facts(window.depthPDFData))');
  const heads=plan.groups.flatMap(g=>g.heads),hashes=new Map(),empty=[];
  for(const h of heads){const paras=filled.secs[h.id]||[];if(!paras.length||!paras.join('').trim())empty.push(h.id);const text=paras.map(norm).join('\n');if(!hashes.has(text))hashes.set(text,[]);hashes.get(text).push({id:h.id,chapter:h.chapter,title:h.title});}
  const duplicates=[...hashes].filter(([t,hs])=>t&&hs.length>1).map(([text,heads])=>({heads,chars:text.length,excerpt:text.slice(0,200)}));
  const fieldsText=Object.values(filled.fields).join(' '),sectionsText=Object.values(filled.secs).flat().join(' ');
  report.pdf.push({category:cat,version:w.__depthPDF.version,characterCeiling:w.__depthPDF.maxChars,chapters:plan.pages.length,headings:heads.length,requestGroups:plan.groups.length,emptyHeadings:empty,duplicateHeadingBodies:duplicates,fallbackProseChars:sectionsText.length,fieldsChars:fieldsText.length,note:'Counts cover generated chapter prose/fields before pagination. They do not establish total PDF text length, clipping, semantic correctness, or live AI coverage.'});
  if(empty.length)finding('error','pdf-empty-heading',cat,empty.join(', '));
  if(duplicates.length)finding('review','pdf-duplicate-heading-bodies',cat,`${duplicates.reduce((n,g)=>n+g.heads.length,0)} headings share exact fallback prose. Verify distinct heading questions are answered, rather than merely reusing an arc.`);
 });
 report.summary={generated:report.records.length,categories:[...new Set(report.records.map(x=>x.category))],systems:[...new Set(report.records.map(x=>x.system))],pdfProducts:report.pdf.length,errors:report.findings.filter(x=>x.level==='error').length,editorialReviewItems:report.findings.filter(x=>x.level==='review').length,limits:'Mocked output and source checks only; no future accuracy or human satisfaction claim.'};
 const stableSources=sourceFiles.every(p=>sha(fs.readFileSync(path.join(rt.root,p),'utf8'))===report.sources[p]);report.sourceSnapshotStableDuringRun=stableSources;
 if(!stableSources)report.snapshotWarning='Production files changed during audit. Each generator was loaded at startup; PDF uses its recorded snapshot. Repeat after implementation stabilizes for final comparison.';
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.summary,null,2));console.log('Audit: '+output);
 if(report.summary.errors)process.exitCode=1;
}finally{rt.close();}
