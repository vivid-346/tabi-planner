# r25 予定に合わせたWeb通知

## 現在
- テスト通知のiPhone実受信はユーザー確認済み。
- 予定連動のコードと自動検証は完成。実際の時刻配信とスマホ操作は未確認。
- Cloudflare D1 `tabinote-reminders` 作成・schema実行・NOTIFY_DB接続済み。
- Worker a8dcc724公開、毎分Cron保存、PR #22作成済み。Devinの7指摘を修正して再反映・再レビューへ進む。まだマージしていない。

## 使い方
公開アプリをSafariからホーム画面に追加。「持ち物と通知」で通知時刻を選び、「同意して通知をオンにする」。旅行の変更はアプリをオンラインで開いたとき同期する。

## 送る情報
通知時刻・種類（予定前／前夜／朝／旅行前）・端末の購読先と公開暗号鍵。旅行名・場所・メモ・写真・友達の情報は送らない。通知文は固定で、押すとアプリを開く。
登録は明示的な同意ボタンだけ。端末の管理トークンは端末に保存し、サーバーはハッシュのみ保存する。通知停止で登録と待機通知を削除。全データ消去も通知停止に成功してから行う。
先60日・最大200件。60日後に端末登録が失効。見本の旅行は除外。時計は端末のタイムゾーンを使う。

## 配信
Cloudflare Workers FreeとD1 Free。毎分Cronから最大10件を配信。通信状況・混雑・省電力などで遅延の可能性があり、正確な秒単位の配信は保証しない。未送信の通知は混雑だけを理由に消さず順に配信し、10分以上遅れた通知は遅れたことを示す文にする。端末登録は60日で失効するが、アプリを開いたとき・戻ったときに更新する。
一時的な失敗は最大3回試行。404/410の無効な購読先を削除。多重CronはSQLで排他し、同じ通知タグを使う。外部配信は厳密なexactly-onceを保証できない。

## デプロイ
1. `web-push/worker-bundle.js`を既存Workerエディタへ貼り付けてDeploy。既存VAPID秘密鍵を維持する（ファイルには含めない）。
2. `/config`が `mode:scheduled` になることを確認。
3. Worker Settings → Trigger events → Cron triggersで毎分（`* * * * *`）を登録。
4. GitHub新ブランチで `app/src/app.html` ← `app.html`、公開 `app/index.html` ← `index.html`、`app/sw.js`、`app/manifest.webmanifest` を登録。
5. ビルドにもsw.js/manifestをコピーする処理を追加し、wwwと公開indexの一致を確認。PRをDevinレビューしてから公開。
6. 実機で通知許可→数分後の予定→アプリを閉じる→受信→更新・停止を確認。

## 検証
- scheduler-test.mjs：実SQLiteで登録・置き換え・重複・他端末拒否・並行配信・停止・200件の遅れた通知を消さず配信・購読失効。
- client-test.cjs：構文・送信データの最小化・見本除外・同期中の停止。
- worker-test.mjs：VAPID署名、独立した暗号APIで通知本文の復号、送信失敗分岐。
- 既存の初回作成・投票・ビルド一致の回帰もPASS。
原本は worker.js と scheduler.js と test-assets.js。node app/web-push/build-worker.cjs でbundleを生成し、--checkで一致を確認する。worker.jsとbundleのHTTP動作は同一。テスト通知は同意後にD1へ端末を登録し、管理トークンが一致した端末だけに送れる。
