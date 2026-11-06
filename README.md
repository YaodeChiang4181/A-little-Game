# 氣勢連鎖奇偶戰 (Parity Battle Engine) ⚔️

這是一款結合了「像素西洋棋」、「賽局理論」、「奇偶數陣營博弈」、「角色專屬特性」與「動態戰場環境」的策略卡牌對戰小遊戲。
玩家將在三個隨機變化的戰場上佈署兵力，與具備智能演算法的 AI 對手展開博弈，爭奪最終的勝利。

---

## 🎯 核心玩法與遊戲機制 (Gameplay)

### 1. 手牌管理：4 抽選 3 佈署 (Hand Management)
* 雙方每回合會從棋子池中隨機抽取 **4 張手牌**。
* 玩家需要根據當前陣營（ODD 還是 EVEN）、戰場環境與敵方潛在出牌，**挑選 3 張佈署於三大戰場**，剩餘 1 張作為備用。
* 多達 **24 種出牌組合**，大幅提升策略深度！

### 2. 角色專屬特性 (Character Traits)
每顆西洋棋子皆擁有符合典故的專屬特性與生命週期鉤子：
* ♟ **小兵 (Lv.1) - 【以弱勝強】**：若對手當前戰力比自己大 3 級以上（面對 Lv.4~6），小兵判定為直接勝出！弱牌成為抓大怪的神牌。
* ♞ **騎士 (Lv.2) - 【奇襲跳躍】**：無視對手上一格獲得的氣勢加成，直接斬斷對手的連鎖優勢！
* ♜ **主塔 (Lv.3) - 【堅壁防線】**：此格若戰敗，差值計算強制鎖定為 1，控分止損神卡。
* ♝ **主教 (Lv.4) - 【天秤偏轉】**：若此格獲勝，可自動微調差值 +1 以導正奇偶數總分。
* ♛ **皇后 (Lv.5) - 【威壓統御】**：若此格獲勝，帶給下一格的氣勢加成躍升為 `+2`！
* ♚ **國王 (Lv.6) - 【御駕親征】**：若佈署在權重最高（weight ≥ 3）的要衝，戰力額外獲得 +1 王權加成！

> 💡 **自主擴充角色**：系統採用模組化資料驅動架構（Data-Driven Registry），未來隨時可在 `src/game/registry/characters.ts` 自由新增自訂像素角色與技能，引擎與 AI 會全自動感知適配！

### 3. 動態戰場環境 (Dynamic Terrains)
每回合由戰場池隨機輪換 3 個環境：
* 🌲 **沼澤荒原 (x1)**：【泥沼阻滯】氣勢加成無效，純拼裸點數。
* ⚔️ **決鬥擂台 (x2)**：【生死搏殺】勝者氣勢躍升為 `+2`。
* 🏛️ **皇宮大殿 (x3)**：【王權加護】Lv.4 以上高階棋子戰力 +1。
* 🪞 **鏡像之殿 (x2)**：【偶數領域】結算總分保底為偶數。
* ⛪ **靜默神殿 (x1)**：【異能封印】所有角色特性完全失效。
* ⚡ **雷霆斷崖 (x3)**：【狂雷轟鳴】差值 ≥ 2 時額外計入 +2 分。

### 4. 交鋒、氣勢連鎖與奇偶數陣營結算 (Parity System)
* **氣勢連鎖 (Momentum Buff)**：贏得前一格交鋒的一方，將會為下一張牌帶來 `+1`（或由皇后/擂台增幅為 `+2`）的連鎖優勢！
* **奇偶換邊**：雙方分為 **ODD (奇數)** 與 **EVEN (偶數)** 陣營，**每局結束後自動互換陣營**。
* **傷害判定**：三大戰場（差值 × 場地倍率）加總為**「總積分」**。
  * 總積分為**奇數**：ODD 陣營發動攻擊，對手扣 1 滴血。
  * 總積分為**偶數**：EVEN 陣營發動攻擊，對手扣 1 滴血。
* 雙方各有 3 滴血，率先扣完者戰敗。

---

## 🤖 智能 AI 對手 (Smart AI Agent)

AI 引擎採用即時賽局模擬：
* 遍歷自身手牌的 **24 種出牌組合**。
* 模擬玩家可能採取的數十種陣型，並將**「戰場環境效果」**與**「雙方角色被動特性」**完整帶入交鋒演算。
* 預判出在當下陣營中，能讓自己不受傷（甚至讓玩家扣血）機率最高的**「最佳佈署決策」**。

---

## 💻 專案架構與技術棧 (Tech Stack)

全面採用純客戶端現代化架構，**徹底告別後端冷啟動延遲與免費用量限制，點開網頁 0.1 秒秒開秒玩！**

* **核心技術**：React 18 + Vite + TypeScript
* **架構模組**：
  * `src/game/types.ts`：通用角色、特性鉤子與戰鬥上下文型別。
  * `src/game/registry/characters.ts`：模組化像素角色註冊庫（支援自由擴充）。
  * `src/game/registry/terrains.ts`：動態戰場環境庫。
  * `src/game/engine.ts`：全特性與動態環境支援的戰鬥結算引擎。
  * `src/game/aiAgent.ts`：特性感知與環境適應型 AI 策略決策器。
  * `src/game/gameService.ts`：對局生命週期與狀態管理。
  * `src/game/soundManager.ts`：純前端 Web Audio 8-Bit 晶片音樂與戰鬥音效合成引擎（零外部流量依賴、100% 免費版權）。
  * `src/components/SettingsModal.tsx`：音效與背景音樂設定面板（支援獨立開關、音量滑桿與多首輕快戰鬥曲目切換）。
  * `src/game/towerEngine.ts`：奇偶試煉 (Tower Run) 刷塔核心引擎（關卡階梯配置、血量跨層繼承、分數加權與本地排行榜）。
  * `src/game/towerCardGenerator.ts`：HTML5 Canvas 8-Bit 像素戰報卡生成器（純前端繪製可分享之戰報海報）。
  * `src/components/TowerView.tsx`：獨立刷塔試煉模式主窗口（層級戰況、專屬 HUD、修整營地與 Boss 決戰）。
  * `src/components/TowerResultModal.tsx`：試煉結算、歷史 Top 10 榮譽榜與戰報海報複製/下載彈窗。
  * `src/game/online/types.ts`：雲端對戰網路通訊協定型別（交握、回合同步、佈署廣播與心跳監控）。
  * `src/game/online/networkManager.ts`：基於 PeerJS WebRTC DataChannel 之純前端免伺服器 P2P 雲端連線管理器（0 後端成本、10~30ms 極致延遲）。
  * `src/components/OnlineLobbyModal.tsx`：雲端連機大廳（支援 6 位數房間代碼創建、邀請網址一鍵複製、雷達波紋掃描等待與快速加入）。
  * `src/components/OnlineMatchView.tsx`：雲端即時雙人博弈交鋒戰場（包含房主/挑戰者身分銘牌、即時就緒廣播、暗牌出征、同步逐格翻牌結算、血量扣減、再戰一局與斷線防護）。
  * `src/game/economy/wallet.ts`：本地永久錢包與軍備陣容管理（支援 localStorage 金幣持久化、已徵召特職棋手庫存、出征卡組 6 槽位自由裝備與自訂立繪 Base64 快照）。
  * `src/components/ShopModal.tsx`：軍需商城模態窗口（支援 6 位全新西洋特職棋手招募、8-Bit 像素金幣音效與餘額即時扣除）。
  * `src/components/DeckBuilderModal.tsx`：軍備庫陣容編成與像素立繪上傳工坊（支援 1~6 階棋手自由替換出征、直接選取本機像素圖 PNG/GIF/WebP 即時替換卡面立繪，純前端 0 後端圖床依賴）。
  * `src/game/registry/CUSTOM_CHARACTERS_GUIDE.md`：開發者自訂角色與全新效果設定開發指南（包含 4 大生命週期鉤子、戰力修正與環境聯動完整教學）。
* **部署支援**：**Vercel**（官方推薦與正式部署環境，Root Directory: `frontend`，輸出目錄: `dist`，建置指令: `tsc && vite build`）、GitHub Pages 等靜態託管平台。

---

## ☁️ Vercel 部署設定指南 (Vercel Deployment Guide)

本專案已建立完整之 Vercel 部署與單頁應用 (SPA) 支援配置：
1. **Root Directory (根目錄設定)**：在 Vercel 專案設定中將 **Root Directory** 設定為 `frontend`。
2. **Framework Preset**：選擇 `Vite`。
3. **Build Command (建置指令)**：`tsc && vite build`（預設觸發嚴格 TypeScript 型別檢查）。
4. **Output Directory (輸出目錄)**：`dist`。
5. **SPA 路由配置**：`frontend/vercel.json` 內建重定向規則 (`rewrites: [ { source: "/(.*)", destination: "/index.html" } ]`)，保障網頁重新整理與深層路徑存取不發生 404。

---

## 🚀 本地端運行

```bash
cd frontend
npm install
npm run dev
```

---

## 📝 更新日誌 (Changelog)

* **2026-11-06**：
  * **方向 D 實作：永久錢包經濟體系、對局金幣軍餉、軍需商城、陣容編成與本機像素立繪上傳工坊**：
    * **永久錢包與全模式對局軍餉體系 (`src/game/economy/wallet.ts`)**：
      * 採用純前端無伺服器持久化架構 (`localStorage: parity_battle_wallet_v1`)，永久保存玩家擁有的金幣、已徵召棋手清單、當前出征卡組 6 槽位與自訂立繪快照。
      * **全模式獲勝/奮戰收益發放**：
        * **經典單局**：獲勝基本獎勵 `+60 G`，若無損 (滿 3 點血) 獲勝觸發完美戰役加成 `+40 G` (共 `+100 G`)；惜敗慰問金 `+20 G`。
        * **奇偶試煉 (刷塔)**：每突破一層獲取 `40 + 層數 × 20 G`（最高第 5 層 `140 G`），登頂通關額外發放大捷賞金 `+100 G`，失敗慰問金 `+25 G`。
        * **雲端對戰 (Online Match)**：P2P WebRTC 雲端交鋒勝者獲取 `+80 G`，敗者獲取 `+30 G`。
      * 結算畫面與對戰結束彈窗加入專屬戰後軍餉收益橫幅，配合純前端 Web Audio 8-Bit 金幣音效 (`coin`)，即時回饋戰果！
    * **軍需商城 (Shop) 招募系統 (`src/components/ShopModal.tsx`)**：
      * 推出 6 位各具專屬異能的全新西洋特職棋手（影武流浪者 Lv.1、荒野獵人 Lv.2、攻城投石車 Lv.3、禁忌鍊金術師 Lv.4、奧術魔導師 Lv.5、暴虐征服者 Lv.6）。
      * 整合 8-Bit 晶片硬幣音效、即時餘額檢核與狀態防重複購買機制；招募後立即入庫，可於軍備庫自由換裝。
    * **軍備庫陣容編成與自訂像素立繪工坊 (`src/components/DeckBuilderModal.tsx`)**：
      * **1~6 階陣容自由換裝**：嚴格保障「奇偶數陣營博弈」與「4 抽選 3」數學天秤平衡，玩家可於 Lv.1~6 槽位中自由裝備經典棋子或特職棋手，並即時預覽出征卡組。
      * **本機直接上傳像素圖片 (`FileReader -> Base64 DataURL`)**：玩家可直接點擊 `[ 上傳像素立繪 ]` 選取本機任意像素圖檔（PNG/GIF/WebP），純客戶端自動轉換為輕量 DataURL 並綁定至角色身上；搭配 `image-rendering: pixelated` 硬邊縮放，立即在戰場、手牌與結算畫面完美呈現個人專屬像素立繪！隨時可一鍵 `[ 恢復官方像素 ]`。
    * **自訂新角色與笑果（效果）資料驅動開發指南 (`src/game/registry/CUSTOM_CHARACTERS_GUIDE.md`)**：
      * 建立完整的開發手冊，詳解 4 大生命週期鉤子（`BEFORE_CLASH`、`DETERMINE_WIN`、`AFTER_CLASH`、`ON_MOMENTUM`）、算式推演註解、戰鬥上下文型別與 AI 智能感知適配範例，方便未來隨時新增自訂角色與趣味笑果。
    * **純化 8-Bit 像素視覺美學（零 Emoji 規範對齊）**：
      * 打造專屬 16x16 點陣像素金幣 SVG 圖標 (`PixelCoinIcon`)，全面取代外部表情符號，嚴格維持直角像素邊框、方括號標籤 `[ ]` 與沉浸式復古街機品質。
    * **Vercel TypeScript 嚴格編譯適配 (`TS2305`、`TS2322` 與 `TS2722` 修復)**：
      * 於 `src/game/economy/wallet.ts` 導出 `export type PlayerWallet = WalletState;`，根治模組未導出成員型別報錯。
      * 於 `ShopModal.tsx` 與 `DeckBuilderModal.tsx` 組件介面補齊 `isOpen?: boolean` 布林屬性與互連跳轉可選回調，確保組件於嚴格模式下相容條件渲染。
      * 全面為可選跳轉回調函式改採安全可選鏈調用（`onOpenShop?.()` 與 `onOpenDeckBuilder?.()`），根除 `TS2722: Cannot invoke an object which is possibly 'undefined'` 報錯。

* **2026-11-04**：
  * **卡牌特性 Tooltip 文字撕裂（破字/破圖）與頂部 HUD 遮擋碰撞徹底修復**：
    * **徹底杜絕像素字體偽斜體撕裂破圖 (`font-synthesis: none`)**：
      * 深入排查發現 Tooltip 內的棋子典故介紹（Lore，如「巍峨屹立的巨石防線...」）原採用 `font-style: italic` 與 9px 超微小字級，因 DotGothic16 像素字體不具備斜體字形，瀏覽器在繁體中文回退時強制套用幾何傾斜矩陣（Synthetic Oblique），導致方塊中文字形筆畫斷裂、殘缺雜訊化（即使用者回報之「文字破圖」）。
      * 全面移除 `CardView.tsx` 與 `CompendiumModal.tsx` 中所有 `font-style: italic` 設定，改為標準直立排版；加入 `font-synthesis: none` 與 `-webkit-font-smoothing: antialiased` 強制阻斷瀏覽器對像素字體的不當人工變形。
      * 提升介紹文字至極致清晰的 `11px`，以銀灰色（`#94a3b8`）搭配微細點陣虛線分隔線（`1px dashed #334155`），兼具豐富背景敘事與俐落清晰的街機字體質感。
    * **手牌區與戰場 Tooltip 智能防溢出與防遮擋定位重構**：
      * **手牌前排防遮擋向下開展**：原 `.card-trait-tooltip` 固定為 `bottom: calc(100% + 6px)`，當玩家滑鼠懸浮於手牌第 1 排（如【主塔】）時，彈窗向上猛衝高達 160px，直接橫越並遮蔽頂部 `[ 圖鑑 ]` 按鈕與玩家陣營 HUD（`[ ODD ] 玩家` 及血量心）。重構為手牌第 1 排（`div:nth-child(1), div:nth-child(2)`）**向下開展**，徹底解放頂部所有控制面板與狀態資訊。
      * **手牌後排精準覆蓋手牌向上開展**：手牌第 2 排（`div:nth-child(3), div:nth-child(4)`）**向上開展**，剛好覆蓋前排手牌，最高點低於 y=270px，絕不觸及上方 HUD。
      * **側邊欄兩側邊緣內縮保護**：手牌奇數欄靠左對齊向右展開、偶數欄靠右對齊向左展開；並針對 3 張手牌時居中的第 3 張手牌（`div:nth-child(3):last-child`）以及僅剩 1 張時（`div:only-child`）加入水平居中錨定，彈窗寬度精簡收斂至 200px，完美居中收納於 280px 側邊欄內，絕不溢出邊緣。
      * **戰場槽位雙向中央對進**：戰場上方敵方陣地 Tooltip 朝中央向下開展，下方我方陣地 Tooltip 朝中央向上開展，雙向往中線 VS 空間匯聚，徹底根除頂部與底部溢出。
    * **奇偶試煉 (刷塔) 特殊固定戰場 ID 對齊與回合繼承修復**：
      * 排查並修正 `towerEngine.ts` 中第 3 層與第 4 層之 `fixedTerrains` 設定（由未定義的 `'thunder'` 修正為 `'storm_cliff'`，`'mirror'` 修正為 `'mirror_hall'`），徹底解決因 ID 不匹配導致系統 fallback 為隨機戰場（如第 3 層頂部提示「固定為雷霆斷崖」但下方第 3 格卻隨機抽出「皇宮大殿」）的認知偏誤。
      * 於 `TowerView.tsx` 回合推進邏輯中加入當前層固定戰場判定，確保同一層在經歷多回合膠著拉扯時，核心挑戰戰場始終鎖定不隨機漂移。

* **2026-11-03**：
  * **雙模式全方位對弈架構：支援「雲端連機 (Online Multiplayer)」與「單機模式 (Single-Player)」**：
    * **原汁原味首頁街機按鍵整合**：徹底捨棄雜亂的大卡片與 Emoji 符號，無縫回歸首頁原版簡約俐落的四顆實體像素街機按鍵一字排開（「新手指南」、「經典單局」、「雲端連機」、「奇偶試煉 (刷塔)」），全域嚴格遵守純直角終端機風格與專業像素點陣排版。
    * **P2P WebRTC 零伺服器雲端連線引擎 (`src/game/online/networkManager.ts`)**：全面整合 PeerJS WebRTC DataChannel 技術，於純前端靜態託管平台 (Vercel) 實現零伺服器成本、極致低延遲 (10~30ms) 的真人跨裝置端對端加密連線。
    * **6 位數字房間代碼與邀請網址深度連結 (`src/components/OnlineLobbyModal.tsx`)**：房主一鍵生成 6 位數字房間碼，支援一鍵複製代碼及網址帶參邀請連結 (`?room=XXXXXX`)。對手開啟連結自動識別並預先填入房間號，免手動輸入即可秒速連線！
    * **雙向隱蔽佈署與權威房主仲裁結算 (`src/components/OnlineMatchView.tsx`)**：雙方各自保有 4 張私密手牌，完成 3 槽佈署後按下「出征決鬥！」，即時向對方發送就緒廣播；待雙方皆出征後同步揭開真實佈署，由房主權威執行戰鬥引擎演算並雙向同步逐格交鋒動畫、特性觸發、算式推演與奇偶傷害扣減。
    * **即時連線防護與生命週期管理**：內建雙向心跳 PING/PONG 延遲監控毫秒數展示、奇偶陣營多局自動輪換、勝負結算、一鍵「再戰一局 (Rematch)」雙向確認開局與對手中途斷線提示機制。
    * **Vercel TypeScript 嚴格編譯與 Vite 打包深度適配**：於 `tsconfig.json` 補齊 `allowSyntheticDefaultImports` 與 `esModuleInterop`，建立獨立宣告檔 `src/types/peerjs.d.ts`，並於 `vite.config.ts` 注入 `global: 'window'` 瀏覽器相容宣告；同時於 `networkManager.ts` 為 `peer.on` 回呼函式之 `id: string` 與 `conn: DataConnection` 參數補齊明確型別標註，根治 Vercel 嚴格模式 `TS7006: Parameter implicitly has an 'any' type` 與 `@types/peerjs` 廢棄存根警告。

* **2026-10-30**：
  * **戰場 Tooltip 碰撞穿透與跑板問題徹底根治**：
    * **全域戰術情報橫條架構（Stage-Level Intel Bar）**：徹底捨棄原先從戰場橫幅下墜覆蓋敵方卡片的懸浮彈窗設計，改採於戰場正上方展示的全寬即時戰術情報橫條（`.terrain-stage-intel-bar`）。玩家點選任意戰場橫幅時，該橫幅點亮金光標籤，上方即時推播場地倍率與特殊異能說明，**卡牌 100% 完整裸露可見，絕不發生覆蓋敵方暗牌/明牌之遮擋偏誤**，且點擊任意處或出征時自動收起。
    * **算式推演框槽位智能錨定（Slot-Aware Clamping）**：重構 `.equation-tooltip` 佈局定位，針對左側（Slot 0）採靠左對齊向右展開、右側（Slot 2）採靠右對齊向左展開、中間（Slot 1）維持置中，並設定 `max-width: 92vw`，徹底解決長算式文字（如 `差值 0 × x1 (靜默神殿) = 0`）溢出行動版螢幕兩側遭裁剪截斷之嚴重跑板。
    * **消除 CSS Stacking Context 層級穿透 Bug**：修復卡牌因 `transform` 動畫產生新堆疊上下文導致敵方卡片直接「穿透切斷」環境說明彈窗之視覺缺陷；全站懸浮提示同步直角像素化與高層級防禦保護。
  * **硬派復古街機結算牌重構（消除 AI 模板感與視覺偏誤）**：
    * **徹底根除高斯模糊與圓角矛盾**：移除彈窗外圍發散的 CSS 霓虹模糊光暈（`box-shadow: 0 0 30px`）與現代網頁式圓角（`border-radius: 4px/6px`），重構為硬派像素雙重邊框（`border: 4px solid #000` + `outline: 3px solid` 戰敗暗紅/勝利金光）與 0 圓角純直角硬派投影（`box-shadow: 8px 8px 0px #000`）。
    * **嚴格統一復古調色盤**：全面掃除雜色（原綠底、藍底、紫底、青底混雜之 AI 模板感），確立以黑曜岩（`#0b0f19`）為底、暗紅戰損（`#991b1b`/`#f87171`）、古金計分（`#fbbf24`）與鋼鐵灰階為骨幹的極簡復古配色。
    * **街機計分銘牌與矩陣排版**：捨棄原 Google Analytics 儀表板式空曠卡片，採用大型 DotGothic16 街機點陣金字（`000,000 PTS`），搭配終止階層與戰功評級等寬對齊規格矩陣。
    * **情境化戰況通訊文案**：捨棄原冷冰冰之資料庫預設提示（如「未通過任何層數」與「(可分享)」），重構為沉浸式戰場通訊（「01F 哨站斥候 ── 初戰受挫 · 於先鋒交鋒中力竭」、「鐫刻戰績海報」），並加入專屬戰術指引。
    * **街機實體分頁與觸感按鍵**：重構分頁切換為無縫內嵌式街機按鈕群，底部「重返試煉」與「返回大廳」按鍵升級為 3D 階梯按壓回饋，全面契合專業復古獨立遊戲品質。

* **2026-10-27**：
  * **網頁版側邊欄折行裁剪與行動版 HUD 擠壓偏誤修復**：
    * **電腦版 2x2 手牌雙列網格與出征按鈕可見性**：將側邊欄寬度擴增至 280px，優化內距與間距，保證 4 張戰備手牌與敵方 4 張暗牌穩定排成 2x2 雙列網格，徹底解決原單列縱向排成 4 行導致下方手牌與出征按鈕被 100dvh 視窗高度截斷隱藏的問題。
    * **HUD 文字雙層架構防折行**：重構作戰 HUD 為清晰的上下兩排分流佈局（上排陣營身分 + 生命點陣心，下排樓層進度 + 積分/稱號），徹底根除文字因欄位過窄斷成單字豎排（如 `[ ODD / ] 試煉 / 者`）之視覺破版。
    * **行動版頂部狀態條雙層分離**：將行動版單行混合擠壓的文字與生命心拆分為雙層結構（首行：撤退按鈕 + 樓層積分；次行：玩家血量條 + 回合數 + 敵方血量條），使 5 點血量心與中央標籤享有寬鬆排版，告別碰撞黏連。
  * **字體破版修復與刷塔模式三欄式街機架構重構**：
    * **字型棧與行高優化**：在 `index.css` 為 `--font-pixel` 加入微軟正黑體 (`Microsoft JhengHei`) 與蘋方 (`PingFang TC`) 中文回退棧，並全局設定安全行高 (`line-height: 1.5~1.6`) 與 `white-space: normal !important`，徹底解決日文點陣字在繁體中文字元回退時引發的垂直行疊合破版。
    * **Tooltip 空間擴展**：將戰場環境浮動說明 (`.terrain-tooltip`) 與卡牌特性說明 (`.card-trait-tooltip`) 寬度擴展至 220px~240px，支援文字自動換行與寬鬆字距排版。
    * **刷塔模式架構全面對齊**：全面重構 `TowerView.tsx`，捨棄原垂直堆疊樣式，無縫套用主遊戲經過深層適配的三欄式街機佈局（電腦版：左側玩家 HUD + 4 張戰備手牌 + 出征按鈕；中間：頂部情報橫幅 + 三大實體卡槽 `.field-slot` + 交鋒 VS 算式推演；右側：首領情報 HUD + 敵方暗牌手牌；手機版：頂部對陣條 + 底部手牌抽屜），徹底修復手牌被視窗溢出裁切、戰場卡槽塌縮為純文字等所有視覺錯誤。
  * **Vercel 嚴格部署規範校驗與記憶固化**：
    * 檢查並修復 `CardViewProps` 缺漏 `isRevealed?: boolean` 導致 `tsc` strict 模式報錯之隱患，完善敵方暗牌翻開機制。
    * 重構 `towerCardGenerator.ts` 系統剪貼簿複製邏輯，增強 `window.ClipboardItem` 與 `navigator.clipboard` 嚴格型別相容性與容錯機制。
    * 規範化 `main.tsx` 模組引用路徑為相容性更高的無副檔名標準。
    * 新增 `frontend/vercel.json` 與根目錄 `vercel.json`，配置 Vite SPA 單頁應用重定向規則 (`rewrites`) 與 HTTP 安全標頭。
    * 於工作區規範 (`GEMINI.md`) 中固化「Vercel 部署記憶」，要求未來所有代碼變更必須 100% 通過 Vercel CI/CD 嚴格 TypeScript 編譯 (`tsc && vite build`)。
  * **8-Bit 晶片音訊引擎**：整合純前端 Web Audio API 音訊合成器 (`src/game/soundManager.ts`)，內建 3 首輕快戰鬥配樂（《疾馳交鋒》、《賽局博弈》、《王城決戰》）與全套 8-bit 打擊音效。
  * **系統設定面板**：新增收納式設定彈窗 (`src/components/SettingsModal.tsx`)，支援獨立開關 BGM/SFX、音量滑桿與即時換曲，設定自動留存至 `localStorage`。
  * **代理人工作流與規範**：建置 `read-readme-first`、`post-change-sync` 技能與 `GEMINI.md` 常駐約束，強制行動前閱讀機制與每次改動後自動更新文件與 Git 遠端推送。
  * **視覺風格規範純化**：全面移除系統設定與頂部導覽中之 Emoji 符號，全站嚴格遵循專業像素點陣與方括號 `[ ]` 終端機排版風格。
  * **首頁與局內導覽職責重構**：移除開始畫面中央重複的「系統設定」按鈕，聚焦「新手指南」與「立即開戰」雙核心；首頁右上角對稱放置 `[ 設定 ]`，並將「三槓選單 (☰)」調整為僅在戰鬥進行中顯示（作為局內暫停與設定選單），消除功能重複。
  * **單機刷塔模式「奇偶試煉 (The Parity Spire)」**：新增獨立於單局對決的 5 層 Roguelite 刷塔窗口，支援 5 點生命跨層繼承、戰場變異詞綴、第 4 層營地整補與第 5 層 Boss 永劫棋王；引入街機計分體系、本機排行榜與 HTML5 Canvas 8-Bit 像素海報一鍵複製/下載分享。



