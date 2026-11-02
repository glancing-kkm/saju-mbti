/* A real completion gate: calculated birth chart stays visible until every chapter validates. */
(function(g){'use strict';
let current=null,sequence=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function chartHTML(chart,meta){
 const columns=[['시주','hp'],['일주','dp'],['월주','mp'],['연주','yp']];
 const cell=(p,type)=>{const n=type==='stem'?p.stem:p.branch,oh=type==='stem'?SOH[n]:BOH[n];return `<span class="analysis-glyph analysis-oh-${oh}"><b>${esc(type==='stem'?LC_STEM_HAN[n]:LC_BR_HAN[n])}</b><small>${esc(type==='stem'?STEMKO[n]:BRCHKO[n])} · ${esc(OHNAME[oh])}</small></span>`;};
 return `<div class="analysis-chart" aria-label="입력한 출생정보로 계산한 사주 원국">${columns.map(([title,key])=>`<div class="analysis-pillar${key==='dp'?' analysis-self':''}"><h3>${title}</h3>${chart?.[key]?cell(chart[key],'stem')+cell(chart[key],'branch'):'<span class="analysis-unknown">시간<br>미상</span>'}</div>`).join('')}</div>`;
}
function markup(chart,meta,label){
 const name=meta?.userName?esc(meta.userName)+'님의 ':'';
 const time=typeof birthTimeReference==='function'?birthTimeReference(meta):null;
 return `<main class="reading-analysis" aria-labelledby="analysisTitle"><div class="analysis-halo" aria-hidden="true"></div><div class="analysis-orbit" aria-hidden="true"><i></i><i></i><i></i></div><p class="analysis-kicker">${esc(label||'사주 풀이')}</p><h1 id="analysisTitle">${name}사주를<br>풀고 있어요</h1><p class="analysis-intro">타고난 기운과 시간의 흐름을 함께 살펴보고 있어요.</p><div class="analysis-board">${chartHTML(chart,meta)}<div class="analysis-scan" aria-hidden="true"></div></div><p class="analysis-time">${time?esc(time.label):''}${time?.note?'<span>'+esc(time.note)+'</span>':''}</p><div class="analysis-state" role="status" aria-live="polite"><span class="analysis-dots" aria-hidden="true"><i></i><i></i><i></i></span><p>전체 풀이를 정리하고 있어요</p></div><div class="analysis-error" hidden></div><button type="button" class="analysis-home">처음으로</button></main>`;
}
function ensure(){let view=document.getElementById('view-analysis');if(!view){view=document.createElement('div');view.id='view-analysis';view.className='view';document.getElementById('app')?.appendChild(view);}return view;}
function begin(root,report){
 if(current?.root===root)return current;
 const ticket={id:++sequence,root,identity:JSON.stringify({meta:_meta,lang:currentLanguage()})};current=ticket;
 const view=ensure();view.classList.remove('analysis-paused');view.innerHTML=markup(_saju,_meta,report?.label||AIReport.CAT[AIReport.category(root)]);
 view.querySelector('.analysis-home').onclick=()=>goHome();
 document.getElementById('revealLayer')?.remove();showView('analysis');const title=view.querySelector('h1');title.tabIndex=-1;title.focus({preventScroll:true});return ticket;
}
function valid(ticket){return current===ticket&&ticket.root.isConnected&&ticket.identity===JSON.stringify({meta:_meta,lang:currentLanguage()});}
function complete(ticket){if(!valid(ticket))return;current=null;const view=document.getElementById('view-analysis');if(view)view.innerHTML='';showView('result');}
function fail(ticket,error,retry){
 if(!valid(ticket))return;
 const view=ensure(),state=view.querySelector('.analysis-state'),box=view.querySelector('.analysis-error');if(!box)return;
 state.hidden=true;view.classList.add('analysis-paused');box.hidden=false;
 const permanent=error?.permanent||['NEED_PAYMENT','PAID_LIMIT'].includes(error?.code),validation=/VALIDATION|INVALID_REPORT/.test(error?.code||'');
 const message=error?.code==='NEED_PAYMENT'?'결제 정보를 확인하지 못했어요. 결제한 기기와 이용 기간을 확인해 주세요.':error?.code==='PAID_LIMIT'?'결제 내역과 함께 고객센터로 문의해 주세요.':validation?'계산 자료와 맞지 않는 부분을 확인해야 해요. 입력 정보는 그대로 유지돼요.':'응답을 받는 데 문제가 생겨 잠시 멈췄어요. 입력 정보는 그대로 유지돼요.';
 box.innerHTML='<p>'+message+'</p>';
 if(!permanent){const b=document.createElement('button');b.type='button';b.textContent='이어서 불러오기';b.onclick=()=>{if(!valid(ticket))return;current=null;retry();};box.appendChild(b);}
}
function cancel(){current=null;const view=document.getElementById('view-analysis');if(view){view.innerHTML='';view.classList.remove('on','analysis-paused');}}
function shouldStage(root){return !!root?.closest('#view-result')&&!!root.closest('.panel.on');}
g.ReadingStage={markup,chartHTML,begin,complete,fail,cancel,shouldStage,get active(){return current;}};
})(globalThis);
