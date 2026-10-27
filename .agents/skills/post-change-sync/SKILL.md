---
name: post-change-sync
description: MANDATORY: Trigger this skill AFTER completing any code changes, bug fixes, or feature updates in this workspace. Ensures the assistant always records the modifications into README.md and performs a git commit & git push to the remote repository.
---

# 完成改動記錄與遠端同步規範 (Post-Change Sync Protocol)

在完成任何程式碼編輯、新功能開發或錯誤修復後，**嚴格禁止**在未更新文件與未推送遠端的情況下結束任務。你必須遵循以下流程將最新狀態固化並同步：

---

## 標準執行步驟 (SOP)

1. **第一步：更新 [README.md](file:///c:/Users/09664/Desktop/個人專案群/六抽三小遊戲/A-little-Game/README.md)**
   - 檢視本次修改或新增的模組（如新元件、新音效引擎、新卡牌角色或規則變更）。
   - 將新功能、架構說明或更新日誌 (Changelog) 準確補齊至 `README.md` 相應章節。

2. **第二步：語法與完整性快速驗證**
   - 確保所有修改的檔案無語法錯誤、無遺漏 import、無未定義變數。

3. **第三步：Git 暫存與提交 (Git Add & Commit)**
   - 使用 `run_command` 於 `A-little-Game` 目錄執行：
     ```bash
     git add .
     git commit -m "feat(或 fix): 詳細描述本次完成的功能或變更"
     ```

4. **第四步：推送到遠端儲存庫 (Git Push)**
   - 使用 `run_command` 執行：
     ```bash
     git push
     ```
   - 若遠端有更新，先執行 `git pull --rebase` 再 push。

5. **第五步：驗證工作區狀態**
   - 執行 `git status` 確認 working tree 為 clean 狀態，分支與遠端保持同步。

---

## 檢查清單 (Checklist)
- [ ] [README.md](file:///c:/Users/09664/Desktop/個人專案群/六抽三小遊戲/A-little-Game/README.md) 是否已詳實反映本次改動？
- [ ] 是否已執行 `git add .`？
- [ ] 提交訊息 (Commit Message) 是否清晰語意化？
- [ ] 是否已成功執行 `git push` 且遠端接收成功？
