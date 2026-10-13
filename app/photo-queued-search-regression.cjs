const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
// 検索中に場所の名前を変えたとき、新しい名前の検索が捨てられず、今の検索が終わったあとに必ず行われること
async function scenario(file){
 const src=fs.readFileSync(path.join(__dirname,file),'utf8');
 const calls=[],resolvers=[],timers=[];
 const trip={spots:{p:{name:'Old place'}}};
 const c={DB:{trips:{t:trip}},S:{tid:'t',tab:'plan'},PH:{jobs:new Set()},
  photoOn:()=>true,navigator:{onLine:true},draw:()=>{},$:()=>null,save:()=>true,phCache:()=>{},toast:()=>{},
  findPhoto:sp=>{calls.push(sp.name);return new Promise(r=>resolvers.push(r))},
  setTimeout:(fn)=>{timers.push(fn)}};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf('async function fillPhotos('),src.indexOf('const uid=')),c);
 const first=c.fillPhotos('t');
 await Promise.resolve();
 // 利用者が名前を変えて保存（保存処理は場所オブジェクトを作り直し、写真を外してから fillPhotos(tid,[id]) を呼ぶ）
 trip.spots.p={name:'New place'};
 const second=c.fillPhotos('t',['p']);await second;
 assert.equal(calls.length,1,'rename during a running search must not start a parallel search');
 resolvers[0]({u:'https://upload.wikimedia.org/old.jpg'});await first;
 assert(!trip.spots.p.photo,'old-name result must not be written to the renamed place');
 // 待っていた検索は、今の検索の後に予約される
 const queued=timers.filter(fn=>!/phCache/.test(String(fn)));
 for(const fn of queued)fn();
 await Promise.resolve();
 assert.deepEqual(calls,['Old place','New place'],'queued search for the new name must run after the first one finishes');
 const found={u:'https://upload.wikimedia.org/new.jpg'};resolvers[1](found);
 for(let i=0;i<5;i++)await Promise.resolve();
 await new Promise(r=>setImmediate(r));
 assert.strictEqual(trip.spots.p.photo,found,'renamed place receives the photo for its new name');
 assert.equal(c.PH.jobs.size,0);assert.equal(c.PH.pending?.size||0,0,'no leftover queued searches');
 assert.equal(c.S.phBusy,0);
}
(async()=>{for(const file of ['src/app.html','index.html'])await scenario(file);
 console.log('PASS a rename during a running photo search queues and runs the new-name search afterwards (src and built)');
})().catch(e=>{console.error(e);process.exitCode=1});
