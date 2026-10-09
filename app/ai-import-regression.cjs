const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'src/app.html'),'utf8');
const c={pad:n=>String(n).padStart(2,'0'),dates:t=>['2026-11-21','2026-11-22','2026-11-23'],spots:()=>[],KINDS:{see:1,food:1,move:1,stay:1,other:1},CATS:{see:1},costRanges:()=>({}),conflict:()=>false};
vm.createContext(c);
vm.runInContext(src.slice(src.indexOf('const normName='),src.indexOf('function aiApply(')),c);
const item=(title,time='10:00')=>({title,time,kind:'see'});
let result=c.aiCheck({}, {days:[{date:'2026-11-21',area:'京都',items:[item('清水寺')]},{date:'2026-11-21',items:[]}]},'plan');
assert.equal(result.nItems,1);assert.equal(result.areas['2026-11-21'],'京都');assert(result.warn.some(w=>w.includes('重複')));
result=c.aiCheck({}, {days:[{date:'2026-11-21',items:[]},{date:'2026-11-21',items:[item('清水寺')]},{date:'2026-11-21',items:[item('清水寺'),item('伏見稲荷','14:00')]}]},'plan');
assert.equal(result.nItems,2);assert.equal(result.days['2026-11-21'][1].title,'伏見稲荷');
result=c.aiCheck({}, {days:[{date:'2026-11-21',items:[item('清水寺','10:00'),item('清水寺','15:00')]}]},'plan');assert.equal(result.nItems,2);
result=c.aiCheck({}, {days:[{date:'2026-11-21',items:[item('清水寺')]},{date:'2026-11-21',items:[{...item('清水寺'),spot:'清水寺',note:'後の回答にだけ場所情報'}]}]},'plan');assert.equal(result.nItems,1);assert.equal(result.days['2026-11-21'][0].spotName,'清水寺');assert.equal(result.days['2026-11-21'][0].note,'後の回答にだけ場所情報');
result=c.aiCheck({}, {days:[{date:'2026-11-21',items:[{title:'電車で移動',kind:'move',time:'10:00',arrive:'11:00'}]},{date:'2026-11-21',items:[{title:'電車で移動',kind:'move',time:'10:00',arrive:'11:30'}]}]},'plan');assert.equal(result.nItems,2);
for(const [name,count] of [['actual-ai-answer.txt',39],['actual-ai-consult.txt',37]]){
 const text=fs.readFileSync(path.join(__dirname,name),'utf8');
 const raw=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));
 const checked=c.aiCheck({},raw,'plan');assert.equal(checked.nItems,count,name);assert(Object.values(checked.days).every(d=>d.length>0));
 console.log('PASS actual AI fixture:',name,checked.nItems,'items preserved');
}
for(const m of src.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
console.log('PASS empty duplicates, complementary duplicates, same place at different times, full script syntax');

const sameStart=src.indexOf('function aiSameItem('),sameEnd=src.indexOf('function aiPrepare(',sameStart);vm.runInContext(src.slice(sameStart,sameEnd),c);const transfer={kind:'move',title:'電車で移動',time:'10:00',arrive:'11:00'};assert(!c.aiSameItem({},transfer,{...transfer,arrive:''}));assert(!c.aiSameItem({},transfer,{...transfer,arrive:'11:30'}));console.log('PASS missing arrivals reuse existing transfer; distinct arrivals remain separate');

Object.assign(c,{S:{ai:{o:{from:'東京'}}},DB:{},items:(t,d)=>Object.values(t.items||{}).filter(x=>!d||x.date===d),timeKey:x=>x?Number(x.slice(0,2))*60+Number(x.slice(3)):null,hm:n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'),distKm:()=>0,legMin:()=>0,mainMove:()=> 'train'});vm.runInContext(src.slice(src.indexOf('function aiPrepare('),src.indexOf('function moneyStats(')),c);const oldTrip={from:'東京',items:{old:{id:'old',date:'2026-11-21',...transfer,arrive:''}},spots:{}};const missingThenKnown={spots:[],warn:[],days:{'2026-11-21':[{...transfer,arrive:'11:00'},{...transfer,arrive:'11:30'}]}};const prepared=c.aiPrepare(oldTrip,missingThenKnown,'add');assert.equal(prepared.updates[0].arrive,'11:00');assert.equal(prepared.days['2026-11-21'].length,1);assert.equal(prepared.days['2026-11-21'][0].arrive,'11:30');assert.equal(oldTrip.items.old.arrive,'');const knownTrip={...oldTrip,items:{old:{...oldTrip.items.old,arrive:'11:00'}}};const absent=c.aiPrepare(knownTrip,{...missingThenKnown,days:{'2026-11-21':[{...transfer,arrive:''}]}},'add');assert.equal(absent.nItems,0);console.log('PASS preview preserves original state; arrival enrichment and distinct transfers survive preparation');


vm.runInContext(src.slice(src.indexOf('function conflict('),src.indexOf('function countdown(')),c);const overlapping={...oldTrip,items:{...oldTrip.items,see:{id:'see',date:'2026-11-21',time:'10:30',kind:'see',title:'観光'}}};const enriched=c.aiPrepare(overlapping,{...missingThenKnown,days:{'2026-11-21':[{...transfer,arrive:'11:00'}]}},'add');assert.equal(enriched.overlaps[0],'see');assert(enriched.warn.some(x=>x.includes('既存の予定1件')));assert.equal(overlapping.items.old.arrive,'');assert(!overlapping.items.see.flag);let applySeq=0;Object.assign(c,{T:()=>overlapping,change:(msg,fn)=>fn(overlapping),uid:()=> 'new'+(++applySeq),nextOrder:()=>1});vm.runInContext(src.slice(src.indexOf('function aiApply('),src.indexOf('function aiView(')),c);c.aiApply({...missingThenKnown,areas:{},days:{'2026-11-21':[{...transfer,arrive:'11:00'}]}},'add');assert.equal(overlapping.items.old.arrive,'11:00');assert(overlapping.items.see.flag);assert(overlapping.items.see.note.includes('要確認'));console.log('PASS arrival enrichment warns in preview and marks affected existing stops only on save');

const morning={...oldTrip,items:{old:{...oldTrip.items.old,arrive:''},early:{id:'early',date:'2026-11-21',time:'08:00',kind:'see',title:'朝の観光'},overlap:{id:'overlap',date:'2026-11-21',time:'10:30',kind:'see',title:'移動中の観光'},after:{id:'after',date:'2026-11-21',time:'11:00',kind:'see',title:'到着後の観光'}}};const win=c.aiPrepare(morning,{...missingThenKnown,days:{'2026-11-21':[{...transfer,arrive:'11:00'}]}},'add');assert.deepEqual(Array.from(win.overlaps),['overlap']);console.log('PASS only stops inside the enriched transfer interval are flagged; earlier and arrival-time stops remain valid');

assert(!c.conflict({...morning,items:{...morning.items,old:{...morning.items.old,arrive:'11:00'}}},'2026-11-21','08:00','early'));
const inboundTitle='東京から京都へ新幹線で移動';
const inbound={...morning,items:Object.fromEntries(Object.entries(morning.items).map(([id,x])=>[id,{...x,...(id==='old'?{title:inboundTitle}: {})}]))};
const inboundAnswer={...missingThenKnown,areas:{},days:{'2026-11-21':[{...transfer,title:inboundTitle,arrive:'11:00'}]}};
const inboundPreview=c.aiPrepare(inbound,inboundAnswer,'add');
assert.deepEqual(Array.from(inboundPreview.overlaps),['early','overlap']);
assert.equal(inbound.items.old.arrive,'');assert(!inbound.items.early.flag);
Object.assign(c,{T:()=>inbound,change:(msg,fn)=>fn(inbound)});c.aiApply(inboundAnswer,'add');
assert.equal(inbound.items.old.arrive,'11:00');assert(inbound.items.early.flag);assert(inbound.items.overlap.flag);assert(!inbound.items.after.flag);
assert(c.conflict(inbound,'2026-11-21','08:00','early').includes('到着前'));
console.log('PASS inbound arrival enrichment flags pre-departure and in-transit stops; local transfer does not block the morning');

const savedDates=c.dates;c.dates=()=>['2026-11-21'];
const airport={dest:'京都',from:'東京',items:{m:{id:'m',date:'2026-11-21',kind:'move',title:'京都から空港へ移動',time:'16:00',arrive:'17:00'}}};
assert.equal(c.conflict(airport,'2026-11-21','09:00',''), '');
assert(c.conflict(airport,'2026-11-21','16:30','').includes('移動中'));
const bus={dest:'京都',from:'',items:{old:{id:'old',date:'2026-11-21',kind:'move',title:'バスで京都へ',time:'10:00',arrive:''},early:{id:'early',date:'2026-11-21',kind:'see',title:'観光',time:'08:00'}}};
const busAnswer={spots:[],areas:{},warn:[],days:{'2026-11-21':[{kind:'move',title:'バスで京都へ',time:'10:00',arrive:'11:00'}]}};
const busPreview=c.aiPrepare(bus,busAnswer,'add');assert.deepEqual(Array.from(busPreview.overlaps),['early']);assert(!bus.items.early.flag);
Object.assign(c,{T:()=>bus,change:(msg,fn)=>fn(bus)});c.aiApply(busAnswer,'add');assert(bus.items.early.flag);assert(c.conflict(bus,'2026-11-21','09:00','early').includes('到着前'));assert(!c.conflict(bus,'2026-11-21','11:00','early'));
c.dates=savedDates;
console.log('PASS one-day outbound airport transfer leaves morning open; inbound bus to destination blocks pre-arrival and enrichment flags existing stops');

