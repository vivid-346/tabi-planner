const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');const src=fs.readFileSync(path.join(__dirname,'../src/app.html'),'utf8');for(const s of src.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);
const store=new Map([['test-push-on','1']]);let stopped=false,sent=[];
const c={localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},KEY:'test',DB:{trips:{a:{sample:false},b:{sample:true}}},notifList:()=>[{at:new Date(Date.now()+60000),kind:'before',title:'SECRET',body:'PRIVATE NOTE'}],Date,crypto:require('node:crypto').webcrypto,console,Promise,setTimeout};
vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'client.js'),'utf8')+';globalThis.client=WebNotify',c);
c.client.registration=async()=>({pushManager:{getSubscription:async()=>({toJSON:()=>({endpoint:'test'}),unsubscribe:async()=>{stopped=true}})}});
c.client.request=async(p,data)=>{await new Promise(r=>setTimeout(r,5));sent.push({p,data});return {saved:data.notifications?.length||0}};
(async()=>{
 await c.client.sync();assert.equal(sent[0].data.notifications.length,1);assert.deepEqual(Object.keys(sent[0].data.notifications[0]).sort(),['at','kind']);assert(!JSON.stringify(sent).includes('SECRET'));
 const pending=c.client.sync();await c.client.stop();await pending;assert.equal(sent.at(-1).p,'/stop');assert(stopped);assert(!c.client.enabled());
 await c.client.sync();assert.equal(sent.at(-1).p,'/stop');
 assert(src.includes('kind:"pre"')&&src.includes('kind:"eve"')&&src.includes('kind:"morn"')&&src.includes('kind:"before"'));
 assert(!src.includes('いまはブラウザで開いているので、実際の通知は届きません'));
 console.log('PASS: JavaScript syntax, minimal data, sample exclusion, serialized stop, disabled schedule');
})().catch(e=>{console.error(e);process.exitCode=1});
