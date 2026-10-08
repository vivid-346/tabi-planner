const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('src/app.html','utf8');
const source=src.slice(src.indexOf('async function memGc(){'),src.indexOf('/* JPEG の撮影日時'));
async function run({referenced=[],saved=[],undo=[],marked={}}={}){
 const deleted=[],store={trip:JSON.stringify({trips:{t:{mem:Object.fromEntries(saved.map(id=>[id,{}]))}}}), 'trip-mem-gc':JSON.stringify(marked)};
 let tx,q; const db={transaction(){tx={objectStore:()=>({delete:id=>deleted.push(id),openKeyCursor(){q={};queueMicrotask(()=>next(0));return q}})};return tx}};
 const ids=['live','new','old','undo','otherTab'];
 function next(i){q.result=i<ids.length?{key:ids[i],continue:()=>queueMicrotask(()=>next(i+1))}:null;q.onsuccess();if(i===ids.length)tx.oncomplete()}
 const c={phDB:async()=>db,DB:{trips:{t:{mem:Object.fromEntries(referenced.map(id=>[id,{}]))}}},UNDO:{before:JSON.stringify({mem:Object.fromEntries(undo.map(id=>[id,{}]))})},KEY:'trip',MEM:{url:new Map()},URL:{revokeObjectURL(){}},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},Date:{now:()=>10*86400000},Set,Promise};
 vm.createContext(c);vm.runInContext(source,c);await c.memGc();return {deleted,marks:JSON.parse(store['trip-mem-gc'])};
}
(async()=>{
 const r=await run({referenced:['live'],saved:['otherTab'],undo:['undo'],marked:{old:86400000,otherTab:86400000}});
 assert.deepEqual(r.deleted,['old']);assert(r.marks.new);assert(!r.marks.otherTab);assert(!r.marks.undo);
 const first=await run();assert.equal(first.deleted.length,0);
 console.log('PASS photo cleanup preserves new writes, persisted other-tab references and undo; old orphans only are removed');
})().catch(e=>{console.error(e);process.exitCode=1});
