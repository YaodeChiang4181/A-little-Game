# 自訂像素角色與新效果擴充指引 (Custom Character & Trait Developer Guide) 🛠️

本遊戲採用**模組化資料驅動架構 (Data-Driven Architecture)**，您可以隨時在 `src/game/registry/characters.ts` 自由新增自訂角色與特性，戰鬥結算引擎與智能 AI 會全自動感知適配！

---

## 🎨 一、 如何為角色更換像素圖片 (Pixel Art)

本專案提供兩種極簡的像素圖片方式：

### 方式 1：遊戲內直接點選上傳（推薦，最方便）
1. 在遊戲首頁點擊 `[ 軍備 ]` 進入軍備庫。
2. 點擊想要換裝的角色，按下 `[ 📷 上傳自訂立繪 ]`。
3. 選擇電腦中的任意圖片（PNG、GIF、SVG、WebP 均可）。
4. 系統會自動轉為像素化圖片並永久儲存於瀏覽器 `localStorage` 中，任何戰鬥均會即時呈現！隨時可按 `[ 恢復官方像素 ]` 重設。

### 方式 2：放入 `public/characters/` 目錄
1. 將您的像素圖檔（如 `ninja.png`，建議尺寸 36x36 ~ 72x72 像素）放置於 `frontend/public/characters/` 資料夾。
2. 在 `characters.ts` 中設定：
   ```ts
   avatar: {
     type: 'image',
     src: '/characters/ninja.png'
   }
   ```
   系統已內建 CSS `image-rendering: pixelated;`，保證點對點硬邊像素放大不模糊！

---

## ⚡ 二、 如何新增角色與自訂「技能效果」

只需在 `frontend/src/game/registry/characters.ts` 的 `SHOP_CHARACTERS` 陣列中新增一個物件：

```typescript
{
  id: 'assassin',                        // 1. 唯一英文識別碼 (不可與其他角色重複)
  name: '暗影刺客',                      // 2. 遊戲內顯示名稱
  level: 1,                              // 3. 基礎點數/等級 (1 至 6，建議每個等級都有替代角色)
  price: 450,                            // 4. 商城招募金幣價格
  category: 'shop',                      // 5. 分類 (shop 或 custom)
  avatar: { type: 'unicode', src: 'pawn' }, // 6. 預設立繪 (或指定圖片路徑)
  themeColor: '#7c3aed',                 // 7. 專屬邊框色彩 (Hex Code)
  lore: '潛伏於王宮帷幕後的刺客，出其不意給予對手致命重擊。', // 8. 背景故事
  
  // 9. 核心特性鉤子 (Trait Hook)
  trait: {
    id: 'assassin_strike',
    name: '致命一擊',
    badge: '暗殺',                       // 卡牌下方小徽章 (2~3 字)
    trigger: 'BEFORE_CLASH',             // 觸發生命週期 (詳見下方)
    description: '交鋒前，若敵方戰力大於自身，自身戰力額外 +2。', // 懸浮 Tooltip 說明
    execute: (context, isPlayer) => {
      // 讀取當前交鋒數值
      const myEff = isPlayer ? context.playerEff : context.enemyEff;
      const oppEff = isPlayer ? context.enemyEff : context.playerEff;

      // 滿足觸發條件
      if (oppEff > myEff) {
        return {
          bonusEff: 2,                                  // 自身戰力 +2
          popupText: '[ 暗殺 STRIKE ] 弱勢突襲戰力 +2！' // 畫面浮動像素字
        };
      }
      return null; // 不滿足條件時回傳 null
    }
  }
}
```

---

## 🪝 三、 特性觸發時機 (Trigger) 與回傳效果 (ClashModification)

### 1. 觸發時機 (`trigger`)：
* `'BEFORE_CLASH'`：**交鋒前**。適合用於「調整雙方戰力點數」、「吸取/清除氣勢連鎖」等。
* `'DETERMINE_WIN'`：**勝負判定時**。適合用於「特殊勝負翻盤條件」（如小兵以弱勝強、鍊金術士平手改判勝出）。
* `'AFTER_CLASH'`：**結算差值時**。適合用於「鎖定差值」（如主塔差值鎖為 1）、「增加差值」（投石機）、「差值翻倍」（暴君）、「削弱下格敵方戰力」（獵人）。
* `'ON_MOMENTUM'`：**傳遞氣勢時**。適合用於「增幅下一格氣勢加成」（如皇后勝出下一格 +2 氣勢）。

### 2. 支援的回傳效果 (`ClashModification`)：
| 欄位名稱 | 型別 | 效果說明 |
| :--- | :--- | :--- |
| `bonusEff` | `number` | 增加自身有效戰力（如 `bonusEff: 2`） |
| `enemyEffModifier` | `number` | 減少/調整對手戰力（如 `enemyEffModifier: -1`） |
| `overrideWinner` | `'player' \| 'enemy' \| 'tie'` | 強制直接指定勝者（覆寫純數值比較） |
| `overrideDiff` | `number` | 強制覆寫兩者差值（如主塔固定為 1、暴君翻倍） |
| `overrideScore` | `number` | 強制覆寫該格結算總積分 |
| `overrideMomentum` | `number` | 覆寫此格勝出帶給下一格的氣勢加成數值 |
| `cancelOpponentMomentum` | `boolean` | 消除對手上一格獲得的氣勢加成 |
| `popupText` | `string` | 觸發時於戰場中央彈出的街機戰鬥標籤 |

---

## 🤖 四、 智能 AI 的相容性

您新增的任何角色，`src/game/aiAgent.ts` 均會在進行 24 種出牌模擬時**動態呼叫其 `execute()` 鉤子**，因此 AI 會自動理解新角色的技能並做出最具侵略性或防禦性的決策，無需手動微調 AI 代碼！
