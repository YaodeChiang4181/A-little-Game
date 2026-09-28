# 氣勢連鎖奇偶戰 (Parity Battle Engine) ⚔️

這是一款結合了「像素西洋棋」、「賽局理論」與「奇偶數陣營博弈」的卡牌對戰小遊戲。
玩家將在三個截然不同的戰場上佈署兵力，與具備智能演算法的 AI 對手展開博弈，爭奪最終的勝利。

## 🎯 核心玩法 (Gameplay)

1. **三格戰場與加成**：
   雙方每回合會從 6 種棋子（Lv.1 ~ Lv.6）中隨機抽取 3 張手牌，並將其暗置於三大戰場中：
   * **沼澤地帶** (差值積分 × 1)
   * **城鎮街道** (差值積分 × 2)
   * **皇宮大殿** (差值積分 × 3)

2. **交鋒與氣勢連鎖 (Momentum Buff)**：
   * 卡牌依序翻開進行比拚，數值大者勝出。
   * **經驗加成**：贏得該格戰鬥的一方，將會為自己的下一張牌帶來 `+1` 的隱藏氣勢加成，形成連鎖優勢！

3. **奇偶數陣營結算 (Parity System)**：
   * 雙方分為 **ODD (奇數)** 與 **EVEN (偶數)** 兩個陣營。**每局結束後，雙方會自動攻防換邊（互換陣營）**。
   * 三個戰場的（差值 × 場地權重）加總即為**「總積分」**。
   * 如果總積分為「奇數」，則 ODD 陣營發動攻擊，對手扣 1 滴血。
   * 如果總積分為「偶數」，則 EVEN 陣營發動攻擊，對手扣 1 滴血。
   * 雙方各有 3 滴血，率先扣完者戰敗。

## 🤖 智能 AI 對手

後端的敵方並非隨機出牌。AI 引擎會窮舉自身手牌的 6 種排列組合，並模擬對應玩家可能的 120 種陣型，預判出在當下陣營（ODD 還是 EVEN）中，能讓自己不受傷（甚至讓玩家扣血）機率最高的**「最佳佈署決策」**。

## 💻 專案架構與技術棧 (Tech Stack)

本專案採用現代化全端分離架構：

### Frontend (前端介面)
* **技術**：React + Vite + TypeScript
* **UI/UX 亮點**：
  * **雙階段張力動畫**：神秘卡牌飛入戰場（Fly-in）與逐格掀牌交鋒（Flip-reveal）。
  * **響應式佈局**：電腦版採用充滿對峙感的三欄式佈局，手機版則自動適應為無縫的上下版面。
  * **打字機算式推演**：實時以打字機動畫顯示戰鬥結算算式。
  * **戰況歷史覆盤**：完整記錄每一局的真實等級、卡牌、算式與傷害判定。
* **部署**：Vercel

### Backend (後端引擎)
* **技術**：Python + FastAPI
* **核心模組**：
  * `engine.py`：處理交鋒邏輯、氣勢加成與奇偶數傷害判定。
  * `ai_agent.py`：賽局模擬與最佳佈署演算法。
* **部署**：Render Web Service

### Database (資料庫)
* **技術**：PostgreSQL (via SQLAlchemy ORM)
* **功能**：持久化儲存每一場 Game 的血量狀態與每一 Round 的詳細對戰記錄（JSON 格式）。
* **部署**：Neon Serverless Postgres

## 🚀 開發與運行指引

### 環境變數設定 (`.env`)
後端需要設定以下環境變數：
```env
# Neon PostgreSQL 連線字串
DATABASE_URL=postgresql://user:password@endpoint...
```
前端需要設定以下環境變數（Vercel 後台）：
```env
# 指向 Render 後端的 API 網址，結尾需包含 /api
VITE_API_URL=https://your-backend-app.onrender.com/api
```

### 本地端啟動
**啟動後端：**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**啟動前端：**
```bash
cd frontend
npm install
npm run dev
```
