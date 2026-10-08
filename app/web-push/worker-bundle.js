// Only timestamps and notification kinds leave the phone. No trip/place/note/photo data.
const messages = {
 before:'まもなく予定の時間です。日程を確認しましょう。',
 eve:'明日の予定を確認しましょう。',
 morn:'今日の予定を確認しましょう。',
 pre:'旅行前の予約と持ち物を確認しましょう。'
};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
async function authorizedDevice(request,env,sub){
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!env.NOTIFY_DB||!/^[a-f0-9]{64}$/.test(token||''))return false;
 const row=await env.NOTIFY_DB.prepare('SELECT token_hash,expires FROM devices WHERE id=?').bind(await hash(sub.endpoint)).first();
 return !!row&&row.expires>Date.now()&&row.token_hash===await hash(token);
}
async function scheduleRequest(request,env,validSubscription){
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!env.NOTIFY_DB)return json({error:'schedule_not_configured'},503);
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(token||''))return json({error:'authorization'},401);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'content_type'},415);
 const raw=await request.text();if(raw.length>40000)return json({error:'too_large'},413);
 let data;try{data=JSON.parse(raw)}catch(_){return json({error:'invalid_json'},400)}
 if(!validSubscription(data.subscription))return json({error:'invalid_subscription'},400);
 const id=await hash(data.subscription.endpoint),secret=await hash(token),db=env.NOTIFY_DB;
 const existing=await db.prepare('SELECT token_hash FROM devices WHERE id=?').bind(id).first();
 if(existing&&existing.token_hash!==secret)return json({error:'authorization'},403);
 if(new URL(request.url).pathname==='/stop'){
  await db.batch([db.prepare('DELETE FROM reminders WHERE device=?').bind(id),db.prepare('DELETE FROM devices WHERE id=?').bind(id)]);
  return json({stopped:true});
 }
 const now=Date.now(),limit=now+60*86400000;
 if(!Array.isArray(data.notifications)||data.notifications.length>200)return json({error:'too_many'},400);
 const rows=[],seen=new Set();
 for(const n of data.notifications){
  if(!Number.isSafeInteger(n.at)||n.at<=now||n.at>limit||!Object.hasOwn(messages,n.kind))return json({error:'invalid_schedule'},400);
  const key=n.at+':'+n.kind;if(seen.has(key))continue;seen.add(key);
  rows.push({id:crypto.randomUUID(),at:n.at,kind:n.kind});
 }
 // Conditional UPSERT prevents two simultaneous first registrations taking ownership.
 const owner=await db.prepare('INSERT INTO devices(id,token_hash,subscription,expires) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription,expires=excluded.expires WHERE devices.token_hash=excluded.token_hash RETURNING id').bind(id,secret,JSON.stringify(data.subscription),limit).first();
 if(!owner)return json({error:'authorization'},403);
 await db.batch([db.prepare('DELETE FROM reminders WHERE device=?').bind(id),...rows.map(n=>db.prepare('INSERT INTO reminders(id,device,at,kind) VALUES(?,?,?,?)').bind(n.id,id,n.at,n.kind))]);
 return json({saved:rows.length,until:limit});
}
async function runScheduled(env,send){
 if(!env.NOTIFY_DB)return;
 const db=env.NOTIFY_DB,now=Date.now();
 // Keep overdue queued reminders: a busy minute must not silently discard unsent jobs.
 await db.batch([db.prepare('DELETE FROM reminders WHERE device IN (SELECT id FROM devices WHERE expires<?)').bind(now),db.prepare('DELETE FROM devices WHERE expires<?').bind(now)]);
 const jobs=await db.prepare('SELECT r.*,d.subscription FROM reminders r JOIN devices d ON d.id=r.device WHERE r.at<=? AND r.lease<=? ORDER BY r.at LIMIT 10').bind(now,now).all();
 for(const job of jobs.results||[]){
  const claim=await db.prepare('UPDATE reminders SET lease=?,attempts=attempts+1 WHERE id=? AND lease<=? RETURNING id').bind(now+120000,job.id,now).first();
  if(!claim)continue;
  try{
   const body=now-job.at>600000?'遅れて届いた通知です。日程を確認してください。':messages[job.kind];
   const result=await send(JSON.parse(job.subscription),{title:'旅のノート',body,tag:'reminder-'+job.id},env);
   if(result.status===404||result.status===410){await db.batch([db.prepare('DELETE FROM reminders WHERE device=?').bind(job.device),db.prepare('DELETE FROM devices WHERE id=?').bind(job.device)]);continue;}
   if(result.ok||job.attempts>=2||[400,401,403].includes(result.status))await db.prepare('DELETE FROM reminders WHERE id=?').bind(job.id).run();
  }catch(_){if(job.attempts>=2)await db.prepare('DELETE FROM reminders WHERE id=?').bind(job.id).run();}
 }
}

const TEST_HTML="<!doctype html><html lang=\"ja\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"apple-mobile-web-app-capable\" content=\"yes\"><meta name=\"theme-color\" content=\"#ffffff\"><link rel=\"manifest\" href=\"/manifest.webmanifest\"><title>旅のノート 通知テスト</title>\n<style>body{font-family:-apple-system,system-ui,sans-serif;color:#202124;background:#fff;margin:0;padding:32px 22px;line-height:1.65}main{max-width:480px;margin:auto}h1{font-size:30px;line-height:1.3}button{font:inherit;font-weight:650;min-height:48px;border-radius:14px;padding:12px 18px;cursor:pointer;width:100%;margin:6px 0;border:1px solid #d8d8df;background:#fff;color:#202124}button.primary{background:#6146d8;color:#fff;border:0}button:disabled{opacity:.6}section{border-radius:18px;background:#f4f4f7;padding:18px;margin:18px 0}a{color:#4833b1}#state{font-weight:650;white-space:pre-line}</style>\n<main><h1>通知が届くか試そう（更新版3）</h1><p>旅のノートの通知受信テストです。旅行の予定にはまだ連動しません。</p>\n<section id=\"install\"><b>iPhoneで使う準備</b><ol><li>Safariでこのページを開く</li><li>共有 →「ホーム画面に追加」</li><li>追加した「旅の通知テスト」アイコンから開く</li></ol><p>iOS 16.4以降が必要です。</p></section>\n<button class=\"primary\" id=\"enable\">1 同意して通知を登録する</button><button class=\"primary\" id=\"send\" disabled>2 テスト通知を送る</button><button id=\"stop\" disabled>通知を止める</button>\n<p id=\"state\" role=\"status\">準備を確認しています…</p><p>「送信を受け付けました」が出たら、ホーム画面へ戻って届くか確認してください。通知の許可や集中モードによって表示が変わります。</p>\n<details><summary>送る情報について</summary><p>通知の配送先と受信に必要な公開暗号鍵をCloudflareへ送り、最大60日間保存します。旅行・写真・名前は送りません。「通知を止める」でサーバーの登録も削除します。</p></details><p><a href=\"https://vivid-346.github.io/tabi-planner/app/\">旅行のアプリを開く</a></p></main>\n<script>\nconst state=document.getElementById('state'),enable=document.getElementById('enable'),send=document.getElementById('send'),stop=document.getElementById('stop');let reg,sub,publicKey;let registered=localStorage.getItem(\"notify-test-on\")===\"1\";\nfunction token(){let t=localStorage.getItem(\"notify-test-token\");if(!t){t=Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,\"0\")).join(\"\");localStorage.setItem(\"notify-test-token\",t)}return t}\nasync function api(path,data){const r=await fetch(path,{method:\"POST\",headers:{\"Content-Type\":\"application/json\",Authorization:\"Bearer \"+token()},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error);return v}\nconst ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);\nconst standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;\nfunction keyBytes(v){return Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-v.length%4)%4)),c=>c.charCodeAt(0))}\nfunction show(){send.disabled=!sub||!registered;stop.disabled=!sub;enable.disabled=!!sub&&registered;state.textContent=sub&&registered?'通知の準備ができました。「テスト通知を送る」を押してください。':'「通知を許可する」を押してください。'}\nasync function init(){try{if(ios&&!standalone){enable.disabled=true;state.textContent='ホーム画面に追加して、追加したアイコンから開いてください。';return}if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){enable.disabled=true;state.textContent='このブラウザではWeb通知に対応していません。iPhoneではホーム画面のアイコンから開いてください。';return}reg=await navigator.serviceWorker.register('/sw.js');reg=await navigator.serviceWorker.ready;const r=await fetch('/config');if(!r.ok)throw Error('送信側の準備が完了していません。');publicKey=(await r.json()).publicKey;sub=await reg.pushManager.getSubscription();show();if(standalone)document.getElementById('install').hidden=true}catch(e){state.textContent=e.message;enable.disabled=true}}\nenable.onclick=async()=>{if(!reg||!publicKey)return;try{const p=await Notification.requestPermission();if(p!=='granted'){state.textContent='通知が許可されませんでした。iPhoneの「設定」→「通知」から許可を確認してください。';return}enable.disabled=true;sub=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)});await api(\"/schedule\",{subscription:sub.toJSON(),notifications:[]});registered=true;localStorage.setItem(\"notify-test-on\",\"1\");show()}catch(e){enable.disabled=false;state.textContent='通知を登録できませんでした。ホーム画面から開き直して、もう一度試してください。'}};\nsend.onclick=async()=>{if(!sub)return;send.disabled=true;state.textContent='テスト通知を送っています…';try{const r=await fetch('/test',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({subscription:sub.toJSON()})});const data=await r.json();if(!r.ok)throw Error([data.error,data.providerStatus,data.reason,data.detail].filter(Boolean).join(\" / \"));state.textContent='送信を受け付けました。ホーム画面へ戻って通知を確認してください。\\n受信の確認は、通知が実際に表示された時点で完了です。'}catch(e){state.textContent='送信できませんでした。\\n確認コード：'+e.message+'\\nこのコードを教えてください。'+(e.message.startsWith('subscription_expired')?' 通知を止めてから再登録してください。':'')}finally{send.disabled=!sub}};\nstop.onclick=async()=>{try{if(sub){if(registered)await api(\"/stop\",{subscription:sub.toJSON()});await sub.unsubscribe()}sub=null;registered=false;localStorage.removeItem(\"notify-test-on\");localStorage.removeItem(\"notify-test-token\");show();state.textContent='通知の登録を解除しました。'}catch(e){state.textContent='解除できませんでした。再試行してください。'}};init();\n</script></html>\n";
const TEST_SW="/* Web通知の受信専用。旅行や写真のキャッシュは作らない。 */\n'use strict';\nself.addEventListener('push', event => {\n  let message = {};\n  try { message = event.data ? event.data.json() : {}; } catch (_) {}\n  const title = typeof message.title === 'string' ? message.title.slice(0, 80) : '旅のノート';\n  const body = typeof message.body === 'string' ? message.body.slice(0, 300) : '予定を確認しましょう';\n  const tag = typeof message.tag === 'string' ? message.tag.slice(0, 100) : 'tabinote-reminder';\n  event.waitUntil(self.registration.showNotification(title, {\n    body, tag, data: { url: self.registration.scope }\n  }));\n});\nself.addEventListener('notificationclick', event => {\n  event.notification.close();\n  // 通知のペイロードから任意の外部URLを開かない。\n  const appUrl = self.registration.scope;\n  event.waitUntil((async () => {\n    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });\n    const tab = tabs.find(tab => tab.url.startsWith(appUrl));\n    if (tab) return tab.focus();\n    return self.clients.openWindow(appUrl);\n  })());\n});\n";
const TEST_MANIFEST="{\"name\":\"旅のノート 通知テスト\",\"short_name\":\"旅の通知テスト\",\"id\":\"/\",\"start_url\":\"/\",\"scope\":\"/\",\"display\":\"standalone\",\"background_color\":\"#fff\",\"theme_color\":\"#fff\"}";

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
    if(!await authorizedDevice(request,env,sub))return reply({error:'authorization'},403);
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
