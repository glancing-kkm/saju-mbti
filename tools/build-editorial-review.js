'use strict';
// Build a local review artifact from the real renderer. No AI/payment/network calls.
const fs=require('node:fs'),path=require('node:path');
const rt=require('./lib/reading-runtime')(),{run,fixture,set}=rt;
const dest=process.argv[2]||'/tmp/saju-editorial-review';fs.mkdirSync(dest,{recursive:true});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 const chosen=[],seen=new Set();
 const add=(m,label)=>{
  set(m);const plans=['core','career','money'].map(domain=>run(`lifeEditorialPlan(_saju,_meta,'${domain}')`));
  if(plans.some(p=>!p))return false;const signature=plans.map(p=>p.title).join('|');if(seen.has(signature))return false;
  const pillars=run("[['연주',_saju.yp],['월주',_saju.mp],['일주',_saju.dp],['시주',_saju.hp]].filter(x=>x[1]).map(([l,p])=>l+' '+STEMKO[p.stem]+BRCHKO[p.branch]).join(' · ')");
  const html=['core','career','money'].map(domain=>{
   const before=run(`lv4StoryLines(_saju,_meta,'${domain}')`),after=run(`lifeEditorialHTML(_saju,_meta,'${domain}')`);
   return `<section class="lc-card">${after}<details class="before"><summary>기존 공통 서술과 비교</summary>${before.map(t=>'<p>'+esc(t)+'</p>').join('')}</details></section>`;
  }).join('');
  chosen.push({label,pillars,plans,html});seen.add(signature);return true;
 };
 add({...fixture(40),sy:1987,sm:9,sd:21,hour:8,min:15,userName:'예시 A'},'예시 A · 제공하신 명식');
 for(let i=0;chosen.length<3&&i<120;i++)add({...fixture(30+i%25,i),userName:'비교 예시'},'비교 예시 '+chosen.length);
 const styles=[...rt.d.querySelectorAll('style')].map(e=>e.textContent).join('\n');
 const header=`<header class="review-head"><p>인생총운 · 세 장 검토본</p><h1>무엇이 이 사람의 선택을 어렵게 할까?</h1><p>성향·직업·재물의 서로 다른 장면을 비교해 보세요. 근거는 각 장에서 펼칠 수 있어요.</p><label for="reviewCase">비교할 명식</label><select id="reviewCase">${chosen.map((c,i)=>`<option value="${i}">${esc(c.label)}</option>`).join('')}</select></header>`;
 const body=chosen.map((c,i)=>`<section class="review-case" data-case="${i}" ${i?'hidden':''}><p class="review-pillars">${esc(c.pillars)}</p><div class="lv4">${c.html}</div></section>`).join('');
 fs.writeFileSync(path.join(dest,'index.html'),`<!doctype html><html lang="ko" data-flow-theme="life" style="--flow-bg:#06251e;--flow-depth:#155243;--flow-accent:#7fe0c4"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>인생총운 세 장 검토본</title><style>${styles}</style>${['design-system','journey','night','reading-flow'].map(n=>`<link rel="stylesheet" href="/assets/${n}.css">`).join('')}<style>.review-head{padding:28px 20px}.review-head h1{font-size:1.4rem;margin:12px 0}.review-head p,.review-pillars{font-size:.9rem;line-height:1.8}.review-head select{margin-top:8px;width:100%;padding:12px;background:#123b30;color:#fff;border:1px solid #6ca78f;border-radius:8px}.review-case{padding:0 16px 40px}.review-case[hidden]{display:none}.review-pillars{color:#d5e8df;margin:0 0 18px}.review-case .lc-card{padding:22px 18px;margin-bottom:24px}.life-editorial>h3{font-size:1.18rem;line-height:1.6;margin-bottom:18px}.life-editorial>p,.before p{text-align:left;line-height:1.95;font-size:1rem}.before{margin-top:22px;padding-top:18px;border-top:1px solid #41685c}.before summary{cursor:pointer;color:#d5e8df}.before p{color:#d5e8df}</style></head><body><div id="app">${header}${body}</div><script>document.getElementById('reviewCase').addEventListener('change',e=>{document.querySelectorAll('.review-case').forEach(s=>s.hidden=s.dataset.case!==e.target.value);});</script></body></html>`);
 try{fs.symlinkSync(path.join(rt.root,'assets'),path.join(dest,'assets'),'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
 let md='# 인생총운 성향·직업·재물 검토본\n\n세 장을 먼저 비교하기 위한 작성 시안입니다. 개인 사건을 정답으로 사용하지 않았습니다. 현재 문체 시안과 계산 참조를 검증했으며, 실제 AI 응답의 편집 검토나 예측 정확도를 검증한 자료는 아닙니다.\n\n';
 chosen.forEach(c=>{md+='## '+c.label+'\n\n'+c.pillars+'\n\n';c.plans.forEach(p=>{md+='### '+({core:'성향',career:'직업',money:'재물'}[p.domain])+' — '+p.title+'\n\n'+p.paragraphs.join('\n\n')+'\n\n근거: '+p.why+'\n\n';});});
 fs.writeFileSync(path.join(rt.root,'docs/reading-quality/editorial-samples.md'),md);
 console.log(`Review: ${dest}/index.html (${chosen.length} charts × 3 chapters)`);
}finally{rt.close();}
