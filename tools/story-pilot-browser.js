'use strict';
// Local review only: synthetic inputs, no live AI/payment/email. Requires an isolated puppeteer-core installation.
const fs=require('node:fs'),path=require('node:path');
const puppeteer=require(process.env.STORY_BROWSER_MODULE||'puppeteer-core');
const base=process.env.STORY_REVIEW_BASE||'http://127.0.0.1:8778/',out=process.env.STORY_REVIEW_OUT||'/tmp/fortune-story-review';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-background-networking']});
 const results=[],blocked=[];
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',r=>{const u=r.url();if(u.startsWith(base)||/^data:/.test(u))r.continue();else{blocked.push(u);r.abort();}});
  await page.evaluateOnNewDocument(()=>{window.FortuneStoryConfig={enabled:true};});
  await page.goto(base,{waitUntil:'networkidle0',timeout:30000});await page.waitForFunction(()=>typeof storyBuild==='function'&&typeof calculateAstrologyChart==='function');
  await page.evaluate(()=>{
   window.qaMeta={sy:1990,sm:5,sd:15,hour:9,min:30,gender:'male',marital:'married',cityKey:'seoul',tsoMin:0,userName:'검토용 가상 인물',counsel:{source:'user-stated',answers:[{key:'occupation',label:'현재 하는 일',value:'사무직'},{key:'focus',label:'관심사',value:'일과 생활의 균형'}]}};
   _meta=window.qaMeta;gender='male';_saju=calcSaju(1990,5,15,9,30);_category='life';
   window.qaChart=calculateAstrologyChart({country:'대한민국',city:'서울특별시',year:1990,month:5,day:15,hour:9,minute:30,latitude:37.57,longitude:126.98,timezone:'Asia/Seoul',utcDateTime:'1990-05-15T00:30:00.000Z',birthTimeUnknown:false});
   window.qaTarot={question:'이직을 고민할 때 어떤 조건부터 확인할까요?',topic:'career',questionCategory:'career',spreadName:'3장',positions:getSpreadPositions('tarot3','career','career'),selectedCards:[{positionIndex:0,cardId:'swords-08',orientation:'reversed'},{positionIndex:1,cardId:'wands-08',orientation:'upright'},{positionIndex:2,cardId:'pentacles-08',orientation:'upright'}],paymentStatus:'none'};
  });
  const kinds=['saju','tarot','astrology','ziwei'];
  for(const kind of kinds){
   await page.evaluate(kind=>{
    applyCategoryTheme(kind==='tarot'?'tarot-career':kind==='astrology'?'astro-life':kind==='ziwei'?'ziwei':'life');let html='';if(kind==='saju')html=renderSajuPaid(_saju,1990,5,15,9,30);else if(kind==='ziwei')html=renderZiweiPaid(_saju,_meta);
    else if(kind==='tarot'){const input=buildAIReadingInput(window.qaTarot),md=generateTemplateReading(input),r=lv4FromMarkdown(md,'tr');html=`<div class="lv4-wrap"><div class="lv4">${storyMarkdownView(md,'tarot',input,'career')}${lvToc(r.items,'타로 풀이 목차')}${r.html}</div></div>`;}
    else{_astroFlow={chart:window.qaChart,birthInfo:window.qaChart.birthInfo,productType:'life',productName:'점성술 인생총운',question:'내 안의 두 기준을 어떻게 맞출까요?',paymentStatus:'none'};const md=astroPreviewTemplate(window.qaChart,'life'),r=lv4FromMarkdown(md,'ar');html=`<div class="lv4-wrap"><div class="lv4">${storyMarkdownView(md,'astrology',_astroFlow,'life')}${lvToc(r.items,'점성술 목차')}${r.html}</div></div>`;}
    document.getElementById('app').innerHTML='<div style="padding:14px;font-size:14px;line-height:1.7">검토용 가상 입력 · 계산형 샘플 · 실제 AI 생성 전</div><main id="story-review-root">'+html+'</main>';storyBindMarkdownView(document.getElementById('story-review-root'));window.scrollTo(0,0);
   },kind);
   for(const width of [390,1069]){
    await page.setViewport({width,height:width===390?844:745});await new Promise(r=>setTimeout(r,200));
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,plans:document.querySelectorAll('[data-story-plan]').length,chapters:document.querySelectorAll('[data-story-chapter]').length,deadLinks:[...document.querySelectorAll('.story-map a')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)}));
    if(metrics.scrollWidth>width+1||metrics.deadLinks.length||!metrics.plans)throw Error(kind+' layout: '+JSON.stringify(metrics));
    await page.screenshot({path:path.join(out,kind+'-'+width+'.png')});results.push({kind,...metrics});
   }
   await page.evaluate(()=>{const e=document.querySelector('.story-evidence');if(e){e.open=true;e.scrollIntoView({block:'start'});}});await page.screenshot({path:path.join(out,kind+'-evidence.png')});
   const html=await page.evaluate(()=>{const copy=document.documentElement.cloneNode(true);copy.querySelectorAll('script').forEach(s=>s.remove());const b=document.createElement('base');b.href=location.origin+'/';copy.querySelector('head').prepend(b);return '<!doctype html>'+copy.outerHTML;});fs.writeFileSync(path.join(out,kind+'.html'),html);
  }
  // Render the real application PDF template using the same calculated fixture, no inference.
  await page.addScriptTag({url:base+'assets/report-pdf.js'});
  const pdf=await page.evaluate(async()=>{_category='life';const r=await buildTemplateReport('life',{skipAI:true,dryRun:true,info:{}});const overflow=r.pages.map((p,i)=>{const b=p.querySelector('.rp-body');return b&&b.scrollHeight>b.clientHeight+1?i+1:null;}).filter(Boolean);return {html:r.html,pages:r.pages.length,chars:r.chars,hasPlan:!!r.storyPlan,overflow};});
  if(!pdf.hasPlan||pdf.overflow.length||pdf.chars>60000)throw Error('PDF checks: '+JSON.stringify({...pdf,html:undefined}));
  fs.writeFileSync(path.join(out,'life-report.html'),pdf.html);
  await page.setContent(pdf.html,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.pdf({path:path.join(out,'life-report.pdf'),preferCSSPageSize:true,printBackground:true});
  await page.setViewport({width:794,height:1123});const cover=await page.$('.rp-page');if(cover)await cover.screenshot({path:path.join(out,'life-report-cover.png')});
  const bodyPage=await page.$('.rp-page:nth-of-type(7)');if(bodyPage)await bodyPage.screenshot({path:path.join(out,'life-report-body.png')});
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,pdf:{...pdf,html:undefined},errors,blockedModelRequests:blocked.filter(u=>/workers\.dev.*\/(reading|portrait|tarot-reading|astrology-reading)/.test(u))},null,2));
  if(errors.length)throw Error('Page errors: '+errors.join('; '));
  console.log(JSON.stringify({reviewDirectory:out,viewports:results.length,pdfPages:pdf.pages,pdfChars:pdf.chars,pdfOverflow:pdf.overflow,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
