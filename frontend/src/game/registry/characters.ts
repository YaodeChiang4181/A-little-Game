import { Character } from '../types';

/**
 * =========================================================================
 * 像素角色註冊表 (Character Registry) - 專業像素無 Emoji 版
 * =========================================================================
 */

export const INITIAL_CHARACTERS: Character[] = [
  // -------------------------------------------------------------
  // 小兵 (Lv.1) - 【常規步兵】
  // -------------------------------------------------------------
  {
    id: 'pawn',
    name: '小兵',
    level: 1,
    avatar: { type: 'unicode', src: 'pawn' },
    themeColor: '#78909c',
    lore: '看似微不足道的步兵，以微小代價試探敵方陣容。'
  },

  // -------------------------------------------------------------
  // 騎士 (Lv.2) - 【常規騎兵】
  // -------------------------------------------------------------
  {
    id: 'knight',
    name: '騎士',
    level: 2,
    avatar: { type: 'unicode', src: 'knight' },
    themeColor: '#42a5f5',
    lore: '行動迅捷的輕裝騎兵，能靈活佈署於各處戰場。'
  },

  // -------------------------------------------------------------
  // 主塔 (Lv.3) - 【常規重衛】
  // -------------------------------------------------------------
  {
    id: 'rook',
    name: '主塔',
    level: 3,
    avatar: { type: 'unicode', src: 'rook' },
    themeColor: '#ab47bc',
    lore: '巍峨屹立的巨石防線，提供扎實穩定的中堅戰力。'
  },

  // -------------------------------------------------------------
  // 主教 (Lv.4) - 【常規神官】
  // -------------------------------------------------------------
  {
    id: 'bishop',
    name: '主教',
    level: 4,
    avatar: { type: 'unicode', src: 'bishop' },
    themeColor: '#26a69a',
    lore: '掌握戰局節奏的先導者，正面戰力充裕。'
  },

  // -------------------------------------------------------------
  // 皇后 (Lv.5) - 【常規統領】
  // -------------------------------------------------------------
  {
    id: 'queen',
    name: '皇后',
    level: 5,
    avatar: { type: 'unicode', src: 'queen' },
    themeColor: '#ec407a',
    lore: '君臨陣地的強大戰力核心，正面壓迫感十足。'
  },

  // -------------------------------------------------------------
  // 國王 (Lv.6) - 【常規君王】
  // -------------------------------------------------------------
  {
    id: 'king',
    name: '國王',
    level: 6,
    avatar: { type: 'unicode', src: 'king' },
    themeColor: '#ffa726',
    lore: '最高統帥，點數高達 6 級，交鋒無可匹敵。'
  }
];

/**
 * =========================================================================
 * 商城解鎖角色 (Shop Unlockable Characters) - 點數 1~6 嚴格對稱替換庫
 * =========================================================================
 */
export const SHOP_CHARACTERS: Character[] = [
  // -------------------------------------------------------------
  // 盜賊 (Lv.1) - 【奇襲】(對標小兵)
  // -------------------------------------------------------------
  {
    id: 'rogue',
    name: '盜賊',
    level: 1,
    price: 300,
    category: 'shop',
    avatar: { type: 'unicode', src: 'rogue' },
    themeColor: '#10b981',
    lore: '穿行於陰影之中的奇襲者，專門截斷並奪取對手的氣勢。',
    trait: {
      id: 'rogue_ambush',
      name: '暗影奇襲',
      badge: '奇襲',
      trigger: 'BEFORE_CLASH',
      description: '若敵方帶有上一格氣勢加成，將其瓦解並轉化為己方 +1 戰力。',
      execute: (ctx, isPlayer) => {
        const oppBuff = isPlayer ? ctx.enemyBuff : ctx.playerBuff;
        if (oppBuff > 0) {
          return {
            bonusEff: 1,
            cancelOpponentMomentum: true,
            popupText: '[ 奇襲 AMBUSH ] 截斷並吸取敵方氣勢！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 獵人 (Lv.2) - 【陷阱】(對標騎士)
  // -------------------------------------------------------------
  {
    id: 'hunter',
    name: '獵人',
    level: 2,
    price: 500,
    category: 'shop',
    avatar: { type: 'unicode', src: 'hunter' },
    themeColor: '#0284c7',
    lore: '佈設淬毒陷阱的游擊獵手，縱然戰敗也能削弱後續敵軍。',
    trait: {
      id: 'hunter_trap',
      name: '牽制陷阱',
      badge: '陷阱',
      trigger: 'AFTER_CLASH',
      description: '此格若戰敗，對下一格戰場之敵方棋子附加 -1 戰力削弱。',
      execute: (ctx, isPlayer) => {
        const isLoser = isPlayer ? ctx.winner === 'enemy' : ctx.winner === 'player';
        if (isLoser) {
          return {
            enemyEffModifier: -1,
            popupText: '[ 陷阱 TRAP ] 誘敵削弱下格敵軍！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 投石機 (Lv.3) - 【重砲】(對標主塔)
  // -------------------------------------------------------------
  {
    id: 'catapult',
    name: '投石機',
    level: 3,
    price: 700,
    category: 'shop',
    avatar: { type: 'unicode', src: 'catapult' },
    themeColor: '#b45309',
    lore: '攻城拔寨的遠程重型拋石器，擊破防線時造成額外差值破壞。',
    trait: {
      id: 'catapult_siege',
      name: '攻城巨砲',
      badge: '重砲',
      trigger: 'AFTER_CLASH',
      description: '若此格獲勝，兩者差值強制額外 +1 計入總分。',
      execute: (ctx, isPlayer) => {
        const isWinner = isPlayer ? ctx.winner === 'player' : ctx.winner === 'enemy';
        if (isWinner) {
          return {
            overrideDiff: ctx.diff + 1,
            popupText: '[ 重砲 SIEGE ] 攻堅破壞差值 +1！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 鍊金術士 (Lv.4) - 【同化】(對標主教)
  // -------------------------------------------------------------
  {
    id: 'alchemist',
    name: '鍊金術士',
    level: 4,
    price: 800,
    category: 'shop',
    avatar: { type: 'unicode', src: 'alchemist' },
    themeColor: '#7e22ce',
    lore: '探尋物質轉化真理的學者，在均勢僵局中引發奇蹟質變。',
    trait: {
      id: 'alchemist_transmute',
      name: '質變同化',
      badge: '同化',
      trigger: 'DETERMINE_WIN',
      description: '若雙方有效戰力完全相同（平手），強制改判為己方獲勝！',
      execute: (ctx, isPlayer) => {
        if (ctx.playerEff === ctx.enemyEff) {
          return {
            overrideWinner: isPlayer ? 'player' : 'enemy',
            popupText: '[ 同化 TRANSMUTE ] 平局逆轉獲勝！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 大魔導師 (Lv.5) - 【魔能】(對標皇后)
  // -------------------------------------------------------------
  {
    id: 'archmage',
    name: '大魔導師',
    level: 5,
    price: 1200,
    category: 'shop',
    avatar: { type: 'unicode', src: 'archmage' },
    themeColor: '#ec4899',
    lore: '掌控狂暴奧術秘能的巔峰法皇，專門壓制高階敵方將領。',
    trait: {
      id: 'archmage_arcane',
      name: '秘術壓制',
      badge: '魔能',
      trigger: 'BEFORE_CLASH',
      description: '若對手為 Lv.4 以上高階棋子，自身戰力額外躍升 +2。',
      execute: (ctx, isPlayer) => {
        const oppChar = isPlayer ? ctx.enemyChar : ctx.playerChar;
        if (oppChar.level >= 4) {
          return {
            bonusEff: 2,
            popupText: '[ 魔能 ARCANE ] 奧術共鳴戰力 +2！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 暴君 (Lv.6) - 【君臨】(對標國王)
  // -------------------------------------------------------------
  {
    id: 'tyrant',
    name: '暴君',
    level: 6,
    price: 1500,
    category: 'shop',
    avatar: { type: 'unicode', src: 'tyrant' },
    themeColor: '#dc2626',
    lore: '以鐵腕統治黑曜王國的冷血君王，極度渴望以壓倒性差距撕碎對手。',
    trait: {
      id: 'tyrant_overrule',
      name: '狂暴君臨',
      badge: '君臨',
      trigger: 'AFTER_CLASH',
      description: '勝出時若差值 ≥ 2，該格差值翻倍計入！',
      execute: (ctx, isPlayer) => {
        const isWinner = isPlayer ? ctx.winner === 'player' : ctx.winner === 'enemy';
        if (isWinner && ctx.diff >= 2) {
          return {
            overrideDiff: ctx.diff * 2,
            popupText: '[ 君臨 OVERRULE ] 差值強制翻倍！'
          };
        }
        return null;
      }
    }
  }
];

// 全域角色註冊表
export const ALL_CHARACTERS: Character[] = [...INITIAL_CHARACTERS, ...SHOP_CHARACTERS];

// 角色查找與管理輔助函數
export const CHARACTER_MAP: Record<string, Character> = {};
ALL_CHARACTERS.forEach(c => {
  CHARACTER_MAP[c.id] = c;
});

export function getCharacter(idOrLevel: string | number): Character {
  const key = idOrLevel.toString();
  return CHARACTER_MAP[key] || INITIAL_CHARACTERS[0];
}

export function getAllCharacters(): Character[] {
  return [...ALL_CHARACTERS];
}

export function getShopCharacters(): Character[] {
  return [...SHOP_CHARACTERS];
}

/**
 * 取得指定等級的所有候選角色（經典 + 商城已解鎖）
 */
export function getCharactersByLevel(level: number): Character[] {
  return ALL_CHARACTERS.filter(c => c.level === level);
}

/**
 * 取得玩家當前配置的出征卡組（預設 6 張，對應 Lv.1 ~ Lv.6 各 1 張）
 * 支援從 localStorage 錢包動態組裝
 */
export function getActivePlayerDeck(): Character[] {
  try {
    // 動態引用避免循環相依
    const raw = localStorage.getItem('parity_wallet_v1');
    if (!raw) return [...INITIAL_CHARACTERS];
    const wallet = JSON.parse(raw);
    const activeDeck: Record<number, string> = wallet.activeDeck || {};

    const deck: Character[] = [];
    for (let lv = 1; lv <= 6; lv++) {
      const charId = activeDeck[lv];
      const char = (charId && CHARACTER_MAP[charId]) || INITIAL_CHARACTERS[lv - 1];
      deck.push(char);
    }
    return deck;
  } catch (e) {
    return [...INITIAL_CHARACTERS];
  }
}

/**
 * =========================================================================
 * 💡 自訂新角色與新特性擴充指南 (Custom Character Developer Guide)
 * =========================================================================
 * 若您未來想自行新增角色，只需在 SHOP_CHARACTERS 中加入如下物件：
 * 
 * {
 *   id: 'ninja',                           // 唯一英文 ID
 *   name: '忍者',                          // 角色名稱
 *   level: 1,                              // 等級/點數 (1~6)
 *   price: 400,                            // 商城金幣售價
 *   avatar: { type: 'unicode', src: 'pawn' }, // 像素立繪，亦可使用 type: 'image', src: '/characters/ninja.png'
 *   themeColor: '#475569',                 // 卡框專屬配色
 *   lore: '出沒於黑夜的暗殺行者。',          // 背景故事
 *   trait: {
 *     id: 'ninja_smoke',                   // 特性唯一 ID
 *     name: '煙幕障眼',                     // 特性名稱
 *     badge: '隱遁',                       // 2~3 字特色標籤
 *     trigger: 'BEFORE_CLASH',             // 觸發時機：'BEFORE_CLASH' | 'DETERMINE_WIN' | 'AFTER_CLASH' | 'ON_MOMENTUM'
 *     description: '此格不受任何戰場環境負面效果影響。', // 提示說明
 *     execute: (ctx, isPlayer) => {
 *       // 在此編寫效果邏輯，回傳 ClashModification 或 null
 *       return { bonusEff: 1, popupText: '[ 隱遁 ] 戰力 +1！' };
 *     }
 *   }
 * }
 */

