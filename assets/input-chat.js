/* Conversational shell over the existing input model. No inference or calculation changes. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  let ready=false,permit=false,complete=false,editReturn=null;
  const oldInit=inputWizardInit,oldShow=wizardShow,oldAdvance=wzAdvance,oldKind=wzStepKind,oldDone=wzStepDone;
  const domestic=new Set(['seoul','busan','daegu','incheon','gwangju','daejeon','ulsan','sejong','suwon','chuncheon','cheongju','jeonju','mokpo','pohang','changwon','jeju','kr-other']);
  const val=id=>String($(id)?.value||'').trim();
  const signature=()=>['iY','iM','iD','iHourInput','iMin','iCity'].map(val).join('|')+'|'+calType+'|'+isLeap;
  function dstNeeded(){const b=dstBirthSolar(+val('iY'),+val('iM'),+val('iD'),calType,isLeap);return !!b&&!$('iTimeUnknown').checked&&val('iHourInput')!==''&&domestic.has(normalizeCityInput(val('iCity')))&&krDstDay(b.y,b.m,b.d);}
  function partnerPrepare(){
    const parent=$('catExtraGunghap');
    if(!$('chatPartnerBirth')){
      function part(id,title,nodes){const fs=document.createElement('fieldset');fs.id=id;const legend=document.createElement('legend');legend.textContent=title;fs.append(legend,...nodes);parent.after(fs);return fs;}
      const date=part('chatPartnerBirth','상대방 생년월일',[$('gnY').closest('.birth-date-row')]);
      const calendar=part('chatPartnerCalendar','상대방 달력 기준',[$('gnCalType').closest('.birth-calendar'),$('gnLeapSec')]);
      const time=part('chatPartnerTime','상대방 태어난 시각',[$('gnH').closest('.row3')]);
      const unknown=document.createElement('label');unknown.className='time-unknown-row';unknown.innerHTML='<input type="checkbox" id="chatPartnerUnknown"> 시간을 몰라요';time.append(unknown);
      unknown.querySelector('input').addEventListener('change',e=>{['gnH','gnMin'].forEach(id=>{$(id).disabled=e.target.checked;if(e.target.checked)$(id).value='';});});
      const city=part('chatPartnerCity','상대방 출생지역',[$('gnCity').closest('.ig')]);
      const dst=part('chatPartnerDst','상대방 서머타임 확인',[$('gnDstAsIs').closest('.dst-row')]);
      dst.insertAdjacentHTML('beforeend','<div class="chat-dst-options"><button type="button" data-partner-dst="clock">당시 시계 시간이에요</button><button type="button" data-partner-dst="corrected">이미 1시간을 뺐어요</button><button type="button" data-partner-dst="unknown">잘 모르겠어요</button></div><p class="chat-dst-note">잘 모르겠다면 당시 시계 시간으로 보고 기존 시간 보정을 적용해요.</p>');
      dst.querySelectorAll('[data-partner-dst]').forEach(b=>b.addEventListener('click',()=>{dst.dataset.answer=b.dataset.partnerDst;$('gnDstAsIs').checked=b.dataset.partnerDst==='corrected';paint();}));
      parent.after(date,calendar,time,city,dst);
    }
    ['Birth','Calendar','Time','City'].forEach(k=>$('chatPartner'+k).hidden=_category!=='gunghap');
    const b=dstBirthSolar(+val('gnY'),+val('gnM'),+val('gnD'),_gnCal,_gnLeap);
    $('chatPartnerDst').hidden=_category!=='gunghap'||!b||!krDstDay(b.y,b.m,b.d)||val('gnH')===''||!domestic.has(normalizeCityInput(val('gnCity')));
    const sig=['gnY','gnM','gnD','gnH','gnMin','gnCity'].map(val).join('|')+_gnCal+_gnLeap;
    if($('chatPartnerDst').dataset.signature!==sig){delete $('chatPartnerDst').dataset.answer;$('chatPartnerDst').dataset.signature=sig;}
  }
  function prepare(){
    const form=$('formWrap');form.classList.add('input-chat');
    if(!$('chatCalendar')){
      const date=$('iY').closest('fieldset'),cal=document.createElement('fieldset');cal.id='chatCalendar';cal.innerHTML='<legend>달력 기준</legend><div class="chat-calendar-options" role="group" aria-label="달력 기준"><button type="button" data-cal="solar">양력이에요</button><button type="button" data-cal="lunar">음력이에요</button></div>';
      cal.append($('iCalType').closest('.birth-calendar'),$('leapSec'));date.after(cal);
      cal.querySelectorAll('[data-cal]').forEach(b=>b.addEventListener('click',()=>{setCal(b.dataset.cal);cal.dataset.wzConfirmed='1';paint();}));
      const dst=document.createElement('fieldset');dst.id='chatDst';dst.innerHTML='<legend>서머타임 확인</legend><div class="chat-dst-options" role="group" aria-label="입력한 시각의 기준"><button type="button" data-dst="clock">당시 시계 시간이에요</button><button type="button" data-dst="corrected">이미 1시간을 뺐어요</button><button type="button" data-dst="unknown">잘 모르겠어요</button></div><p class="chat-dst-note">잘 모르겠다면 당시 시계 시간으로 보고 기존 시간 보정을 적용해요.</p>';
      dst.append($('iDstAsIs').closest('.dst-row'),$('dstHelp'));$('iCity').closest('fieldset').after(dst);
      dst.querySelectorAll('[data-dst]').forEach(b=>b.addEventListener('click',()=>{dst.dataset.answer=b.dataset.dst;dst.dataset.signature=signature();$('iDstAsIs').checked=b.dataset.dst==='corrected';paint();}));
      form.addEventListener('click',e=>{
        const button=e.target.closest('.gender-choice button');
        if(!button||!button.closest('fieldset').classList.contains('chat-current'))return;
        const fs=button.closest('fieldset');
        if(wzStepKind([fs])==='gender')form.dataset.genderPicked='1';
        else fs.dataset.genderPicked='1';
        next();
      });
      form.addEventListener('submit',e=>{if(!complete){e.preventDefault();e.stopImmediatePropagation();next();}},true);
      form.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='BUTTON'){e.preventDefault();e.stopImmediatePropagation();next();}},true);
    }
    partnerPrepare();
    $('chatDst').hidden=!dstNeeded();
    if($('chatDst').dataset.signature!==signature())delete $('chatDst').dataset.answer;
    if(!form.querySelector('.chat-progress')){const p=document.createElement('div');p.className='chat-progress';p.innerHTML='<span role="status" aria-live="polite"></span><progress max="100" value="0" aria-label="출생정보 입력 진행률"></progress>';form.prepend(p);}
  }
  wzStepKind=function(step){if(step[0].id==='catExtraGunghap')return 'partnerGender';if(step[0].id.startsWith('chatPartner'))return 'partner'+step[0].id.slice(11);if(step.some(f=>f.id==='chatCalendar'))return 'calendar';if(step.some(f=>f.id==='chatDst'))return 'dst';return oldKind(step);};
  wzStepDone=function(step){const k=wzStepKind(step);if(k.startsWith('partner'))return step[0].dataset.wzConfirmed==='1';if(k==='calendar')return $('chatCalendar').dataset.wzConfirmed==='1';if(k==='dst')return !!$('chatDst').dataset.answer;return oldDone(step);};
  inputWizardInit=function(keep){
    prepare();ready=true;complete=false;if(!keep)editReturn=null;
    if(!keep&&_lastInputs&&val('iY')===String(_lastInputs.year)&&val('iM')===String(_lastInputs.month)&&val('iD')===String(_lastInputs.day))$('chatCalendar').dataset.wzConfirmed='1';
    const previous=keep&&_wz.steps[_wz.open]?.[0];oldInit(keep);const active=previous||_wz.steps[_wz.open]?.[0];
    const dstAt=_wz.steps.findIndex(s=>s[0].id==='chatDst'),cityAt=_wz.steps.findIndex(s=>s[0].querySelector('#iCity'));
    if(dstAt>=0&&cityAt>=0){const item=_wz.steps.splice(dstAt,1)[0];_wz.steps.splice(cityAt+1,0,item);}
    if(active){const at=_wz.steps.findIndex(s=>s.includes(active));if(at>=0)_wz.open=at;}
    wizardShow(null);paint();
  };
  wizardShow=function(prev){oldShow(prev);if(ready)paint();};
  // Input/change events update the answer in place. Only an explicit reply advances the chat.
  wzAdvance=function(){if(!ready||permit)return oldAdvance.apply(this,arguments);paint();};
  function character(){let key=_category?.replace('topic-','')||'life';if(['manse','daily','life','newyear','gunghap','name','love','marriage','reunion','money','career','study','child','children','health','ziwei','qna'].includes(key)===false)key='life';return '/assets/art-v2/posters/'+key+'.webp';}
  function question(fs){const k=wzStepKind([fs]),name=readSajuName(),who=name?name+'님, ':'';
    const optional=k==='counsel'&&fs.dataset.counselKey!=='occupation';
    return ({partnerGender:'이제 상대방 정보를 알려주세요. 성별은 어떻게 되세요?',partnerBirth:'상대방의 생년월일을 알려주세요.',partnerCalendar:'상대방 생일은 양력인가요, 음력인가요?',partnerTime:'상대방이 태어난 시각을 알고 계세요?',partnerCity:'상대방은 어느 지역에서 태어났나요?',partnerDst:'상대방이 태어난 날짜에도 서머타임을 사용했어요. 입력한 시각의 기준을 알려주세요.',name:'만나서 반가워요 🙂 편하게 불러드릴 이름을 알려주세요.',gender:who+'성별을 알려주시겠어요?',birth:who+'생일은 언제인가요? 태어난 날짜를 알려주세요.',calendar:'알려주신 생일은 양력인가요, 음력인가요?',time:'태어난 시각을 알려주세요. 모르면 아래에서 선택해 주세요.',city:'어느 지역에서 태어나셨나요?',dst:who+'태어난 날짜에는 한국에서 서머타임을 사용했어요. 입력한 시각은 당시 시계 시간인가요?',marital:'지금 연애·결혼 상태는 어떻게 되세요?',naming:'풀이하고 싶은 이름을 알려주세요.'})[k]||(wzPromptFor([fs])+(optional?' 답변은 선택이에요.':''));
  }
  function answer(fs){const k=wzStepKind([fs]);
    if(k==='partnerGender')return _gnGender==='female'?'여성':'남성';if(k==='partnerBirth')return `${val('gnY')}년 ${val('gnM')}월 ${val('gnD')}일`;if(k==='partnerCalendar')return _gnCal==='lunar'?'음력 · '+(_gnLeap?'윤달':'평달'):'양력';if(k==='partnerTime')return val('gnH')===''?'태어난 시각은 몰라요':`${val('gnH')}시 ${val('gnMin')||'00'}분`;if(k==='partnerCity')return val('gnCity');if(k==='partnerDst')return ({clock:'당시 시계 시간',corrected:'이미 1시간 보정함',unknown:'잘 모르겠어요 · 당시 시계 시간으로 적용'})[fs.dataset.answer]||'';if(k==='name')return readSajuName();if(k==='gender')return gender==='female'?'여성':'남성';
    if(k==='birth')return `${val('iY')}년 ${val('iM')}월 ${val('iD')}일`;
    if(k==='calendar')return calType==='lunar'?'음력 · '+(isLeap?'윤달':'평달'):'양력';
    if(k==='time')return $('iTimeUnknown').checked?'태어난 시각은 몰라요':`${val('iHourInput')}시 ${val('iMin')||'00'}분`;
    if(k==='city')return val('iCity');if(k==='dst')return ({clock:'당시 시계 시간',corrected:'이미 1시간 보정함',unknown:'잘 모르겠어요 · 당시 시계 시간으로 적용'})[fs.dataset.answer]||'시간 기준을 확인해 주세요';
    if(k==='marital')return ({single:'미혼',dating:'연애 중',married:'기혼'})[_marital]||'';
    return [...fs.querySelectorAll('input:not([type=hidden]):not([type=checkbox]),select,textarea')].filter(x=>x.value).map(x=>x.tagName==='SELECT'?x.selectedOptions[0]?.textContent:x.value).join(' · ')||'건너뛰었어요';
  }
  function paint(){if(!ready||!_wz.steps.length)return;const form=$('formWrap'),steps=_wz.steps;
    steps.forEach((step,i)=>step.forEach(fs=>{
      let prompt=fs.querySelector(':scope > .chat-question');if(!prompt){prompt=document.createElement('div');prompt.className='chat-question';prompt.innerHTML='<img alt="" width="42" height="42"><p tabindex="-1"></p>';fs.prepend(prompt);}
      prompt.querySelector('img').src=character();prompt.querySelector('img').onerror=function(){this.onerror=null;this.src='/assets/art-v2/posters/life.webp';};prompt.querySelector('p').textContent=question(fs);
      let reply=fs.querySelector(':scope > .chat-reply');if(!reply){reply=document.createElement('button');reply.type='button';reply.className='chat-reply';reply.innerHTML='<span></span><small>수정</small>';fs.append(reply);reply.addEventListener('click',()=>{editReturn={fs:_wz.steps[_wz.open][0],complete};complete=false;_wz.open=_wz.steps.findIndex(s=>s.includes(fs));wizardShow(null);fs.scrollIntoView({behavior:'smooth',block:'center'});});}
      reply.querySelector('span').textContent=answer(fs);reply.setAttribute('aria-label',answer(fs)+' 수정');
      const kind=wzStepKind([fs]);
      fs.dataset.chatKind=kind;
      if(kind==='gender'||kind==='partnerGender'){
        const picked=kind==='gender'?form.dataset.genderPicked:fs.dataset.genderPicked;
        const selected=kind==='gender'?gender:_gnGender;
        fs.querySelectorAll('.gender-choice button').forEach(b=>{const on=picked==='1'&&((b.id==='bm'||b.id==='gnGm')?selected==='male':selected==='female');b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on));});
      }
      let send=fs.querySelector('.chat-send');if(!send){send=document.createElement('button');send.type='button';send.className='chat-send';send.addEventListener('click',next);fs.append(send);}
      const optional=wzStepKind([fs])==='counsel'&&fs.dataset.counselKey!=='occupation'&&!fs.querySelector('input,select,textarea')?.value.trim();
      if(!send.querySelector('svg'))send.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>';
      send.setAttribute('aria-label',optional?'건너뛰기':'보내기');send.title=optional?'건너뛰기':'보내기';
      send.hidden=kind==='gender'||kind==='partnerGender';
      if(!send.hidden&&!fs.querySelector('.chat-composer')){
        const control=[...fs.children].find(el=>!el.matches('legend,.chat-question,.chat-reply,.chat-send')&&el.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea'));
        if(control){const composer=document.createElement('div');composer.className='chat-composer';fs.insertBefore(composer,control);composer.append(control,send);if(kind==='birth'||kind==='partnerBirth')composer.classList.add('chat-date-composer');}
      }

      fs.classList.toggle('chat-answered',i<_wz.open||complete);fs.classList.toggle('chat-current',i===_wz.open&&!complete);
      fs.querySelectorAll('[data-partner-dst]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.partnerDst===fs.dataset.answer)));
      fs.querySelectorAll('[data-cal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cal===calType)));fs.querySelectorAll('[data-dst]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dst===fs.dataset.answer)));
    }));
    const progress=form.querySelector('.chat-progress');progress.querySelector('span').textContent=complete?'입력 내용을 확인해 주세요':`${_wz.open+1} / ${steps.length} · 한 가지씩 알려주세요`;progress.querySelector('progress').value=complete?100:Math.round(_wz.open/steps.length*100);
    form.querySelector('.analyze-btn')?.classList.toggle('wz-hide',!complete);form.classList.toggle('chat-complete',complete);
  }
  function valid(fs){const k=wzStepKind([fs]);
    if(k.startsWith('partner')){
      if(k==='partnerGender'&&fs.dataset.genderPicked!=='1')return showErr('상대방 성별을 선택해 주세요.','gnGm'),false;
      if(k==='partnerBirth'&&!(+val('gnY')>=1900&&+val('gnY')<=2050&&+val('gnM')>=1&&+val('gnM')<=12&&+val('gnD')>=1&&+val('gnD')<=31))return showErr('상대방 생년월일을 확인해 주세요.','gnY'),false;
      if(k==='partnerCalendar'&&_gnCal==='solar'&&new Date(+val('gnY'),+val('gnM')-1,+val('gnD')).getMonth()!==+val('gnM')-1)return showErr('상대방 생일에 없는 날짜예요.','gnD'),false;
      if(k==='partnerTime'&&!$('chatPartnerUnknown').checked&&(val('gnH')===''||+val('gnH')<0||+val('gnH')>23||val('gnMin')===''||+val('gnMin')<0||+val('gnMin')>59))return showErr('상대방 시각을 입력하거나 시간을 몰라요를 선택해 주세요.','gnH'),false;
      if(k==='partnerCity'&&!val('gnCity'))return showErr('상대방이 태어난 곳을 알려주세요.','gnCity'),false;
      if(k==='partnerDst'&&!fs.dataset.answer)return showErr('상대방 시각의 기준을 골라주세요.'),false;
      fs.dataset.wzConfirmed='1';
    }
    if(k==='name'){if(!readSajuName())return showErr('이름을 입력해 주세요.','iName'),false;fs.dataset.wzConfirmed='1';}
    if(k==='gender'&&$('formWrap').dataset.genderPicked!=='1')return showErr('성별을 선택해 주세요.','bm'),false;
    if(k==='birth'){const y=+val('iY'),m=+val('iM'),d=+val('iD');if(!wzBirthOk()||d>31)return showErr('생년월일을 확인해 주세요.','iD'),false;}
    if(k==='calendar'){if(calType==='solar'){const date=new Date(+val('iY'),+val('iM')-1,+val('iD'));if(date.getMonth()!==+val('iM')-1)return showErr('해당 월에 없는 날짜예요. 생일을 확인해 주세요.','iD'),false;}fs.dataset.wzConfirmed='1';}
    if(k==='time'&&!$('iTimeUnknown').checked){if(val('iHourInput')===''||+val('iHourInput')<0||+val('iHourInput')>23||val('iMin')===''||+val('iMin')<0||+val('iMin')>59)return showErr('시(0~23)와 분(0~59)을 입력하거나 시간을 몰라요를 선택해 주세요.','iHourInput'),false;}
    if(k==='city'){if(!val('iCity'))return showErr('태어난 곳을 알려주세요.','iCity'),false;fs.dataset.wzConfirmed='1';}
    if(k==='dst'&&!fs.dataset.answer)return showErr('입력한 시각의 기준을 골라주세요.'),false;
    if(k==='marital'&&!_marital)return showErr('현재 연애·결혼 상태를 선택해 주세요.','mrSingle'),false;
    if(k==='naming'){if(!namingFieldsValid())return showErr('성씨와 이름을 확인해 주세요.','nmGiven'),false;fs.dataset.wzConfirmed='1';}
    if(k==='counsel'){const input=fs.querySelector('input,select,textarea');if(fs.dataset.counselKey==='occupation'&&!input.value.trim())return showErr('현재 하는 일을 알려주세요. 학생·구직 중·육아·은퇴도 적을 수 있어요.',input.id),false;fs.dataset.wzConfirmed='1';counselSave();}
    if(fs.querySelector('#nyY')){if(+val('nyY')<1900||+val('nyY')>2100)return showErr('보고 싶은 해를 확인해 주세요.','nyY'),false;}
    return true;
  }
  function next(){const fs=_wz.steps[_wz.open]?.[0];if(!fs||!valid(fs))return;clearErr();
    const old=fs;prepare(); // A changed date/place may insert or remove the DST question.
    permit=true;try{inputWizardInit(true);}finally{permit=false;}
    const at=_wz.steps.findIndex(s=>s.includes(old));_wz.open=Math.min(at+1,_wz.steps.length-1);complete=at===_wz.steps.length-1;
    if(editReturn&&!['birth','calendar','time','city','partnerBirth','partnerCalendar','partnerTime','partnerCity'].includes(wzStepKind([old]))){const back=_wz.steps.findIndex(s=>s.includes(editReturn.fs));if(back>=0){_wz.open=back;complete=editReturn.complete;}}editReturn=null;wizardShow(null);
    const target=complete?$('formWrap').querySelector('.analyze-btn'):_wz.steps[_wz.open][0];requestAnimationFrame(()=>{target?.scrollIntoView({behavior:'smooth',block:'center'});(target?.querySelector('.chat-question p')||target)?.focus({preventScroll:true});});
  }
  window.InputChat={next,refresh:paint};
})();
