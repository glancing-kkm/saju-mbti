'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const rt=require('./lib/reading-runtime')(),{run,w,d}=rt;
try{
 run(fs.readFileSync('assets/input-chat.js','utf8'));
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
 run("setCal('solar')");next();assert.equal(step(),'time');
 d.getElementById('iHourInput').value=8;d.getElementById('iMin').value=45;run("syncHourInput('8')");next();assert.equal(step(),'city');
 d.getElementById('iCity').value='대전광역시';next();
 // Marital may precede DST in the legacy order. Both must remain available.
 if(step()==='marital'){run("setMarital('married')");next();}
 assert.equal(step(),'dst');next();assert.equal(step(),'dst');
 d.querySelector('[data-dst="clock"]').click();assert(!d.getElementById('iDstAsIs').checked);d.querySelector('[data-dst="unknown"]').click();assert(!d.getElementById('iDstAsIs').checked);d.querySelector('[data-dst="corrected"]').click();assert(d.getElementById('iDstAsIs').checked);next();
 for(let i=0;i<30&&!d.getElementById('formWrap').classList.contains('chat-complete');i++){
   if(step()==='marital')run("setMarital('married')");
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
 ['gnY','gnM','gnD'].forEach((id,i)=>d.getElementById(id).value=[1987,9,21][i]);next();assert.equal(step(),'partnerCalendar');next();assert.equal(step(),'partnerTime');
 d.getElementById('gnH').value=8;d.getElementById('gnMin').value=45;next();assert.equal(step(),'partnerCity');
 d.getElementById('gnCity').value='대전광역시';next();assert.equal(step(),'partnerDst');
 d.querySelector('[data-partner-dst="corrected"]').click();assert(d.getElementById('gnDstAsIs').checked);next();
 run("goToInput('life')");assert(!run('_wz.steps.some(s=>wzStepKind(s).startsWith("partner"))'));
 console.log('Input chat passed: explicit replies, named/category guide, DST corrected/unknown, completion/edit, unknown-time skip, 16 shared categories; no model/payment calls.');
}finally{rt.close();}
