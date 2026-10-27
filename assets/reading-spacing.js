/* Bound justification to small adjustments. CSS alone cannot cap the extra
   space a browser adds to a short Korean line. Keep the original markup so
   font loading, resizing and newly generated readings can be laid out again. */
(()=>{
  'use strict';
  const selector='.lv4 p,.lv4-list li>span,.lv4-md-list li>span,.nb-body,.abody,.daily-cat-body,.reading-brief,.chat-msg-body,.ai-reading-body p,.ai-reading-section p,.tarot-markdown p,.astro-markdown p,.tarot-reading-flow p';
  const saved=new WeakMap();
  let queued=false,force=false;
  const observer=new MutationObserver(()=>schedule());
  function schedule(refresh=false){
    force=force||refresh;
    if(queued)return;
    queued=true;
    requestAnimationFrame(layout);
  }
  function layout(){
    queued=false;
    observer.disconnect();
    document.querySelectorAll(selector).forEach(el=>{
      // Leave controls, diagrams and containers of other blocks intact.
      if(el.querySelector('p,div,ul,ol,table,button,input,textarea,select,svg,img,br,.lk-block')||el.closest('[contenteditable="true"]'))return;
      const width=el.clientWidth,style=getComputedStyle(el);
      if(width<100||style.textAlign!=='justify'||el.textContent.trim().length<12)return;
      let old=saved.get(el);
      const intact=old&&old.text===el.textContent&&Array.from(el.childNodes).every(n=>n.nodeType===1&&n.classList.contains('reading-line'));
      if(intact&&old.width===width&&!force)return;
      if(intact)el.replaceChildren(old.source.cloneNode(true));
      else if(old)Array.from(el.children).filter(n=>n.classList.contains('reading-line')).forEach(n=>n.replaceWith(...n.childNodes));
      const source=document.createDocumentFragment();
      Array.from(el.childNodes).forEach(n=>source.append(n.cloneNode(true)));
      el.classList.add('reading-measure');
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      const nodes=[];let size=0,node;
      while((node=walker.nextNode())){nodes.push({node,start:size,end:size+node.length});size+=node.length;}
      const text=el.textContent;
      const point=(index)=>{
        const n=nodes.find(n=>index<n.end)||nodes[nodes.length-1];
        return [n.node,Math.min(n.node.length,index-n.start)];
      };
      const range=(start,end)=>{
        const r=document.createRange(),a=point(start),b=point(end);
        r.setStart(a[0],a[1]);r.setEnd(b[0],b[1]);return r;
      };
      const top=index=>range(index,index+1).getBoundingClientRect().top;
      const lines=[];let start=0;
      while(start<size){
        const y=top(start);let low=start+1,high=size;
        // Single-character ranges avoid counting an inline ancestor's full box.
        while(low<high){const mid=Math.floor((low+high)/2);if(Math.abs(top(mid)-y)<1)low=mid+1;else high=mid;}
        const end=low,r=range(start,end),value=text.slice(start,end).trimEnd();
        const trimmed=range(start,start+value.length);
        const slack=Math.max(0,width-trimmed.getBoundingClientRect().width);
        const count=Array.from(value).length;
        const span=document.createElement('span');span.className='reading-line';
        // At most 0.055em per character (under 0.9px at 16px).
        // Short lines retain natural spacing instead of stretching to the edge.
        if(end===size||slack>parseFloat(style.fontSize)*0.055*Math.max(1,count-1))span.classList.add('reading-line-natural');
        span.append(r.cloneContents());lines.push(span);start=end;
      }
      el.classList.remove('reading-measure');
      if(lines.length){el.replaceChildren(...lines);saved.set(el,{width,source,text});}
    });
    force=false;
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true,characterData:true});
  }
  window.addEventListener('resize',()=>schedule());
  document.fonts?.ready.then(()=>schedule(true));
  document.fonts?.addEventListener('loadingdone',()=>schedule(true));
  schedule();
})();
