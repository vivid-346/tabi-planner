const fs=require('fs'),vm=require('vm'),assert=require('assert');
for(const file of ['src/app.html','index.html']){
  const s=fs.readFileSync(file,'utf8');
  const c={dates:()=>['2026-11-05','2026-11-06'],wd:()=>'',spots:()=>[],items:()=>[],fixedList:t=>t.bookings||[]};vm.createContext(c);
  vm.runInContext(s.slice(s.indexOf('function aiCompactDisplayRules('),s.indexOf('function aiRecoveryPrompt(')),c);
  vm.runInContext(s.slice(s.indexOf('function fixedGoBack('),s.indexOf('function tripForm(')),c);
  vm.runInContext(s.slice(s.indexOf('function aiPrompt('),s.indexOf('function pickJSON(')),c);
  const o={dest:'金沢',from:'名古屋',people:'',move:'電車・バス',prefs:[],pace:'ふつう',count:12,mode:'new',src:'',extra:''};
  const flight={bookings:[{type:'flight',from:'羽田',no:'JL183'}]};
  const p=c.aiPrompt(flight,o,'plan');
  assert(p.includes('- 出発地：羽田（'),file+': flight origin takes precedence over saved home');
  assert(!p.includes('- 出発地：名古屋（'),file+': do not use old home for booked flight');
  assert(c.aiPrompt({},o,'plan').includes('- 出発地：名古屋（'),file+': preserve ordinary origin when no flight');
  assert(c.aiPrompt({}, {...o,from:''},'plan').includes('- 出発地：未定（'),file+': retain unknown-origin guidance without flight');
}
console.log('PASS booked departure origin overrides saved home in source and built prompts');
