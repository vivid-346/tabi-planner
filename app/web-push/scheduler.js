// Only timestamps and notification kinds leave the phone. No trip/place/note/photo data.
export const messages = {
 before:'まもなく予定の時間です。日程を確認しましょう。',
 eve:'明日の予定を確認しましょう。',
 morn:'今日の予定を確認しましょう。',
 pre:'旅行前の予約と持ち物を確認しましょう。'
};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
export async function authorizedDevice(request,env,sub){
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!env.NOTIFY_DB||!/^[a-f0-9]{64}$/.test(token||''))return false;
 const row=await env.NOTIFY_DB.prepare('SELECT token_hash,expires FROM devices WHERE id=?').bind(await hash(sub.endpoint)).first();
 return !!row&&row.expires>Date.now()&&row.token_hash===await hash(token);
}
export async function scheduleRequest(request,env,validSubscription){
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!env.NOTIFY_DB)return json({error:'schedule_not_configured'},503);
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(token||''))return json({error:'authorization'},401);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'content_type'},415);
 const raw=await request.text();if(raw.length>40000)return json({error:'too_large'},413);
 let data;try{data=JSON.parse(raw)}catch(_){return json({error:'invalid_json'},400)}
 if(!validSubscription(data.subscription))return json({error:'invalid_subscription'},400);
 const id=await hash(data.subscription.endpoint),secret=await hash(token),db=env.NOTIFY_DB;
 const existing=await db.prepare('SELECT token_hash FROM devices WHERE id=?').bind(id).first();
 if(existing&&existing.token_hash!==secret)return json({error:'authorization'},403);
 if(new URL(request.url).pathname==='/stop'){
  await db.batch([db.prepare('DELETE FROM reminders WHERE device=?').bind(id),db.prepare('DELETE FROM devices WHERE id=?').bind(id)]);
  return json({stopped:true});
 }
 const now=Date.now(),limit=now+60*86400000;
 if(!Array.isArray(data.notifications)||data.notifications.length>200)return json({error:'too_many'},400);
 const rows=[],seen=new Set();
 for(const n of data.notifications){
  if(!Number.isSafeInteger(n.at)||n.at<=now||n.at>limit||!Object.hasOwn(messages,n.kind))return json({error:'invalid_schedule'},400);
  const key=n.at+':'+n.kind;if(seen.has(key))continue;seen.add(key);
  rows.push({id:crypto.randomUUID(),at:n.at,kind:n.kind});
 }
 // Conditional UPSERT prevents two simultaneous first registrations taking ownership.
 const owner=await db.prepare('INSERT INTO devices(id,token_hash,subscription,expires) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription,expires=excluded.expires WHERE devices.token_hash=excluded.token_hash RETURNING id').bind(id,secret,JSON.stringify(data.subscription),limit).first();
 if(!owner)return json({error:'authorization'},403);
 await db.batch([db.prepare('DELETE FROM reminders WHERE device=?').bind(id),...rows.map(n=>db.prepare('INSERT INTO reminders(id,device,at,kind) VALUES(?,?,?,?)').bind(n.id,id,n.at,n.kind))]);
 return json({saved:rows.length,until:limit});
}
export async function runScheduled(env,send){
 if(!env.NOTIFY_DB)return;
 const db=env.NOTIFY_DB,now=Date.now();
 // Keep overdue queued reminders: a busy minute must not silently discard unsent jobs.
 await db.batch([db.prepare('DELETE FROM reminders WHERE device IN (SELECT id FROM devices WHERE expires<?)').bind(now),db.prepare('DELETE FROM devices WHERE expires<?').bind(now)]);
 const jobs=await db.prepare('SELECT r.*,d.subscription FROM reminders r JOIN devices d ON d.id=r.device WHERE r.at<=? AND r.lease<=? ORDER BY r.at LIMIT 10').bind(now,now).all();
 for(const job of jobs.results||[]){
  const claim=await db.prepare('UPDATE reminders SET lease=?,attempts=attempts+1 WHERE id=? AND lease<=? RETURNING id').bind(now+120000,job.id,now).first();
  if(!claim)continue;
  try{
   const body=now-job.at>600000?'遅れて届いた通知です。日程を確認してください。':messages[job.kind];
   const result=await send(JSON.parse(job.subscription),{title:'旅のノート',body,tag:'reminder-'+job.id},env);
   if(result.status===404||result.status===410){await db.batch([db.prepare('DELETE FROM reminders WHERE device=?').bind(job.device),db.prepare('DELETE FROM devices WHERE id=?').bind(job.device)]);continue;}
   if(result.ok||job.attempts>=2||[400,401,403].includes(result.status))await db.prepare('DELETE FROM reminders WHERE id=?').bind(job.id).run();
  }catch(_){if(job.attempts>=2)await db.prepare('DELETE FROM reminders WHERE id=?').bind(job.id).run();}
 }
}
