# 🎴 心象牌卡 Card Oracle

線上心理投射牌卡：憑直覺選一張牌，翻開後顯示背後意涵（意象、光明面、陰影面、自我提問）。
純靜態網站，無後端，可直接放上 GitHub Pages。

牌組：🌿 植物 30｜🦊 動物 30｜🍜 食物 30｜🏔️ 山水 30｜🎲 綜合（全部混合，共 120 張）

## QR Code
部署後打開網站，按「📱 QR Code」即可顯示、下載、列印該網址的 QR（自動以目前網址產生）。

## 部署到 GitHub Pages
1. 新增 repo（例如 `card-oracle`），把本資料夾所有檔案上傳到根目錄。
2. Settings → Pages → Source: `main` / `(root)` → Save。
3. 網址：`https://cyysongyy.github.io/card-oracle/`

## 新增牌組（例如動物）
1. 複製 `data/plants.js` 為 `data/animals.js`，把 `window.DECKS.plants` 改成 `window.DECKS.animals`，id/name/emoji/intro 與 cards 內容改成動物。
2. `index.html` 取消註解 `<script src="data/animals.js"></script>`。
3. `assets/app.js` 的 `DECK_META` 已預留 animals / food / landscape，名稱需一致。

## 牌卡欄位
`id` `name` `en` `emoji` `hue`（牌面色相 0–360） `title` `meaning` `light` `shadow` `ask`

## 聲明
本工具為自我覺察與對話引導之趣味工具，非心理診斷或專業評估。
