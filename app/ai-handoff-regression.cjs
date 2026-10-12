const fs=require('fs'),vm=require('vm'),assert=require('assert');const s=fs.readFileSync('src/app.html','utf8');let opened=[];const c={navigator:{clipboard:{writeText:()=>Promise.resolve()}},window:{open:u=>opened.push(u)},toast:()=>{}};vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function aiOpen('),s.indexOf('async function flowCopy(')),c);const A={};const longP='旅行条件'.repeat(2000);c.aiOpen(longP,'chatgpt',A);assert(opened.pop().startsWith('https://chatgpt.com/?q='));assert.equal(A.promptText,longP);assert.equal(A.promptAi,'chatgpt');c.aiOpen('短い指示','chatgpt',A);assert(opened.pop().includes('?q='));assert.equal(A.promptText,'短い指示');c.aiOpen('条件','gemini',A);assert.equal(A.promptText,'条件');assert(s.includes('id="${prefix}_handoff_prompt"'));console.log('PASS long and short ChatGPT prompts auto-fill by URL and stay available for recovery copy; Gemini manual fallback preserved');

/* 送信できなかったときの復旧：同じ完全な指示文をコピーでき、自動入力なしで開き直せる */
{const c2={AI_NAME:{chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini'},esc:x=>String(x).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m])};vm.createContext(c2);
 vm.runInContext(s.slice(s.indexOf('const AI_PLAIN='),s.indexOf('function aiFlowBox(')),c2);
 const pr='指示<全文>"テスト"';
 const h=c2.aiRecoverBox({promptAi:'chatgpt'},'ai',pr);
 assert(h.includes('id="ai_sendfail"')&&!/<details[^>]*\bopen\b/.test(h.split('<summary>')[0]),'復旧欄は閉じた状態で出る');
 assert(h.includes('href="https://chatgpt.com/"')&&!h.includes('?q='),'自動入力なしで開き直すリンク');
 assert(h.includes('data-a="aiCopy"'),'同じ指示文をコピーするボタン');
 assert(h.includes('>指示&lt;全文&gt;&quot;テスト&quot;</textarea>'),'表示する指示文は渡された全文');
 const g=c2.aiRecoverBox({promptAi:'gemini'},'cg',pr);assert(g.includes('data-a="cgCopy"')&&!g.includes('<a '),'Geminiは従来どおりコピーのみ');
 assert(s.includes('case"aiEdit":S.ai.sent=null;S.ai.copyText=null;S.ai.back=false;S.ai.promptText=null;'),'条件を変えたら古い指示文を消す');
 assert(s.includes('case"open":if(S.cg&&S.cg.step!=="idle"&&S.cg.tid!==id)S.cg={step:"idle"};'),'別の旅行を開いたら前の旅行のAI相談を消す');
 assert(s.includes('S.cg={step:"wait",req:q,tid:S.tid}'),'コピーで始めた相談も、始めた旅行を覚える');
 assert(s.includes('if(S.tid&&S.cg&&(S.cg.step==="wait"||S.cg.step==="preview")&&S.cg.tid!==S.tid)S.cg={step:"idle"};'),'どの経路で旅行が変わっても、前の旅行の相談・答えを出さない');
 /* 再読み込みで復元した相談・旅程づくりでも、開いたAIを覚えて「自動入力なしで開き直す」リンクを出す */
 {const fr=s.slice(s.indexOf('function flowRestore('),s.indexOf('const T=()=>'));
  const mk=f=>{const st={};st['k-flow']=JSON.stringify(f);const c3={KEY:'k',DB:{trips:{t1:{}}},S:{tid:'t1'},localStorage:{getItem:k=>st[k]??null,removeItem:k=>{delete st[k]}},aiDefaults:()=>({}),aiPrompt:()=>'AIP',cgPrompt:()=>'CGP',Date};vm.createContext(c3);vm.runInContext(fr,c3);assert.equal(c3.flowRestore(),true);return c3.S};
  const a=mk({k:'ai',tid:'t1',kind:'plan',o:{},sent:'chatgpt',at:Date.now()});assert.equal(a.ai.promptAi,'chatgpt','復元した旅程づくりは開いたAIを覚える');assert.equal(a.ai.promptText,'AIP');
  const b=mk({k:'cg',tid:'t1',req:'q',ai:'claude',at:Date.now()});assert.equal(b.cg.promptAi,'claude','復元した相談は開いたAIを覚える');assert.equal(b.cg.tid,'t1','復元した相談は旅行を覚える');assert.equal(b.cg.promptText,'CGP');
  const h2=c2.aiRecoverBox(b.cg,'cg','CGP');assert(h2.includes('href="https://claude.ai/new"'),'復元後も自動入力なしで開き直すリンクが出る');}
 assert(s.includes('aiRecoverBox(A,prefix,prompt)'),'復旧欄は最新の条件から作った指示文を表示');
 /* ID重複防止：送信復旧欄のIDが、表示し直すお願い（${prefix}_recover textarea）など既存IDと重ならない */
{const box=s.slice(s.indexOf('function aiRecoverBox('),s.indexOf('function aiFlowBox('));
 const flow=s.slice(s.indexOf('function aiFlowBox('),s.indexOf('\n',s.indexOf('function aiFlowBox(')+5000));
 const ids=src=>[...src.matchAll(/id="\$\{prefix\}_([a-z_]+)"/g)].map(m=>m[1]);
 const a=ids(box),b=ids(flow);
 assert(a.includes('sendfail')&&a.includes('handoff_prompt'),'送信復旧欄のIDを抽出できる');
 assert(b.includes('recover'),'既存の表示し直すお願いtextareaのIDは維持');
 assert(!a.some(x=>b.includes(x)),'送信復旧欄と既存フローでIDが重複しない: '+a.filter(x=>b.includes(x)));
 assert(new Set(a).size===a.length,'送信復旧欄の中でID重複なし');
 assert(/\$\(prefix\+"_recover"\)/.test(s)&&/for="\$\{prefix\}_recover"/.test(s),'既存Recoverコピーの失敗時選択とlabelは_recover textareaを指す');
 assert(/for="\$\{prefix\}_handoff_prompt"/.test(box),'送信復旧欄のlabel関連付け');}

console.log('PASS recovery copy after a ChatGPT send failure: full prompt, plain reopen link, stale prompt cleared on edit and trip switch');}
