---
name: read-readme-first
description: MANDATORY: Trigger this skill BEFORE taking any action, answering questions, or editing files in this workspace. Ensures the assistant always reads the project README.md first to maintain alignment with current game rules, mechanics, and architecture.
---

# 優先閱讀 README 規範 (Read README First Protocol)

身為【六抽三小遊戲】(氣勢連鎖奇偶戰 / Parity Battle Engine) 的專屬開發助理，在進行任何實質行動、提出架構分析或撰寫/修改任何程式碼之前，**必須優先確認並閱讀最新的 [README.md](file:///c:/Users/09664/Desktop/個人專案群/六抽三小遊戲/A-little-Game/README.md)**。

---

## 執行流程

1. **第一步（必做）：閱讀專案 README**
   - 調用 `view_file` 讀取 `c:\Users\09664\Desktop\個人專案群\六抽三小遊戲\A-little-Game\README.md`。
   - 若為長文件，確保完整檢視核心玩法、角色特性、動態戰場環境與技術架構段落。

2. **第二步：校準與理解專案現狀**
   - **核心玩法規則**：
     - 手牌管理（抽 4 選 3 佈署）、24 種出牌組合。
     - 陣營機制（ODD 奇數 / EVEN 偶數陣營、每局結束互換陣營）。
     - 氣勢連鎖（Momentum Buff +1 或 +2）與差值結算。
   - **角色特性與戰場環境**：
     - 檢查 `characters.ts` 與 `terrains.ts` 是否有新規範或特性生命週期鉤子。
   - **技術棧與工程架構**：
     - 前端純客戶端架構（React 18 + Vite + TypeScript）。
     - 核心路徑規範（`src/game/types.ts`, `src/game/engine.ts`, `src/game/aiAgent.ts`, `src/game/gameService.ts`）。

3. **第三步：接續執行使用者的具體需求**
   - 在確保對專案規則完全理解無誤後，方可呼叫後續的編輯工具（如 `replace_file_content`、`write_to_file`、`run_command` 等）或回應用戶問題。

---

## 檢查清單 (Checklist)
- [ ] 我是否在採取行動前呼叫了 `view_file` 檢視 [README.md](file:///c:/Users/09664/Desktop/個人專案群/六抽三小遊戲/A-little-Game/README.md)？
- [ ] 我的修改是否違反了 README 中定義的遊戲機制或模組化資料驅動規範？
- [ ] 是否需要配合 `syntax-checker` 技能在修改完成後進行語法檢查？
