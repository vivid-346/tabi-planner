const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['src/app.html','index.html']){
  const s=fs.readFileSync(file,'utf8');
  const prefix=fs.readFileSync('ai-compact-display-prompt.txt','utf8').replace(/\r\n/g,'\n').trimEnd();
  const c={dates:()=>['2026-11-21','2026-11-22'],wd:()=>'',spots:()=>[{name:'兼六園'}],items:()=>[]};vm.createContext(c);
  vm.runInContext(s.slice(s.indexOf('function aiCompactDisplayRules('),s.indexOf('function aiRecoveryPrompt(')),c);
  vm.runInContext(s.slice(s.indexOf('function aiPrompt('),s.indexOf('function pickJSON(')),c);
  const TIME='time と arrive は "HH:MM"（例："09:30"）か空文字 "" だけにする。未定・目安・範囲・条件などの説明は time に書かず note に書く。';
  const FULL='詳細パネルには、コピーボタンとは別に「JSON全文」を折りたたみで必ず置き、コピーできない場合でもそこから全文を選んでコピーできるようにする。';
  const o={dest:'金沢',from:'',people:'',move:'電車・バス',prefs:['定番の名所'],pace:'ふつう',count:12,mode:'new',src:'金沢の近江町市場で海鮮丼を食べた。',extra:''};
  // 実際の入口：日程作成(plan・置き換え/追加)、候補を増やす(more)、文章から候補(text)
  for(const [kind,mode] of [['plan','new'],['plan','add'],['more','new'],['text','new']]){
    const pr=c.aiPrompt({},{...o,mode},kind);
    assert(pr.startsWith(prefix+'\n\n'),file+' '+kind+'/'+mode+': verified display text must stay first and unchanged');
    assert.equal(pr.split(TIME).length,2,file+' '+kind+'/'+mode+': time rule once');
    assert.equal(pr.split(FULL).length,2,file+' '+kind+'/'+mode+': full JSON rule once');
    const sh=pr.indexOf('## 返事の形（JSON）\n');assert(sh>0);
    assert(pr.slice(sh).startsWith('## 返事の形（JSON）\n'+TIME+'\n'+FULL+'\n{'),file+' '+kind+'/'+mode+': rules sit directly under the JSON heading');
  }
  const cp=s.slice(s.indexOf('function costPrompt('),s.indexOf('\n',s.indexOf('function costPrompt(')));assert(cp.length>100&&!cp.includes('HH:MM')&&!cp.includes('JSON全文」を折りたたみ'),file+': cost prompt unchanged');
}
console.log('PASS prompt time-format and always-visible full JSON rules in plan(new/add)/more/text prompts (src and built), verified display text untouched, cost prompt untouched');
