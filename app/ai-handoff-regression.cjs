const fs=require('fs'),vm=require('vm'),assert=require('assert');const s=fs.readFileSync('src/app.html','utf8');let opened=[];const c={navigator:{clipboard:{writeText:()=>Promise.resolve()}},window:{open:u=>opened.push(u)},toast:()=>{}};vm.createContext(c);vm.runInContext(s.slice(s.indexOf('function aiOpen('),s.indexOf('async function flowCopy(')),c);const A={};const longP='旅行条件'.repeat(2000);c.aiOpen(longP,'chatgpt',A);assert(opened.pop().startsWith('https://chatgpt.com/?q='));assert.equal(A.promptText,longP);assert.equal(A.promptAi,'chatgpt');c.aiOpen('短い指示','chatgpt',A);assert(opened.pop().includes('?q='));assert.equal(A.promptText,'短い指示');c.aiOpen('条件','gemini',A);assert.equal(A.promptText,'条件');assert(s.includes('id="${prefix}_handoff_prompt"'));console.log('PASS long and short ChatGPT prompts auto-fill by URL and stay available for recovery copy; Gemini manual fallback preserved');

/* 送信できなかったときの復旧：同じ完全な指示文をコピーでき、自動入力なしで開き直せる */
{const c2={AI_NAME:{chatgpt:'ChatGPT',claude:'Claude',gemini:'Gemini'},esc:x=>String(x).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m])};vm.createContext(c2);
 vm.runInContext(s.slice(s.indexOf('const AI_PLAIN='),s.indexOf('function aiFlowBox(')),c2);
 const pr='指示<全文>"テスト"';
 const h=c2.aiRecoverBox({promptAi:'chatgpt'},'ai',pr);
 assert(h.includes('id="ai_recover"')&&!/<details[^>]*\bopen\b/.test(h.split('<summary>')[0]),'復旧欄は閉じた状態で出る');
 assert(h.includes('href="https://chatgpt.com/"')&&!h.includes('?q='),'自動入力なしで開き直すリンク');
 assert(h.includes('data-a="aiCopy"'),'同じ指示文をコピーするボタン');
 assert(h.includes('>指示&lt;全文&gt;&quot;テスト&quot;</textarea>'),'表示する指示文は渡された全文');
 const g=c2.aiRecoverBox({promptAi:'gemini'},'cg',pr);assert(g.includes('data-a="cgCopy"')&&!g.includes('<a '),'Geminiは従来どおりコピーのみ');
 assert(s.includes('case"aiEdit":S.ai.sent=null;S.ai.copyText=null;S.ai.back=false;S.ai.promptText=null;'),'条件を変えたら古い指示文を消す');
 assert(s.includes('case"open":if(S.cg&&S.cg.tid&&S.cg.tid!==id)S.cg={step:"idle"};'),'別の旅行を開いたら前の旅行のAI相談を消す');
 assert(s.includes('aiRecoverBox(A,prefix,prompt)'),'復旧欄は最新の条件から作った指示文を表示');
 console.log('PASS recovery copy after a ChatGPT send failure: full prompt, plain reopen link, stale prompt cleared on edit and trip switch');}
