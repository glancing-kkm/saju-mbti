#!/usr/bin/env node
'use strict';
// Deterministic content audit. No AI, payment, email or external requests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const rt=require('./lib/reading-runtime')();
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const out=arg('--out')||'docs/reading-quality/latest.json';
const routes={life:'renderSajuPaid(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min)',newyear:'renderNewyearFortune(_saju,2027)',gunghap:'renderGunghapPaid(_saju,_meta.gnExtra)',name:'renderNamePaid(_saju,_meta.nmExtra)',ziwei:'renderZiweiPaid(_saju,_meta)',manse:'renderManseryeokFull(_saju,_meta.sy,_meta.sm,_meta.sd,_meta.hour,_meta.min,s2l(_meta.sy,_meta.sm,_meta.sd))',daily:'renderDailyFortune(_saju)',vedic:'renderVedicFree(_saju,_meta)',mahabote:'renderMahaboteFree(_saju,_meta)'};
for(const key of ['love','money','career','marriage','reunion','study','child','children','health'])routes['topic-'+key]=`renderTopicPaid('topic-${key}',_saju,_meta)`;
routes.free='renderSajuFree(_saju)';routes['mbti-comparison']="renderMBTI(_saju,'INTJ')";
const fixtures=[5,6,15,16,19,20,25,26,35,36,45,46,55,56,65,66,80].map((age,i)=>rt.fixture(age,i));
fixtures.push(rt.fixture(40,7,'dating'),rt.fixture(40,7,'married'),rt.fixture(40,7,'single',true),rt.fixture(40,8,'married'));
const summary={revision:crypto.createHash('sha256').update(rt.source).digest('hex').slice(0,12),referenceDate:'2026-10-28',scope:'생성 경로/대표 사례의 문장 품질 검사. 미래 사건의 정확도 검증이나 AI 실응답 전수 검증은 포함하지 않음.',routes:Object.keys(routes),fixtures:fixtures.map(m=>m.id),records:[],findings:[],metrics:{}};
const stories=[],monthActions=new Map(),samples=[];
summary.metrics.longSentences={all:0,structured:0};summary.metrics.repeatedSentences={reports:0,sentenceOccurrences:0,excessOccurrences:0,examples:[]};
const add=(severity,code,where,detail)=>summary.findings.push({severity,code,where,detail});
try{
 for(const meta of fixtures){
  rt.set(meta);
  for(const [cat,expression] of Object.entries(routes)){
   if(cat==='ziwei'&&meta.hour<0)continue;
   rt.run(`_category='${cat}'`);
   try{
    const html=rt.run(expression),text=rt.text(html);const box=rt.d.createElement('div');box.innerHTML=html;
    const sections=[...box.querySelectorAll('.lv4-sec')].map(e=>({id:e.id,title:rt.clean(e.querySelector('h2')?.textContent),paragraphs:[...e.querySelectorAll('p')].map(p=>rt.clean(p.textContent)).filter(Boolean)}));
    const sentences=sections.flatMap(s=>s.paragraphs).flatMap(p=>p.match(/[^.!?]+[.!?]/g)||[]).map(t=>rt.clean(t));
    summary.metrics.repeatedSentences.sentenceOccurrences+=sentences.length;
    summary.metrics.longSentences.all+=sentences.filter(t=>t.length>50).length;
    const counts=new Map();sentences.filter(t=>t.length>=25).forEach(t=>counts.set(t,(counts.get(t)||0)+1));
    const repeated=[...counts].filter(([,n])=>n>=3);if(repeated.length){summary.metrics.repeatedSentences.reports++;summary.metrics.repeatedSentences.excessOccurrences+=repeated.reduce((n,[,count])=>n+count-1,0);if(summary.metrics.repeatedSentences.examples.length<8)summary.metrics.repeatedSentences.examples.push({cat,fixture:meta.id,sentences:repeated.slice(0,2)});}
    summary.metrics.longSentences.structured+=[...box.querySelectorAll('[data-reading-step]')].flatMap(p=>p.textContent.match(/[^.!?]+[.!?]/g)||[]).filter(t=>rt.clean(t).length>50).length;
    const record={fixture:meta.id,cat,chars:text.length,sections:sections.length,paragraphs:sections.reduce((n,s)=>n+s.paragraphs.length,0)};summary.records.push(record);
    if(!text||/undefined|NaN|\[object Object\]/.test(text))add('error','render',`${meta.id}/${cat}`,'빈 본문 또는 미치환 값');
    if(meta.id===fixtures[9].id)samples.push({cat,sections});
    if(cat==='life'){
     const lines=rt.run("lv4StoryLines(_saju,_meta,'career')");stories.push({id:meta.id,lines});
     if(lines.length<4)add('warning','arc',`${meta.id}/career`,'핵심·근거·전개·행동의 네 단락이 분리되지 않음');
    }
   }catch(e){add('error','exception',`${meta.id}/${cat}`,e.message);}
  }
  const m=rt.run('buildNewyearV3Model(_saju,2027,_meta)');
  for(const x of m.months){rt.w.monthFixture=x;const t=rt.run("lv4MonthNarrative(window.monthFixture,_saju,_meta,2027-_meta.sy+1,'career')");const end=rt.clean(t.match(/[^.!?]+[.!?]*$/)?.[0]||t);monthActions.set(end,(monthActions.get(end)||0)+1);}
 }
 const adults=stories.filter(x=>!/^age(5|6|15|16|19)-/.test(x.id));
 const actions=adults.map(x=>x.lines[x.lines.length-1]);summary.metrics.careerActionVariants={outputs:actions.length,unique:new Set(actions).size};
 if(new Set(actions).size<=2)add('warning','generic-action','career','다른 사주와 생애주기에서도 행동 문장이 거의 같음');
 summary.metrics.monthlyEndings=[...monthActions].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([text,count])=>({text,count}));
 if(rt.source.includes('paceSet[(x.month-1)%3]'))add('warning','cosmetic-variation','monthly','월 번호에 따라 마무리 조언을 순환 선택함');
 const domains=['core','career','money','love','health','study','child','children','reunion','marriage'];
 summary.metrics.storyDomains=domains;
 const staticFiles=['index.html','assets/astrology.js','assets/report-pdf.js'];
 const sourceInventory=staticFiles.map(file=>({file,functions:[...fs.readFileSync(path.join(rt.root,file),'utf8').matchAll(/function\s+([\w$]+)\s*\(/g)].map(m=>m[1]).filter(n=>/Reading|Narrative|Fortune|Paid|Story|Template|FieldDecision/.test(n))}));summary.sourceInventory=sourceInventory;
 // All 12 topics for tarot/astrology are generated from fixture data, without models.
 rt.set(rt.fixture(40,7,'married'));
 for(const topic of ['life','newyear','gunghap','love','marriage','reunion','money','career','study','child','children','health']){
  const input=rt.run(`({topic:'${topic}',question:'확인할 조건은 무엇인가요?',cards:TAROT_CARDS.slice(0,5).map((c,i)=>({positionLabel:['현재','장애물','숨은 강점','조언','결과'][i],positionMeaning:'질문과 연결한 조건',cardNameKo:c.nameKo,keywords:c.keywords,baseMeaning:c.uprightMeaning,categoryMeaning:c.careerMeaning,advice:c.advice,warning:c.warning,orientation:'upright'}))})`);rt.w.input=input;
  const tarot=rt.run('generateTemplateReading(window.input)');summary.records.push({fixture:'tarot-5',cat:'tarot-'+topic,chars:tarot.length,sections:(tarot.match(/^# /gm)||[]).length});
  if(!tarot||/undefined|NaN|\[object Object\]/.test(tarot))add('error','render','tarot-'+topic,'빈 본문 또는 미치환 값');
  const astro=rt.run(`astroPracticalReading({planets:[{planet:'sun',sign:'aries'},{planet:'moon',sign:'cancer'},{planet:'venus',sign:'libra'},{planet:'mercury',sign:'virgo'}]},'${topic}')`);summary.records.push({fixture:'astro-reference',cat:'astro-'+topic,chars:astro.length});
  if(!astro||/undefined|NaN|\[object Object\]/.test(astro))add('error','render','astro-'+topic,'빈 본문 또는 미치환 값');
 }
 summary.metrics.generated=summary.records.length;summary.metrics.errors=summary.findings.filter(f=>f.severity==='error').length;summary.metrics.warnings=summary.findings.filter(f=>f.severity==='warning').length;
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(summary,null,2)+'\n');
 if(arg('--samples'))fs.writeFileSync(arg('--samples'),JSON.stringify(samples,null,2)+'\n');
 console.log(JSON.stringify(summary.metrics,null,2));console.log(`Audit: ${out}`);
 if(summary.metrics.errors)process.exitCode=1;
}finally{rt.close();}
