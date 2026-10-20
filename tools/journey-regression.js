#!/usr/bin/env node
// DOM integration checks. All network calls are mocked; no payment is made.
// This checks behavior, not browser layout. Run with npm test.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const virtualConsole=new VirtualConsole();
const errors=[];
virtualConsole.on('jsdomError',e=>{if(!/navigation|CSS stylesheet/.test(e.message))errors.push(e.message);});
const dom=new JSDOM(html,{url:'https://saju.example/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
const w=dom.window,d=w.document,ctx=dom.getInternalVMContext();
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>'';
// jsdom does not implement native dialog opening; the browser check covers its UI behavior.
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
w.fetch=async()=>({ok:true,json:async()=>({}),text:async()=>'',headers:{get:()=>null}});
const run=code=>vm.runInContext(code,ctx,{timeout:15000});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(label,fn)=>{fn();console.log('✓ '+label);};
const scripts=[...d.querySelectorAll('script')].filter(s=>!s.src&&!/json/.test(s.type)).map(s=>s.textContent).join('\n;\n');
const events=()=>Array.from(w.dataLayer||[]).filter(e=>e[0]==='event');
const pending=()=>JSON.parse(w.sessionStorage.getItem('kakao_pay_pending_v1'));
const submitBirth=async()=>{
  d.getElementById('iY').value='1994';d.getElementById('iM').value='5';d.getElementById('iD').value='18';
  run('setTimeUnknown(true);analyze();');await wait(150);
};
(async()=>{
  try{
    run(fs.readFileSync(path.join(root,'assets/vendor/astronomy.browser.min.js'),'utf8'));
    run(scripts);
    run(fs.readFileSync(path.join(root,'assets/astrology.js'),'utf8'));
    await wait(30);
    check('초기화: 오류 없이 홈과 실제 상품 가격 표시',()=>{assert.equal(errors.length,0,errors.join('\n'));assert.equal(d.querySelector('[data-journey-price="life"]').textContent,'1,500원');});
    check('홈: 무료 풀이 줄과 전체 풀이 목록이 모두 보임',()=>{
      const paid=[...d.querySelectorAll('#paidCoreMenu .home-category')].map(c=>c.dataset.homeCategory||c.dataset.homeExtra);
      assert.deepEqual(paid,['life','newyear','gunghap','name','qna','chat-unni','chat-senior','chat-halmae','tarot-question','astro-report','ziwei','topic-love','topic-marriage','topic-reunion','topic-money','topic-career','topic-study','topic-child','topic-children','topic-health','monthly','daypick','tarot-love','tarot-reunion','tarot-marriage','tarot-career','tarot-money']);
      assert(!d.querySelector('#paidCoreMenu').closest('details,[hidden]'));
      assert.deepEqual([...d.querySelectorAll('#freeMenu .home-category')].map(c=>c.dataset.homeCategory||c.dataset.homeExtra),['manse','daily','tarot-today','astro-today','astro-natal']);
    });
    run(d.querySelector('.nh-cta').getAttribute('onclick'));
    check('홈 배너: 오늘의 무료 운세 3종 선택 팝업',()=>{
      const dialog=d.getElementById('todayChoiceDialog');assert(dialog.open);
      assert.deepEqual([...dialog.querySelectorAll('.today-choice-item b')].map(el=>el.textContent),['오늘의 운세','오늘의 타로','오늘의 점성술']);
    });
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    check('무료 운세 팝업: Escape로 닫기',()=>assert(!d.getElementById('todayChoiceDialog').open));
    for(const kind of ['daily','tarot','astrology']){
      run('openTodayChoice()');run(`selectTodayReading('${kind}')`);
      check('무료 운세 선택: '+kind+'에 바로 연결',()=>{
        assert(!d.getElementById('todayChoiceDialog').open);
        if(kind==='daily'){assert.equal(run('_category'),'daily');assert(d.getElementById('view-input').classList.contains('on'));}
        if(kind==='tarot')assert.equal(run('_tarotRoute'),'today');
        if(kind==='astrology')assert.equal(run('_astroRoute'),'today');
        assert(!d.getElementById('payOverlay').classList.contains('vis'));
      });
      run('goHome()');
    }
    run('openVault()');
    check('보관함: 결제 전에는 비어 있다는 안내와 무료 시작 버튼',()=>{assert(d.querySelector('#view-vault .vault-empty'));assert.equal(d.getElementById('vaultCount').hidden,true);});
    run('goHome()');
    check('홈 분류 탭: 무료만 고르면 무료 풀이 7개, 전체로 돌아오면 원래 목록',()=>{
      run("setHomeTab('free')");
      assert(d.getElementById('homeMain').hidden);
      assert.equal(d.querySelectorAll('#homeFiltered .pc').length,7);
      assert.deepEqual([...d.querySelectorAll('#homeFiltered .pc')].slice(0,5).map(c=>c.dataset.go),['manse','daily','tarot-today','astro-today','astro-natal']);
      run("setHomeTab('family')");
      assert.deepEqual([...d.querySelectorAll('#homeFiltered .pc')].map(c=>c.dataset.go),['topic-marriage','topic-study','topic-child','topic-children','topic-health','name','chat-halmae','tarot-marriage']);
      run("setHomeTab('all')");
      assert(!d.getElementById('homeMain').hidden&&d.getElementById('homeFiltered').hidden);
    });
    check('홈 카드: 모든 data-go가 소개 화면이나 무료 풀이로 연결',()=>{
      const gos=[...new Set([...d.querySelectorAll('#view-home [data-go]')].map(b=>b.dataset.go))];
      gos.forEach(g=>assert(run(`!!(PRODUCT_INTRO[${JSON.stringify(g)}]||FREE_START[${JSON.stringify(g)}])`),g));
    });
    for(const card of d.querySelectorAll('[data-home-category]')){
      run(card.getAttribute('onclick'));
      const viaIntro=d.getElementById('view-intro').classList.contains('on');
      if(viaIntro){
        check('유료 카드 → 소개 화면: '+card.dataset.homeCategory,()=>{
          assert.match(d.querySelector('#view-intro .ni-pricebox').textContent,/원/);
          assert(d.querySelector('#view-intro .ni-cta'));
          assert(!/미리보기/.test(d.getElementById('view-intro').textContent));
          assert(!d.querySelector('#view-intro .ni-teasers,#view-intro .ni-chat'));
        });
        run('startIntro()');
      }
      check('홈 카테고리 → 해당 입력 화면: '+card.dataset.homeCategory,()=>{
        assert.equal(run('_category'),card.dataset.homeCategory);
        assert(d.getElementById('view-input').classList.contains('on'));
        assert(!d.getElementById('payOverlay').classList.contains('vis'));
      });
      if(viaIntro){
        run('inputBack()');
        check('입력 뒤로 → 소개 화면으로 복귀: '+card.dataset.homeCategory,()=>assert(d.getElementById('view-intro').classList.contains('on')));
      }
      run('goHome()');
    }
    run("startJourney('career')");
    check('무료 시작: 입력 화면과 결제 없는 안내',()=>{assert(d.getElementById('view-input').classList.contains('on'));assert.match(d.querySelector('.analyze-btn').textContent,/무료/);});
    run('analyze()');
    check('빈 입력: 오류를 표시하고 결제로 넘어가지 않음',()=>{assert.match(d.getElementById('errMsg').textContent,/연도/);assert(!d.getElementById('payOverlay').classList.contains('vis'));});
    await submitBirth();
    check('시간 미상: 실제 계산으로 무료 풀이 생성',()=>{assert(d.getElementById('view-result').classList.contains('on'));assert(!d.querySelector('#p0 .journey-overview'));assert(d.querySelector('#journeyManseBoard .pillars'));});
    check('무료 결과: 만세력 판 아래에 유료 풀이 추천',()=>{assert.match(d.querySelector('#p0 .journey-recommend').textContent,/인생총운 보기 · 1,500원/);assert(d.querySelector('#journeyManseBoard').compareDocumentPosition(d.querySelector('#p0 .journey-recommend'))&4);assert(events().some(e=>e[1]==='free_reading_view'));});
    run("goToInput('daily');analyze()");await wait(150);
    check('오늘의 운세: 선택 바·요약 덱 없이 전체 리포트 바로 표시',()=>{
      assert(d.querySelector('#p1 .daily-report .daily-wrap'));
      assert(!d.querySelector('#p1 .journey-chapters,#p1 .story-experience,#p1 .story-deck-layer,#p1 .journey-recommend'));
      assert(!/본인 10년 흐름 안에서 본 오늘/.test(d.getElementById('p1').textContent));
      assert.equal(d.querySelectorAll('#p1 .daily-cat').length,4);
    });
    check('오늘의 행운: 색·음식·중복 없는 1~45 숫자 6개',()=>{
      const luck=d.querySelector('#p1 .daily-luck-card');assert(luck);
      assert(!/행운 방향|맞는 띠|평생/.test(luck.textContent));
      assert.match(luck.textContent,/행운의 색/);assert.match(luck.textContent,/행운의 음식/);
      const numbers=[...luck.querySelectorAll('.daily-lotto-ball')].map(el=>Number(el.textContent));
      assert.equal(numbers.length,6);assert.equal(new Set(numbers).size,6);
      assert(numbers.every(n=>n>=1&&n<=45));
      assert.deepEqual(numbers,numbers.slice().sort((a,b)=>a-b));
      assert.match(luck.textContent,/당첨을 예측하지/);
      const first=run('JSON.stringify(dailyLuckyNumbers(_saju,calcDailyFortune(_saju,new Date(2026,9,15))))');
      assert.equal(first,run('JSON.stringify(dailyLuckyNumbers(_saju,calcDailyFortune(_saju,new Date(2026,9,15))))'));
      assert.notEqual(first,run('JSON.stringify(dailyLuckyNumbers(_saju,calcDailyFortune(_saju,new Date(2026,9,16))))'));
    });
    check('유료 연결: 200자 미만의 짧은 호기심 문구와 실제 가격',()=>{
      const hook=d.querySelector('#p1 .daily-paid-hook');assert(hook);
      assert(hook.textContent.trim().length<200);
      assert.equal(hook.querySelectorAll('button').length,1);
      assert.match(hook.textContent,/1,500원/);
    });
    run(d.querySelector('#p1 .daily-paid-hook button').getAttribute('onclick'));await wait(150);
    check('유료 연결 버튼: 기존 출생정보로 신년운세 결제 안내',()=>{
      assert.equal(run('_category'),'newyear');
      assert(d.getElementById('payOverlay').classList.contains('vis'));
      assert.equal(run('_payCategory'),'newyear');
    });
    run('closePaymentConsent()');
    run("continueJourney('life')");await wait(150);
    check('입력 재사용: 동일한 생년월일로 인생총운 결제 안내',()=>{assert.equal(d.getElementById('iY').value,'1994');assert.match(d.querySelector('#p5 .journey-contents').textContent,/1,500원/);});
    check('유료 풀이: 미리보기 없이 바로 결제 안내 표시',()=>{
      assert(d.querySelector('#p5 .paid-access-notice'));
      assert(!d.querySelector('#p5 .paid-preview,#p5 .journey-overview,#p5 .life-experience'));
      assert(d.getElementById('payOverlay').classList.contains('vis'));
      assert.equal(run("isUnlockedFor('life')"),false);
      assert(events().some(e=>e[1]==='payment_gate_view'));
    });
    for(const cat of ['life','newyear','monthly','daypick','gunghap','name','ziwei','topic-love','topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-child','topic-health']){
      check('결제 전 풀이 비공개: '+cat,()=>{
        const lock=run(`renderPaidLock('${cat}',_saju)`);
        assert(!/paid-preview|journey-overview|teaser-score|미리보기/.test(lock));
        assert.match(lock,/paid-access-notice/);
        assert.match(lock,new RegExp("openPaymentConsent\\('"+cat+"'"));
      });
    }
    run("openPaymentConsent('life','KAKAOPAY')");
    check('결제 안내: 금액과 포커스, 미동의 버튼 비활성',()=>{assert.equal(d.getElementById('payProductPrice').textContent,'1,500원');assert.match(d.getElementById('payCtaGo').textContent,/1,500원/);assert(d.getElementById('payCtaGo').disabled);assert(d.activeElement.classList.contains('pay-close'));});
    let readyCalls=0,resolveReady;
    w.fetch=()=>{readyCalls++;return new Promise(r=>resolveReady=r);};
    await run('startKakaoPayment()');
    check('동의 없는 직접 호출도 결제 요청을 보내지 않음',()=>assert.equal(readyCalls,0));
    run('payAgreeAll(true)');
    const first=run('startKakaoPayment()');
    const second=run('startKakaoPayment()');await second;
    check('중복 클릭: 결제 준비 요청은 한 번만 전송',()=>{assert.equal(readyCalls,1);assert(d.getElementById('payCtaGo').disabled);});
    resolveReady({ok:false,json:async()=>({ok:false})});await first;
    check('결제 준비 실패: 상태 안내와 재시도 복원',()=>{assert.match(d.getElementById('payStatus').textContent,/잠시 후|문제/);assert(!d.getElementById('payCtaGo').disabled);});
    w.fetch=async()=>({ok:true,json:async()=>({ok:true,tid:'TEST_ONLY',nextRedirectPcUrl:'https://payment.example/',next_redirect_pc_url:'https://payment.example/'})});
    await run('startKakaoPayment()');
    check('결제 이동: 입력·사주 정보를 보존',()=>{assert(pending().saju);assert(pending().meta);assert.equal(pending().amount,1500);});
    run("_paymentStarting=false;closePaymentConsent();history.replaceState({},'','?kpay=cancel');");
    await run('_handlePaymentReturn()');
    check('결제 취소: 잠금을 풀지 않고 결제 안내 복원',()=>{assert(d.querySelector('#p5 .journey-return'));assert.match(d.querySelector('#p5 .journey-return').textContent,/취소/);assert.equal(run("isUnlockedFor('life')"),false);assert.equal(pending(),null);});
    run("_savePendingPayment({tid:'TEST_APPROVE',partnerOrderId:'TEST-ORDER-1',category:'life',amount:1500,saju:_saju,meta:_meta});history.replaceState({},'','?kpay=ok&cat=life&pg_token=TEST_TOKEN');");
    w.fetch=async()=>({ok:true,json:async()=>({ok:true}),text:async()=>'',headers:{get:()=>null}});
    await run('_handlePaymentReturn()');await wait(30);
    check('승인 성공: 전체 풀이를 열고 구매 완료 이벤트 전송',()=>{assert.equal(run("isUnlockedFor('life')"),true);assert(d.querySelector('#p5 .life-experience'));assert(events().some(e=>e[1]==='purchase'&&e[2].transaction_id==='TEST-ORDER-1'));});
    run("goHome();continueJourney('life')");await wait(150);
    check('구매 후 홈 왕복: 같은 사주는 재결제 없이 복원',()=>assert(d.querySelector('#p5 .life-experience')));
    run("goHome();openVault()");
    check('보관함: 결제한 인생총운이 남은 시간과 함께 보임',()=>{assert(d.getElementById('view-vault').classList.contains('on'));const it=d.querySelector('.vault-item');assert(it);assert.match(it.textContent,/인생총운/);assert.match(it.textContent,/까지/);assert.equal(d.getElementById('vaultCount').hidden,false);});
    run("goHome()");
    const birth=async(y,m,dd)=>{d.getElementById('iY').value=y;d.getElementById('iM').value=m;d.getElementById('iD').value=dd;run('setTimeUnknown(true);analyze();');await wait(150);};
    run("goToInput('life')");await birth('1995','3','9');
    check('다른 사주: 이전 결제로 열리지 않고 결제 안내만 노출',()=>{assert.equal(run("isUnlockedFor('life')"),false);assert(d.querySelector('#p5 .paid-access-notice'));assert(!d.querySelector('#p5 .life-experience'));});
    run("goToInput('life')");await birth('1994','5','18');
    check('원래 사주로 돌아오면 24시간 안에는 다시 열림',()=>{assert.equal(run("isUnlockedFor('life')"),true);assert(d.querySelector('#p5 .life-experience'));});
    const partner=async(y)=>{run("goToInput('gunghap')");d.getElementById('gnY').value=y;d.getElementById('gnM').value='3';d.getElementById('gnD').value='9';await birth('1994','5','18');};
    await partner('1992');run("setUnlockedFor('gunghap')");
    await partner('1993');
    check('궁합: 상대가 바뀌면 다시 잠김',()=>assert.equal(run("isUnlockedFor('gunghap')"),false));
    await partner('1992');
    check('궁합: 같은 상대는 그대로 열림',()=>assert.equal(run("isUnlockedFor('gunghap')"),true));
    run("journeyEvent('test','life',{value:1500,birthYear:'1994',name:'SECRET_NAME',pg_token:'SECRET_TOKEN'})");
    check('분석 이벤트: 개인정보와 결제 토큰 제외',()=>{const e=events().find(e=>e[1]==='test');assert(!('birthYear' in e[2]));assert(!JSON.stringify(e).includes('SECRET'));});
    run("goToInput('newyear')");run('analyze()');await wait(150);
    {
      if(!w.crypto||!w.crypto.subtle)Object.defineProperty(w,'crypto',{value:require('node:crypto').webcrypto,configurable:true});
      if(!w.TextEncoder)w.TextEncoder=require('node:util').TextEncoder; // 브라우저에는 기본으로 있음
      const tap=d.querySelector('#p4 .paid-access-lockbtn').getAttribute('onclick');
      check('운영자 코드: 자물쇠 onclick이 해당 카테고리로 연결',()=>assert.match(tap,/_secretUnlockTap\('newyear'\)/));
      let asked=0,answer='wrong';w.prompt=()=>{asked++;return answer;};w.alert=()=>{};
      for(let i=0;i<4;i++)run(tap);
      check('운영자 코드: 자물쇠 4번은 입력창 없음',()=>{assert.equal(asked,0);assert.equal(run("isUnlockedFor('newyear')"),false);});
      await run(tap);
      check('운영자 코드: 틀린 코드는 거절',()=>{assert.equal(asked,1);assert.equal(run("isUnlockedFor('newyear')"),false);});
      answer=' Open ';for(let i=0;i<4;i++)run(tap);await run(tap);
      check('운영자 코드: 5번 + open(대소문자·공백 무시)이면 결제 없이 열림',()=>{assert.equal(asked,2);assert.equal(run("isUnlockedFor('newyear')"),true);});
      w.prompt=()=>'';
    }
    run("goToInput('topic-love')");await birth('1994','5','18');
    check('주제별 풀이: 연애운은 미리보기 없이 1,000원 결제 버튼',()=>{
      assert(d.querySelector('#p9 .paid-access-notice'));
      assert(!d.querySelector('#p9 .paid-preview'));
      assert(d.getElementById('payOverlay').classList.contains('vis'));
      assert.match(d.querySelector('#p9 .teaser-pay-btn').textContent,/1,000원/);
      assert.equal(run("isUnlockedFor('topic-love')"),false);
      assert(!/역술가 질문/.test(d.querySelector('#p9 .usage-guide').textContent));
    });
    run("openPaymentConsent('topic-love','KAKAOPAY')");
    check('주제별 풀이: 결제 안내 금액 1,000원',()=>assert.equal(d.getElementById('payProductPrice').textContent,'1,000원'));
    run("closePaymentConsent();unlockAndRender('topic-love')");
    check('주제별 풀이: 결제 후 요약·10년·12개월 풀이가 열림',()=>{
      assert(d.querySelector('#p9 .tp-v4'));
      assert(d.querySelectorAll('#p9 .lv4-sec').length>=5);
      assert(d.querySelectorAll('#p9 .lv4-row').length>=22);
    });
    for(const cat of ['topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-children','topic-health']){
      check('주제별 풀이: '+cat+' 렌더링에 빈 값 없음',()=>{
        const html=run(`renderTopicPaid('${cat}',_saju,_meta)`);
        assert(/tp-v4/.test(html)&&(html.match(/class="lv4-sec"/g)||[]).length>=5);
        assert(!/undefined|NaN|\[object/.test(html.replace(/<[^>]+>/g,'')));
      });
    }
    run("goToTarotTopic('love')");
    check('연애 타로: 주제 제목과 연애 질문 예시',()=>{assert.match(d.querySelector('#tarotApp .tq-title').textContent,/연애 타로/);assert.match(d.querySelector('#tarotApp .tarot-examples').textContent,/그 사람은 저를/);});
    d.getElementById('tarotQuestionInput').value='그 사람은 요즘 저를 어떻게 생각하고 있을까요?';run('submitTarotQuestion()');
    check('연애 타로: 주제가 흐름에 저장되고 5장을 추천',()=>{assert.equal(run('_tarotFlow.topic'),'love');assert.equal(run('_tarotFlow.recommendedSpreadId'),'tarot5');});
    run("selectTarotProduct('tarot3')");
    check('연애 타로 3장: 나의 마음 · 그 사람의 마음 · 두 사람의 흐름',()=>assert.equal(run('JSON.stringify(_tarotFlow.positions.map(p=>p.label))'),JSON.stringify(['나의 마음','그 사람의 마음','두 사람의 흐름'])));
    run("tarotNavigate('payment')");
    check('타로: 결제 화면에 무료·블러 미리보기 없이 상품 안내만 표시',()=>{
      assert(d.querySelector('#tarotApp .paid-access-heading'));
      assert(!d.querySelector('#tarotApp .paid-preview'));
      assert.match(d.querySelector('#tarotApp .ts-cta').textContent,/결제하고 카드 뽑기/);
    });
    run("selectTarotProduct('tarot10')");
    check('연애 타로 10장: 켈틱크로스 자리는 그대로',()=>assert.equal(run('_tarotFlow.positions[0].label'),'현재 상황'));
    run("goToTarot('question')");
    check('자유 질문 타로: 주제 없이 원래 화면',()=>{assert.equal(run('_tarotTopic'),'');assert.match(d.querySelector('#tarotApp .tq-title').textContent,/본인의 질문/);});
    check('타로 카드 그림: 컵 2는 새로 그린 그림, 컵 6은 컵 6 그림',()=>{assert.equal(run("TAROT_CARDS.find(c=>c.id==='cups-02').imageUrl"),'assets/tarot/card-cups-02.jpg');assert.equal(run("TAROT_CARDS.find(c=>c.id==='cups-06').imageUrl"),'assets/tarot/card-45.jpg');});
    {
      let sent=null;const prevFetch=w.fetch;
      w.fetch=async(url,opt)=>{if(String(url).indexOf('/translate')<0&&opt&&opt.body){try{const b=JSON.parse(opt.body);if(b.question)sent=b;}catch(e){}}return {ok:true,status:200,json:async()=>({answer:'테스트 답변이에요.'}),text:async()=>'',headers:{get:()=>null}};};
      run("setQnaCounselor('unni');goToInput('qna')");await birth('1994','5','18');
      check('캐릭터 상담: 달님 언니가 상담방 제목과 첫 인사에 나옴',()=>{assert.match(d.querySelector('.qna-chat-room .chat-title').textContent,/달님 언니/);assert.match(d.querySelector('.qna-chat-room .chat-msg-lab').textContent,/달님 언니/);assert(d.querySelector('.qna-counselor.on[data-counselor="unni"]'));});
      run("setQnaCounselor('senior')");
      check('캐릭터 상담: 상담사를 바꾸면 제목과 인사가 바뀜',()=>{assert.match(d.querySelector('.qna-chat-room .chat-title').textContent,/직설 선배/);assert.match([...d.querySelectorAll('.qna-chat-room .chat-msg-lab')].pop().textContent,/직설 선배/);});
      run("setQnaCounselor('master')");
      w.fetch=prevFetch;
    }
    run("goToInput('ziwei')");d.getElementById('iY').value='1994';d.getElementById('iM').value='5';d.getElementById('iD').value='18';run('setTimeUnknown(true);analyze();');await wait(150);
    check('자미두수: 태어난 시간이 없으면 안내하고 진행하지 않음',()=>{assert.match(d.getElementById('errMsg').textContent,/태어난 시간/);assert(d.getElementById('view-input').classList.contains('on'));});
    d.getElementById('iHourInput').value='9';run("setTimeUnknown(false);document.getElementById('iTimeUnknown').checked=false;analyze()");await wait(150);
    check('자미두수: 결제 안내와 1,500원 결제 버튼',()=>{assert(d.querySelector('#p9 .paid-access-notice'));assert.match(d.querySelector('#p9 .teaser-pay-btn').textContent,/1,500원/);});
    run("unlockAndRender('ziwei')");
    check('자미두수: 결제 후 12궁 판과 주성 14개',()=>{assert(d.querySelector('#p9 .zw-board'));assert.equal(run("buildZiweiChart(_saju,_meta).palaces.reduce((n,p)=>n+p.stars.length,0)"),14);});
    run("goToInput('vedic')");run('analyze()');await wait(150);
    check('베딕 점성술: 결제 없이 낙샤트라와 다샤가 보임',()=>{assert(d.querySelector('#p9 .vd-hero'));assert.match(d.getElementById('p9').textContent,/의 시기예요/);assert(!d.querySelector('#p9 .paid-preview'));});
    run("goToInput('mahabote')");run('analyze()');await wait(150);
    check('마하보테: 1994년 5월 18일 오전 9시는 수요일 오전의 상아 코끼리',()=>assert.match(d.querySelector('#p9 .vd-hero').textContent,/상아 코끼리/));
    run("goToInput('topic-child')");
    check('아이 사주: 보호자 생년월일을 비우고 입력란 이름을 바꿈',()=>{assert.equal(d.getElementById('iY').value,'');assert.equal(d.getElementById('lgBirth').textContent,'아이 생년월일');});
    await birth('2019','3','9');
    check('아이 사주: 보호자 입력 캐시를 덮어쓰지 않음',()=>{assert.equal(run('_lastInputs.year'),'1994');assert(d.querySelector('#p9 .paid-access-notice'));});
    run("goToInput('life')");
    check('아이 사주 뒤 다른 풀이: 보호자 생년월일이 다시 채워짐',()=>{assert.equal(d.getElementById('iY').value,'1994');assert.equal(d.getElementById('lgBirth').textContent,'생년월일');});
    run("goToInput('newyear')");
    check('한 해 풀이: 올해를 기본값으로 사용',()=>assert.equal(d.getElementById('nyY').value,String(new Date().getFullYear())));
    run("closePaymentConsent();window._astroPreferProduct='';goToAstrology('input')");
    d.getElementById('astroYear').value='1994';d.getElementById('astroMonth').value='5';d.getElementById('astroDay').value='18';
    d.getElementById('astroTimeUnknown').checked=true;
    run('submitAstrologyBirth()');
    check('점성술: 출생정보 입력 후 무료 요약 없이 유료 상품 선택',()=>{
      assert.equal(run('_astroRoute'),'products');
      assert.equal(d.querySelectorAll('#astroApp .astro-product').length,5);
      assert(!/무료 요약/.test(d.getElementById('astroApp').textContent));
      assert(!d.querySelector('#astroApp .astro-chart-grid'));
    });
    for(const product of ['birth-basic','love-marriage','career-money','yearly','full-report']){
      run(`selectAstrologyProduct('${product}')`);
      check('점성술 결제: '+product+'에 미리보기 없이 결제창 표시',()=>{
        assert(d.querySelector('#astroApp .paid-access-heading'));
        assert(!d.querySelector('#astroApp .paid-preview'));
        assert(d.getElementById('payOverlay').classList.contains('vis'));
        assert.equal(run('_payCategory'),'astro-'+product);
      });
      run('closePaymentConsent()');
    }
    run("window._astroPreferProduct='love-marriage';goToAstrology('input');submitAstrologyBirth()");
    check('점성술 연애 카테고리: 무료 요약·상품 재선택 없이 해당 풀이 결제로 연결',()=>{
      assert.equal(run('_astroRoute'),'payment');
      assert.equal(run('_astroFlow.productType'),'love-marriage');
      assert(d.getElementById('payOverlay').classList.contains('vis'));
    });
    run("closePaymentConsent();goToAstrology('natalInput')");
    d.getElementById('astroTimeUnknown').checked=false;
    d.getElementById('astroHour').value='14';d.getElementById('astroMinute').value='30';
    run('submitNatalChart()');
    check('무료 출생차트 카테고리: 결제 없이 기존 결과 제공',()=>{
      assert.equal(run('_astroRoute'),'natalResult');
      assert(d.querySelector('#astroApp .astro-wheel-wrap'));
      assert(!d.getElementById('payOverlay').classList.contains('vis'));
    });
    check('출생차트: 풀이·덱·시간 여행 없이 차트와 원본 위치표만 표시',()=>{
      assert(d.querySelector('#astroApp .natal-chart-report'));
      assert.equal(d.querySelectorAll('#astroApp .astro-wheel').length,1);
      assert(!d.querySelector('#astroApp .story-experience,#astroApp .journey-chapters,#astroApp #timeJourneyPanel,#astroApp .conversion-hook'));
      assert.equal(d.querySelector('#astroApp .wheel-transit-layer').children.length,0);
      assert(!/삶의 방향|마음의 호흡|첫인상,|커리어 이미지|간단 의미|강한 행성|전체 서고|자세히 풀이받기/.test(d.getElementById('astroApp').textContent));
      assert(d.getElementById('natalAiCopyBtn'));
      assert(!run('_astroFlow.transit'));
    });
    const knownNatal=run('JSON.stringify(_astroFlow.chart)');
    check('출생차트 AI 데이터: 계산값·위치·각도는 원본과 동일하고 트랜짓 제외',()=>{
      const data=JSON.parse(run('buildNatalAiDataText()'));
      assert.deepEqual(data.chart,JSON.parse(knownNatal));
      assert.equal(data.chart.planets.length,10);
      assert.equal(data.chart.houses.length,12);
      assert.equal(data.calculation.houseSystem,'whole-sign');
      assert(!data.transit&&!data.chart.transit);
    });
    for(const provider of ['chatgpt','claude','gemini']){
      const captured=[];const originalCopy=w.copyToClipboard;
      w.copyToClipboard=(text,message)=>captured.push({text,message});
      d.getElementById('natalAiCopyBtn').focus();run('showNatalAiCopyModal()');await wait(10);
      check('출생차트 AI 선택창: '+provider,()=>{
        assert(d.getElementById('manseAiCopyOverlay').classList.contains('vis'));
        assert.match(d.getElementById('manseAiCopyTitle').textContent,/출생차트/);
        assert.equal(d.activeElement.className,'ai-copy-provider');
        const button=d.querySelector(`#manseAiCopyOverlay [onclick="copyChartForAI('${provider}')"]`);
        run(button.getAttribute('onclick'));
        assert.equal(captured.length,1);
        const prompt=captured[0].text;
        assert.match(prompt,provider==='claude'?/<natal_data format="json">/:provider==='gemini'?/\[NATAL DATA START\]/:/# 출생차트 원본 데이터/);
        assert(prompt.includes(run('buildNatalAiDataText()')));
        assert.match(captured[0].message,/출생차트/);
        assert(!d.getElementById('manseAiCopyOverlay').classList.contains('vis'));
        assert.equal(d.activeElement.id,'natalAiCopyBtn');
      });
      w.copyToClipboard=originalCopy;
    }
    run('showNatalAiCopyModal()');
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    check('출생차트 복사창: Escape로 닫기',()=>assert(!d.getElementById('manseAiCopyOverlay').classList.contains('vis')));
    run("astroNavigate('natalInput')");d.getElementById('astroTimeUnknown').checked=true;run('submitNatalChart()');
    check('출생시간 미상: 차트와 AI 복사에 가짜 시간·ASC·MC·하우스 없음',()=>{
      const data=JSON.parse(run('buildNatalAiDataText()'));
      assert(data.chart.birthInfo.birthTimeUnknown);
      assert(!('hour' in data.chart.birthInfo));assert(!('minute' in data.chart.birthInfo));
      assert(!data.chart.ascendant&&!data.chart.midheaven&&!data.chart.houses);
      assert(data.chart.planets.every(p=>!p.house));
      assert.match(data.calculation.unknownTimeBasis,/현지 정오/);
      assert(!d.querySelector('#astroApp .wheel-axis-label'));
      assert(![...d.querySelectorAll('#astroApp summary')].some(el=>/12하우스/.test(el.textContent)));
      assert.match(d.querySelector('#astroApp .astro-warn').textContent,/정오 기준/);
    });
    run("goToInput('manse')");await submitBirth();run('showManseAiCopyModal()');
    check('공유 AI 복사창: 만세력으로 돌아가면 제목과 데이터도 만세력으로 복귀',()=>{
      assert.match(d.getElementById('manseAiCopyTitle').textContent,/만세력/);
      const captured=[];const originalCopy=w.copyToClipboard;w.copyToClipboard=text=>captured.push(text);
      run("copyChartForAI('chatgpt')");w.copyToClipboard=originalCopy;
      assert.equal(captured.length,1);assert.match(captured[0],/# 만세력 원본 데이터/);
      assert(!captured[0].includes('# 출생차트 원본 데이터'));
    });
    // jsdom has no layout; only the focusable input rectangles are supplied here.
    const astroBoxes=()=>{
      for(const id of ['astroYear','astroMonth','astroDay','astroHour','astroMinute','astroCountry']){
        const el=d.getElementById(id);el.getBoundingClientRect=()=>({width:100,height:44});
      }
    };
    const typeAstro=(id,value,inputType='insertText')=>{
      const el=d.getElementById(id);el.focus();el.value=value;
      el.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType}));
      return d.activeElement.id;
    };
    for(const route of ['natal','today','input']){
      run(`goToAstrology('${route}')`);astroBoxes();
      d.getElementById('astroTimeUnknown').checked=false;run('toggleAstroTimeFields()');
      check('출생정보 자동 이동: '+route+'의 연·월·일·시·분',()=>{
        assert.equal(typeAstro('astroYear','199'),'astroYear');
        assert.equal(typeAstro('astroYear','1994'),'astroMonth');
        assert.equal(typeAstro('astroMonth','1'),'astroMonth');
        assert.equal(typeAstro('astroMonth','12'),'astroDay');
        assert.equal(typeAstro('astroDay','3'),'astroDay');
        assert.equal(typeAstro('astroDay','31'),'astroHour');
        assert.equal(typeAstro('astroHour','2'),'astroHour');
        assert.equal(typeAstro('astroHour','23'),'astroMinute');
        assert.equal(typeAstro('astroMinute','5'),'astroMinute');
        assert.equal(typeAstro('astroMinute','59'),'astroCountry');
      });
      check('출생정보 입력: '+route+'의 잘못된 값은 다음 칸으로 이동하지 않음',()=>{
        assert.equal(typeAstro('astroMonth','13'),'astroMonth');
        assert.equal(typeAstro('astroHour','24'),'astroHour');
        assert.equal(typeAstro('astroMinute','60'),'astroMinute');
        d.getElementById('astroMonth').value='2';
        assert.equal(typeAstro('astroDay','30'),'astroDay');
        assert.equal(typeAstro('astroYear','20aa'),'astroYear');
        d.getElementById('astroYear').value='2024';
        assert.equal(typeAstro('astroDay','29'),'astroHour');
        assert.equal(typeAstro('astroMonth','5','deleteContentBackward'),'astroMonth');
      });
      check('출생정보 입력: '+route+'의 Enter 확정과 시간 모름 건너뛰기',()=>{
        typeAstro('astroMonth','1');
        d.getElementById('astroMonth').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        assert.equal(d.activeElement.id,'astroDay');
        d.getElementById('astroTimeUnknown').checked=true;run('toggleAstroTimeFields()');
        assert(d.getElementById('astroHour').disabled&&d.getElementById('astroMinute').disabled);
        assert.equal(typeAstro('astroDay','18'),'astroCountry');
      });
    }
    run("goToAstrology('today')");
    d.getElementById('astroYear').value='1994';d.getElementById('astroMonth').value='5';d.getElementById('astroDay').value='18';
    d.getElementById('astroTimeUnknown').checked=true;
    run('submitTodayAstrology()');
    check('오늘의 점성술: 출생정보 제출 후 요약·선택 바 없이 전체 풀이',()=>{
      assert.equal(run('_astroRoute'),'todayResult');
      assert(d.querySelector('#astroApp .today-astro-report .astro-markdown p'));
      assert(d.querySelector('#astroApp .astro-wheel'));
      assert(!d.querySelector('#astroApp .journey-chapters,#astroApp .story-experience,#astroApp .story-deck-layer'));
      assert.match(d.querySelector('#astroApp .astro-warn').textContent,/출생시간을 몰라/);
      assert(d.querySelector('#astroApp .today-paid-hook').textContent.length<200);
    });
    run('renderAstrology()');
    check('오늘의 점성술: 재렌더링에도 전체 풀이 유지',()=>assert(d.querySelector('#astroApp .today-astro-report')));
    run(d.querySelector('#astroApp .today-paid-hook button').getAttribute('onclick'));
    check('오늘의 점성술: 짧은 안내에서 유료 상품 선택으로 연결',()=>assert.equal(d.querySelectorAll('#astroApp .astro-product').length,5));
    run("goToTarot('today');selectTodayTarot(_todayTarotCardIds[0])");
    check('오늘의 타로: 카드 뽑은 직후 주제 선택 없이 전체 풀이 6개 표시',()=>{
      assert(d.querySelector('#todayTarotResult .today-tarot-report'));
      assert.equal(d.querySelectorAll('#todayTarotResult .tarot-reading-flow').length,6);
      assert(!d.querySelector('#todayTarotResult .journey-chapters,#todayTarotResult .story-experience,#todayTarotResult .story-deck-layer'));
      assert.equal(d.querySelectorAll('#view-tarot .tarot-today-grid .tarot-card-btn').length,1);
      assert(!d.querySelector('#todayTarotResult .tarot-mini-face'));
      assert(d.querySelector('#todayTarotResult .today-paid-hook').textContent.length<200);
    });
    run(d.querySelector('#todayTarotResult .today-paid-hook button').getAttribute('onclick'));
    check('오늘의 타로: 유료 질문형 타로로 정상 연결',()=>assert.equal(run('_tarotRoute'),'question'));
    check('런타임: 입력·무료·유료 전체 흐름에서 오류 없음',()=>assert.equal(errors.length,0,errors.join('\n')));
    console.log('Journey integration checks passed. Network fully mocked; no live payment.');
  }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
