# 專案強制規範 (Workspace Rules)

本專案為【六抽三小遊戲】（氣勢連鎖奇偶戰 / Parity Battle Engine）。為確保所有開發與維護工作與現有遊戲機制、架構定義嚴格保持一致，所有 AI 代理必須無條件遵守以下規則：

---

## 1. 行動前必讀規範 (Pre-action Requirement) - 最高優先順序

* **每次開始行動或回答架構性問題前，第一步必須使用 `view_file` 閱讀 [README.md](file:///c:/Users/09664/Desktop/個人專案群/六抽三小遊戲/A-little-Game/README.md)**。
* **嚴格禁止**在未檢閱 `README.md` 的情況下逕行修改任何程式碼檔案（如 `frontend/src/*` 或 `backend/*`）或憑空假設遊戲數值、技能判定機制。
* 助理必須啟動並遵循 `read-readme-first` 技能，完成核心規則（手牌管理、奇偶結算、動態戰場、角色生命週期鉤子）的對齊後，方可進入實作環節。

---

## 2. 程式碼變更與語法安全規範 (Syntax & Type Safety)

* 遵守 `syntax-checker` 技能規範：
  * 在任何修改完成後，若更動 TypeScript / React 程式碼，必須執行靜態型別與語法確認（如 `npx tsc --noEmit` 或 `npm run build`）。
  * 嚴格禁止引入 `NameError`、未定義變數或型別錯誤。

---

## 3. 完成改動後必做規範 (Post-action Requirement) - 記錄與同步

* **每次完成任何代碼改動、新功能或錯誤修復後，必須嚴格執行以下流程**：
  1. **記錄於 README**：在 [README.md](file:///c:/Users/09664/Desktop/個人專案群/六抽三小遊戲/A-little-Game/README.md) 中更新相關架構、新元件與變更日誌。
  2. **Git 提交與推送**：透過 `run_command` 執行 `git add .`、`git commit -m "..."` 並執行 `git push` 推送至遠端倉庫。
* 隨時調用並遵循 `post-change-sync` 技能，確保每次工作成果都留痕並同步。

---

## 4. 架構設計準則

* **模組化資料驅動 (Data-Driven)**：新增棋子角色與戰場環境應優先擴充 `src/game/registry/characters.ts` 與 `src/game/registry/terrains.ts`，確保引擎 (`engine.ts`) 與 AI 決策器 (`aiAgent.ts`) 自動感知。
* **純客戶端無伺服器優先**：遊戲邏輯核心運行於前端，保持毫秒級即時運算體驗。

---

## 5. 平台部署記憶與規範 (Vercel Deployment Memory) - 永久約束

* **雲端託管平台**：本專案已正式部署於 **Vercel**（採用無伺服器純前端架構，Vercel 設定 Root Directory 為 `frontend`）。
* **嚴格型別編譯標準**：Vercel CI/CD 建置指令為 `tsc && vite build`，在嚴格模式 (`strict: true`) 下執行：
  1. 嚴格禁止缺漏 props 型別、未定義型別、或未宣告介面屬性（例如組件屬性必須完整定義）。
  2. 瀏覽器特有 API（如 `ClipboardItem`、`webkitAudioContext` 等）必須具備安全型別判定與容錯 fallback，不可引發編譯失敗。
  3. 保障 SPA 重寫路由：確保 `frontend/vercel.json` 包含 `rewrites: [{ source: "/(.*)", destination: "/index.html" }]`，避免網頁重整時出現 404。
  4. 每次推送前確認代碼完全符合 TypeScript 嚴格標準，不可讓 Vercel CI/CD 出現任何建置錯誤。
