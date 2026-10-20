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
// 相談文の下書きは旅行ごと：別の旅行には出ず、元の旅行に戻ると残っている。旅行を消すと下書きも消える
await p.evaluate(()=>{DB.trips.t2={title:'京都',dest:'京都',start:'2026-12-01',end:'2026-12-02',sid:'S2',spots:{},items:{},checks:{},ex:{}};save();S.tid=null;draw()});
await p.evaluate(()=>{S.tid='t2';S.tab='ai';S.cg={step:'idle'};draw()});await p.waitForTimeout(150);
assert.equal(await p.inputValue('#cg_in'),'','other trip does not get the draft');
await p.fill('#cg_in','京都の1日目を短く');
await p.evaluate(()=>{S.tid='t1';S.tab='ai';S.cg={step:'idle'};draw()});await p.waitForTimeout(150);
assert.equal(await p.inputValue('#cg_in'),'2日目をゆっくりにしたい','original trip keeps its draft');
await p.evaluate(()=>{S.tid='t2';S.tab='plan';S.tripForm='edit';S.bk=null;S.confirm='trip';draw()});await p.evaluate(()=>document.querySelector('[data-a="delTripYes"]').click());await p.waitForTimeout(200);
assert.equal(await p.evaluate(()=>!!(S.cgDrafts||{}).t2),false,'deleting a trip drops its draft');
await p.evaluate(()=>{S.tid='t1';S.tab='split';S.cg={step:'idle'};draw()});
// 3) 場所の検索で見つからなければ、その名前で追加できる
await p.evaluate(()=>{S.tab='spots';S.q='';S.cat='';draw()});await p.waitForTimeout(200);
await p.fill('#sq','ひがし茶屋街');await p.waitForTimeout(150);
await p.click('[data-a="addSpotQ"]');
assert.equal(await p.inputValue('#sf_name'),'ひがし茶屋街','search word carried into the add form');
await p.evaluate(()=>{S.edit=null;S.q='';S.cat='';const t=T();t.items={z:{date:'2026-11-21',time:'10:00',kind:'see',title:'兼六園',spot:'s1',order:1}};save();draw()});await p.waitForTimeout(150);
await p.click('[data-a="cat"][data-c="__unplanned"]');await p.waitForTimeout(150);
const names=await p.evaluate(()=>[...document.querySelectorAll('#excards h3, #excards b')].map(x=>x.innerText).join('|'));
assert(!names.includes('兼六園')&&names.includes('近江町市場'),'unplanned filter shows only places not in the plan: '+names);
await p.evaluate(()=>{S.cat='';draw()});
// 4) 出発日を変えると予定・予約・お金の記録も同じ日数ずれる（チェックを外すとずらさない）
await p.evaluate(()=>{const t=T();t.items={a:{date:'2026-11-21',time:'10:00',kind:'see',title:'兼六園',spot:'',order:1},b:{date:'2026-11-23',time:'09:00',kind:'see',title:'近江町',spot:'',order:1}};t.fixed={f:{type:'flight',no:'JL1',from:'羽田',to:'小松',date:'2026-11-21',time:'08:00',adate:'',atime:'09:00'}};t.dayInfo={'2026-11-21':{area:'金沢駅'}};t.expenses.e1.date='2026-11-22';syncFixed(t);save();S.tab='plan';S.tripForm='edit';S.bk=null;draw()});await p.waitForTimeout(200);
assert.equal(await p.isChecked('#tf_shift'),true,'shift is on by default');
await p.fill('#tf_start','2026-11-28');await p.fill('#tf_end','2026-11-30');await p.click('#tripForm [type=submit]');await p.waitForTimeout(300);
const sh=await p.evaluate(()=>{const t=T();return {a:t.items.a.date,b:t.items.b.date,fx:Object.values(t.items).filter(x=>x.fix).map(x=>x.date),bk:t.fixed.f.date,area:Object.keys(t.dayInfo),ex:t.expenses.e1.date}});
assert.deepEqual(sh,{a:'2026-11-28',b:'2026-11-30',fx:['2026-11-28'],bk:'2026-11-28',area:['2026-11-28'],ex:'2026-11-29'},'everything moved by 7 days');
await p.evaluate(()=>{S.tripForm='edit';S.bk=null;draw()});await p.uncheck('#tf_shift');await p.fill('#tf_start','2026-11-27');await p.click('#tripForm [type=submit]');await p.waitForTimeout(300);
assert.equal(await p.evaluate(()=>T().items.a.date),'2026-11-28','unchecked keeps item dates');
// 日付の外になった予定は日程に案内が出て、日を選んで戻せる（11/27〜11/30にしたので 11/30 は内側。期間を縮めて外に出す）
await p.evaluate(()=>{S.tripForm='edit';S.bk=null;draw()});await p.uncheck('#tf_shift');await p.fill('#tf_end','2026-11-29');await p.click('#tripForm [type=submit]');await p.waitForTimeout(300);
await p.evaluate(()=>{S.tripForm=null;S.tab='plan';draw()});await p.waitForTimeout(200);
assert.equal(await p.locator('#orphanBox').count(),1,'orphan box shown');
await p.selectOption('#orph_b','2026-11-29');await p.click('[data-a="orphanMove"][data-id="b"]');await p.waitForTimeout(200);
assert.equal(await p.evaluate(()=>T().items.b.date),'2026-11-29','orphan moved back into the trip');
assert.equal(await p.locator('#orphanBox').count(),0,'box disappears when none left');
// 5) 出発日を変えても、新しく足した予約や日付を直した予約は入力どおり。保存エラーのあと直して保存しても二重にずらさない
await p.evaluate(()=>{DB.trips.t4={title:'予約',dest:'金沢',start:'2026-11-13',end:'2026-11-16',sid:'S4',spots:{},items:{},checks:{},ex:{},fixed:{f1:{type:'flight',no:'OLD1',from:'羽田',to:'小松',date:'2026-11-13',time:'08:00',adate:'',atime:'09:00'},h1:{type:'hotel',name:'宿A',in:'2026-11-13',inTime:'15:00',out:'2026-11-14',outTime:'10:00'}}};syncFixed(DB.trips.t4);save();S.tid='t4';S.tab='plan';S.tripForm='edit';S.bk=null;draw()});await p.waitForTimeout(200);
await p.fill('#tf_start','2026-11-14');await p.fill('#tf_end','2026-11-14');
await p.evaluate(()=>document.getElementById('bkDetails').open=true);
await p.click('[data-a="bkAdd"][data-type="flight"]');await p.waitForTimeout(150);
const ni=await p.evaluate(()=>S.bk.length-1);await p.fill(`#bk${ni}_no`,'NEW1');
assert.equal(await p.inputValue(`#bk${ni}_date`),'2026-11-14','new booking prefilled with the new start date');
await p.fill('#bk1_in','2026-11-15');await p.fill('#bk1_out','2026-11-16');
await p.click('#tripForm [type=submit]');await p.waitForTimeout(250);
assert.match(await p.evaluate(()=>$('toast').innerText),/期間の外/,'first save fails because the trip is too short');
await p.fill('#tf_end','2026-11-17');await p.click('#tripForm [type=submit]');await p.waitForTimeout(300);
const fx=await p.evaluate(()=>{const t=DB.trips.t4;const by=n=>Object.values(t.fixed).find(b=>(b.no||b.name)===n);return {old:by('OLD1').date,neu:by('NEW1').date,hin:by('宿A').in,hout:by('宿A').out}});
assert.deepEqual(fx,{old:'2026-11-14',neu:'2026-11-14',hin:'2026-11-15',hout:'2026-11-16'},'only the untouched saved booking moves, exactly once: '+JSON.stringify(fx));
// 6) 種類が1つでも、日程に入っている場所と入っていない場所があれば「まだ日程にない」が出る。全部入っていれば出さない
await p.evaluate(()=>{DB.trips.t5={title:'一種類',dest:'金沢',start:'2026-11-21',end:'2026-11-21',sid:'S5',spots:{a:{name:'兼六園',cat:'see'},b:{name:'21世紀美術館',cat:'see'}},items:{x:{date:'2026-11-21',time:'10:00',kind:'see',title:'兼六園',spot:'a',order:1}},checks:{},ex:{}};save();S.tid='t5';S.tripForm=null;S.tab='spots';S.cat='';S.q='';draw()});await p.waitForTimeout(150);
assert.equal(await p.locator('[data-a="cat"][data-c="__unplanned"]').count(),1,'chip shown with a single category');
await p.evaluate(()=>{DB.trips.t5.items.y={date:'2026-11-21',time:'13:00',kind:'see',title:'美術館',spot:'b',order:2};save();draw()});await p.waitForTimeout(100);
assert.equal(await p.locator('[data-a="cat"][data-c="__unplanned"]').count(),0,'no chip when everything is planned');
assert.deepEqual(errs,[]);await b.close();console.log('PASS booking shift keeps new/edited bookings and never double-shifts; unplanned chip with one category; trip date shift moves items/bookings/expenses; money fill keeps typed amount/unit and names the real button; consult draft survives must chips; search miss offers add');
})().catch(e=>{console.error(e);process.exit(1)});
