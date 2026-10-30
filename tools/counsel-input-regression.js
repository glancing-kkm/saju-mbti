'use strict';
const assert=require('node:assert/strict');
const rt=require('./lib/reading-runtime')();const {run,d,w}=rt;
try{
 run("goToInput('life');document.getElementById('iName').value='검증예시';document.getElementById('iY').value='1990';document.getElementById('iM').value='5';document.getElementById('iD').value='15';setTimeUnknown(true);setMarital('single');renderCounselFields('life');inputWizardInit();");
 const cats=Array.from(run('Object.keys(COUNSEL_FIELDS)'));
 for(const cat of cats){
  w.cat=cat;run('goToInput(window.cat)');
  const occupation=d.getElementById('counsel_occupation');assert(occupation.required,cat);
  const fs=occupation.closest('fieldset'),steps=run('_wz.steps');
  assert(steps.some(step=>step[0]===fs),cat+' must be a wizard step');
  assert.equal(fs.querySelector('.counsel-skip'),null);
  assert.equal(d.querySelectorAll('#counselFields [required]').length,1);
  assert.equal(d.querySelectorAll('#counselFields .counsel-skip').length,run('counselFieldsFor(window.cat).length')-1);
  run("document.getElementById('counsel_occupation').value='';confirmCounselStep('occupation')");
  assert.match(d.getElementById('errMsg').textContent,/직업/);
 }
 console.log(`✓ ${cats.length}개 상담 입력: 직업만 필수, 추가 항목은 각각 다음·건너뛰기 단계`);
 run("goToInput('life');document.getElementById('iName').value='검증예시';document.getElementById('iY').value='1990';document.getElementById('iM').value='5';document.getElementById('iD').value='15';setTimeUnknown(true);setMarital('single');renderCounselFields('life');inputWizardInit();_wz.open=_wz.steps.findIndex(s=>s[0].dataset.counselKey==='occupation');wizardShow(null);");
 run("document.getElementById('counsel_occupation').value=' ';analyze()");assert.match(d.getElementById('errMsg').textContent,/직업/);assert(d.getElementById('view-input').classList.contains('on'));
 run("document.getElementById('counsel_occupation').value='프리랜서';document.getElementById('counsel_occupation').dispatchEvent(new Event('input',{bubbles:true}));");
 assert.equal(run("wzStepDone(_wz.steps[_wz.open])"),false,'typing must not immediately reveal next');
 run("document.getElementById('counsel_occupation').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))");
 assert.equal(run('_wz.steps[_wz.open][0].dataset.counselKey'),'focus');
 assert(d.getElementById('counsel_timing').closest('fieldset').classList.contains('wz-hide'));
 run("confirmCounselStep('focus',true)");assert.equal(run('_wz.steps[_wz.open][0].dataset.counselKey'),'timing');
 run("confirmCounselStep('timing',true);renderCounselFields('life')");
 assert.equal(d.getElementById('counsel_focus').closest('fieldset').dataset.wzConfirmed,'1','skip decision restored');
 run("renderCounselFields('manse');counselSave();renderCounselFields('topic-money')");assert.equal(d.getElementById('counsel_occupation').value,'프리랜서');assert.equal(d.getElementById('counsel_activity').value,'','income type must not become occupation');
 run("document.getElementById('iY').value='1991';renderCounselFields('topic-money')");assert.equal(d.getElementById('counsel_occupation').value,'');
 console.log('✓ 입력·Enter·건너뛰기 순서, 공백 직업 제출 차단, 동일 출생정보 재사용·다른 출생정보 격리');
 run("document.getElementById('iY').value='1990';renderCounselFields('qna');document.getElementById('counsel_marriage').value='기혼';document.getElementById('counsel_children').value='있음';counselSave();");
 assert.equal(d.getElementById('qaJob').value,'프리랜서');assert.equal(d.getElementById('qaMarriage').value,'기혼');assert.equal(d.getElementById('qaChildren').value,'있음');
 const info=run("counselRead('qna')");assert.equal(info.source,'user-stated');assert.equal(info.answers[0].key,'occupation');
 run("renderCounselFields('topic-child')");assert.match(d.querySelector('[for=counsel_occupation]').textContent,/아이/);
 console.log('✓ 즉문즉답 직업·결혼·자녀 정보 전달 및 아이의 학업·활동 입력 구분');
}finally{rt.close();}
