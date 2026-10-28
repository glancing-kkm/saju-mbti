// Relationship, profile and per-order chat checks. AI and payments never leave this process.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://saju.example/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
const w=dom.window,d=w.document,ctx=dom.getInternalVMContext();
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});w.alert=()=>{};w.fetch=async()=>({ok:true,json:async()=>({}),text:async()=>'',headers:{get:()=>null}});
const run=s=>vm.runInContext(s,ctx,{timeout:15000});
run([...d.querySelectorAll('script')].filter(x=>!x.src&&!/json/.test(x.type)).map(x=>x.textContent).join('\n;\n'));
const check=(label,fn)=>{fn();console.log('✓ '+label);};
const server=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,atob,btoa,Request,Response,URL,FormData,Blob,console});
vm.runInContext(fs.readFileSync(path.join(root,'worker/saju-chat-worker.js'),'utf8').replace(/^import .*;\s*$/gm,'').replace('export default {','const testWorker={'),server);
(async()=>{
 run("_saju={yp:{stem:0,branch:0},mp:{stem:2,branch:2},dp:{stem:4,branch:4},hp:null};_meta={sy:1990,sm:5,sd:15,hour:null,min:0,gender:'male',cityKey:'seoul',marital:'single'};gender='male';_category='life';");
 check('이름 초성: 한글 이름을 음절별로 분해하고 두 인물을 구분',()=>{
   assert.equal(run("nameInitials('김강민')"),'ㄱㄱㅁ');
   for(let seed=0;seed<60;seed++){assert.match(run(`personInitials(${seed})`),/^[ㄱ-ㅎ]{3}$/);assert.notEqual(run(`personInitials(${seed},0)`),run(`personInitials(${seed},1)`));}
 });
 check('귀인·주의 인물: 각각 사진 1장과 서로 다른 초성의 프로필 2명 이하',()=>{
   const box=d.createElement('div');box.innerHTML=run("lcPeople(_saju,{partner:true})");
   for(const kind of ['helper','foe']){
     assert.equal(box.querySelectorAll('.lc-pcard.'+kind+'[data-portrait]').length,1);
     const profiles=[...box.querySelectorAll('.lc-pcard.'+kind)];assert(profiles.length>=1&&profiles.length<=2);
     const initials=profiles.map(e=>e.textContent.match(/[ㄱ-ㅎ]{3}/)?.[0]);assert.equal(new Set(initials).size,initials.length);
     const p=JSON.parse(decodeURIComponent(profiles[0].dataset.portrait));assert.equal(p.country,'대한민국');assert(p.age>=18);assert(p.traits);
     assert(!profiles[0].querySelector('img').getAttribute('src'),'메인 포스터를 인물 사진으로 재사용하지 않음');
   }
 });
 check('관계 상태: 기혼은 귀인, 연애 중은 현재 연인과 배우자 관계, 캐시 분리',()=>{
   run("_meta.marital='single'");const key=run("aiReadingCacheKey('life','main','ko')");
   run("_meta.marital='married'");assert.notEqual(run("aiReadingCacheKey('life','main','ko')"),key);
   const box=d.createElement('div');box.innerHTML=run("lcPeople(_saju,{partner:true,helper:false})");assert(!box.querySelector('.lc-pcard.love'));assert(box.querySelector('.lc-pcard.helper'));
   const text=run("relationshipReadingHTML('연애운에 새로운 연인과 운명의 상대를 만나기 쉬워요.',_meta)");assert(!/새로운 연인|운명의 상대/.test(text));assert(text.includes('귀인'));
   const married=run("renderTopicPaid('topic-love',_saju,_meta)");assert(married.includes('귀인'));assert(!married.includes('운명의 상대'));
   run("_meta.marital='dating'");assert.match(run("ppPartnerHTML(buildPinpoint(_saju,_meta),{})"),/현재 연인과 배우자로 발전/);
   run("_meta.marital='single'");
 });
 check('인물 카드: 연애운·결혼운·재회운만 운명의 상대 카드, 인생총운 등은 귀인·악연 두 장',()=>{
   const cards=html=>{const b=d.createElement('div');b.innerHTML=html;return [...b.querySelectorAll('.lc-pcard')].map(x=>x.classList[1]).join(',');};
   const want={'topic-love':'love,foe','topic-marriage':'love,helper,foe','topic-reunion':'love,foe'};
   for(const c in want)assert.equal(cards(run(`renderTopicPaid('${c}',_saju,_meta)`)),want[c],c);
   assert.equal(cards(run("lcPeople(_saju,{})")),'helper,foe');
   assert.equal(cards(run("buildLifeReadingV4(_saju,_meta)")),'helper,foe');
 });
 const unsigned=(id,cat)=>Buffer.from(JSON.stringify({o:id,c:cat,e:Date.now()+86400000})).toString('base64url')+'.mock';
 check('무료 질문: 이전 전역 소진 기록과 무관하게 결제 건마다 1회, 새 결제에는 다시 1회',()=>{
   run("_unlockedCats.set('life',unlockScopeOf('life'));localStorage.setItem('saju_chat_count_life_v2','999')");
   w.testToken=unsigned('ORDER-A','life');run('savePaidToken(window.testToken)');assert.equal(run("chatRemaining('life')"),1);
   run("chatIncCount('life')");assert.equal(run("chatRemaining('life')"),0);
   w.testToken=unsigned('ORDER-B','life');run('savePaidToken(window.testToken)');assert.equal(run("chatRemaining('life')"),1);
   assert.equal(run("chatRemaining('topic-love')"),0);assert.equal(run("chatRemaining('qna')"),0);
   assert.match(run("renderChatSection('life')"),/1회 남음/);
   run("chatIncCount('life')");assert.match(run("renderChatSection('life')"),/질문권 구매/);
 });
 check('질문권: 무료를 먼저 쓰고 구매 횟수만큼 이어서 사용',()=>{
   w.testToken=unsigned('PACK-A','chatpack3');run('savePaidToken(window.testToken)');assert.equal(run("chatRemaining('life')"),3);
   run("chatIncCount('life');chatIncCount('life');chatIncCount('life')");assert.equal(run("chatRemaining('life')"),0);
 });
 // Signed real HMAC tokens exercise server validation, rather than replacing verifyPaidToken.
 server.relationContext={marital:'married'};
 const relationPrompt=vm.runInContext("buildReadingUserPrompt('life',relationContext,{language:'ko'})",server);assert.match(relationPrompt,/married/);assert.match(relationPrompt,/귀인·협력자/);
 console.log('✓ AI 요청: 관계 상태를 명시하고 기혼자에게 새 연인 예측을 하지 않도록 안내');
 const secret='test-only-reading-chat-secret',store=new Map();
 const env={PAID_TOKEN_SECRET:secret,SAJU_QNA_CACHE:{get:async k=>store.get(k)||null,put:async(k,v)=>store.set(k,v)}};
 const sign=async(id,cat)=>{const body=Buffer.from(JSON.stringify({o:id,c:cat,e:Date.now()+86400000})).toString('base64url');const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(body));return body+'.'+Buffer.from(sig).toString('base64url');};
 server.testEnv=env;server.testRequest=new Request('https://worker.example/',{method:'POST'});
 async function gate(body){server.testBody=body;return vm.runInContext('requirePaidChat(testEnv,testRequest,testBody)',server);}
 const life=await sign('REAL-LIFE','life'),topic=await sign('REAL-TOPIC','topic-love'),pack=await sign('REAL-PACK','chatpack3');
 let g=await gate({category:'life',activeReadingToken:life,paidTokens:[life],requestId:'q1'});assert(!g.error);assert(!store.size,'응답 실패 전에는 차감하지 않음');
 await g.commit();
 g=await gate({category:'life',activeReadingToken:life,paidTokens:[life],requestId:'q1'});assert(!g.error,'같은 요청 재시도는 중복 차감하지 않음');await g.commit();
 assert.equal(store.get('paid-use:chat:REAL-LIFE'),'1');
 g=await gate({category:'life',activeReadingToken:life,paidTokens:[life],requestId:'q1',question:'다른 질문'});assert.equal(g.error.status,402,'같은 요청 ID를 다른 질문에 재사용해도 무료 횟수를 우회하지 못함');
 g=await gate({category:'life',activeReadingToken:life,paidTokens:[life],requestId:'q2'});assert.equal(g.error.status,402);
 g=await gate({category:'qna',freeQuestion:true,paidTokens:[]});assert.equal(g.error.status,402);
 g=await gate({category:'topic-love',activeReadingToken:topic,paidTokens:[topic]});assert.equal(g.error.status,402);
 g=await gate({category:'qna',activeReadingToken:life,paidTokens:[life]});assert.equal(g.error.status,402,'보고서의 무료 질문을 별도 상담에서 사용할 수 없음');
 for(let i=0;i<3;i++){g=await gate({category:'qna',paidTokens:[pack],requestId:'pack'+i});assert(!g.error);await g.commit();}
 g=await gate({category:'qna',paidTokens:[pack],requestId:'pack4'});assert.equal(g.error.status,402);
 const oldClient=await sign('OLD-CLIENT-ORDER','life');g=await gate({category:'life',paidTokens:[oldClient]});assert(!g.error,'기존에 열린 화면도 같은 결제 건의 1회를 사용할 수 있음');
 const newyear=await sign('REAL-NY','newyear');g=await gate({category:'newyear',activeReadingToken:newyear,paidTokens:[newyear]});assert(!g.error);
 server.testBody={category:'life',activeReadingToken:life,paidTokens:[life,pack]};
 const usage=await vm.runInContext("handleChatUsage(new Request('https://worker.example/chat-usage',{method:'POST',body:JSON.stringify(testBody)}),testEnv)",server);const grants=(await usage.json()).grants;assert.equal(grants.find(x=>x.category==='life').used,1);assert.equal(grants.find(x=>x.category==='chatpack3').used,3);
 console.log('✓ 서버: 서명 검증·결제 건별 1회·정확한 질문권·오류 미차감·재시도·다른 카테고리 차단·사용량 동기화');
 let prompt='';server.photoEnv={AI:{run:async(model,input)=>{assert.equal(model,'@cf/black-forest-labs/flux-2-klein-9b');const form=await new Response(input.multipart.body,{headers:{'Content-Type':input.multipart.contentType}}).formData();prompt=form.get('prompt');return {image:'mock-image-only'};}}};
 server.photoBody={kind:'helper',gender:'female',age:58,country:'일본',look:2,seed:72,traits:'calm expression and neat appearance'};
 const photo=await vm.runInContext("handlePortrait(new Request('https://worker.example/portrait',{method:'POST',body:JSON.stringify(photoBody)}),photoEnv)",server);assert.equal(photo.status,200);assert.match(prompt,/Japanese woman around 58/);assert.match(prompt,/calm expression/);assert.match(prompt,/Photorealistic/);
 console.log('✓ 대표 인물 사진: 성별·나이·국가·특징을 실사풍 생성 요청에 전달(모델 호출은 모의 처리)');
 console.log('Reading fix checks passed. No live AI or payment requests.');w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
