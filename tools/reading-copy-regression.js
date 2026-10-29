'use strict';
const assert=require('node:assert/strict');
const rt=require('./lib/reading-runtime')();
const old=/뒤흔|보이는군|진동을 하는군|각오하고|보통 사주는|풀어 볼까|들어 보겠소/;
const box=html=>{const b=rt.d.createElement('div');b.innerHTML=html;return b;};
try{
 let dohwa=0,other=0;const cues=new Set();
 for(let i=0;i<120;i++){
  rt.set(rt.fixture(26+i%50,i,['single','dating','married'][i%3],i%9===0));
  const names=rt.run('buildPersonaProfile(_saju).sins.map(s=>String(s.n||" ").split(" ")[0])');
  const actual=names.some(n=>/^도화(?:살)?$/.test(n)),cue=rt.run('lcChartCue(_saju)');
  assert.equal(cue.source==='sinsal:도화',actual);
  assert.equal(cue.html.includes('도화'),actual);
  assert(cue.html&&!old.test(cue.html));cues.add(cue.source);actual?dohwa++:other++;
  if(cue.source==='sinsal:문창귀인')assert(names.includes('문창귀인'));
  if(cue.source.startsWith('axis:'))assert.equal(cue.source,'axis:'+rt.run('buildPersonaProfile(_saju).axisSorted[0][0]'));
  const life=box(rt.run('buildLifeReadingV4(_saju,_meta)'));
  const strengths=[...life.querySelectorAll('[data-strength-order]')];
  const count=rt.run('buildLifeV2Model(_saju,_meta).strengths.strengths.length');
  assert.equal(strengths.length,Math.min(3,count));
  assert.deepEqual(strengths.map(e=>+e.dataset.strengthOrder),Array.from({length:strengths.length},(_,j)=>j+1));
  assert(strengths.every(e=>!e.closest('details,.lv4-why')));
  assert(strengths.every((e,j)=>e.textContent.startsWith(['첫째','둘째','셋째'][j])));
 }
 assert(dohwa>0&&other>0&&cues.size>=4);
 rt.set({...rt.fixture(40),sy:1987,sm:9,sd:21,hour:8,min:15});
 assert(!rt.run('lcChartCue(_saju).html').includes('도화'),'연애운 점수만 보고 원국에 없는 도화를 말하면 안 됨');
 const life=box(rt.run('buildLifeReadingV4(_saju,_meta)'));
 const talent=[...life.querySelectorAll('.lv4-sub')].find(e=>e.querySelector('h3')?.textContent==='가장 강한 재능');
 assert(talent.textContent.includes('둘째는 가까이 지낼수록 드러나는 깊이 파고드는 직관'));
 rt.w.copyRoot=life;rt.w.copyRewrite=rt.run("buildReadingNarrative(_saju,_meta,'career').paragraphs");
 assert.equal(rt.run("deepApply(window.copyRoot,{sections:[{id:'lv4-talent',paragraphs:window.copyRewrite}]})"),1);
 assert.deepEqual([...life.querySelectorAll('#lv4-talent [data-strength-order]')].map(e=>+e.dataset.strengthOrder),[1,2,3]);
 const routes={life:'buildLifeReadingV4(_saju,_meta)',newyear:'renderNewyearFortune(_saju,2027)',gunghap:'renderGunghapPaid(_saju,_meta.gnExtra)',name:'renderNamePaid(_saju,_meta.nmExtra)',ziwei:'renderZiweiPaid(_saju,_meta)',monthly:'renderMonthlyFortune(_saju,2027,1,2027,3,{})',daypick:'renderDaypickFortune(_saju,2027,3,15,{})'};
 for(const key of ['love','money','career','marriage','reunion','study','child','children','health'])routes['topic-'+key]=`renderTopicPaid('topic-${key}',_saju,_meta)`;
 let bubbles=0;
 for(const [cat,expr] of Object.entries(routes)){
  const html=rt.run(expr),full=box(html),preview=box(rt.run(`previewLockHTML('${cat}',${JSON.stringify(html)})`));
  for(const b of [full,preview]){
   const captions=[...b.querySelectorAll('.lc-bubble,.lc-scroll-title,.lc-chapter h2')];
   assert(captions.length,cat+'의 안내 문구 누락');
   assert(captions.every(e=>!old.test(e.textContent)),cat+'에 기존 멘트가 남음');bubbles+=captions.length;
  }
 }
 console.log(`✓ 안내 멘트: ${Object.keys(routes).length}개 카테고리 전체/미리보기, ${bubbles}개 말풍선·제목 확인`);
 console.log(`✓ 원국별 멘트: 120개 명식 중 도화 ${dohwa}개·비도화 ${other}개, 실제 근거 ${cues.size}종 확인`);
 console.log('✓ 강점 목록: 첫째·둘째·셋째 연속 표시, 둘째만 근거 상자로 이동하는 오류 재현·수정');
}finally{rt.close();}
