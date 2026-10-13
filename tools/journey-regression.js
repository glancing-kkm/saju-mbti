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
    await wait(30);
    check('초기화: 오류 없이 홈과 실제 상품 가격 표시',()=>{assert.equal(errors.length,0,errors.join('\n'));assert.equal(d.querySelector('[data-journey-price="life"]').textContent,'1,500원');});
    check('홈: 무료 풀이 줄과 전체 풀이 목록이 모두 보임',()=>{
      const paid=[...d.querySelectorAll('#paidCoreMenu .home-category')].map(c=>c.dataset.homeCategory||c.dataset.homeExtra);
      assert.deepEqual(paid,['life','newyear','gunghap','name','qna','chat-unni','chat-senior','chat-halmae','tarot-question','astro-report','ziwei','topic-love','topic-marriage','topic-reunion','topic-money','topic-career','topic-study','topic-child','topic-health','monthly','daypick','tarot-love','tarot-reunion','tarot-marriage','tarot-career','tarot-money']);
      assert(!d.querySelector('#paidCoreMenu').closest('details,[hidden]'));
      assert.deepEqual([...d.querySelectorAll('#freeMenu .home-category')].map(c=>c.dataset.homeCategory||c.dataset.homeExtra),['manse','daily','tarot-today','astro-natal','astro-today']);
    });
    run('openVault()');
    check('보관함: 결제 전에는 비어 있다는 안내와 무료 시작 버튼',()=>{assert(d.querySelector('#view-vault .vault-empty'));assert.equal(d.getElementById('vaultCount').hidden,true);});
    run('goHome()');
    check('홈 분류 탭: 무료만 고르면 무료 풀이 7개, 전체로 돌아오면 원래 목록',()=>{
      run("setHomeTab('free')");
      assert(d.getElementById('homeMain').hidden);
      assert.equal(d.querySelectorAll('#homeFiltered .pc').length,7);
      run("setHomeTab('family')");
      assert.deepEqual([...d.querySelectorAll('#homeFiltered .pc')].map(c=>c.dataset.go),['topic-marriage','topic-study','topic-child','topic-health','name','chat-halmae','tarot-marriage']);
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
    check('시간 미상: 실제 계산으로 무료 풀이 생성',()=>{assert(d.getElementById('view-result').classList.contains('on'));assert(d.querySelector('#p0 .journey-overview'));assert.match(d.querySelector('#p0 .journey-overview').textContent,/시간은 모르는/);assert(d.querySelector('#journeyManseBoard .pillars'));});
    check('무료 결과: 개인화 요약과 유료 미리보기 연결',()=>{assert.match(d.querySelector('#p0 .journey-recommend').textContent,/인생총운 미리보기 · 1,500원/);assert(events().some(e=>e[1]==='free_reading_view'));});
    run("continueJourney('life')");await wait(150);
    check('입력 재사용: 동일한 생년월일로 인생총운 미리보기',()=>{assert.equal(d.getElementById('iY').value,'1994');assert.match(d.querySelector('#p5 .journey-contents').textContent,/1,500원/);});
    check('유료 미리보기: 실제 풀이 첫 문장 + 흐린 영역 + 자물쇠',()=>{
      const pv=d.querySelector('#p5 .paid-preview');assert(pv);
      assert(pv.querySelector('.paid-preview-clear').textContent.length>=40);
      assert(pv.querySelector('.paid-preview-blur'));assert(pv.querySelector('.paid-preview-lockbtn'));
      assert.equal(run("isUnlockedFor('life')"),false);
    });
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
    check('결제 취소: 잠금을 풀지 않고 보던 미리보기 복원',()=>{assert(d.querySelector('#p5 .journey-return'));assert.match(d.querySelector('#p5 .journey-return').textContent,/취소/);assert.equal(run("isUnlockedFor('life')"),false);assert.equal(pending(),null);});
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
    check('다른 사주: 이전 결제로 열리지 않고 미리보기만 노출',()=>{assert.equal(run("isUnlockedFor('life')"),false);assert(d.querySelector('#p5 .paid-preview'));assert(!d.querySelector('#p5 .life-experience'));});
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
      const tap=d.querySelector('#p4 .paid-preview-lockbtn').getAttribute('onclick');
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
    check('주제별 풀이: 연애운 미리보기는 실제 첫 문장과 1,000원 결제 버튼',()=>{
      assert(d.querySelector('#p9 .paid-preview-clear').textContent.length>=30);
      assert.match(d.querySelector('#p9 .teaser-pay-btn').textContent,/1,000원/);
      assert.equal(run("isUnlockedFor('topic-love')"),false);
      assert(!/역술가 질문/.test(d.querySelector('#p9 .usage-guide').textContent));
    });
    run("openPaymentConsent('topic-love','KAKAOPAY')");
    check('주제별 풀이: 결제 안내 금액 1,000원',()=>assert.equal(d.getElementById('payProductPrice').textContent,'1,000원'));
    run("closePaymentConsent();unlockAndRender('topic-love')");
    check('주제별 풀이: 결제 후 요약·10년·12개월 풀이가 열림',()=>{
      assert(d.querySelector('#p9 .story-experience'));
      assert(d.getElementById('card-TOPIC_YEARS')&&d.getElementById('card-TOPIC_MONTHS'));
      assert(d.querySelectorAll('#p9 .life-v3-time-card').length>=22);
    });
    for(const cat of ['topic-money','topic-career','topic-marriage','topic-reunion','topic-study','topic-health']){
      check('주제별 풀이: '+cat+' 렌더링에 빈 값 없음',()=>{
        const html=run(`renderTopicPaid('${cat}',_saju,_meta)`);
        assert(/story-experience/.test(html));
        assert(!/undefined|NaN|\[object/.test(html.replace(/<[^>]+>/g,'')));
      });
    }
    run("goToTarotTopic('love')");
    check('연애 타로: 주제 제목과 연애 질문 예시',()=>{assert.match(d.querySelector('#tarotApp .tq-title').textContent,/연애 타로/);assert.match(d.querySelector('#tarotApp .tarot-examples').textContent,/그 사람은 저를/);});
    d.getElementById('tarotQuestionInput').value='그 사람은 요즘 저를 어떻게 생각하고 있을까요?';run('submitTarotQuestion()');
    check('연애 타로: 주제가 흐름에 저장되고 5장을 추천',()=>{assert.equal(run('_tarotFlow.topic'),'love');assert.equal(run('_tarotFlow.recommendedSpreadId'),'tarot5');});
    run("selectTarotProduct('tarot3')");
    check('연애 타로 3장: 나의 마음 · 그 사람의 마음 · 두 사람의 흐름',()=>assert.equal(run('JSON.stringify(_tarotFlow.positions.map(p=>p.label))'),JSON.stringify(['나의 마음','그 사람의 마음','두 사람의 흐름'])));
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
    check('자미두수: 미리보기와 1,500원 결제 버튼',()=>{assert(d.querySelector('#p9 .paid-preview-clear'));assert.match(d.querySelector('#p9 .teaser-pay-btn').textContent,/1,500원/);});
    run("unlockAndRender('ziwei')");
    check('자미두수: 결제 후 12궁 판과 주성 14개',()=>{assert(d.querySelector('#p9 .zw-board'));assert.equal(run("buildZiweiChart(_saju,_meta).palaces.reduce((n,p)=>n+p.stars.length,0)"),14);});
    run("goToInput('vedic')");run('analyze()');await wait(150);
    check('베딕 점성술: 결제 없이 낙샤트라와 다샤가 보임',()=>{assert(d.querySelector('#p9 .vd-hero'));assert.match(d.getElementById('p9').textContent,/의 시기예요/);assert(!d.querySelector('#p9 .paid-preview'));});
    run("goToInput('mahabote')");run('analyze()');await wait(150);
    check('마하보테: 1994년 5월 18일 오전 9시는 수요일 오전의 상아 코끼리',()=>assert.match(d.querySelector('#p9 .vd-hero').textContent,/상아 코끼리/));
    run("goToInput('topic-child')");
    check('아이 사주: 보호자 생년월일을 비우고 입력란 이름을 바꿈',()=>{assert.equal(d.getElementById('iY').value,'');assert.equal(d.getElementById('lgBirth').textContent,'아이 생년월일');});
    await birth('2019','3','9');
    check('아이 사주: 보호자 입력 캐시를 덮어쓰지 않음',()=>{assert.equal(run('_lastInputs.year'),'1994');assert(d.querySelector('#p9 .paid-preview'));});
    run("goToInput('life')");
    check('아이 사주 뒤 다른 풀이: 보호자 생년월일이 다시 채워짐',()=>{assert.equal(d.getElementById('iY').value,'1994');assert.equal(d.getElementById('lgBirth').textContent,'생년월일');});
    run("goToInput('newyear')");
    check('한 해 풀이: 올해를 기본값으로 사용',()=>assert.equal(d.getElementById('nyY').value,String(new Date().getFullYear())));
    check('런타임: 입력·무료·유료 전체 흐름에서 오류 없음',()=>assert.equal(errors.length,0,errors.join('\n')));
    console.log('Journey integration checks passed. Network fully mocked; no live payment.');
  }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
