/* Shared Korean copy editor. Language only: no fortune calculations, random draws or network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReadingVoice=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='consultation-v2';
// Edit known editorial phrases, never strip conditional endings or turn an unknown event into a fact.
const edits=[
 ['선택지별로 얻는 것과 잃는 것','선택하기 전에 따져 볼 점'],
 ['지금의 운을 돈의 문제로 옮기면 기준이 하나 더 생겨요.','지금은 버는 금액과 실제 남는 돈을 따로 보세요.'],
 ['독립적으로 정할 일과 함께 합의할 일이 더 선명해질 수 있어요.','혼자 정해도 되는 일과 함께 정해야 할 일을 나누세요.'],
 ['지금은 좋은 뜻보다 실제 시간과 보상이 맞는지가 더 중요해지는 쪽이에요.','지금은 좋은 뜻만큼 들이는 시간과 받는 보상도 중요해요.'],
 ['맡을 수 있는 일과 오래 이어갈 활동의 범위를 구분해 볼 때예요.','잘할 수 있는 일이라도 오래 이어갈 수 있는지 따져 보세요.'],
 ['현재의 조건과 선택의 기준을 함께 살펴보세요.','지금 감당할 시간과 비용부터 확인하세요.'],
 ['개인화된 해석','본인에게 맞춘 풀이'],['종합적으로 해석하면','함께 놓고 보면'],
 ['구조로 해석돼요','모습으로 읽혀요'],['성향이 강조됩니다','성향이 두드러져요'],
 ['현실적인 의미로 옮기면','생활에서는'],['생활 장면으로 옮기면','생활에서는'],
 ['삶의 영역에서','생활에서'],['해당 영역에서','이 부분에서'],
 ['확인할 필요가 있어요','확인하세요'],['구분할 필요가 있어요','나눠 보세요'],
 ['고려할 필요가 있어요','함께 따져 보세요'],['점검할 필요가 있어요','점검하세요'],
 ['구조를 보여 줘요','특징을 보여 줘요'],['마음에 무게가 실리는 쪽이에요','마음이 더 커져요'],
 ['쪽에 무게가 실려요','쪽이 더 중요해져요'],['할 때로 읽어요','챙길 때예요'],
 ['기준이 하나 더 생겨요','따져 볼 점이 하나 더 있어요'],
 ['그다음으로','그다음에는'],['인 복','인복'],['현실 감 각','현실 감각']
];
// Presentation edits only: preserve calculations, uncertainty, quoted user facts and advice.
function cleanText(value){if(typeof value!=='string')return value;return value
 .replace(/अस्पष्ट/g,'불분명')
 .replace(/복잡한\s*용어를\s*현실적인\s*언어로\s*바꿔\s*보겠습니다[.!。]?\s*/g,'')
 .replace(/하지만\s*이\s*장점에는\s*반대쪽\s*모습도\s*있습니다[.!。]?\s*/g,'하지만 ')
 .replace(/(^|[.!?]\s+)((?:하지만|다만|반면)\s+)?(?:현재\s+)?[^.!?\n,]{1,35}?(?:이라는|라는)\s*(?:현재\s*)?정보를\s*(?:토대로|바탕으로)\s*(?:연결해\s*보면|살펴보면|보면|생각해\s*보면)[,，]?\s*/g,'$1$2');}
function foreignScript(value){const t=String(value||'');return /[가-힣]/.test(t)&&/[\u0400-\u052f\u0590-\u08ff\u0900-\u0dff\u0e00-\u0eff]/.test(t);}
function headingHTML(value){
 const text=String(value??'');let at=-1,inTag=false;
 for(let i=0;i<text.length;i++){if(text[i]==='<')inTag=true;else if(text[i]==='>')inTag=false;else if(!inTag&&/[ \t]/.test(text[i]))at=i;}
 if(at<0)return text;
 const before=text.slice(0,at).replace(/<[^>]*>/g,''),tail=text.slice(at+1).replace(/<[^>]*>/g,'').replace(/&[a-z0-9#]+;/gi,'x');
 return before.trim()&&!/\s$/.test(before)&&Array.from(tail).length>0&&Array.from(tail).length<=3?text.slice(0,at)+'\u00a0'+text.slice(at+1):text;
}
const appendixTitle=t=>/^(?:해석 근거와 한계|명리학적 해석 근거)$/.test(String(t).replace(/^\d+[.)]\s*/,'').trim());
function markdown(value){
 if(typeof value!=='string')return value;
 let skip=0;return value.split(/\r?\n/).filter(line=>{const h=line.match(/^(#{1,6})\s+(.+)$/);if(h){if(skip&&h[1].length<=skip)skip=0;if(!skip&&appendixTitle(h[2].replace(/\*\*/g,'')))skip=h[1].length;}return !skip;}).map(cleanText).join('\n');
}
// Check provided periods only; a table or heading without explanatory prose is insufficient.
function periodIssues(value,periods,unit){
 const lines=String(value||'').split(/\r?\n/),heads=lines.map((text,i)=>({text:text.trim(),i})).filter(x=>/^#{1,6}\s+/.test(x.text)),issues=[];let previous=-1;
 for(const period of [...new Set(periods)]){
  const re=new RegExp('^#{1,6}\\s+'+(unit==='월'?'(?:\\d{4}년\\s+)?':'')+period+unit+'(?:운)?(?:\\s|[·:：—–-]|$)'),matches=heads.filter(h=>re.test(h.text));
  if(matches.length!==1){issues.push('missing_'+period+unit);continue;}
  const at=matches[0].i,end=heads.find(h=>h.i>at)?.i??lines.length;
  if(lines.slice(at+1,end).join('').replace(/\s/g,'').length<35)issues.push('unexplained_'+period+unit);
  if(at<=previous)issues.push('period_order');previous=at;
 }
 return issues;
}
function headingsHTML(value){return String(value).replace(/(<(?:script|style|code|pre|textarea)\b[^>]*>[\s\S]*?<\/(?:script|style|code|pre|textarea)>|(<h[1-6]\b[^>]*>)([\s\S]*?)(<\/h[1-6]>))/gi,(match,protectedOrHeading,open,body,close)=>open?open+headingHTML(body)+close:match);}
function blocksHTML(value){return String(value).replace(/(<(?:script|style|code|pre|textarea)\b[^>]*>[\s\S]*?<\/(?:script|style|code|pre|textarea)>|(<(?:p|li|blockquote)\b[^>]*>)([\s\S]*?)(<\/(?:p|li|blockquote)>))/gi,(match,protectedOrBlock,open,body,close)=>open?open+headingHTML(body)+close:match);}
function text(value){if(typeof value!=='string')return value;let out=cleanText(value);for(const [from,to]of edits)out=out.split(from).join(to);return out;}
function html(value){
 if(typeof value!=='string')return value;
 let skip=0;const edited=value.split(/(<!--[\s\S]*?-->|<[^>]*>)/g).map(part=>{
  if(part.startsWith('<')){if(/^<\/(?:script|style|code|pre|textarea)\b/i.test(part))skip=Math.max(0,skip-1);else if(/^<(?:script|style|code|pre|textarea)\b/i.test(part))skip++;return part;}
  return skip?part:text(part);
 }).join('');return headingsHTML(blocksHTML(edited));
}
function apply(root){
 if(!root?.ownerDocument)return;
 const walker=root.ownerDocument.createTreeWalker(root,4),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const n of nodes){if(n.parentElement?.closest('script,style,code,pre,textarea,input,[contenteditable="true"],.lk,.lk-m,.term'))continue;const next=text(n.nodeValue);if(next!==n.nodeValue)n.nodeValue=next;}
 for(const h of root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote')){if(/^H[1-6]$/.test(h.tagName)&&appendixTitle(h.textContent)){const section=h.closest('section');if(section&&section!==root)section.remove();else h.remove();continue;}const next=headingHTML(h.innerHTML);if(next!==h.innerHTML)h.innerHTML=next;}
}
function install(scope,names){for(const name of names){const fn=scope[name];if(typeof fn!=='function'||fn.readingVoiceVersion)continue;const wrapped=function(...args){const result=fn.apply(this,args);if(typeof result==='string')return scope.ReadingVoice.html(result);if(args[0]?.nodeType===1)scope.ReadingVoice.apply(args[0]);return result;};wrapped.readingVoiceVersion=VERSION;scope[name]=wrapped;}}
return {VERSION,text,cleanText,markdown,foreignScript,headingHTML,periodIssues,headingsHTML,html,apply,install};
});
