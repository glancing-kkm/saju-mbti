/* Shared Korean copy editor. Language only: no fortune calculations, random draws or network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReadingVoice=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='consultation-v1';
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
function text(value){if(typeof value!=='string')return value;let out=value;for(const [from,to]of edits)out=out.split(from).join(to);return out;}
function html(value){
 if(typeof value!=='string')return value;
 let skip=0;return value.split(/(<!--[\s\S]*?-->|<[^>]*>)/g).map(part=>{
  if(part.startsWith('<')){if(/^<\/(?:script|style|code|pre|textarea)\b/i.test(part))skip=Math.max(0,skip-1);else if(/^<(?:script|style|code|pre|textarea)\b/i.test(part))skip++;return part;}
  return skip?part:text(part);
 }).join('');
}
function apply(root){
 if(!root?.ownerDocument)return;
 const walker=root.ownerDocument.createTreeWalker(root,4),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const n of nodes){if(n.parentElement?.closest('script,style,code,pre,textarea,input,[contenteditable="true"],.lk,.lk-m,.term'))continue;const next=text(n.nodeValue);if(next!==n.nodeValue)n.nodeValue=next;}
}
function install(scope,names){for(const name of names){const fn=scope[name];if(typeof fn!=='function'||fn.readingVoiceVersion)continue;const wrapped=function(...args){const result=fn.apply(this,args);if(typeof result==='string')return scope.ReadingVoice.html(result);if(args[0]?.nodeType===1)scope.ReadingVoice.apply(args[0]);return result;};wrapped.readingVoiceVersion=VERSION;scope[name]=wrapped;}}
return {VERSION,text,html,apply,install};
});
