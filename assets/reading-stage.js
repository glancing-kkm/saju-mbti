/* A real completion gate: calculated birth chart stays visible until every chapter validates. */
(function(g){'use strict';
let current=null,sequence=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function chartHTML(chart,meta){
 const columns=[['시주','hp'],['일주','dp'],['월주','mp'],['연주','yp']];
 const cell=(p,type)=>{const n=type==='stem'?p.stem:p.branch,oh=type==='stem'?SOH[n]:BOH[n];return `<span class="analysis-glyph analysis-oh-${oh}"><b>${esc(type==='stem'?LC_STEM_HAN[n]:LC_BR_HAN[n])}</b><small>${esc(type==='stem'?STEMKO[n]:BRCHKO[n])} · ${esc(OHNAME[oh])}</small></span>`;};
 return `<div class="analysis-chart" aria-label="입력한 출생정보로 계산한 사주 원국">${columns.map(([title,key])=>`<div class="analysis-pillar${key==='dp'?' analysis-self':''}"><h3>${title}</h3>${chart?.[key]?cell(chart[key],'stem')+cell(chart[key],'branch'):'<span class="analysis-unknown">시간<br>미상</span>'}</div>`).join('')}</div>`;
}
// Waiting progress is explicitly estimated; only a validated completion can reach 100%.
const progressStates=new WeakMap(),PROGRESS_HISTORY='report-progress-durations-v1';
function estimateAt(confirmed,elapsed,duration,ceiling=98){
 if(confirmed>=100)return 100;
 const base=Math.max(0,Math.min(ceiling,Number(confirmed)||0));
 return Math.min(ceiling,base+(ceiling-base)*(1-Math.exp(-Math.max(0,elapsed)/Math.max(1000,duration)*1.2)));
}
function progressMarkup(id,label='풀이 작업 진행률'){return `<div class="report-progress" data-report-progress="${id}" aria-live="off"><div class="report-progress-head"><span>${esc(label)} <small class="report-progress-kind">예상 진행률</small></span><b class="report-progress-value">0%</b></div><div class="report-progress-track" role="progressbar" aria-label="${esc(label)} 예상 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><small class="report-progress-detail">풀이를 준비하고 있어요</small><small class="report-progress-note">실제 완료 시점에 따라 달라지는 예상치예요.</small></div>`;}
function paintProgress(box,percent,detail){
 const bar=box.querySelector('[role="progressbar"]'),n=Math.max(Number(bar.getAttribute('aria-valuenow'))||0,Math.min(100,Math.floor(percent||0)));
 bar.setAttribute('aria-valuenow',String(n));box.querySelector('i').style.width=n+'%';box.querySelector('.report-progress-value').textContent=n+'%';
 if(detail)box.querySelector('.report-progress-detail').textContent=detail;
 if(n===100){box.querySelector('.report-progress-kind').textContent='완료';box.querySelector('.report-progress-note').hidden=true;}
}
function startProgress(root,opts={}){
 const box=root?.querySelector('.report-progress');if(!box)return null;
 if(progressStates.has(box))return progressStates.get(box);
 const key=opts.key||box.dataset.reportProgress||'generic',fallback=key.startsWith('pdf')?50000:key.startsWith('single')?60000:100000;
 let duration=Number(opts.durationMs)||fallback;
 try{const previous=JSON.parse(localStorage.getItem(PROGRESS_HISTORY)||'{}')[key];if(!opts.durationMs&&previous?.ms)duration=Math.max(5000,Math.min(300000,previous.ms));}catch(e){}
 const state={box,key,duration,started:performance.now(),confirmed:0,finished:false,timer:null};progressStates.set(box,state);
 state.timer=setInterval(()=>{if(!box.isConnected||state.finished){clearInterval(state.timer);return;}paintProgress(box,estimateAt(state.confirmed,performance.now()-state.started,state.duration));},350);
 return state;
}
function updateProgress(root,percent,detail){
 const state=startProgress(root);if(!state)return;const value=Math.max(0,Math.min(100,Number(percent)||0));state.confirmed=Math.max(state.confirmed,value);
 paintProgress(state.box,value,detail);
 if(value===100&&!state.finished){state.finished=true;clearInterval(state.timer);const ms=performance.now()-state.started;
  if(ms>=1000)try{const history=JSON.parse(localStorage.getItem(PROGRESS_HISTORY)||'{}'),old=history[state.key]?.ms;history[state.key]={ms:Math.round(old?old*.65+ms*.35:ms)};localStorage.setItem(PROGRESS_HISTORY,JSON.stringify(history));}catch(e){}
 }
}
function stopProgress(root,detail){const box=root?.querySelector('.report-progress'),state=box&&progressStates.get(box);if(state){state.finished=true;clearInterval(state.timer);}if(box&&detail)box.querySelector('.report-progress-detail').textContent=detail;}
g.ReportProgress={markup:progressMarkup,update:updateProgress,start:startProgress,stop:stopProgress,estimateAt};
// Share identical paid requests and retain only validated responses, in memory for ten minutes.
const sharedRequests=new Map(),validatedResponses=new Map();
function sharedReadingRequest(key,job,validate){
 const cached=validatedResponses.get(key);if(cached&&cached.expires>Date.now())return Promise.resolve(cached.value);if(cached)validatedResponses.delete(key);
 if(sharedRequests.has(key))return sharedRequests.get(key);
 const task=Promise.resolve().then(job).then(value=>{let valid=false;try{valid=typeof validate==='function'&&validate(value);}catch(e){}if(valid){validatedResponses.set(key,{value,expires:Date.now()+600000});while(validatedResponses.size>16)validatedResponses.delete(validatedResponses.keys().next().value);}return value;}).finally(()=>sharedRequests.delete(key));
 sharedRequests.set(key,task);return task;
}
g.ReadingRequests={run:sharedReadingRequest};

function markup(chart,meta,label){
 const name=meta?.userName?esc(meta.userName)+'님의 ':'';
 const time=typeof birthTimeReference==='function'?birthTimeReference(meta):null;
 return `<main class="reading-analysis" aria-labelledby="analysisTitle"><div class="analysis-halo" aria-hidden="true"></div><div class="analysis-orbit" aria-hidden="true"><i></i><i></i><i></i></div><p class="analysis-kicker">${esc(label||'사주 풀이')}</p><h1 id="analysisTitle">${name}사주를<br>풀고 있어요</h1><p class="analysis-intro">타고난 기운과 시간의 흐름을 함께 살펴보고 있어요.</p><div class="analysis-board">${chartHTML(chart,meta)}<div class="analysis-scan" aria-hidden="true"></div></div><p class="analysis-time">${time?esc(time.label):''}${time?.note?'<span>'+esc(time.note)+'</span>':''}</p><div class="analysis-state" role="status" aria-live="polite"><span class="analysis-dots" aria-hidden="true"><i></i><i></i><i></i></span><p>전체 풀이를 정리하고 있어요</p></div>${progressMarkup('web','전체 풀이 작성')}<div class="analysis-error" hidden></div><button type="button" class="analysis-home">처음으로</button></main>`;
}
function ensure(){let view=document.getElementById('view-analysis');if(!view){view=document.createElement('div');view.id='view-analysis';view.className='view';document.getElementById('app')?.appendChild(view);}return view;}
function begin(root,report){
 if(current?.root===root)return current;
 const ticket={id:++sequence,root,identity:JSON.stringify({meta:_meta,lang:currentLanguage()})};current=ticket;
 const view=ensure();view.classList.remove('analysis-paused');view.innerHTML=markup(_saju,_meta,report?.label||AIReport.CAT[AIReport.category(root)]);
 startProgress(view,{key:'web-'+(report?.product||'saju')});
 view.querySelector('.analysis-home').onclick=()=>goHome();
 document.getElementById('revealLayer')?.remove();showView('analysis');const title=view.querySelector('h1');title.tabIndex=-1;title.focus({preventScroll:true});return ticket;
}
function valid(ticket){return current===ticket&&ticket.root.isConnected&&ticket.identity===JSON.stringify({meta:_meta,lang:currentLanguage()});}
function progress(ticket,percent,detail){if(valid(ticket))updateProgress(ensure(),percent,detail);}
function complete(ticket){if(!valid(ticket))return;progress(ticket,100,'전체 풀이가 완성됐어요');current=null;const view=document.getElementById('view-analysis');if(view)view.innerHTML='';showView('result');}
function fail(ticket,error,retry){
 if(!valid(ticket))return;
 const view=ensure(),state=view.querySelector('.analysis-state'),box=view.querySelector('.analysis-error');if(!box)return;
 stopProgress(view,'응답을 확인하고 있어요');state.hidden=true;view.classList.add('analysis-paused');box.hidden=false;
 const permanent=error?.permanent||['NEED_PAYMENT','PAID_LIMIT'].includes(error?.code),validation=/VALIDATION|INVALID_REPORT/.test(error?.code||'');
 const message=/^(WEB_|DEVICE_)/.test(error?.code||'')?error.message:error?.code==='NEED_PAYMENT'?'결제 정보를 확인하지 못했어요. 결제한 기기와 이용 기간을 확인해 주세요.':error?.code==='PAID_LIMIT'?'결제 내역과 함께 고객센터로 문의해 주세요.':validation?'계산 자료와 맞지 않는 부분을 확인해야 해요. 입력 정보는 그대로 유지돼요.':'응답을 받는 데 문제가 생겨 잠시 멈췄어요. 입력 정보는 그대로 유지돼요.';
 box.innerHTML='<p>'+message+'</p>';
 if(!permanent){const b=document.createElement('button');b.type='button';b.textContent='이어서 불러오기';b.onclick=()=>{if(!valid(ticket))return;current=null;retry();};box.appendChild(b);}
}
function cancel(){current=null;const view=document.getElementById('view-analysis');stopProgress(view);if(view){view.innerHTML='';view.classList.remove('on','analysis-paused');}}
function shouldStage(root){return !!root?.closest('#view-result')&&!!root.closest('.panel.on');}
g.ReadingStage={markup,chartHTML,begin,complete,progress,fail,cancel,shouldStage,get active(){return current;}};
})(globalThis);
