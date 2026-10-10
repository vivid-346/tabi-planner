const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync('src/app.html','utf8');
let notices=[],draws=0;
const trip={items:{saved:{title:'既存の予定'}},spots:{saved:{name:'既存の場所'}}};
const c={S:{ai:{step:'form',kind:'plan',o:{}}},T:()=>trip,draw:()=>draws++,toast:x=>notices.push(x),window:{scrollTo(){}},navigator:{clipboard:{writeText:async()=>{throw Error('denied')}}},$:()=>({focus(){},select(){}})};
vm.createContext(c);
vm.runInContext(s.slice(s.indexOf('function aiCopyRules('),s.indexOf('function cgPrompt(')),c);
vm.runInContext(s.slice(s.indexOf('function pickJSON('),s.indexOf('/* AIの答えをコピーしたとき')),c);
vm.runInContext(s.slice(s.indexOf('function aiParse('),s.indexOf('/* ================= 旅行を渡す')),c);
const raw={days:[{date:'2026-11-21',items:[{title:'大阪城公園',kind:'see',time:'12:00'}]}],spots:[{name:'大阪城公園',fee:'無料',note:'自然と歴史を楽しむ'}]};
c.aiCheck=(t,x)=>{assert.deepEqual(JSON.parse(JSON.stringify(x)),raw);return {nItems:1,spots:x.spots,warn:[]}};
for(const text of [JSON.stringify(raw),'```json\n'+JSON.stringify(raw)+'\n```']){c.aiParse(text);assert.equal(c.S.ai.step,'preview');assert.equal(c.S.ai.c.nItems,1)}
const saved=JSON.stringify(trip);c.S.ai={step:'form',kind:'plan',o:{}};
c.aiParse('↓ 下のJSON枠のコピーアイコンを押してください。');assert.equal(c.S.ai.step,'form');assert(c.S.ai.manual);assert.equal(JSON.stringify(trip),saved);assert(notices.at(-1).includes('表示されない'));
c.aiParse(c.aiCopyRules()+'\n'+JSON.stringify(raw));assert.equal(c.S.ai.step,'form');assert(notices.at(-1).includes('指示文'));
assert(c.aiCopyRules().includes('通常の本文'));assert(!c.aiCopyRules().includes('コードブロック1つに必ず'));assert(c.aiRecoveryPrompt().includes('件数を変えず'));assert(c.aiRecoveryPrompt().includes('JSONを作成していない場合'));assert(c.aiRecoveryPrompt().includes('最初の依頼の条件と指定されたJSON構造'));
assert(!s.includes('1つのJSONコード枠だけ'));assert(s.includes('case"aiRecover"'));assert(s.includes('case"cgRecover"'));
c.aiRecoverCopy('ai').then(()=>{assert(notices.at(-1).includes('選択'));console.log('PASS plain JSON and legacy fenced JSON; incomplete answer preserves trip; prompt rejection; recovery clipboard-denied fallback; all output rules consistent')});
