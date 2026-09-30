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
    check('홈: 주요 사주 6개가 펼침 없이 바로 노출',()=>{
      const cards=[...d.querySelectorAll('[data-home-category]')];
      assert.deepEqual(cards.map(c=>c.dataset.homeCategory),['manse','daily','life','newyear','gunghap','name']);
      assert(cards.every(c=>!c.closest('details')));
    });
    check('홈: 타로·별자리·질문 6개도 펼침 없이 노출, 접힌 칸 없음',()=>{
      const extras=[...d.querySelectorAll('[data-home-extra]')];
      assert.equal(extras.length,6);
      assert.equal(d.querySelectorAll('#view-home details').length,0);
    });
    for(const card of d.querySelectorAll('[data-home-category]')){
      run(card.getAttribute('onclick'));
      check('홈 카테고리 → 해당 입력 화면: '+card.dataset.homeCategory,()=>{
        assert.equal(run('_category'),card.dataset.homeCategory);
        assert(d.getElementById('view-input').classList.contains('on'));
        assert(!d.getElementById('payOverlay').classList.contains('vis'));
      });
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
    check('입력 재사용: 동일한 생년월일로 인생총운 미리보기',()=>{assert(d.querySelector('#p5 .journey-overview'));assert.equal(d.getElementById('iY').value,'1994');assert.match(d.querySelector('#p5 .journey-contents').textContent,/1,500원/);});
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
    run("journeyEvent('test','life',{value:1500,birthYear:'1994',name:'SECRET_NAME',pg_token:'SECRET_TOKEN'})");
    check('분석 이벤트: 개인정보와 결제 토큰 제외',()=>{const e=events().find(e=>e[1]==='test');assert(!('birthYear' in e[2]));assert(!JSON.stringify(e).includes('SECRET'));});
    run("goToInput('newyear')");
    check('한 해 풀이: 올해를 기본값으로 사용',()=>assert.equal(d.getElementById('nyY').value,String(new Date().getFullYear())));
    check('런타임: 입력·무료·유료 전체 흐름에서 오류 없음',()=>assert.equal(errors.length,0,errors.join('\n')));
    console.log('Journey integration checks passed. Network fully mocked; no live payment.');
  }finally{w.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
