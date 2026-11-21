'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
try{
 run(fs.readFileSync('assets/input-chat.js','utf8'));
 // The audit runtime disables inline HTML handlers; restore the choice handlers used here.
 ['mrSingle','mrDating','mrMarried','breg','blp','gnLr','gnLp'].forEach(id=>{const b=d.getElementById(id);b.addEventListener('click',()=>run(b.getAttribute('onclick')));});
 run("_lastInputs=null;goToInput('life')");
 const step=()=>run('wzStepKind(_wz.steps[_wz.open])');
 const next=()=>run('InputChat.next()');
 assert.equal(step(),'name');next();assert.equal(step(),'name');
 d.getElementById('iName').value='대화검증';next();assert.equal(step(),'gender');
 assert.equal(d.querySelectorAll('[data-chat-kind="gender"] [aria-checked="true"]').length,0);
 assert(d.querySelector('[data-chat-kind="gender"] .chat-send').hidden);
 next();assert.equal(step(),'gender');
 d.getElementById('bm').click();assert.equal(step(),'birth');
 assert(d.getElementById('iY').closest('.chat-composer').querySelector('.chat-send'));
 assert(d.getElementById('iName').closest('.chat-composer').querySelector('[aria-label="보내기"]'));
 ['iY','iM','iD'].forEach((id,i)=>d.getElementById(id).value=[1987,9,21][i]);next();assert.equal(step(),'calendar');
 assert.deepEqual(['iY','iM','iD'].map(id=>d.getElementById(id).placeholder),['1990','01','01'],'date shows a faded 1990. 01. 01 example');
 assert(d.querySelector('#chatCalendar .chat-send').hidden,'calendar submits on selection');
 assert(!d.querySelector('#chatCalendar .chat-composer'),'choice questions have no typing box');
 d.querySelector('[data-cal="lunar"]').click();assert.equal(step(),'leap');d.getElementById('breg').click();assert.equal(step(),'time');
 d.querySelector('#chatCalendar .chat-reply').click();d.querySelector('[data-cal="solar"]').click();assert.equal(step(),'time');
 assert.deepEqual(['iHourInput','iMin'].map(id=>d.getElementById(id).placeholder),['14','30']);
 const timeBox=d.getElementById('iHourInput').closest('.chat-time-composer');assert(timeBox&&timeBox.contains(d.getElementById('iMin'))&&timeBox.querySelector('.chat-send'),'time uses the same composer shape as the date');
 d.getElementById('iHourInput').value=8;d.getElementById('iMin').value=45;run("syncHourInput('8')");next();assert.equal(step(),'city');
 d.getElementById('iCity').value='대전광역시';next();
 // Marital may precede DST in the legacy order. Both must remain available.
 if(step()==='marital'){run("setMarital('married')");next();}
 assert.equal(step(),'dst');next();assert.equal(step(),'dst');
 assert.deepEqual([...d.querySelectorAll('#chatDst [data-dst]')].map(x=>x.textContent),['기록된 시간 그대로예요','이미 1시간 빼고 적었어요','어느 쪽인지 모르겠어요']);assert(d.querySelector('#chatDst .chat-send').hidden);
 for(const choice of ['clock','unknown','corrected']){
   if(step()!=='dst')d.querySelector('#chatDst .chat-reply').click();
   d.querySelector('[data-dst="'+choice+'"]').click();assert.notEqual(step(),'dst');assert.equal(d.getElementById('iDstAsIs').checked,choice==='corrected');
 }
 for(let i=0;i<30&&!d.getElementById('formWrap').classList.contains('chat-complete');i++){
   if(step()==='marital'){assert(d.querySelector('#catExtraMarital .chat-send').hidden);d.getElementById('mrMarried').click();continue;}
   const f=run('_wz.steps[_wz.open][0]');if(f.dataset.counselKey==='occupation')f.querySelector('input,textarea,select').value='학생';next();
 }
 assert(d.getElementById('formWrap').classList.contains('chat-complete'));
 assert.equal(d.querySelector('.chat-progress progress').value,100);
 assert(!d.querySelector('#formWrap .analyze-btn').classList.contains('wz-hide'));
 assert(d.querySelector('.chat-question img').src.endsWith('/life.webp'));
 d.querySelector('#nameFieldset .chat-reply').click();assert.equal(step(),'name');assert(d.querySelector('#formWrap .analyze-btn').classList.contains('wz-hide'));
 next();assert(d.getElementById('formWrap').classList.contains('chat-complete'),'editing a name returns to review');
 // Unknown birth time has no DST question; changing category swaps the guide.
 run("document.getElementById('iTimeUnknown').checked=true;setTimeUnknown(true);goToInput('newyear')");
 assert(!run('_wz.steps.some(s=>wzStepKind(s)==="dst")'));
 assert(d.querySelector('.chat-question img').src.endsWith('/newyear.webp'));
 for(const cat of ['manse','daily','life','newyear','gunghap','name','ziwei','topic-love','topic-marriage','topic-reunion','topic-money','topic-career','topic-study','topic-child','topic-children','topic-health']){
   w.cat=cat;run('goToInput(window.cat)');assert(d.querySelector('#formWrap.input-chat .chat-current'),'current question '+cat);
   assert.equal(d.querySelectorAll('#chatCalendar').length,1);assert.equal(d.querySelectorAll('#iCalType').length,1);assert.equal(d.querySelectorAll('#chatDst').length,1);
 }
 run("goToInput('gunghap');_wz.open=_wz.steps.findIndex(s=>wzStepKind(s)==='partnerGender');wizardShow(null)");
 assert.equal(step(),'partnerGender');next();assert.equal(step(),'partnerGender');d.getElementById('gnGf').click();assert.equal(step(),'partnerBirth');
 ['gnY','gnM','gnD'].forEach((id,i)=>d.getElementById(id).value=[1987,9,21][i]);next();assert.equal(step(),'partnerCalendar');assert(d.querySelector('#chatPartnerCalendar .chat-send').hidden);d.querySelector('[data-partner-cal="lunar"]').click();assert.equal(run('_gnCal'),'lunar');assert.equal(step(),'partnerLeap');d.getElementById('gnLp').click();assert.equal(step(),'partnerTime');d.querySelector('#chatPartnerCalendar .chat-reply').click();d.querySelector('[data-partner-cal="solar"]').click();assert.equal(step(),'partnerTime');
 d.getElementById('gnH').value=8;d.getElementById('gnMin').value=45;next();assert.equal(step(),'partnerCity');
 d.getElementById('gnCity').value='대전광역시';next();assert.equal(step(),'partnerDst');
 d.querySelector('[data-partner-dst="corrected"]').click();assert(d.getElementById('gnDstAsIs').checked);assert.notEqual(step(),'partnerDst');
 run("goToInput('life')");assert(!run('_wz.steps.some(s=>wzStepKind(s).startsWith("partner"))'));
 run("goToInput('topic-love');document.getElementById('counsel_status').value='';_wz.open=_wz.steps.findIndex(s=>s[0].dataset.counselKey==='status');wizardShow(null)");
 next();assert.equal(run('_wz.steps[_wz.open][0].dataset.counselKey'),'status','unified relationship status is required');
 assert(!run('_wz.steps.some(s=>wzStepKind(s)==="marital")'),'no duplicate relationship question');
 d.getElementById('counsel_status').value='연애 중';d.getElementById('counsel_status').dispatchEvent(new w.Event('change',{bubbles:true}));next();
 assert.equal(run('_marital'),'dating');assert.equal(run('_wz.steps[_wz.open][0].dataset.counselKey'),'focus');
 next();assert.equal(run('_wz.steps[_wz.open][0].dataset.counselKey'),'duration');
 next();assert.equal(run('_wz.steps[_wz.open][0].dataset.counselKey'),'question');
 assert.match(d.querySelector('#counsel_question').closest('fieldset').querySelector('.chat-question').textContent,/더 알려주고 싶은 상황/);
 next();assert(d.getElementById('formWrap').classList.contains('chat-complete'),'all extra context may be skipped');
 console.log('Input chat passed: explicit replies, named/category guide, DST corrected/unknown, completion/edit, unknown-time skip, 16 shared categories, unified love intake; no model/payment calls.');
}finally{rt.close();}
