/**
 * Best strategy - 永久錢包、軍備庫庫存與自訂立繪持久化模組
 * 純前端免伺服器架構，基於 localStorage 安全儲存
 */
import { getAllCharacters } from '../registry/characters';

export interface WalletState {
  gold: number;
  unlockedCharacterIds: string[];
  activeDeck: Record<number, string>; // Lv.1~6 -> characterId
  customAvatars: Record<string, string>; // characterId -> base64 dataUrl / image url
  history: { date: string; amount: number; reason: string }[];
}

export type PlayerWallet = WalletState;

const WALLET_STORAGE_KEY = 'parity_wallet_v1';

// 依照「一等4張、兩等4張、三等4張、四等3張」自動建立預設 15 張不重複標準卡組
function buildDefault15Deck(): Record<number, string> {
  const allChars = getAllCharacters();
  const byLevel = (lv: number) =>
    allChars.filter(c => (c.base_level ?? c.level ?? 1) === lv);

  const orderedChars = [
    ...byLevel(1).slice(0, 4), // 槽位 1~4：LV.1（4張）
    ...byLevel(2).slice(0, 4), // 槽位 5~8：LV.2（4張）
    ...byLevel(3).slice(0, 4), // 槽位 9~12：LV.3（4張）
    ...byLevel(4).slice(0, 3), // 槽位 13~15：LV.4（3張）
  ];

  const deck: Record<number, string> = {};
  orderedChars.forEach((char, idx) => {
    deck[idx + 1] = char.id;
  });
  return deck;
}

//  LV.1 槽位（例如 4 張）
// 1: 'cyclops_a',  列陣步兵
// 3: 'scout_rogue',    暗影盜賊
// 4: 'trapper_hunter',    // 游擊陷阱兵
// 5: 'infantry_a', // 先鋒步兵
// LV.2 槽位（例如 4 張）
// 6: 'rapper_music_b', // 饒舌小子
// 7: 'knight_guardian',   // 重裝鐵士
// 8: 'duelist_assassin',  // 核心刺客
// 9: 'infantry_b', // 輕飄遊騎
// LV.3 槽位（例如 4 張）
// 10: 'rook_bastion', //堅石主塔
// 11: 'alchemist_transmute', // 煉金術士
// 12: 'bishop_inquisitor', // 聖輝秘僧
// 13: 'catapult_siege', // 歐克族人
// LV.4 槽位（例如 3 張）
// 14: 'bishop_archon', // 光輝大主教
// 15: 'queen_command', // 王國女統領
// 16: 'king_emperor', // 黑曜帝王

// 預設經典 15 角色配置
const DEFAULT_ACTIVE_DECK: Record<number, string> = buildDefault15Deck();

const DEFAULT_WALLET_STATE: WalletState = {
  gold: 300, // 新進試煉者初始啟動金
  unlockedCharacterIds: getAllCharacters().map(c => c.id),
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
  const buildinIds = getAllCharacters().map(c => c.id);

  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) {
      const initialState = {
        ...DEFAULT_WALLET_STATE,
        unlockedCharacterIds: buildinIds,
        activeDeck: { ...DEFAULT_ACTIVE_DECK },
      };
      saveWallet(initialState);
      return initialState;
    }
    const parsed: WalletState = JSON.parse(raw);
    const deckValues = Object.values(parsed.activeDeck || {});
    const isValid15Deck = deckValues.length === 15 && new Set(deckValues).size === 15;

    return {
      gold: typeof parsed.gold === 'number' ? parsed.gold : DEFAULT_WALLET_STATE.gold,
      unlockedCharacterIds: Array.isArray(parsed.unlockedCharacterIds)
        ? Array.from(new Set([...parsed.unlockedCharacterIds, ...buildinIds]))
        : [...buildinIds],
      activeDeck: { ...DEFAULT_ACTIVE_DECK, ...(parsed.activeDeck || {}) }, customAvatars: parsed.customAvatars || {},
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch (e) {
    console.error('Failed to load wallet state, falling back to default', e);
    return { ...DEFAULT_WALLET_STATE, unlockedCharacterIds: buildinIds };
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
 * 重設出征陣容為經典 15 角色
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
