// src/app.html（画面）と src/jp-geo.json（日本地図）を合わせて www/index.html を作る
const fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"src/app.html"),"utf8");
const g=JSON.parse(fs.readFileSync(path.join(root,"src/jp-geo.json"),"utf8"));
const geo=JSON.stringify({d:g.d,W0:g.W0,N0:g.N0,C:g.C,K:g.K,vw:g.vw,vh:g.vh});
if(!app.includes("__GEO__"))throw new Error("src/app.html に __GEO__ がありません");
const head=`<!doctype html><html lang="ja" data-theme="light"><head><meta charset="utf-8">
<link rel="manifest" href="./manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
<meta name="color-scheme" content="light only">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#FFFFFF">
<meta name="format-detection" content="telephone=no">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:0}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>`;
fs.mkdirSync(path.join(root,"www"),{recursive:true});
fs.writeFileSync(path.join(root,"www/index.html"),head+app.replace("__GEO__",geo)+"</body></html>");
/* 詳しい地図の部品（MapLibre）をアプリの中に入れる。地図の画像だけネットから読む */
fs.mkdirSync(path.join(root,"www/vendor"),{recursive:true});
for(const f of ["maplibre-gl.js","maplibre-gl.css"])fs.copyFileSync(path.join(root,"node_modules/maplibre-gl/dist",f),path.join(root,"www/vendor",f));
console.log("www/index.html を作りました",Math.round(fs.statSync(path.join(root,"www/index.html")).size/1024),"KB");
for(const f of ["sw.js","manifest.webmanifest","apple-touch-icon.png","icon-192.png","icon-512.png"])if(fs.existsSync(path.join(root,f)))fs.copyFileSync(path.join(root,f),path.join(root,"www",f));
