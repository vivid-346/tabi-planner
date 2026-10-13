const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
for(const file of ['src/app.html','index.html']){
 const s=fs.readFileSync(path.join(__dirname,file),'utf8'),storage=new Map(),stages=[];let seq=0;
 const trip={title:'Boundary test',start:'2026-11-21',end:'2026-11-21',from:'',items:{},spots:{},dayInfo:{}};
 const c={S:{tid:'test',ai:{kind:'plan',o:{from:''}}},DB:{trips:{test:trip}},KEY:'test-db',
  dates:()=>['2026-11-21'],pad:n=>String(n).padStart(2,'0'),
  KINDS:{see:1,food:1,move:1,stay:1,other:1},CATS:{see:1},MOVES:{},CUR:{},EXCATS:{},NDEF:{},
  COST_CATS:{},costRanges:()=>({}),conflict:()=>false,distKm:()=>0,legMin:()=>0,mainMove:()=> 'train',
  timeKey:x=>x?+x.slice(0,2)*60+(+x.slice(3)):null,hm:n=>String(n/60|0).padStart(2,'0')+':'+String(n%60).padStart(2,'0'),
  uid:()=> 'id'+(++seq),costScope:()=>'',schedNotif:()=>{},toast:()=>{},Native:{haptic:()=>{}},
  localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null}};
 c.T=()=>c.DB.trips.test;
 vm.createContext(c);
 const load=(a,b)=>{const start=s.indexOf(a),end=s.indexOf(b,start);assert(start>=0&&end>start,a);vm.runInContext(s.slice(start,end),c)};
 load('function aiCostCheck(','function cleanCosts(');
 load('function aiSameItem(','function moneyStats(');
 load('const normName=','function aiCostForecast(');
 load('function aiApply(','function aiView(');
 load('function items(','function spotDay(');
 load('function nextOrder(','/* 入れられない時間');
 const saveStart=s.indexOf('function save(){');vm.runInContext(s.slice(saveStart,s.indexOf('\n',saveStart)),c);
 load('let UNDO=null;','function undo(');
 const cleanStart=s.indexOf('function cleanCosts(');vm.runInContext(s.slice(cleanStart,s.indexOf('\n',cleanStart)),c);
 load('const cs_=','async function shareTrip(');
 const original='元のメモ'.repeat(33)+'末尾を必ず保持!';assert.equal(original.length,140);
 const raw={days:[{date:trip.start,items:[{title:'出発地から移動',kind:'move',time:'朝の時刻はまだ未定'.repeat(6),arrive:'夕方の到着時刻は未定'.repeat(6),note:original}]}]};
 const snapshot=(stage,item)=>stages.push({stage,length:item.note.length,originalRetained:item.note.includes(original)});
 const checked=c.aiCheck(c.T(),raw,'plan');snapshot('aiCheck',checked.days[trip.start][0]);
 assert(checked.warn.some(x=>x.includes('短くして残した')),'shortened time details must be disclosed');
 const prepared=c.aiPrepare(c.T(),checked,'replace');snapshot('aiPrepare',prepared.days[trip.start][0]);
 c.aiApply(checked,'replace');snapshot('aiApply/save',Object.values(c.T().items)[0]);
 c.DB=JSON.parse(storage.get(c.KEY));snapshot('local reload',Object.values(c.T().items)[0]);
 const cleaned=c.cleanTrip(JSON.parse(JSON.stringify(c.T())));snapshot('shared/backup import',Object.values(cleaned.items)[0]);
 console.log(file,JSON.stringify(stages));
 for(const stage of stages){assert(stage.originalRetained,stage.stage+': original note must survive');assert(stage.length<=160,stage.stage+': note must fit shared-trip limit')}
 assert.equal(prepared.nItems,1);assert.equal(prepared.days[trip.start][0].time,'');assert.equal(prepared.days[trip.start][0].arrive,'');
 const before=JSON.stringify(c.T().items);c.aiApply(checked,'add');assert.equal(JSON.stringify(c.T().items),before,'reimport must not duplicate notes or items');
 const reversed=c.aiCheck(c.T(),{days:[{date:trip.start,items:[{title:'Return transfer',kind:'move',time:'18:00',arrive:'17:00',note:original}]}]},'plan');
 assert(reversed.days[trip.start][0].note.includes(original),'arrival warning must preserve original note');
 c.aiApply(reversed,'replace');c.DB=JSON.parse(storage.get(c.KEY));
 assert(Object.values(c.cleanTrip(c.T()).items)[0].note.includes(original),'reversed arrival must survive save, reload and shared-trip import');
 assert(Object.values(c.cleanTrip(c.T()).items)[0].note.includes('【到着要確認：17:00】'),'original reversed arrival must remain available after reload');
 const longWarnings=[];const longNote=c.aiTimeNote({time:'時'.repeat(60)},'',longWarnings);
 assert(longNote.includes('…')&&longWarnings.some(x=>x.includes('短くして残した')),'40-character shortening must be disclosed');
 const visits=c.aiCheck(c.T(),{days:[{date:trip.start,items:['朝','夕方'].map(time=>({title:'Same place',kind:'see',spot:'Park',time,note:''}))}]},'plan');
 assert.equal(c.aiPrepare(c.T(),visits,'replace').nItems,2,'distinct nonstandard times must not collapse into one visit');
 c.aiApply(visits,'replace');c.DB=JSON.parse(storage.get(c.KEY));assert.equal(Object.keys(c.cleanTrip(c.T()).items).length,2);
 for(const kind of ['see','move']){
  const repeatedDays={days:['朝','夕方'].map(time=>({date:trip.start,items:[{title:'Same visit',kind,time,note:''}]}))};
  const data=c.aiCheck(c.T(),repeatedDays,'plan');assert.equal(data.nItems,2,'duplicate date blocks must retain distinct original time details');
  assert.equal(c.aiPrepare(c.T(),data,'replace').nItems,2,'arrival enrichment must not bypass unknown-time distinction');
 }
}
console.log('PASS actual import, save, reload and shared-trip sanitation preserve the original 140-character note');
