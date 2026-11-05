'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('worker/saju-chat-worker.js','utf8');let captured;
const ctx=vm.createContext({console,Response,AbortSignal,fetch:async(url,options)=>{
 assert.equal(url,'https://api.anthropic.com/v1/messages');captured=JSON.parse(options.body);
 assert.equal(options.headers['anthropic-version'],'2023-06-01');
 return Response.json({model:captured.model,stop_reason:'end_turn',content:[{type:'thinking',thinking:'synthetic'},{type:'text',text:'연결 확인'}]});
}});
vm.runInContext(src.replace(/^import .*;\s*$/gm,'').replace('export default {','const worker={'),ctx);
(async()=>{
 assert.equal(vm.runInContext('ANTHROPIC_DEFAULT_MODEL',ctx),'claude-sonnet-5-5');
 assert.equal((src.match(/model: env\.ANTHROPIC_MODEL \|\| ANTHROPIC_DEFAULT_MODEL/g)||[]).length,5,'Q&A, report/PDF, tarot, astrology, translation all honor override');
 assert(!src.includes('claude-sonnet-4-6'),'no hardcoded old fallback');
 for(const override of [undefined,'explicit-override']){
 ctx.env={ANTHROPIC_MODEL:override};
 const r=await vm.runInContext("callAnthropicWithRetry({apiKey:'synthetic',body:{model:env.ANTHROPIC_MODEL||ANTHROPIC_DEFAULT_MODEL,max_tokens:1000,system:[{type:'text',text:'Synthetic',cache_control:{type:'ephemeral'}}],messages:[{role:'user',content:'Test'}]}})",ctx);
 assert.equal(captured.model,override||'claude-sonnet-5-5');assert(r.ok);
 const d=await r.json();assert.equal(d.content.filter(x=>x.type==='text').map(x=>x.text).join(''),'연결 확인');
 }
 assert.equal(vm.runInContext('OPENAI_DEFAULT_MODEL',ctx),'gpt-5.6-luna');
 console.log('Sonnet routing passed: 5 routes, default/override, Messages payload and text blocks, GPT preserved. Network mocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
