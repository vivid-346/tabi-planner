// iPhone用プロジェクト（ios/）を作り直したあとに実行して、審査向けの設定をそろえる
//  ・iPhone専用（iPadなし）・縦向きのみ・暗号化の申告（なし）・いつもライト表示（ダークモードでも白い画面）
const fs=require("fs"),path=require("path");const root=path.join(__dirname,"..");
const pbx=path.join(root,"ios/App/App.xcodeproj/project.pbxproj"),plist=path.join(root,"ios/App/App/Info.plist");
if(!fs.existsSync(pbx))throw new Error("ios/ がありません。先に npx cap add ios を実行してください");
let p=fs.readFileSync(pbx,"utf8");p=p.replace(/TARGETED_DEVICE_FAMILY = "1,2";/g,"TARGETED_DEVICE_FAMILY = 1;");fs.writeFileSync(pbx,p);
let s=fs.readFileSync(plist,"utf8");
s=s.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/,"$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2");
if(!s.includes("ITSAppUsesNonExemptEncryption"))s=s.replace("<dict>","<dict>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>");
if(!s.includes("UIUserInterfaceStyle"))s=s.replace("<dict>","<dict>\n\t<key>UIUserInterfaceStyle</key>\n\t<string>Light</string>");
fs.writeFileSync(plist,s);
console.log("iOSの設定をそろえました（iPhone専用・縦向き・暗号化なし・ライト表示）",(p.match(/TARGETED_DEVICE_FAMILY = 1;/g)||[]).length);
