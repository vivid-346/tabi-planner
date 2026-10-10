const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'src/app.html'),'utf8');
const part=(start,end)=>{a(src.includes(start),start);a(src.includes(end),end);return src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)))};
const base={console,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,Date,Promise,atob,TypeError,crypto:require('node:crypto').webcrypto};
async function notification(){
 const store=new Map([['test-push-on','1']]);let calls=[];
 const sub={toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:Buffer.alloc(65,4).toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}})};
 const c={...base,KEY:'test',DB:{trips:{a:{},b:{},sample:{sample:true}}},notifList:()=>[{at:new Date(Date.now()+60000),kind:'before',title:'PRIVATE',body:'PRIVATE'},{at:new Date(Date.now()+1000),kind:'before'}],localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},navigator:{serviceWorker:{register:async()=>({}),ready:Promise.resolve({pushManager:{getSubscription:async()=>sub}})}},window:{PushManager:1,Notification:1},Notification:{permission:'granted'},fetch:async(u,o)=>{calls.push(JSON.parse(o.body));return {ok:true,json:async()=>({saved:1})}}};
 vm.createContext(c);vm.runInContext(part('function waitLimit(', 'let schedT=' )+';globalThis.client=WebNotify;',c);
 a(c.client.validSubscription(sub));for(const endpoint of ['http://fcm.googleapis.com/a','https://evil.example/a','https://fcm.googleapis.com:444/a','https://user@fcm.googleapis.com/a'])a(!c.client.validSubscription({toJSON:()=>({...sub.toJSON(),endpoint})}));
 a(!c.client.validSubscription({toJSON:()=>({...sub.toJSON(),keys:{p256dh:'bad',auth:'bad'}})}));
 await c.client.sync();a.equal(calls[0].notifications.length,1,'deduplicate restored trip reminders');a(!JSON.stringify(calls).includes('PRIVATE'));
 c.navigator.serviceWorker.ready=Promise.resolve({pushManager:{getSubscription:async()=>({toJSON:()=>({endpoint:'https://bad.example'})})}});
 await a.rejects(c.client.sync(),/通知先を確認できません/);a.equal(calls.length,1,'invalid endpoint never sent');
 c.Notification.permission='denied';await a.rejects(c.client.registration(),/通知の許可/);
 await a.rejects(c.waitLimit(new Promise(()=>{}),5,'timed out'),/timed out/);
 c.fetch=async()=>({ok:false,json:async()=>({error:'storage_failed'})});await a.rejects(c.client.request('/schedule',{}),/保存できません/);
 console.log('PASS notification subscription validation, meaningful errors, timeouts, deduplication, no private metadata');
}
async function clipboard(){
 let parsed=[],notes=[],draws=0;const A={};const c={...base,S:{ai:A,tid:'a'},navigator:{clipboard:{readText:async()=>'{"spots":[]}' }},$:()=>null,draw:()=>draws++,toast:x=>notes.push(x),aiParse:x=>parsed.push(x),cgParse:x=>parsed.push(x)};
 vm.createContext(c);vm.runInContext(part('function waitLimit(','/* Web版通知。')+part('async function aiReadClipboard(','function aiParse('),c);
 await c.aiReadClipboard();a.equal(parsed.length,1);a.equal(A.clipBusy,false);
 c.navigator.clipboard.readText=async()=>{const e=Error('permission');e.name='NotAllowedError';throw e};await c.aiReadClipboard();a(A.manual);a.match(A.clipError,/許可されていません/);a.equal(parsed.length,1);
 let finish;c.navigator.clipboard.readText=()=>new Promise(r=>finish=r);const pending=c.aiReadClipboard();c.S.tid='b';finish('{"days":[]}');await pending;a.equal(parsed.length,1,'late clipboard cannot affect another trip');
 c.S.tid='a';c.waitLimit=()=>Promise.reject(Error('timeout'));await c.aiReadClipboard();a.match(A.clipError,/時間がかかっています/);
 console.log('PASS real-read path, denied permission fallback, read timeout, late result trip isolation');
}
function ai(){
 const c={...base,COST_CATS:{transport:'交通費',hotel:'宿代',food:'食費',other:'観光・体験'},pad:n=>String(n).padStart(2,'0'),dates:()=>['2026-11-21'],spots:()=>[],KINDS:{move:1,see:1},CATS:{see:1},conflict:()=>'',timeKey:x=>x?Number(x.slice(0,2))*60+Number(x.slice(3)):null};
 vm.createContext(c);vm.runInContext(part('function costRanges(','function cleanCosts(')+part('const normName=','function aiApply('),c);
 const raw={costs:{transport:{min:0,max:0,note:'未確認のためnull'},hotel:null,other:{min:0,max:0,note:'無料の公園のみ'}}};const checked=c.aiCheck({},raw,'cost');a(!checked.costs.transport);a.equal(checked.costs.other.min,0);a(checked.warn.some(x=>x.includes('矛盾')));
 const empty=c.aiCheck({},{costs:{transport:null,hotel:null,food:null,other:null}},'cost');a.equal(Object.keys(empty.costs).length,0);a(empty.warn.some(x=>x.includes('0円としては扱いません')));
 const bad=c.aiCheck({},{days:[{date:'2026-11-21',items:[{kind:'move',title:'夜行バス',time:'23:00',arrive:'07:00'},{kind:'see',title:'観光',time:'25:00'}]}]},'plan');a.equal(bad.days['2026-11-21'][0].arrive,'');a(bad.days['2026-11-21'][0].flag);a.equal(bad.days['2026-11-21'][1].time,'');a(bad.warn.some(x=>x.includes('到着が出発以前')));a(bad.warn.some(x=>x.includes('形式が正しくない')));
 console.log('PASS AI unknown-vs-zero, explicit free, all-unknown estimates and reversed/invalid times');
}
async function photo(){
 let url='blob:bad',stored=false,aborted=false,revoked=false;
 const c={...base,PH:{map:new Map([['https://upload.wikimedia.org/a.jpg',url]]),failed:new Set(),busy:false},navigator:{onLine:true},DB:{trips:{a:{spots:{a:{photo:{u:'https://upload.wikimedia.org/b.jpg'}}}}}},S:{},phDB:async()=>({transaction:()=>{const tx={objectStore:()=>({openKeyCursor(){const q={};queueMicrotask(()=>{q.result=null;q.onsuccess()});return q},put(){queueMicrotask(()=>{aborted=true;tx.onabort()})}})};return tx}}),URL:{createObjectURL:()=>{stored=true;return 'blob:new'},revokeObjectURL:()=>{revoked=true}},fetch:async()=>({ok:true,blob:async()=>({type:'image/jpeg',size:300})}),draw:()=>{}};
 vm.createContext(c);vm.runInContext(part('function phSrc(','function phDB(')+part('async function phCache(','async function fillPhotos('),c);
 const img={dataset:{},getAttribute:()=>url,set src(x){url=x}};a(c.photoFallback(img));a.equal(url,'https://upload.wikimedia.org/a.jpg');a(!c.photoFallback(img));a(c.PH.failed.has(url));
 await c.phCache();a(aborted);a(!stored,'failed IndexedDB transaction must not masquerade as cached');a(!c.PH.busy);
 console.log('PASS corrupted cache remote fallback, failed remote marked retryable, abort never treated as persistent success');
}
(async()=>{for(const script of src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);await notification();await clipboard();ai();await photo()})().catch(e=>{console.error(e);process.exitCode=1});
