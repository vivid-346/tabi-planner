# 旅のノート（iPhoneアプリ版）

旅行の日程・行きたい場所・地図・割り勘・持ち物・通知をまとめる旅のしおりアプリです。
今の Web 版の画面（HTML）を [Capacitor](https://capacitorjs.com/) で iPhone アプリにしています。データはすべて端末内に保存し、外部には送りません。

## フォルダの中身

| 場所 | 中身 |
|---|---|
| `src/app.html` | アプリの画面と動き（ここを直す） |
| `src/jp-geo.json` | 日本地図のデータ（地球地図日本・国土地理院をもとに作成） |
| `scripts/build-www.js` | `src` から `www/index.html` を作る |
| `scripts/ios-setup.js` | iPhone用プロジェクトに審査向けの設定を入れる（iPhone専用・縦向き・暗号化なし） |
| `resources/` | アイコン（1024×1024）と起動画面 |
| `capacitor.config.json` | アプリID `io.github.vivid346.tabinote`・アプリ名 |
| `privacy.html` `support.html` | 審査に必要なプライバシーポリシーとサポートページ（GitHub Pages で公開） |
| `store/` | App Store に入力する文章（`listing.md`）とスクリーンショット |
| `../codemagic.yaml` | Mac なしでビルドして TestFlight に上げる設定 |

## 申請までにあなたがやること（チェックリスト）

かかる時間は目安です。★は費用がかかる・本人確認があるので、あなたにしかできない作業です。

### A. 準備（無料）
- [ ] **GitHub Pages をオンにする**（約3分）
  リポジトリの Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `/(root)` にして Save。
  数分後に https://vivid-346.github.io/tabi-planner/app/privacy.html が開けば OK。
- [ ] **問い合わせ用のメールを作る（おすすめ）**（約5分）
  サポートページの連絡先は今は GitHub の Issues だけです。GitHub アカウントがない人も連絡できるよう、アプリ用の Gmail を作って `support.html` に足すと審査で安心です（作ったら教えてください。私が書き足します）。
- [ ] **iPhone を借りる当てを作る**
  TestFlight で実機確認するため、友達の iPhone を1台借りられるようにしておく。

### B. Apple の登録 ★（年99ドル）
- [ ] Apple アカウントの2ファクタ認証をオンにする（約5分）
- [ ] https://developer.apple.com/programs/ から「個人」で登録・支払い（約20分＋承認待ち1〜2日）
  ※ App Store の「販売元」に本名が表示されます

### C. App Store Connect でアプリを作る ★（約20分）
- [ ] Certificates, Identifiers & Profiles → Identifiers → ＋ で App ID を作る
  Bundle ID：`io.github.vivid346.tabinote`（Explicit）
- [ ] App Store Connect → マイApp → ＋ → 新規App
  プラットフォーム iOS／名前・言語・バンドルID・SKU は `store/listing.md` のとおり
- [ ] できたアプリの「App情報」にある **Apple ID（数字10桁）** を控える → `codemagic.yaml` の `APP_STORE_APPLE_ID` に書く（私に教えてくれれば直します）
- [ ] ユーザーとアクセス → 統合 → App Store Connect API → キーを作る（アクセス：App Manager）。
  **Issuer ID・Key ID・.p8 ファイル**の3つを控える（.p8 は一度しかダウンロードできません。人に送らないこと）

### D. Codemagic でビルド（無料枠あり）（約20分＋ビルド待ち20〜30分）
- [ ] https://codemagic.io に GitHub アカウントでサインアップ
- [ ] Teams → Integrations → Developer Portal → Connect で、C で作った API キーを登録。名前は **`tabinote-asc`**
- [ ] Add application → GitHub → `vivid-346/tabi-planner` を選ぶ → 「codemagic.yaml を使う」
- [ ] Start new build → ワークフロー「旅のノート iOS（TestFlight）」→ 実行
- [ ] 成功すると、App Store Connect の TestFlight にビルドが届く（処理に10〜30分）
  失敗したら、ログの画面をそのまま私に見せてください

### E. TestFlight で実機確認（約30分）
- [ ] TestFlight → 内部テスト → 借りた iPhone の持ち主を（その人の Apple アカウントで）テスターに追加
- [ ] その iPhone に TestFlight アプリを入れて、旅のノートを入れる
- [ ] 確認すること：起動する／旅行を作れる／機内モードで地図が見える／「準備」タブの「通知を試す」で5秒後に通知が来る／共有ボタンで LINE が選べる

### F. 申請 ★（約30分）
- [ ] App Store Connect のアプリページに `store/listing.md` の文章を貼る
- [ ] スクリーンショット（`store/screenshots/6.9-*.png`）を6.9インチの欄に上げる
- [ ] App のプライバシー：「データを収集しない」
- [ ] 年齢制限指定の質問に答える（すべて「なし」）
- [ ] ビルドを選ぶ → App Review に関する情報（メモは `listing.md` の文章）→ 審査に提出
- [ ] 結果は1〜2日でメールが来る。却下されたら理由の文章を私に見せてください

## 開発メモ（コードを直すとき）

```bash
cd app
npm ci                 # 初回だけ
npm run build          # src → www/index.html
# Mac がある場合：npm run ios:create → npx cap open ios（Xcode で実行）
```

- 画面を直したら `src/app.html` を編集 → GitHub に上げる → Codemagic で Start new build
- アプリの機能（端末の通知・共有）は `Native` という窓口から呼ぶ。ブラウザでは代わりの動きになる
- 通知は iOS の制限で同時に64件までなので、近いものから60件だけ登録している
