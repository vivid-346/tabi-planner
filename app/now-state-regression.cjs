const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'src/app.html'),'utf8');
let hour=10,min=30;
class Clock extends Date{constructor(){super(2026,9,8,hour,min)}}
const c={Date:Clock,ymd:()=> '2026-10-08',dates:t=>[t.start],items:t=>t.rows,timeKey:s=>s?Number(s.slice(0,2))*60+Number(s.slice(3)):null,esc:String,addMin:()=> '11:00',fmtMin:String,Native:{dirUrl:()=>''}};
vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function nowCard(t)'),source.indexOf('const MODE_L=')),c);
const t={start:'2026-10-08',rows:[{id:'a',title:'京都駅',time:'10:00',dur:60}]};
assert(c.nowCard(t).includes('>いま</div>'));
hour=11;min=0;assert(!c.nowCard(t).includes('>いま</div>'));assert(c.nowCard(t).includes('直前の予定'));
hour=20;assert(c.nowCard(t).includes('直前の予定'));
hour=10;min=30;t.rows[0].done=true;assert(c.nowCard(t).includes('直前の予定'));
t.rows[0].done=false;t.rows[0].dur=0;assert(c.nowCard(t).includes('直前の予定'));
hour=9;t.rows.push({id:'b',title:'次',time:'12:00',dur:60});assert(c.nowCard(t).includes('次の予定'));
t.start='2026-10-09';assert.equal(c.nowCard(t),'');
console.log('PASS nowCard: active/expired/exact end/done/unknown duration/before start/other day');
