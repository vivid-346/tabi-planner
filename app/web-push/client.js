/* Web版通知。旅行名・場所・メモは送信しない。 */
const WebNotify={
 messages:{before:'まもなく予定の時間です。日程を確認しましょう。',eve:'明日の予定を確認しましょう。',morn:'今日の予定を確認しましょう。',pre:'旅行前の予約と持ち物を確認しましょう。'},
 url:'https://tabinote-notify-test.hourensou2048.workers.dev',busy:false,error:'',saved:0,
 enabled(){return localStorage.getItem(KEY+'-push-on')==='1'},
 supported(){return 'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window},
 standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone},
 token(){let v=localStorage.getItem(KEY+'-push-token');if(!v){v=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');localStorage.setItem(KEY+'-push-token',v)}return v},
 async registration(){await navigator.serviceWorker.register('./sw.js');return navigator.serviceWorker.ready},
 async request(path,data){const r=await fetch(this.url+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.token()},body:JSON.stringify(data)});const v=await r.json();if(!r.ok)throw Error(v.error||'送信失敗');return v},
 async enable(){
  if(!this.supported())throw Error('このブラウザは通知に対応していません');
  if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!this.standalone())throw Error('Safariからホーム画面に追加し、そのアイコンから開いてください');
  // 権限ダイアログはユーザーが押した直後に出す。
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('通知が許可されていません');
  const response=await fetch(this.url+'/config');const config=await response.json();if(config.mode!=='scheduled')throw Error('予定通知の準備中です');
  const reg=await this.registration();let sub=await reg.pushManager.getSubscription();
  if(!sub){const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-config.publicKey.length%4)%4)),c=>c.charCodeAt(0));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})}
  localStorage.setItem(KEY+'-push-on','1');await this.sync();
 },
 sync(){this.chain=(this.chain||Promise.resolve()).catch(()=>{}).then(()=>this.syncCore());return this.chain},
 async syncCore(){
  if(!this.enabled())return;
  this.busy=true;this.error='';
  try{const reg=await this.registration(),subscription=await reg.pushManager.getSubscription();if(!subscription)throw Error('通知をもう一度オンにしてください');
   const now=Date.now(),until=now+60*86400000;
   const notifications=Object.values(DB.trips).filter(t=>!t.sample).flatMap(notifList).filter(n=>+n.at>now&&+n.at<=until).map(n=>({at:+n.at,kind:n.kind}));
   if(notifications.length>200)throw Error('通知が200件を超えています。設定を減らしてください');
   const result=await this.request('/schedule',{subscription:subscription.toJSON(),notifications});this.saved=result.saved;localStorage.setItem(KEY+'-push-saved',String(result.saved));
  }catch(e){this.error=e.message;throw e}finally{this.busy=false}
 },
 async stop(){localStorage.removeItem(KEY+'-push-on');await (this.chain||Promise.resolve()).catch(()=>{});try{const reg=await this.registration(),sub=await reg.pushManager.getSubscription();if(sub){await this.request('/stop',{subscription:sub.toJSON()});await sub.unsubscribe()}this.saved=0;this.error=''}catch(e){localStorage.setItem(KEY+'-push-on','1');this.error='通知を停止できませんでした';throw Error(this.error)}},
 async test(){const reg=await this.registration(),sub=await reg.pushManager.getSubscription();if(!sub)throw Error('先に通知をオンにしてください');await this.request('/test',{subscription:sub.toJSON()})},
 view(){return `<section class="card form"><h3>画面を閉じても通知を受け取る</h3><p class="note">通知時刻・通知の種類・端末の通知先をCloudflareに保存します。旅行名・場所・メモ・写真は送りません。通知から日程を開けます。</p><p class="sub">先60日・最大200件。時刻はこの端末の設定です。通信状況によって遅れることがあります。予定を変えたら、オンラインでアプリを開くと更新します。</p>${this.enabled()?`<p role="status">${this.error?'更新できませんでした。前の通知が残っている可能性があります。':`通知はオン・${this.saved||Number(localStorage.getItem(KEY+'-push-saved'))||0}件を登録`}</p><div class="row"><button class="btn" data-a="webPushSync">通知を更新する</button><button class="btn" data-a="webPushStop">通知を止める</button></div>`:`<button class="btn fill" data-a="webPushEnable">同意して通知をオンにする</button><p class="sub">iPhoneはSafariの共有から「ホーム画面に追加」し、追加したアイコンから開いてください（iOS 16.4以降）。</p>`}</section>`}
};
