const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
for(const file of ['src/app.html','index.html']){
  const s=fs.readFileSync(path.join(__dirname,file),'utf8');const take=(a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,file+': slice '+a);return s.slice(i,j)};
  const c={md:d=>d.slice(5).replace('-','/'),wd:()=>'',toD:d=>new Date(d+'T00:00:00'),timeKey:x=>/^\d\d:\d\d$/.test(x||'')?+x.slice(0,2)*60+(+x.slice(3)):null};vm.createContext(c);
  vm.runInContext(take('const BK_DEF=','/* 予約から日程の予定を作り直す')+take('/* 時差のある国際線は','function bkRows('),c);
  const hnl={type:'flight',no:'JL74',from:'羽田',to:'ホノルル',date:'2026-11-20',time:'21:00',adate:'',atime:'09:30'};
  assert.equal(c.bkCheck([hnl],'2026-11-20','2026-11-25'),'',file+': same-day earlier local arrival is not blocked');
  assert.match(c.bkTzNote([hnl]),/時差/,file+': but the user is told about it');
  const prevDay={...hnl,adate:'2026-11-19',atime:'09:30'};
  assert.equal(c.bkCheck([prevDay],'2026-11-19','2026-11-25'),'',file+': previous-day arrival across the date line is allowed');
  assert.match(c.bkCheck([{...hnl,adate:'2026-11-17'}],'2026-11-15','2026-11-25'),/2日以上前/,file+': far-off arrival date still blocked');
  assert.match(c.bkCheck([{...hnl,date:'2026-12-01'}],'2026-11-20','2026-11-25'),/期間の外/,file+': outside the trip still blocked');
  const dom={type:'flight',no:'NH1',date:'2026-11-20',time:'08:00',adate:'',atime:'09:10'};
  assert.equal(c.bkTzNote([dom]),'',file+': normal flight has no note');
  assert.equal(c.bkTzNote([{type:'hotel',name:'H',in:'2026-11-20',out:'2026-11-21'}]),'');
}
console.log('PASS international flights with time differences are allowed with a note; real date mistakes still blocked');
