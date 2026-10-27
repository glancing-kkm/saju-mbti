'use strict';
// All AI, email, payment, storage and browser calls are mocked. No outbound mail.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dom=new JSDOM(source,{url:'https://saju.example/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
const w=dom.window,d=w.document,ctx=dom.getInternalVMContext();
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});w.alert=()=>{};
w.fetch=async()=>({ok:true,json:async()=>({available:true,ok:true}),headers:{get:()=>null}});
const run=s=>vm.runInContext(s,ctx,{timeout:15000});
run([...d.querySelectorAll('script')].filter(x=>!x.src&&!/json/.test(x.type)).map(x=>x.textContent).join('\n;\n'));
const wait=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 run("_meta={sy:1987,sm:9,sd:21,hour:7,min:0,gender:'male',cityKey:'seoul',marital:'married'};_saju=calcSaju(1987,9,21,7,0);gender='male';_category='life';");
 const sample=run('buildPinpoint(_saju,_meta)');
 assert.notEqual(sample.helper.years[0],sample.avoid.years[0]);
 for(let stem=0;stem<10;stem++)for(let branch=0;branch<12;branch++){
   w.fixture={yp:{stem:3,branch:3},mp:{stem:5,branch:9},dp:{stem,branch},hp:null};
   const p=run('buildPinpoint(window.fixture,_meta)');
   assert(!p.helper.years.some(y=>(y-4)%12===(branch+6)%12));
   const box=d.createElement('div');w.p=p;box.innerHTML=run('lcPeople(window.fixture,{P:window.p})');
   assert.equal(box.querySelectorAll('.lc-person-secondary').length,0);
   assert.equal(box.querySelectorAll('.lc-pcard.helper').length,1);assert.equal(box.querySelectorAll('.lc-pcard.foe').length,1);
 }
 console.log('✓ 인물 검증: 계유일 표본과 120개 일간·일지 조합에서 귀인/충 기준 분리, 두 번째 인물 카드 없음');
 const core=run("lv4StoryLines(_saju,_meta,'core')"),money=run("lv4StoryLines(_saju,_meta,'money')"),work=run("lv4StoryLines(_saju,_meta,'career')");
 assert.equal(core.length,3);assert.notEqual(core[0],money[0]);assert.notEqual(work[0],money[0]);assert.match(core[1],/일간/);
 const married=run("lv4StoryLines(_saju,_meta,'love').join(' ')");assert.match(married,/배우자/);assert(!/새로운 연인/.test(married));
 const child=run("lv4StoryLines(_saju,{sy:new Date().getFullYear()-10},'career').join(' ')");assert(!/이직|승진|직장|대출/.test(child));
 const reading=run('renderSajuPaid(_saju,1987,9,21,7,0)');const box=d.createElement('div');box.innerHTML=reading;const plain=box.textContent.replace(/\u00a0/g,' ');assert(plain.includes(core[0]));assert(plain.includes(money[0]));
 assert(!/사주로 확정할 수 있어요/.test(run("lv4StoryLines(_saju,_meta,'children').join(' ')")));
 console.log('✓ 풀이: 생활 장면·계산 근거·행동, 주제별 구별, 기혼 관계, 어린이 생애주기, 실제 웹 본문 반영');
 const annual=run('buildNewyearReadingV4(_saju,2027,_meta)');
 const monthly=annual.model.months.map(x=>{w.monthFixture=x;return run('lv4MonthNarrative(window.monthFixture,_saju,_meta,41)');});
 assert.equal(new Set(monthly).size,12);assert(monthly.every(t=>t.length>120));
 assert(!annual.html.includes('이달에 챙길 일 하나'));assert(!annual.html.includes('lc-person-secondary'));
 const annualBox=d.createElement('div');annualBox.innerHTML=annual.html;
 assert.equal(annualBox.querySelectorAll('#lv4-ny-basic .lv4-rows')[1].querySelectorAll('.lv4-row').length,12);
 assert(annualBox.textContent.includes(monthly[0]));
 w.monthFixture=annual.model.months[0];
 const monthlyMoney=run("lv4MonthNarrative(window.monthFixture,_saju,_meta,41,'money')");
 const monthlyWork=run("lv4MonthNarrative(window.monthFixture,_saju,_meta,41,'career')");
 const monthlyLove=run("lv4MonthNarrative(window.monthFixture,_saju,_meta,41,'love')");
 assert.notEqual(monthlyMoney,monthlyWork);assert.match(monthlyLove,/배우자/);assert(!/고백|새 인연/.test(monthlyLove));
 const monthlyChild=run("lv4MonthNarrative(window.monthFixture,_saju,_meta,10,'career')");
 assert(!/직장|계약|수입|세금|승진|대출/.test(monthlyChild));
 const low=run("lv4MonthNarrative({...window.monthFixture,score:40,sc:{wealth:40}},_saju,_meta,41,'money')");
 const high=run("lv4MonthNarrative({...window.monthFixture,score:90,sc:{wealth:90}},_saju,_meta,41,'money')");
 assert.notEqual(low,high);assert.match(low,/확인할 여유/);assert.match(high,/반응|작게 시작|대화를 꺼내/);
 console.log('✓ 월별 풀이: 12달 개별 서술·장면과 행동, 영역별 구분, 기혼·아동 반영, 점수별 속도, 두 번째 인물 없음');
 const rgb=hex=>{hex=hex.replace('#','');if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);};
 const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 const tones=run('Object.values(PRODUCT_INTRO).map(x=>x.tone).filter(Boolean)');
 for(const [base,depth] of tones){const bg=rgb(base),card=bg.map((v,i)=>v*.72+rgb(depth)[i]*.28);for(const fg of ['#fafaf7','#e9eeeb','#c2cec8']){assert(ratio(rgb(fg),bg)>=4.5);assert(ratio(rgb(fg),card)>=4.5);}}
 console.log(`✓ 공통 색상: ${tones.length}개 상품 테마의 본문·보조 글씨가 배경과 카드에서 대비 4.5:1 이상`);

 run("_lastInputs={gender:'male',calType:'solar',isLeap:false,year:'1987',month:'9',day:'21',hour:'7',min:'0',cityKey:'seoul',marital:'married'};_marital='';document.getElementById('iName').value='김하늘';goToInput('newyear');");
 assert.equal(run('_marital'),'married');assert.equal(d.getElementById('mrMarried').getAttribute('aria-checked'),'true');assert.equal(d.getElementById('iCity').dataset.wzConfirmed,'1');assert.equal(run('_wz.steps[_wz.open][0].id'),'catExtraNewyear');
 run("setMarital('dating');goToInput('topic-money')");assert.equal(run('_marital'),'dating');assert.equal(run('_lastInputs.marital'),'dating');
 run("_meta.marital='married';_category='life';");const preview=run("previewLockHTML('life',renderSajuPaid(_saju,1987,9,21,7,0))");
 const previewBox=d.createElement('div');previewBox.innerHTML=preview;assert(previewBox.querySelector('img[src*="preview-people/male.jpg"]'));assert(!previewBox.querySelector('[data-portrait]'));assert(!previewBox.querySelector('.lc-portrait-pending'));
 run("gender='female';_meta.gender='female'");const female=run("previewLockHTML('life','<div class=\"lv4\">'+lcPeople(_saju,{})+'</div>')");assert(female.includes('/assets/preview-people/female.jpg'));run("gender='male';_meta.gender='male'");
 console.log('✓ 재입력·미리보기: 관계 상태와 지역 확인 복원, 신년 연도부터 시작, 공용 남녀 이미지, 유료 이미지 생성 차단');

 // PDF-ready form uses the matching PDF token even if a newer other-category token exists.
 const unsigned=c=>Buffer.from(JSON.stringify({o:'UI-'+c,c,e:Date.now()+86400000})).toString('base64url')+'.test';
 w.testToken=unsigned('pdf-life');run('savePaidToken(window.testToken)');w.other=unsigned('life');run('savePaidToken(window.other)');assert.equal(run("pdfPaidToken('life')"),w.testToken);
 w.testBlob=new w.Blob(['%PDF-1.7 test report'],{type:'application/pdf'});run("pdfReadyPrompt(window.testBlob,'리포트.pdf','사주','life')");await wait();
 assert.equal(d.querySelector('#pdfReady input').type,'email');assert.equal(d.querySelector('#pdfReady form button').disabled,false);
 d.querySelector('#pdfEmailAddress').value='reader@example.com';let submitted;
 w.fetch=async(url,options)=>{submitted={url,options};return {ok:true,json:async()=>({ok:true})};};
 await d.querySelector('#pdfReady form').onsubmit({preventDefault(){}});
 assert(submitted.url.endsWith('/report-email'));assert.equal(submitted.options.body.get('paidToken'),w.testToken);assert.equal(submitted.options.body.get('email'),'reader@example.com');assert.match(d.querySelector('.pdf-email-status').textContent,/발송을 요청/);
 console.log('✓ PDF UI: 이메일 입력·발송 상태·첨부 요청·PDF 상품 토큰 선택');
 const server=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,Request,Response,URL,FormData,Blob,AbortSignal,console});
 vm.runInContext(fs.readFileSync(path.join(root,'worker/saju-chat-worker.js'),'utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const testWorker={'),server);
 const store=new Map(),secret='test-email-only',sent=[];
 const env={PAID_TOKEN_SECRET:secret,REPORT_EMAIL_FROM:'report@example.com',EMAIL:{send:async m=>{sent.push(m);return {messageId:'mock'};}},SAJU_QNA_CACHE:{get:async k=>store.get(k)||null,put:async(k,v)=>store.set(k,v)}};
 async function sign(c){const body=Buffer.from(JSON.stringify({o:'PDF-ORDER-'+c,c,e:Date.now()+86400000})).toString('base64url');const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return body+'.'+Buffer.from(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(body))).toString('base64url');}
 const token=await sign('pdf-life'),ordinary=await sign('life');
 async function send(to='reader@example.com',tok=token,content='%PDF-1.7 mock report',customEnv=env){const form=new FormData();form.set('email',to);form.set('paidToken',tok);form.set('pdf',new Blob([content],{type:'application/pdf'}),'리포트.pdf');server.req=new Request('https://worker.example/report-email',{method:'POST',body:form});server.env=customEnv;return vm.runInContext('handleReportEmail(req,env)',server);}
 assert.equal((await send('bad-address')).status,400);assert.equal((await send('reader@example.com',ordinary)).status,403);assert.equal((await send('reader@example.com',token,'not a PDF file')).status,400);
 assert.equal((await send('reader@example.com',token,undefined,{...env,EMAIL:null})).status,503);
 const failedEnv={...env,EMAIL:{send:async()=>{throw new Error('mock-failure');}}};assert.equal((await send('reader@example.com',token,undefined,failedEnv)).status,502);assert(!store.size);
 assert.equal((await send()).status,200);assert.equal(sent.length,1);assert.equal(sent[0].to,'reader@example.com');assert.equal(new TextDecoder().decode(sent[0].attachments[0].content),'%PDF-1.7 mock report');
 assert((await (await send()).json()).alreadySent);assert.equal(sent.length,1);
 assert.equal((await send('second@example.com')).status,200);assert.equal((await send('third@example.com')).status,200);assert.equal((await send('fourth@example.com')).status,429);
 assert(!JSON.stringify([...store]).includes('@example.com'));assert(!JSON.stringify([...store]).includes('%PDF'));
 console.log('✓ 메일 서버: 서명·PDF 상품 검증, 주소·파일 검증, 설정 미완료, 실패 미차감, PDF 첨부, 중복·3회 제한, 주소·파일 미보관');
 let apiMessage;server.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(options.headers.Authorization,'Bearer mock-key');assert(options.headers['Idempotency-Key']);apiMessage=JSON.parse(options.body);return new Response('{"id":"mock"}',{status:200});};
 const apiEnv={...env,EMAIL:null,RESEND_API_KEY:'mock-key'},apiToken=await sign('pdf-topic-money');
 assert.equal((await send('api-reader@example.com',apiToken,undefined,apiEnv)).status,200);assert.equal(Buffer.from(apiMessage.attachments[0].content,'base64').toString(),'%PDF-1.7 mock report');
 assert.match(apiMessage.from,/report@example.com/);assert.equal(apiMessage.to,'api-reader@example.com');
 store.set('refunded:PDF-ORDER-pdf-life','1');assert.equal((await send()).status,403);
 console.log('✓ 대체 메일 공급자: PDF base64·발신 주소·중복 방지 키, 환불한 PDF 발송 차단');

 dom.window.close();
})().catch(e=>{dom.window.close();console.error(e);process.exitCode=1;});
