// 実際の画面（index.html）でクリック・入力の経路を確かめる回帰テスト。Playwright が無い環境ではスキップする
let pw;try{pw=require('playwright')}catch(e){console.log('SKIP ux-dom-regression (playwright not installed)');process.exit(0)}
const path=require('path'),assert=require('assert');
(async()=>{const b=await pw.chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+path.join(__dirname,'index.html'));
const trip={title:'検証',dest:'金沢',start:'2026-11-21',end:'2026-11-23',people:2,sid:'S1',spots:{s1:{name:'兼六園',cat:'see'},s2:{name:'近江町市場',cat:'food'}},items:{},checks:{},ex:{},expenses:{e1:{title:'宿',amount:12000,cat:'stay',date:'',cur:'JPY'}}};
await p.evaluate(t=>{localStorage.clear();localStorage.setItem('tabinote-v1',JSON.stringify({onboarded:true,trips:{t1:t}}));localStorage.setItem('tabinote-v1-ui',JSON.stringify({tid:'t1',tab:'split'}))},trip);
await p.reload();await p.waitForTimeout(400);
const open=()=>p.evaluate(()=>{let q=document.getElementById('costForm');while((q=q.parentElement))if(q.tagName==='DETAILS')q.open=true});
// 1) 入力済みの宿代と単位（1人1泊）は「予定額に入れる」で変わらない
await open();await p.fill('#cost_hotel','6000');await p.selectOption('#cost_hotel_mode','personNight');
await p.click('[data-a="costFromEx"][data-id="e1"]');
assert.equal(await p.inputValue('#cost_hotel'),'6000','existing hotel amount kept');
assert.equal(await p.inputValue('#cost_hotel_mode'),'personNight','unit not changed when not filling');
assert.match(await p.evaluate(()=>document.getElementById('toast').innerText),/この金額で再計算/,'toast names the real button');
// 0円も上書きしない
await p.fill('#cost_hotel','0');await p.selectOption('#cost_hotel_mode','roomNight');await p.click('[data-a="costFromEx"][data-id="e1"]');
assert.equal(await p.inputValue('#cost_hotel'),'0');assert.equal(await p.inputValue('#cost_hotel_mode'),'roomNight');
// 空欄のときだけ金額を入れ、単位を合計にする（保存はしない）
await p.fill('#cost_hotel','');await p.click('[data-a="costFromEx"][data-id="e1"]');
assert.equal(await p.inputValue('#cost_hotel'),'12000');assert.equal(await p.inputValue('#cost_hotel_mode'),'total');
assert.equal(await p.evaluate(()=>T().costPlan?.booked?.hotel??null),null,'nothing saved until the user presses the button');
// 2) AI相談：相談文を書いている途中で必須場所のチップを押しても相談文は消えない
await p.evaluate(()=>{S.tab='ai';S.cg={step:'idle'};draw()});await p.waitForTimeout(200);
await p.fill('#cg_in','2日目をゆっくりにしたい');await p.fill('#cg_must','近江町市場');
await p.click('[data-a="cgMustAdd"][data-n="兼六園"]');
assert.equal(await p.inputValue('#cg_in'),'2日目をゆっくりにしたい','request draft survives chip click');
assert.equal(await p.inputValue('#cg_must'),'近江町市場、兼六園','chip appended to typed must list');
assert.equal(await p.evaluate(()=>T().must),'近江町市場、兼六園','must saved to the trip');
assert.deepEqual(errs,[]);await b.close();console.log('PASS money fill keeps typed amount/unit and names the real button; consult draft survives must chips');
})().catch(e=>{console.error(e);process.exit(1)});
