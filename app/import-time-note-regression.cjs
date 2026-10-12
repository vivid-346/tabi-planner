/* 取り込み時の情報保全：時刻が空（未定）の別の予定を重複として捨てない／HH:MMでないAIの時刻の文字をメモに残す */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['src/app.html','index.html']){const s=fs.readFileSync(file,'utf8');
 const c={pad:n=>String(n).padStart(2,'0')};vm.createContext(c);
 vm.runInContext(s.slice(s.indexOf('const okTime='),s.indexOf('\n',s.indexOf('const okTime=')))+';'+s.slice(s.indexOf('const AI_NOTE_MAX='),s.indexOf('/* AIの返事を検査して'))+';this.aiTimeNote=aiTimeNote;this.AI_NOTE_MAX=AI_NOTE_MAX;',c);
 const w=[];const n=(x,note='')=>c.aiTimeNote(x,note,w);
 assert.equal(n({time:'10:00'},'メモ'),'メモ','HH:MMはそのまま');assert.equal(n({time:'9:05'},'m'),'m','1桁の時もHH:MMとして扱う');
 assert.equal(n({time:''},'メモ'),'メモ','空からは何も作らない');assert.equal(n({},'メモ'),'メモ');assert.equal(n({time:null},'メモ'),'メモ');
 assert.equal(n({time:'未定'},'メモ'),'【AIの開始時刻：未定】メモ');
 assert.equal(n({time:'18:00〜20:00の範囲で調整'},'夕食'),'【AIの開始時刻：18:00〜20:00の範囲で調整】夕食','範囲はHH:MMを取り出さずそのまま残す');
 assert.equal(n({time:'13:00（目安）'},''),'【AIの開始時刻：13:00（目安）】','説明つき時刻も推測で取り出さない');
 assert.equal(n({time:'12:00',arrive:'到着後すぐ'},'移動'),'【AIの到着時刻：到着後すぐ】移動','出発と到着を区別');
 assert.equal(n({time:'朝',arrive:'夕方'},''),'【AIの開始時刻：朝】【AIの到着時刻：夕方】');
 assert.equal(n({time:'未定'},'【AIの開始時刻：未定】メモ'),'【AIの開始時刻：未定】メモ','同じ補足を重ねない（再取り込み）');
 // 保存できるメモは160字。元のメモは削らず、入りきらない補足は短くして警告
 const long='あ'.repeat(140);const r=n({time:'い'.repeat(40)},long);
 assert(r.endsWith(long),'元のメモは削らない');assert(r.length<=c.AI_NOTE_MAX,'160字以内');assert(r.startsWith('【AIの開始時刻：')&&r.includes('…】'),'補足は短くして残す');assert(w.some(x=>x.includes('短くして残した')),'短くしたことを知らせる');
 // 重複判定：時刻が両方空なら kind と title も同じときだけ同じ予定
 const sameSrc=s.slice(s.indexOf('function aiSameItem('),s.indexOf('function aiPrepare('));const d={normName:x=>String(x||'').replace(/\s/g,'').toLowerCase()};vm.createContext(d);vm.runInContext(sameSrc,d);
 const t={spots:{}};const it=(o)=>({date:'2026-11-21',time:'',kind:'see',title:'近江町市場',spotName:'近江町市場',...o});
 assert.equal(d.aiSameItem(t,it(),it({kind:'food',title:'近江町市場で昼ごはん'})),false,'同じ場所・時刻未定でも観光と昼食は別の予定');
 assert.equal(d.aiSameItem(t,it(),it()),true,'まったく同じ未定の予定は重複');
 assert.equal(d.aiSameItem(t,it(),it({title:'近江町市場散策'})),false,'タイトルが違えば別（意味を推測して同一化しない）');
 assert.equal(d.aiSameItem(t,it(),it({date:'2026-11-22'})),false,'別日');assert.equal(d.aiSameItem(t,it(),it({spotName:'兼六園',title:'兼六園'})),false,'別の場所');
 assert.equal(d.aiSameItem(t,it({time:'10:00'}),it()),false,'片方だけ時刻あり');
 assert.equal(d.aiSameItem(t,it({time:'10:00'}),it({time:'10:00',kind:'food',title:'昼'})),true,'時刻ありの既存判定は変えない');
 assert.equal(d.aiSameItem(t,it({title:''}),it({title:''})),false,'タイトルが欠けた未定の予定は安易に捨てない');}
console.log('PASS import keeps unknown-time items at the same place apart and stores non-HH:MM AI time text in the note without inventing times');
