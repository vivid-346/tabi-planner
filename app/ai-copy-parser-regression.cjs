const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync('src/app.html','utf8'),c={};vm.createContext(c);vm.runInContext(src.slice(src.indexOf('function pickJSON('),src.indexOf('const normName=')),c);
const raw={spots:[{name:'大阪城公園',note:'説明内の {記号} と "引用"'}]};
for(const text of [JSON.stringify(raw),'説明 {旅行データではない}\n'+JSON.stringify(raw)+'\n案内 {終わり}','```text\n見本です\n```\n```json\n'+JSON.stringify(raw)+'\n```','{"example":1}\n'+JSON.stringify(raw)])assert.deepEqual(JSON.parse(JSON.stringify(c.pickJSON(text))),raw);
let truncated=c.pickJSON('{"spots":[{"name":"大阪城公園"},{"name":"途中');assert.equal(truncated.spots[0].name,'大阪城公園');assert(truncated._cut);console.log('PASS full answer/prose braces/multiple fences/unrelated object/quoted braces/truncated data retained');
