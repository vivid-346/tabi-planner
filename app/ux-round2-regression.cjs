const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
for(const file of ['src/app.html','index.html']){
  const s=fs.readFileSync(path.join(__dirname,file),'utf8');
  const take=(a,b)=>{const i=s.indexOf(a);assert(i>=0,file+': missing '+a);const j=s.indexOf(b,i);assert(j>i,file+': missing '+b);return s.slice(i,j)};
  const c={esc:x=>String(x),pad:x=>String(x).padStart(2,'0'),md:d=>d.slice(5).replace('-','/'),wd:()=>'',dates:t=>t.ds,nextOrder:()=>1,normName:x=>String(x||'').replace(/\s/g,''),spots:()=>[],uid:()=>'u'};
  vm.createContext(c);
  vm.runInContext(take('function timeSel(','function tripPhoto(')+take('function mustList(','function mustPrompt(')+take('/* 必ず行きたい場所を旅行に保存','function aiMustChips(')+take('const BK_DEF=','/* 日程の上に出す予約の入口')+take('function fixedPrompt(','function tripForm('),c);
  // 1) 場所を選び直したとき、自動で入れた内容だけが新しい場所に追従し、手入力は残る
  assert.equal(c.autoFollow('', '', '兼六園'),'兼六園');
  assert.equal(c.autoFollow('兼六園','兼六園','千里浜'),'千里浜',file+': auto title follows spot change');
  assert.equal(c.autoFollow('兼六園でお茶','兼六園','千里浜'),'兼六園でお茶',file+': typed title is kept');
  assert.equal(c.autoFollow('兼六園','兼六園',''),'',file+': clearing the spot clears the auto title');
  // 2) 予約は1分単位で選べて、08:37が日程と指示文まで保たれる。普通の予定は5分刻みのまま、既存の端数は保持
  const bk=c.timeSel('bk0_time','08:37',1);
  assert((bk.match(/<option[^>]*>\d\d<\/option>/g)||[]).length===60,file+': booking minutes 00-59');
  assert(/<option selected>37<\/option>/.test(bk),file+': 08:37 selected');
  const it=c.timeSel('f_t','10:00');
  assert.equal((it.match(/<option[^>]*>\d\d<\/option>/g)||[]).length,12,file+': item minutes stay 5-minute steps');
  assert(/<option selected>23<\/option>/.test(c.timeSel('f_t','09:23')),file+': odd existing minute is kept on edit');
  const t={ds:['2026-11-05','2026-11-06'],items:{},fixed:{f:{type:'flight',no:'JL183',from:'羽田',to:'小松',date:'2026-11-05',time:'08:37',adate:'',atime:'09:23'}}};
  c.syncFixed(t);
  const fx=Object.values(t.items).find(x=>x.fix==='f');
  assert.equal(fx.time,'08:37');assert.equal(fx.arrive,'09:23');
  assert(c.fixedPrompt(t).includes('08:37発'),file+': prompt keeps 08:37');
  assert(c.fixedPrompt(t).includes('09:23着'),file+': prompt keeps 09:23');
  // 4) 必ず行きたい場所は入力のたびに旅行へ保存され、別の旅行には混ざらない
  const a={},b={must:'千里浜'};
  assert.equal(c.mustSave(a,'兼六園、近江町市場、金沢21世紀美術館'),true);
  assert.equal(a.must,'兼六園、近江町市場、金沢21世紀美術館',file+': third place kept after closing');
  assert.equal(c.mustSave(a,a.must),false,file+': no-op when unchanged');
  assert.equal(b.must,'千里浜',file+': other trip untouched');
  assert.deepEqual(c.mustList({must:'兼六園、 近江町市場\n兼六園'}),['兼六園','近江町市場'],file+': list splits and dedupes');
}
// 共有・バックアップの往復でmustが残る（cleanTripの保持）
const src=fs.readFileSync(path.join(__dirname,'src/app.html'),'utf8');
assert(/must:cs_\(o\.must\|\|"",600\)/.test(src),'cleanTrip keeps must for share/backup');
console.log('PASS spot auto-follow, booking minute precision, must-visit persistence');
