const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
for(const file of ['src/app.html','index.html']){
 const s=fs.readFileSync(path.join(__dirname,file),'utf8');
 const c={items:t=>Object.values(t.items),dates:t=>[t.start],yen:x=>x+'円',esc:String,md:String};
 vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function planFee('),s.indexOf('/* AIが既存予定')),c);
 const trip=fee=>({start:'2026-11-21',end:'2026-11-21',people:3,items:{a:{kind:'see',title:'Test facility',spot:'p'}},spots:{p:{fee,cat:'see'}},costPlan:{facilityAuto:true}});
 let t=trip('1人320円・一般入園（通常料金・訪問日要確認）');
 let f=c.facilityBudget(t);assert.equal(f.estimate,960);assert.equal(f.total,0);assert.equal(f.unknown.length,0);
 let row=c.costSummary(t).rows.find(x=>x.key==='other');assert.equal(row.min,960);assert(row.estimated);assert(row.note.includes('概算')&&row.note.includes('要確認'));
 for(const fee of ['未確認','公園無料・有料施設は別料金','1人320〜500円（通常料金・訪問日要確認）','1室320円（通常料金・訪問日要確認）','1人320円・子供160円（通常料金・訪問日要確認）']){
  t=trip(fee);f=c.facilityBudget(t);assert.equal(f.estimate,0,fee);assert.equal(f.unknown.length,1,fee);
  assert(c.costSummary(t).rows.find(x=>x.key==='other').missing,'all unknown facility costs must not become a zero subtotal');
 }
 t=trip('1人320円・一般入園（通常料金・訪問日要確認）');t.people='';assert.equal(c.facilityBudget(t).estimate,0);assert(c.facilityBudget(t).unknown.length);
 t=trip('無料');assert.equal(c.facilityBudget(t).total,0);assert(!c.costSummary(t).rows.find(x=>x.key==='other').missing,'explicitly free is a real zero');
 t=trip('1000円');t.costPlan.booked={other:8000};t.costPlan.bookScope=c.costScope(t);assert.equal(c.costSummary(t).rows.find(x=>x.key==='other').min,8000,'user-entered total overrides estimates');
 for(const suffix of ['要確認','別料金','1泊']){
  const fee='1000円（'+'説明'.repeat(25)+suffix+'）';
  assert.equal(c.facilityBudget(trip(fee)).unknown.length,1,'qualifiers after character 40 must still control classification');
 }
 Object.assign(c,{pad:n=>String(n).padStart(2,'0'),spots:t=>Object.values(t.spots),CATS:{see:1},KINDS:{see:1},conflict:()=>false});
 vm.runInContext(s.slice(s.indexOf('const normName='),s.indexOf('function aiCostForecast(')),c);
 const longFee='1人1000円（'+'説明'.repeat(25)+'訪問日要確認）';
 assert.equal(c.aiCheck(t,{spots:[{name:'Long fee',fee:longFee}]},'more').spots[0].fee,longFee,'import must retain the qualification beyond the old length limit');
 assert(c.aiCheck(t,{spots:[{name:'Long fee',fee:'1000円'+'説明'.repeat(200)+'要確認'}]},'more').spots[0].fee.startsWith('未確認：'),'overlong values must not lose qualification and become confirmed');
 console.log('PASS',file,'facility estimates, unknown prices, unknown headcount and booking priority');
}
