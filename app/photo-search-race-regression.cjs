const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
async function scenario(file,action,result){
 const src=fs.readFileSync(path.join(__dirname,file),'utf8');
 let finish;const pending=new Promise(resolve=>finish=resolve),original={name:'Test place'};
 const trip={spots:{p:original}},c={DB:{trips:{t:trip}},S:{tid:'t',tab:'plan'},PH:{jobs:new Set()},
  photoOn:()=>true,navigator:{onLine:true},findPhoto:()=>pending,draw:()=>{},$:()=>null,
  save:()=>true,setTimeout:()=>{},phCache:()=>{},toast:()=>{}};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf('async function fillPhotos('),src.indexOf('const uid=')),c);
 const work=c.fillPhotos('t');action(c,original);finish(result);await work;
 assert.equal(c.S.phBusy,0);assert.equal(c.PH.jobs.size,0);
 return {c,original};
}
(async()=>{for(const file of ['src/app.html','index.html']){
 const own={u:'data:image/jpeg;base64,TEST',own:true};
 let r=await scenario(file,(_,sp)=>sp.photo=own,null);assert.strictEqual(r.original.photo,own,'late empty search must not erase a user photo');
 const hidden={none:1};r=await scenario(file,(_,sp)=>sp.photo=hidden,{u:'https://upload.wikimedia.org/old.jpg'});assert.strictEqual(r.original.photo,hidden,'late search must not undo explicit photo removal');
 const replacement={name:'New place'};r=await scenario(file,c=>c.DB.trips.t={spots:{p:replacement}},null);assert(!replacement.photo,'old trip search must not write into a replaced trip');
 r=await scenario(file,(_,sp)=>sp.name='Renamed place',null);assert(!r.original.photo,'search for old name must not set a no-photo result on a renamed place');
 const found={u:'https://upload.wikimedia.org/test.jpg'};r=await scenario(file,()=>{},found);assert.strictEqual(r.original.photo,found,'unchanged place still receives its search result');
 r=await scenario(file,()=>{},null);assert.equal(r.original.photo.none,1,'genuine no-result still receives retry metadata');
 }console.log('PASS photo search results cannot overwrite user photos, removals, renamed places or replaced trips');
})().catch(e=>{console.error(e);process.exitCode=1});
