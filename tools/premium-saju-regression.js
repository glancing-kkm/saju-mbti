'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
try{
 const products=w.PremiumSaju.products;assert.equal(Object.keys(products).length,11);
 rt.set({...rt.fixture(40),hour:8});
 const outlines=new Set();
 for(const [cat,spec]of Object.entries(products)){
  assert(spec.fields.length<=(cat==='topic-reunion'?4:3),cat+' must keep intake short');
  assert(spec.fields.some(f=>f.key==='question'),cat+' keeps one optional free question');
  w.cat=cat;run('goToInput(window.cat)');
  // 주제별 운세는 각자의 질문으로 상황을 받으므로 직업 칸을 따로 묻지 않는다(2026-11-02 사용자 요청).
  assert(!d.getElementById('counsel_occupation'),cat+' should not ask occupation');
  for(const f of spec.fields){const input=d.getElementById('counsel_'+f.key);assert(input,cat+'/'+f.key);assert(!input.required);assert(!input.hasAttribute('maxlength'));if(f.type==='select'){assert.equal(input.tagName,'SELECT');assert([...input.options].some(o=>o.value==='답변하지 않음'));assert([...input.options].some(o=>o.value==='기타'));}}
  const report=run('AIReport.sources(window.cat,_saju,_meta)');
  assert(report.productGuide);assert.equal(report.productGuide.targetCharacters[0],Math.round(spec.range[0]*.8));assert(report.storytelling.secondary.includes('STORY_06'));
  assert.equal(report.chapters[0].kind,'prologue');assert.equal(report.chapters.at(-1).kind,'guide');
  assert(report.chapters.every(c=>c.question.length>40));assert(report.chapters.length>=(cat==='name'?7:8),'한자 미확인 이름풀이만 한자·획수 장을 제외한다');
  outlines.add(report.chapters.map(c=>c.title).join('|'));
  const monthly=report.chapters.find(c=>c.kind==='topic-months');
  if(monthly){assert.equal(report.ledger.filter(x=>x.id.startsWith('mw.')).length,12);assert.equal(monthly.refs.filter(id=>id.startsWith('mw.')).length,12);assert(monthly.question.includes('절기'));}
  assert(!JSON.stringify(report.productGuide).includes('계유')); // no example natal chart in product contract
 }
 assert.equal(outlines.size,11);
 assert.deepEqual(Array.from(products['topic-reunion'].fields,f=>f.key),['timing','contact','reason','question']);
 assert(products.name.fields.some(f=>f.key==='hanjaStatus'),'retain actual Han characters verification');
 for(const cat of ['life','newyear','ziwei']){w.cat=cat;run('goToInput(window.cat)');assert.equal(d.querySelectorAll('#counselFields fieldset').length,1);assert(d.getElementById('counsel_occupation').required);assert.equal(d.querySelectorAll('#counselFields .counsel-skip').length,0);}
 assert(!rt.source.includes('추가로 알려 주실 내용이 있나요? 없으면 건너뛰어도 돼요.'));
 const fixed={...rt.fixture(40),counsel:{source:'user-stated',category:'topic-career',answers:[{key:'question',value:'현재 직장에 남을지 고민합니다.'}]}};
 rt.set(fixed);const first=run("AIReport.sources('topic-career',_saju,_meta)");assert.equal(JSON.stringify(first),JSON.stringify(run("AIReport.sources('topic-career',_saju,_meta)")));
 rt.set({...fixed,counsel:{...fixed.counsel,answers:[{key:'question',value:'지난해 나만의 개인 사건 표본을 겪었습니다.'}]}});const second=run("AIReport.sources('topic-career',_saju,_meta)");assert.equal(JSON.stringify(first.ledger),JSON.stringify(second.ledger));assert.notEqual(JSON.stringify(first.userStatements),JSON.stringify(second.userStatements));assert(!JSON.stringify(second.ledger).includes('개인 사건'));
 rt.set({...fixed,sd:fixed.sd+1});assert.notEqual(JSON.stringify(first.ledger),JSON.stringify(run("AIReport.sources('topic-career',_saju,_meta)").ledger));
 rt.set({...rt.fixture(40),gnExtra:null});assert.throws(()=>run("AIReport.sources('gunghap',_saju,_meta)"),/상대방/);rt.set({...rt.fixture(40),gnExtra:{...rt.fixture(40).gnExtra,gh:-1}});const pair=run("AIReport.sources('gunghap',_saju,_meta)");assert(pair.limits.some(x=>x.includes('상대방 출생시각 미상')));

 run("goToInput('topic-love');document.getElementById('counsel_status').value='솔로';counselUpdateVisibility()");
 assert.equal(d.getElementById('counsel_duration'),null,'relationship duration no longer asked');
 assert(!run("counselRead('topic-love')").answers.some(a=>a.key==='duration'));
 run("document.getElementById('counsel_status').value='연애 중';document.getElementById('counsel_status').dispatchEvent(new Event('change',{bubbles:true}))");
 assert(run('_wz.steps').some(s=>s[0].dataset.counselKey==='question'),'one question follows relationship status');
 const question='개인별 상담 질문 '.repeat(600);d.getElementById('counsel_question').value=question;run('counselSave()');assert.equal(run("ctxCollect('topic-love')").text,question);assert.equal(run("counselRead('topic-love')").source,'user-stated');
 run("goToInput('topic-money');goToInput('topic-love')");assert.equal(d.getElementById('counsel_question').value,question.trim());
 run("document.getElementById('iY').value='1991';renderCounselFields('topic-love')");assert.equal(d.getElementById('counsel_question').value,'');
 rt.set({...rt.fixture(40),hour:-1,counsel:{source:'user-stated',category:'topic-children',answers:[{key:'status',value:'임신 준비 중'}]}});
 const noTime=run("AIReport.sources('topic-children',_saju,_meta)");assert(!noTime.ledger.some(x=>/^natal.hour/.test(x.id)));assert(noTime.productGuide.rules.includes('생식능력'));
 rt.set({...rt.fixture(40),counsel:{source:'user-stated',category:'name',answers:[{key:'hanjaStatus',value:'한자를 모름·한글 이름'}]}});
 const name=run("AIReport.sources('name',_saju,_meta)");assert(name.ledger.some(x=>x.id==='name.sound'));assert(name.ledger.some(x=>x.id==='name.chart'));assert(!name.ledger.some(x=>/^name\.(han|suri)/.test(x.id)));assert(name.limits.some(x=>x.includes('한자 미확인')));
 const worker=fs.readFileSync('worker/saju-chat-worker.js','utf8');const server=vm.createContext({console,URL,TextEncoder,crypto:require('node:crypto').webcrypto});vm.runInContext(worker.replace(/^import .*;\s*$/gm,'').replace('export default {','const workerDefault = {'),server);
 server.raw={...name,phase:'plan'};const parsed=vm.runInContext('professionalReportData(raw)',server);assert(parsed.productGuide);assert.equal(parsed.chapters[0].question,name.chapters[0].question);
 // 선택형 질문에 답해도 이미 확인한 출생지 단계가 풀리지 않는다(입력이 처음 단계로 되돌아가지 않음).
 run("goToInput('gunghap');document.getElementById('iCity').value='대전광역시';document.getElementById('iCity').dataset.wzConfirmed='1';const s=document.getElementById('counsel_status');s.value=s.options[2].value;s.dispatchEvent(new Event('change',{bubbles:true}))");assert.equal(d.getElementById('iCity').dataset.wzConfirmed,'1');
 console.log('✓ 11개 상품별 질문·다른 목차·서사·분량 계약, 조건부 단계, 건너뛰기, 질문 보존·사용자 격리, 절기월 근거, 시간·한자 미상 제한, 서버 계약 전달');
 console.log('모델 출력·실제 해석 품질은 이 테스트에서 평가하지 않습니다. 실제 유료 요청 없음.');
}finally{rt.close();}
