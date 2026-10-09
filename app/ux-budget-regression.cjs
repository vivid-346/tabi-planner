const fs=require('fs'),vm=require('vm'),assert=require('assert');let s=fs.readFileSync(require('path').join(__dirname,'src/app.html'),'utf8');const block=s.slice(s.indexOf('const COST_CATS='),s.indexOf('function costRangeLabel'));const ctx={dates:t=>t.start===t.end?[t.start]:[t.start,t.end],items:t=>Object.values(t.items||{}),planFee:()=>null};vm.createContext(ctx);vm.runInContext(block,ctx);vm.runInContext(`
let t={start:'2026-11-21',end:'2026-11-23',people:3,items:{},spots:{}};
let c=costSummary(t);if(c.lo!==0||c.missing!==4)throw Error('unknown filled');
t.costPlan={forecast:{transport:{min:10000,max:10000},hotel:{min:20000,max:20000},food:{min:5000,max:6000}},scope:costScope(t,true)};
c=costSummary(t);if(c.lo!==105000||c.hi!==108000||c.missing!==1)throw Error('person conversion');
t.costPlan.booked={hotel:0};t.costPlan.bookScope=costScope(t);c=costSummary(t);if(c.lo!==45000||c.rows[1].source!=='予約・確定額')throw Error('zero booking');
t.costPlan.scope='stale';c=costSummary(t);if(c.missing!==3||c.lo!==0)throw Error('stale');
t={start:'2026-11-21',end:'2026-11-21',items:{},spots:{}};c=costSummary(t);if(c.missing!==3||!c.peopleUnknown||c.rows[1].min!==0)throw Error('daytrip');
`,ctx);console.log('5ケースPASS：未確認、人数換算、0円確定、条件変更、日帰り');
