const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('src/app.html','utf8'),c={};vm.createContext(c);vm.runInContext(src.slice(src.indexOf('function pickJSON('),src.indexOf('const normName=')),c);
const raw={spots:[{name:'大阪城公園',note:'説明内の {記号} と "引用"'}]};
for(const text of [JSON.stringify(raw),'説明 {旅行データではない}\n'+JSON.stringify(raw)+'\n案内 {終わり}','```text\n見本です\n```\n```json\n'+JSON.stringify(raw)+'\n```','{"example":1}\n'+JSON.stringify(raw)])assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(text))),raw);
let truncated=c.pickJSON('{"spots":[{"name":"大阪城公園"},{"name":"途中');assert.equal(truncated.spots[0].name,'大阪城公園');assert(truncated._cut);console.log('PASS full answer/prose braces/multiple fences/unrelated object/quoted braces/truncated data retained');
const full={days:[{date:'2026-11-21',items:[{title:'大阪城公園',time:'12:00'}]}],spots:[{name:'大阪城公園',fee:'無料'}],costs:{other:{min:0,max:0,note:'無料'}}};
const fence=String.fromCharCode(96).repeat(3);
for(let repeat=0;repeat<5;repeat++){
  for(const text of ['{"spots":[]}\n'+JSON.stringify(full),JSON.stringify(full)+'\n{"spots":[]}',fence+'json\n{"days":[],"spots":[],"costs":{}}\n'+fence+'\n'+fence+'json\n'+JSON.stringify(full)+'\n'+fence])assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(text))),full);
  const cut=JSON.stringify(full).slice(0,-1)+',"message":"途中';
  for(const text of ['説明 {未確認}\n'+cut,'{"example":1}\n'+cut,fence+'text\n説明 {未確認}\n'+fence+'\n'+cut]){const parsed=c.pickJSON(text);assert.deepEqual(JSON.parse(JSON.stringify(parsed)),full);assert(parsed._cut)}
}
console.log('PASS five repetitions: empty sample before/after real answer; multiple fences; prose before truncated full itinerary; days/spots/costs and cut warning preserved');
const populatedExample={days:[{items:[{title:'見本'}]}],spots:[{name:'見本'}],costs:{hotel:{min:0,max:0}}};
for(let repeat=0;repeat<5;repeat++){
  assert.throws(()=>c.pickJSON(JSON.stringify(populatedExample)+'\n'+JSON.stringify(full)),/ambiguousjson/);
  assert.throws(()=>c.pickJSON(JSON.stringify(populatedExample)+'\n'+JSON.stringify({costs:{other:{min:200,max:200}}})),/ambiguousjson/);
  assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(JSON.stringify(full)+'\n'+JSON.stringify(full)))),full);
}
console.log('PASS ambiguous populated samples are rejected instead of guessing; identical repeated answers remain accepted');
function reorder(value){if(Array.isArray(value))return value.map(reorder);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).reverse().map(k=>[k,reorder(value[k])]));return value}
for(let repeat=0;repeat<5;repeat++){
  for(const wrapped of [{data:full},{result:{itinerary:full}},{metadata:{source:'AI'},data:full}])assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(JSON.stringify(wrapped)))),full);
  assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(JSON.stringify(full)+'\n'+JSON.stringify(reorder(full))))),full);
  const values={spots:[{name:'確認',note:'',booking:false,lat:null,minutes:0}],costs:{other:{min:0,max:0,note:''}}};
  assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(JSON.stringify(values)+'\n'+JSON.stringify(reorder(values))))),values);
  assert.throws(()=>c.pickJSON(JSON.stringify(full)+'\n'+JSON.stringify({...full,spots:[...full.spots].reverse().concat({name:'異なる候補'})})),/ambiguousjson/);
}
console.log('PASS wrapper recovery and semantic duplicate keys; array order and null/false/zero/empty-string distinctions preserved');
