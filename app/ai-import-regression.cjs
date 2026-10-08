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
