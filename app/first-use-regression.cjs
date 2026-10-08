const path=require('path'),fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['app.html','index.html']){
 const s=fs.readFileSync(path.join(__dirname,file==='app.html'?'src/app.html':'index.html'),'utf8');for(const m of s.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 const c={S:{tripForm:'new',ai:{o:{from:''}}},DB:{home:'東京'},esc:x=>String(x??''),MOVES:{train:'電車'},T:()=>({}),dates:t=>[t.start,t.end],items:()=>[],normName:x=>x,timeKey:x=>x?+x.slice(0,2)*60 + +x.slice(3):null,hm:x=>String(x),distKm:()=>0,legMin:()=>0,mainMove:()=> 'train',yen:x=>x+'円',md:x=>x};vm.createContext(c);
 vm.runInContext(s.slice(s.indexOf('function tripForm('),s.indexOf('/* ================= 画面：日程')),c);
 const html=c.tripForm();assert(html.includes('詳しく（任意）'));assert(html.indexOf('id="tf_end"')<html.indexOf('<details '));assert(html.indexOf('id="tf_people"')>html.indexOf('<details '));for(const id of ['tf_dest','tf_start','tf_end','tf_people','tf_move','tf_budget','tf_from','tf_title'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 vm.runInContext(s.slice(s.indexOf('function planFee('),s.indexOf('function moneyStats(')),c);
 const t={start:'2026-11-21',end:'2026-11-23',people:2,from:'東京',spots:{},items:{}};
 const raw={warn:[],spots:[],days:{[t.start]:[{time:'09:00',arrive:'11:30',kind:'move',title:'飛行機で那覇へ',note:''}]}};const out=c.aiPrepare(t,raw,'replace');assert.equal(out.days[t.start][0].time,'09:00');assert.equal(out.days[t.start][0].arrive,'11:30');assert(out.originHint);assert(!out.warn.some(x=>x.includes('時刻を未定')));assert.equal(raw.days[t.start][0].note,'');
 const box=c.planCostBox(t);assert(box.includes('詳しく（内訳・予約金額）'));assert(box.indexOf('交通費の見積もり条件')<0);assert(box.includes('data-a="moneySet"'));assert(box.includes('data-t="split"'));
 console.log('PASS '+file+' first-use form, preserved AI times and compact budget');
}
