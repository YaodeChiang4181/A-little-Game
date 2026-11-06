/**
 * 氣勢連鎖奇偶戰 - 永久錢包、軍備庫庫存與自訂立繪持久化模組
 * 純前端免伺服器架構，基於 localStorage 安全儲存
 */

export interface WalletState {
  gold: number;
  unlockedCharacterIds: string[];
  activeDeck: Record<number, string>; // Lv.1~6 -> characterId
  customAvatars: Record<string, string>; // characterId -> base64 dataUrl / image url
  history: { date: string; amount: number; reason: string }[];
}

const WALLET_STORAGE_KEY = 'parity_wallet_v1';

// 預設經典 6 棋子配置
const DEFAULT_ACTIVE_DECK: Record<number, string> = {
  1: 'pawn',
  2: 'knight',
  3: 'rook',
  4: 'bishop',
  5: 'queen',
  6: 'king'
};

const DEFAULT_WALLET_STATE: WalletState = {
  gold: 300, // 新進試煉者初始啟動金
  unlockedCharacterIds: ['pawn', 'knight', 'rook', 'bishop', 'queen', 'king'],
  activeDeck: { ...DEFAULT_ACTIVE_DECK },
  customAvatars: {},
  history: [{ date: new Date().toISOString(), amount: 300, reason: '初始招募物資' }]
};

// 訂閱事件監聽器列表 (供 UI 自動即時響應)
type WalletListener = (state: WalletState) => void;
const listeners: Set<WalletListener> = new Set();

export function subscribeWallet(listener: WalletListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(state: WalletState): void {
  listeners.forEach(fn => fn(state));
}

/**
 * 讀取當前錢包與軍備庫狀態
 */
export function getWallet(): WalletState {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      saveWallet(DEFAULT_WALLET_STATE);
      return { ...DEFAULT_WALLET_STATE };
    }
    const parsed: WalletState = JSON.parse(raw);
    return {
      gold: typeof parsed.gold === 'number' ? parsed.gold : DEFAULT_WALLET_STATE.gold,
      unlockedCharacterIds: Array.isArray(parsed.unlockedCharacterIds)
        ? parsed.unlockedCharacterIds
        : [...DEFAULT_WALLET_STATE.unlockedCharacterIds],
      activeDeck: parsed.activeDeck || { ...DEFAULT_ACTIVE_DECK },
      customAvatars: parsed.customAvatars || {},
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch (e) {
    console.error('Failed to load wallet state, falling back to default', e);
    return { ...DEFAULT_WALLET_STATE };
  }
}

/**
 * 儲存錢包狀態至 localStorage 並廣播更新
 */
function saveWallet(state: WalletState): void {
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
    notifyListeners(state);
  } catch (e) {
    console.error('Failed to save wallet state', e);
  }
}

/**
 * 增加金幣（對局勝利、完封、爬塔獎勵）
 */
export function addGold(amount: number, reason: string): number {
  if (amount <= 0) return getWallet().gold;
  const current = getWallet();
  const nextState: WalletState = {
    ...current,
    gold: current.gold + amount,
    history: [
      { date: new Date().toISOString(), amount, reason },
      ...current.history.slice(0, 49) // 保留最近 50 筆
    ]
  };
  saveWallet(nextState);
  return nextState.gold;
}

/**
 * 消費金幣（商城招募角色）
 */
export function spendGold(amount: number, reason: string): boolean {
  const current = getWallet();
  if (current.gold < amount) return false;
  const nextState: WalletState = {
    ...current,
    gold: current.gold - amount,
    history: [
      { date: new Date().toISOString(), amount: -amount, reason },
      ...current.history.slice(0, 49)
    ]
  };
  saveWallet(nextState);
  return true;
}

/**
 * 解鎖新角色
 */
export function unlockCharacter(characterId: string, price: number): boolean {
  const current = getWallet();
  if (current.unlockedCharacterIds.includes(characterId)) {
    return true; // 已擁有
  }
  if (!spendGold(price, `招募角色 [${characterId}]`)) {
    return false; // 金幣不足
  }
  const updated = getWallet();
  const nextState: WalletState = {
    ...updated,
    unlockedCharacterIds: [...updated.unlockedCharacterIds, characterId]
  };
  saveWallet(nextState);
  return true;
}

/**
 * 檢查角色是否已解鎖
 */
export function isCharacterUnlocked(characterId: string): boolean {
  return getWallet().unlockedCharacterIds.includes(characterId);
}

/**
 * 設定當前出征陣容的某個等級槽位 (Lv.1 ~ Lv.6)
 */
export function setActiveDeckSlot(level: number, characterId: string): void {
  const current = getWallet();
  const nextState: WalletState = {
    ...current,
    activeDeck: {
      ...current.activeDeck,
      [level]: characterId
    }
  };
  saveWallet(nextState);
}

/**
 * 重設出征陣容為經典 6 西洋棋
 */
export function resetActiveDeckToDefault(): void {
  const current = getWallet();
  const nextState: WalletState = {
    ...current,
    activeDeck: { ...DEFAULT_ACTIVE_DECK }
  };
  saveWallet(nextState);
}

/**
 * 設定/更新角色的自訂像素圖片 (支援玩家上傳的 Base64 圖片)
 */
export function setCustomCharacterAvatar(characterId: string, dataUrl: string): void {
  const current = getWallet();
  const nextState: WalletState = {
    ...current,
    customAvatars: {
      ...current.customAvatars,
      [characterId]: dataUrl
    }
  };
  saveWallet(nextState);
}

/**
 * 清除自訂圖片，恢復官方預設立繪
 */
export function clearCustomCharacterAvatar(characterId: string): void {
  const current = getWallet();
  const nextAvatars = { ...current.customAvatars };
  delete nextAvatars[characterId];
  const nextState: WalletState = {
    ...current,
    customAvatars: nextAvatars
  };
  saveWallet(nextState);
}

/**
 * 取得角色的自訂圖片（若無則回傳 null）
 */
export function getCustomCharacterAvatar(characterId: string): string | null {
  return getWallet().customAvatars[characterId] || null;
}
