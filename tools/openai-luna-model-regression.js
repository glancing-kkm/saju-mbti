'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('worker/saju-chat-worker.js','utf8');let captured;
const ctx=vm.createContext({console,TextEncoder,TextDecoder,Request,Response,URL,FormData,Blob,atob,btoa,AbortSignal,fetch:async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');captured=JSON.parse(opts.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"ok":true}'}]}],usage:{input_tokens:10,output_tokens:5}}),{headers:{'Content-Type':'application/json'}});}});
vm.runInContext(src.replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
(async()=>{
 assert.equal(vm.runInContext('OPENAI_DEFAULT_MODEL',ctx),'gpt-5.6-luna');
 const s=vm.runInContext("chooseQnaModel('간단한 하루 조언을 주세요',{}, {})",ctx),p=vm.runInContext("chooseQnaModel('이직을 고민합니다',{}, {})",ctx);
 assert.equal(s.model,'gpt-5.6-luna');assert.equal(p.model,'gpt-5.6-luna');assert.equal(s.reasoningEffort,'low');assert.equal(p.reasoningEffort,'medium');assert(p.maxOutputTokens>s.maxOutputTokens,'question depth budgets retained');
 assert.equal(vm.runInContext("chooseQnaModel('이직',{}, {OPENAI_QNA_PREMIUM_MODEL:'explicit-override'}).model",ctx),'explicit-override');
 for(const name of ['OPENAI_MODEL','OPENAI_READING_CORE_MODEL','OPENAI_TAROT_MODEL','OPENAI_ASTROLOGY_MODEL','OPENAI_TRANSLATE_MODEL','OPENAI_QNA_MODEL','OPENAI_QNA_PREMIUM_MODEL'])assert(src.includes('env.'+name),name+' override preserved');
 assert(!/['"]gpt-5\.(?:4-mini|5)['"]/.test(src),'no old active defaults');assert(src.includes("env.ANTHROPIC_MODEL || ANTHROPIC_DEFAULT_MODEL"),'Claude fallback remains configurable');
 await vm.runInContext("callOpenAIResponses({apiKey:'synthetic-not-a-key',model:OPENAI_DEFAULT_MODEL,systemPrompt:'Synthetic test',userPrompt:'Return ok',maxOutputTokens:500,reasoningEffort:'low',format:{type:'json_schema',name:'test',strict:true,schema:{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false}}})",ctx);
 assert.equal(captured.model,'gpt-5.6-luna');assert.equal(captured.reasoning.effort,'low');assert.equal(captured.text.format.type,'json_schema');assert.equal(captured.max_output_tokens,500);
 console.log('OpenAI Luna routing passed: all GPT defaults, workload overrides, standard/premium depth budgets, Responses JSON contract, Claude fallback configurable. Network mocked. Separate remote account/model smoke test documented.');
})().catch(e=>{console.error(e);process.exitCode=1});
