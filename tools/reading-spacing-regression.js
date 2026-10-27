// Exercise DOM preservation and re-layout with deterministic range geometry.
// Real font appearance is checked separately in Chrome at mobile/desktop sizes.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<style>p{font-size:16px;text-align:justify}.reading-measure{text-align:left!important}</style><div id="app" class="lv4"><p id="body">본인의 <em>가장 큰 힘</em>은 책임감이에요. 중요한 일은 함께 나누세요.</p><p id="control">상담 안내 <button>질문하기</button></p></div>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
let width=140;const queue=[];
w.requestAnimationFrame=fn=>queue.push(fn);
Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return width;}});
const advance=c=>/[가-힣]/.test(c)?16:/\s/.test(c)?4:8;
w.Range.prototype.getBoundingClientRect=function(){
 const el=(this.startContainer.parentElement.closest('p'));
 const walker=d.createTreeWalker(el,w.NodeFilter.SHOW_TEXT);let n,offset=0,start=0,end=0;
 while((n=walker.nextNode())){if(n===this.startContainer)start=offset+this.startOffset;if(n===this.endContainer)end=offset+this.endOffset;offset+=n.length;}
 let x=0,y=0;const positions=[];
 for(const c of el.textContent){const a=advance(c);if(x+a>width){x=0;y+=24;}positions.push({x,y,a});x+=a;}
 const first=positions[start]||{x,y,a:0},last=positions[Math.max(start,end-1)]||first;
 return {top:first.y,left:first.x,width:last.x+last.a-first.x,height:24};
};
const flush=()=>{for(let n=0;queue.length&&n<10;n++)queue.shift()();};
(async()=>{
 const p=d.getElementById('body'),original=p.textContent,control=d.getElementById('control').innerHTML;
 w.eval(fs.readFileSync(path.join(__dirname,'../assets/reading-spacing.js'),'utf8'));flush();
 assert(p.querySelectorAll('.reading-line').length>1);assert.equal(p.textContent,original);assert.equal(p.querySelector('em').textContent,'가장 큰 힘');
 assert.equal(d.getElementById('control').innerHTML,control,'interactive content stays untouched');
 const count=p.children.length;width=240;w.dispatchEvent(new w.Event('resize'));flush();
 assert(p.children.length<count);assert.equal(p.textContent,original);assert(!p.querySelector('.reading-line .reading-line'),'resizing never nests line wrappers');
 p.textContent='새로 생성된 풀이도 본문 누락 없이 그대로 보여야 해요. 간격을 다시 계산해요.';
 const updated=p.textContent;await Promise.resolve();flush();assert.equal(p.textContent,updated);assert(p.querySelector('.reading-line'));
 width=0;w.dispatchEvent(new w.Event('resize'));flush();assert.equal(p.textContent,updated);
 width=140;w.dispatchEvent(new w.Event('resize'));flush();assert.equal(p.textContent,updated);assert(!p.querySelector('.reading-line .reading-line'));
 console.log('✓ 풀이 간격: 원문·강조 보존, 화면 크기 변경, 새 풀이 갱신, 숨김 복귀, 조작 버튼 보존');dom.window.close();
})().catch(e=>{dom.window.close();console.error(e);process.exitCode=1;});
