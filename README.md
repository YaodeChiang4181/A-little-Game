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

* **2026-10-27**：
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



