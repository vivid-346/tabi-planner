/* 回答の誤コピー判定：有効なデータは通常どおり読み込み、確実に分かる誤コピーだけ専用の案内にする */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['src/app.html','index.html']){const s=fs.readFileSync(file,'utf8');
 const c={};vm.createContext(c);vm.runInContext(s.slice(s.indexOf('const AI_MISCOPY_LABEL='),s.indexOf('/* ================= 旅行を渡す'))+';this.AI_MISCOPY_LABEL=AI_MISCOPY_LABEL;this.aiMisCopy=aiMisCopy;',c);
 const prompt='あなたは旅行プランナー兼、スマートフォン向けUI設計者です。\n'+'旅行条件'.repeat(200)+'\n{"days":[{"date":"YYYY-MM-DD","items":[{"time":"HH:MM"}]}]}';
 // 短い説明文だけをコピーした
 for(const x of ['JSONをコピーします','完全なJSONデータをコピー','完全なJSONデータをコピーしました','JSON全文をもう一度コピー','データをコピー'])assert.equal(c.aiMisCopy(x,[prompt]),'label',x);
 // 送信前の指示文がクリップボードに残った（コピー操作が何もしなかった）。改行コードの違いも同じと判定
 assert.equal(c.aiMisCopy(prompt,[prompt]),'prompt');assert.equal(c.aiMisCopy(prompt.replace(/\n/g,'\r\n'),[prompt]),'prompt');
 assert.equal(c.aiMisCopy(prompt.slice(0,1500),[prompt]),'prompt','途中までの指示文も送った指示文と分かる');
 // 判定しないもの：空・短いJSON語・長い不正データ・本物のJSON・他人の文章・短すぎる指示文の一致
 for(const x of ['','   ','JSON','コピー','↓ 下のJSON枠のコピーアイコンを押してください。','JSONをコピーして旅ノートに戻ってください','あ'.repeat(3000),'{"days":[]}','{"days":[{"date":"2026-11-21","items":[{"time":"10:00","title":"コピー"}]}]}','旅程ができました。完全なJSONデータをコピー\n```json\n{"days":[]}\n```'])assert.equal(c.aiMisCopy(x,[prompt]),'',JSON.stringify(x).slice(0,40));
 assert.equal(c.aiMisCopy('短い文',['短い文']),'','200字未満の文は送った指示文として扱わない');
 assert.equal(c.aiMisCopy(prompt,[]),'','送った指示文が分からないときは指示文と断定しない');
 assert(c.AI_MISCOPY_LABEL.includes('JSONの枠があれば')&&c.AI_MISCOPY_LABEL.includes('枠もない場合は'),'JSON枠の有無で分けた段階的な案内');
 // 判定は既存の解析が失敗した後だけ（catch の中）。有効なデータは先に読み込む
 const ai=s.slice(s.indexOf('function aiParse('),s.indexOf('\n',s.indexOf('function aiParse(')+800));
 assert(ai.indexOf('aiMisCopy(')>ai.indexOf('catch(e)'),'旅程づくりは解析失敗後に判定');
 const cg=s.slice(s.indexOf('function cgParse('),s.indexOf('function planView('));
 assert(cg.indexOf('aiMisCopy(')>cg.indexOf('catch(e)'),'相談は解析失敗後に判定');
 assert(/throw Error\(aiMisCopy\(tx\)==='label'\?'label':'empty'\)/.test(s),'自動読み取りで説明文だけのときも専用の案内');
 // 回答が止まったときの案内は既存の復旧欄の中だけ
 const box=s.slice(s.indexOf('function aiRecoverBox('),s.indexOf('function aiFlowBox('));
 assert(box.includes('『再試行』が表示されていれば試してください。回答が途中なら『続けて』と送れます。取り込みには完全なJSONが必要です。'),'回答停止の案内');
 assert(!/続き.*そのまま貼/.test(box),'続きの断片を貼れば成功すると案内しない');}
/* Execute the actual importer and clipboard entry points, rather than checking
   only helper results or the position of calls in the source. */
async function importerRegression(file){
 const s=fs.readFileSync(file,'utf8'),messages=[],button={focus:()=>{}};
 const trip={items:{keep:{title:'Existing itinerary'}},spots:{}};
 const before=JSON.stringify(trip);
 const prompt='Sent travel instructions '.repeat(30)+' {JSON schema}';
 const c={S:{tid:'test',ai:{kind:'plan',promptText:prompt},cg:{promptText:prompt}},
  T:()=>trip,dates:()=>['2026-11-21'],spots:()=>[],pad:n=>String(n).padStart(2,'0'),
  KINDS:{see:1,food:1,move:1,stay:1,other:1},CATS:{see:1},
  costRanges:()=>({}),conflict:()=>false,timeKey:()=>null,
  toast:msg=>messages.push(msg),draw:()=>{},cgScroll:()=>{},
  window:{scrollTo:()=>{}},$:()=>button,
  navigator:{clipboard:{readText:async()=>c.clipboardText}},
  waitLimit:p=>p};
 vm.createContext(c);
 const load=(start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a,start);vm.runInContext(s.slice(a,b),c)};
 load('function aiCostCheck(','function cleanCosts(');
 load('function pickJSON(','const normName=');
 load('const normName=','function aiCostForecast(');
 load('function aiCompactDisplayRules(','function cgParse(');
 load('function cgParse(','function planView(');
 load('async function aiReadClipboard(','/* ================= 旅行を渡す');
 c.cgScroll=()=>{};
 const raw={days:[{date:'2026-11-21',items:[{time:'10:00',kind:'see',title:'Test stop'}]}],spots:[]};
 const json=JSON.stringify(raw),fence=String.fromCharCode(96).repeat(3);
 for(const key of ['ai','cg'])for(const clipboard of [false,true]){
  const run=async text=>{
   c.S[key]={kind:'plan',promptText:prompt,step:'wait'};messages.length=0;
   if(clipboard){c.clipboardText=text;const requestState=c.S[key];await c.aiReadClipboard(key==='cg');assert.equal(requestState.clipBusy,false);assert.equal(button.disabled,false)}
   else c[key==='cg'?'cgParse':'aiParse'](text);
   assert.equal(JSON.stringify(trip),before,'preview/error must not modify the trip');
  };
  for(const text of ['JSONをコピーします','完全なJSONデータをコピー']){
   await run(text);assert.equal(c.S[key].step,'wait');assert.equal(c.S[key].manual,true);
   assert(messages.some(m=>m.includes('データをコピーできていないようです')&&m.includes('枠もない場合は')),`${file} ${key} clipboard=${clipboard}: label recovery must be visible`);
  }
  await run(prompt);assert.equal(c.S[key].manual,true);assert(messages.some(m=>m.includes('AIに送る指示文がコピーされています')));
  for(const text of ['', 'JSON', '{"days":[']){
   await run(text);assert.equal(c.S[key].manual,true);assert(messages.length>0);
   assert(!messages.some(m=>m.includes('データをコピーできていないようです')||m.includes('AIに送る指示文がコピーされています')),'other errors keep their own advice');
  }
  for(const text of [json,fence+'json\n'+json+'\n'+fence]){
   await run(text);assert.equal(c.S[key].step,'preview');assert.equal(c.S[key].c.nItems,1);
   assert.equal(c.S[key].c.days['2026-11-21'][0].title,'Test stop');assert.equal(messages.length,0,'valid data must not show mis-copy advice');
  }
 }
}
(async()=>{for(const file of ['src/app.html','index.html'])await importerRegression(file);console.log('PASS actual planning/consultation import and clipboard flows: recovery messages, valid JSON previews and unchanged trip data')})().catch(e=>{console.error(e);process.exitCode=1});
