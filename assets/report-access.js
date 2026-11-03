/* PDF access inherits the web reading's deadline and this browser's non-exportable key. */
(function(g){'use strict';
const endpoint=()=>g.ReportAccessConfig?.endpoint||WORKER_URL;
const DB='saju-report-device-v1',STORE='keys',PREFIX='saju-web-access-v1:',sessions=new Map();let keyTask;
const fail=(code,message)=>Object.assign(new Error(message),{code,permanent:true});
const expired=()=>fail('WEB_READING_EXPIRED','웹 풀이의 24시간 열람 기간이 끝나 PDF를 만들 수 없어요.');
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function hash(s){return b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function device(){
 if(!keyTask)keyTask=(async()=>{
  if(!g.indexedDB||!crypto.subtle)throw fail('DEVICE_STORAGE_UNAVAILABLE','이 브라우저에서 기기 확인 정보를 저장할 수 없어요. 일반 브라우저 창에서 다시 열어 주세요.');
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const get=()=>new Promise((resolve,reject)=>{const tx=db.transaction(STORE),r=tx.objectStore(STORE).get('device');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  let pair=await get();if(!pair){pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');const objectStore=tx.objectStore(STORE),r=objectStore.get('device');r.onsuccess=()=>{if(r.result)pair=r.result;else objectStore.put(pair,'device');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);db.close();return {pair,publicKey};
 })().catch(e=>{keyTask=null;throw e;});return keyTask;
}
async function scope(cat){return hash(unlockScopeOf(cat));}
async function proof(purpose,cat,s,token){const d=await device(),at=Date.now(),nonce=crypto.randomUUID(),tokenHash=await hash(token||'');const message=JSON.stringify({purpose,product:cat,scope:s,at,nonce,tokenHash});return {publicKey:d.publicKey,at,nonce,signature:b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},d.pair.privateKey,new TextEncoder().encode(message)))};}
function read(cat,s){try{return JSON.parse(localStorage.getItem(PREFIX+cat+':'+s)||'null');}catch(e){return null;}}
function save(cat,s,r){localStorage.setItem(PREFIX+cat+':'+s,JSON.stringify(r));}
function webToken(cat){return loadPaidTokens().find(t=>chatOrderClaims(t)?.c===cat)||'';}
async function register(cat,operation,session){
 const s=await scope(cat),token=webToken(cat);if(!token)throw fail('WEB_READING_REQUIRED','먼저 이 기기에서 결제한 웹 풀이를 확인해 주세요.');
 const localGrant=typeof _loadValidPaidTokens==='function'?_loadValidPaidTokens().find(x=>x.cat===cat&&x.sajuId===unlockScopeOf(cat)):null;
 const payload={product:cat,scope:s,paidToken:token,previousAccessToken:session?.token||read(cat,s)?.token,operation,webExpiresAt:localGrant?.exp,deviceProof:await proof('web-access:'+operation,cat,s,token)};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let resp,data;
 try{resp=await fetch(endpoint().replace(/\/$/,'')+'/reading-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});data=await resp.json();}catch(e){const error=fail('WEB_ACCESS_UNAVAILABLE','열람 권한을 확인하는 연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요.');error.permanent=false;throw error;}finally{clearTimeout(timer);}
 if(!resp.ok){const error=fail(data.code||'WEB_ACCESS_UNAVAILABLE',data.error||'웹 풀이 열람 권한을 확인하지 못했어요.');error.permanent=resp.status>=400&&resp.status<500;throw error;}
 const next={product:cat,scope:s,token:data.accessToken,expiresAt:data.expiresAt,complete:data.complete===true};save(cat,s,next);if(session)Object.assign(session,next);return next;
}
async function startWeb(report){const session=await register(report.product,'start');sessions.set(report.product,session);return session;}
async function finishWeb(session){if(!session)return;return register(session.product,'complete',session);}
async function requirePdf(cat,{check=true}={}){
 const s=await scope(cat);let r=read(cat,s);
 if(r&&chatOrderClaims(r.token)?.o!==chatOrderClaims(webToken(cat))?.o)r=null;
 if(!r?.complete){
  const report=typeof AIReport==='object'&&AIReport.preparePdf(AIReport.sources(cat,_saju,{..._meta,gender:_meta.gender||gender}));
  if(!report?.webBasis)throw fail('WEB_READING_REQUIRED','먼저 이 기기에서 전체 웹 풀이를 확인한 뒤 PDF를 만들어 주세요.');
  r=await finishWeb(await startWeb({product:cat}));
 }
 if(r.expiresAt<=Date.now())throw expired();
 if(check)r=await register(cat,'check',r);
 return r;
}
async function pdfMeta(cat){const r=await requirePdf(cat,{check:false});return {webAccess:{token:r.token,product:cat,scope:r.scope,deviceProof:await proof('pdf',cat,r.scope,r.token)}};}
function assertActive(r){if(!r||r.expiresAt<=Date.now())throw expired();}
async function deviceId(){const d=await device();return hash(d.publicKey.x+'.'+d.publicKey.y);}
async function paymentBinding(cat){const reportDevice=await deviceId();if(!String(cat).startsWith('pdf-'))return {reportDevice};const r=await requirePdf(cat.slice(4));return {reportDevice,webAccessToken:r.token};}
function order(cat){return chatOrderClaims(webToken(cat))?.o||'';}
g.ReportAccess={paymentBinding,order,deviceId,startWeb,finishWeb,requirePdf,pdfMeta,assertActive};
})(globalThis);
