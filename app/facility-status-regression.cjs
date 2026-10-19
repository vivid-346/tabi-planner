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
// Devin #38 追加指摘：AIが書く料金の言い方の違い／全施設が未確認のときの見積もりプレビュー
for(const file of ['src/app.html','index.html']){
 const s=fs.readFileSync(path.join(__dirname,file),'utf8');
 const c={items:t=>Object.values(t.items),dates:t=>[t.start],yen:x=>x+'円',esc:String,md:String,pad:n=>String(n).padStart(2,'0'),spots:t=>Object.values(t.spots),CATS:{see:1},KINDS:{see:1},conflict:()=>false,aiLinkBox:()=>''};
 vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function planFee('),s.indexOf('/* AIが既存予定')),c);vm.runInContext(s.slice(s.indexOf('const normName='),s.indexOf('function aiCostForecast(')),c);
 vm.runInContext(s.slice(s.indexOf('function aiCostForecast('),s.indexOf('\n',s.indexOf('function aiCostForecast('))),c);
 const trip=fee=>({start:'2026-11-21',end:'2026-11-21',people:3,items:{a:{kind:'see',title:'Test facility',spot:'p'}},spots:{p:{fee,cat:'see'}},costPlan:{facilityAuto:true}});
 // 実際にAIが返した書き方（Devinの例と、2026-10-13の実回答）
 for(const [fee,yen] of [['1人2000円（大人通常料金・訪問日要確認）',2000],['1人320円・通常料金（大人個人、訪問日要確認）',320],['大人1000円（通常料金・訪問日要確認）',1000],['1人あたり500円（一般・通常料金・訪問日要確認）',500]]){
  const f=c.facilityBudget(trip(fee));assert.equal(f.estimate,yen*3,file+' '+fee);assert.equal(f.unknown.length,0,file+' '+fee);
 }
 // 曖昧なものは未確認のまま
 for(const fee of ['公園散策無料／菱櫓・五十間長屋等は1人320円・通常料金（大人個人、訪問日要確認）','1人1000円（大人通常料金・訪問日要確認・特別展は別料金）','1人320円（学生通常料金・訪問日要確認）','1人1000円（通常料金・1泊・訪問日要確認）','1人500〜800円（大人通常料金・訪問日要確認）','1人320円（大人通常料金）']){
  const f=c.facilityBudget(trip(fee));assert.equal(f.estimate,0,file+' '+fee);assert.equal(f.unknown.length,1,file+' '+fee);
 }
 // 全施設が金額未確認のとき、プレビューに「自動計算を継続」と出さない
 const unknownTrip=trip('未確認');const A={step:'preview',o:{people:3,move:'電車・バス',from:''},c:{costs:{transport:{min:1000,max:1000,note:'往復'}},warn:[]}};
 const html=c.costAiView(unknownTrip,A);
 assert(!/観光・体験：未確認<\/b>（施設料金の自動計算を継続）/.test(html),file+': unknown facilities must not show the automatic-calculation label');
 assert(/観光・体験：未確認<\/b>（施設の料金が未確認のため計算できません）/.test(html),file+': unknown facilities explain why no estimate is shown');
 const known=c.costAiView(trip('1人320円・一般入園（通常料金・訪問日要確認）'),A);
 assert(/（施設料金の自動計算を継続）/.test(known),file+': priced facilities keep the automatic-calculation label');
 console.log('PASS',file,'AI fee wording variants and unknown-facility preview label');
}
