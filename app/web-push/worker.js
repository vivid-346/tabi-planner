import {scheduleRequest,runScheduled,authorizedDevice} from './scheduler.js';
import {TEST_HTML,TEST_SW,TEST_MANIFEST} from './test-assets.js';
// 予定通知には時刻・種類・購読先だけを保存する。
const ORIGIN = 'https://vivid-346.github.io';
const recentTests = new Map();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const utf = text => new TextEncoder().encode(text);
const un64 = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
const join = (...arrays) => { const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let at=0;for(const a of arrays){out.set(a,at);at+=a.length}return out; };
async function hkdf(ikm,salt,info,length){const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));}
async function encryptedTest(sub,message={title:'旅のノート',body:'テスト通知が届きました。',tag:'tabinote-test'}){
  // RFC 8291 / RFC 8188: 受信端末だけが読めるaes128gcmの1レコード。
  const ua=un64(sub.keys.p256dh),auth=un64(sub.keys.auth);
  if(ua.length!==65||ua[0]!==4||auth.length!==16)throw Error('invalid_keys');
  const user=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const pub=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:user},pair.privateKey,256));
  const ikm=await hkdf(shared,auth,join(utf('WebPush: info\0'),ua,pub),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(ikm,salt,utf('Content-Encoding: aes128gcm\0'),16);
  const nonce=await hkdf(ikm,salt,utf('Content-Encoding: nonce\0'),12);
  const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const text=JSON.stringify(message);
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,join(utf(text),new Uint8Array([2]))));
  const size=new Uint8Array(4);new DataView(size.buffer).setUint32(0,4096);
  return join(salt,size,new Uint8Array([pub.length]),pub,ciphertext);
}
export function validSubscription(sub){try{const e=new URL(sub.endpoint),h=e.hostname;return e.protocol==='https:'&&!e.username&&!e.password&&!e.port&&(h==='web.push.apple.com'||h.endsWith('.push.apple.com')||h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com')&&typeof sub.keys?.p256dh==='string'&&typeof sub.keys?.auth==='string'&&un64(sub.keys.p256dh).length===65&&un64(sub.keys.auth).length===16}catch(_){return false}}
export async function sendPush(sub,message,env){
 const endpoint=new URL(sub.endpoint);
 const key=await crypto.subtle.importKey('jwk',JSON.parse(env.VAPID_PRIVATE_JWK),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const unsigned=b64(utf(JSON.stringify({typ:'JWT',alg:'ES256'})))+'.'+b64(utf(JSON.stringify({aud:endpoint.origin,exp:Math.floor(Date.now()/1000)+300,sub:ORIGIN})));
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,utf(unsigned));
 const body=await encryptedTest(sub,message);
 return fetch(endpoint.href,{method:'POST',redirect:'manual',body:body.buffer,headers:{Authorization:`vapid t=${unsigned}.${b64(sig)}, k=${env.VAPID_PUBLIC_KEY}`,TTL:'300',Urgency:'high','Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream'}});
}
export default {
  async scheduled(event,env,ctx){ctx.waitUntil(runScheduled(env,sendPush));},
  async fetch(request, env) {
    const headers = {'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, Authorization', 'Cache-Control':'no-store', 'Content-Type':'application/json'};
    const reply = (value, status = 200) => new Response(JSON.stringify(value), {status, headers});
    const ownOrigin=new URL(request.url).origin,requestOrigin=request.headers.get('Origin');
    if(requestOrigin===ownOrigin)headers['Access-Control-Allow-Origin']=ownOrigin;
    const path = new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/')return new Response(TEST_HTML,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
    if(request.method==='GET'&&path==='/sw.js')return new Response(TEST_SW,{headers:{'Content-Type':'application/javascript;charset=utf-8','Cache-Control':'no-cache'}});
    if(request.method==='GET'&&path==='/manifest.webmanifest')return new Response(TEST_MANIFEST,{headers:{'Content-Type':'application/manifest+json'}});
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
    if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return reply({error:'not_configured'},503);
    if (path === '/config' && request.method === 'GET') return reply({publicKey:env.VAPID_PUBLIC_KEY, mode:env.NOTIFY_DB?'scheduled':'test-only'});
    if(['/schedule','/stop'].includes(path)&&request.method==='POST'){
      if(requestOrigin!==ORIGIN&&requestOrigin!==ownOrigin)return reply({error:'origin'},403);
      try{const response=await scheduleRequest(request,env,validSubscription);return reply(await response.json(),response.status)}catch(_){return reply({error:'storage_failed'},503)}
    }
    if(path==='/health'&&request.method==='GET'){
      let stage='key_parse';try{
        const jwk=JSON.parse(env.VAPID_PRIVATE_JWK);stage='key_import';
        const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
        stage='sign';await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,utf('health'));
        stage='encryption';const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
        await encryptedTest({keys:{p256dh:b64(await crypto.subtle.exportKey('raw',pair.publicKey)),auth:b64(crypto.getRandomValues(new Uint8Array(16)))}});
        return reply({ok:true});
      }catch(error){return reply({ok:false,stage,kind:/^[A-Za-z]+$/.test(error.name||'')?error.name:'Error'},503)}
    }
    if (path !== '/test' || request.method !== 'POST') return reply({error:'not_found'},404);
    if(requestOrigin!==ORIGIN&&requestOrigin!==ownOrigin)return reply({error:'origin'},403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'content_type'},415);
    const raw = await request.text();
    if (raw.length > 4096) return reply({error:'too_large'},413);
    let sub, endpoint;
    try { sub=JSON.parse(raw).subscription; endpoint=new URL(sub.endpoint); } catch (_) { return reply({error:'invalid_subscription'},400); }
    // Apple/Google/Mozillaの標準送信先だけを許可。任意のサーバーにアクセスしない。
    const host=endpoint.hostname;
    if (endpoint.protocol!=='https:' || endpoint.username || endpoint.password || endpoint.port || !(
      host==='web.push.apple.com' || host.endsWith('.push.apple.com') || host==='fcm.googleapis.com' || host==='updates.push.services.mozilla.com')) return reply({error:'invalid_endpoint'},400);
    if (!sub.keys || typeof sub.keys.p256dh!=='string' || typeof sub.keys.auth!=='string') return reply({error:'invalid_keys'},400);
    try{if(!await authorizedDevice(request,env,sub))return reply({error:'authorization'},403)}catch(_){return reply({error:'storage_failed'},503)}
    const now=Date.now();
    for(const [key,at] of recentTests)if(now-at>=60000)recentTests.delete(key);
    if(recentTests.size>=1000||now-(recentTests.get(endpoint.href)||0)<10000)return reply({error:'try_later'},429);
    recentTests.set(endpoint.href,now);
    let stage='key_parse';try {
      const jwk=JSON.parse(env.VAPID_PRIVATE_JWK);
      stage='key_import';
      const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
      const payload={aud:endpoint.origin,exp:Math.floor(Date.now()/1000)+300,sub:ORIGIN};
      const unsigned=b64(utf(JSON.stringify({typ:'JWT',alg:'ES256'})))+'.'+b64(utf(JSON.stringify(payload)));
      stage='sign';const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,utf(unsigned));
      stage='encryption';
      const body=await encryptedTest(sub);
      stage='push_request';
      const result=await fetch(endpoint.href,{method:'POST',redirect:'manual',body:body.buffer,headers:{Authorization:`vapid t=${unsigned}.${b64(sig)}, k=${env.VAPID_PUBLIC_KEY}`,TTL:'300',Urgency:'high','Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream'}});
      if (!result.ok) {
        let reason='';try{const data=JSON.parse(await result.text());if(typeof data.reason==='string'&&/^[A-Za-z0-9_ -]{1,80}$/.test(data.reason))reason=data.reason;}catch(_){}
        return reply({error:result.status===404||result.status===410?'subscription_expired':'delivery_failed',providerStatus:result.status,reason},502);
      }
      return reply({accepted:true});
    } catch (error) { return reply({error:error.message==='invalid_keys'?'invalid_keys':'sender_failed',reason:stage+'_'+(/^[A-Za-z]+$/.test(error.name||'')?error.name:'Error'), detail: String(error.message||'').replace(/https?:\/\/\S+/g,'[URL]').replace(/[A-Za-z0-9_=-]{30,}/g,'[非表示]').slice(0,160)},502); }
  }
};
