import { Card } from '../types';

/**
 * =========================================================================
 * 15 張標準三路博弈牌組 (15-Card Tactical Parity Deck)
 * 嚴格契合規格書：
 * - 牌組規模：15 張
 * - base_level: 1 ~ 4
 * - 特性角集中於 1~2 級；3~4 級為穩健高戰力白板
 * =========================================================================
 */

export const STANDARD_CARDS: Card[] = [
  // -----------------------------------------------------------------------
  // LV.1 梯隊 (共 4 張：2 特性角 + 2 純白板)
  // -----------------------------------------------------------------------
  {
    id: 'scout_rogue',
    name: '暗影斥候',
    base_level: 1,
    level: 1,
    has_trait: true,
    avatar: { type: 'image', src: '/avatars/rogue.gif' },
    themeColor: '#10b981',
    lore: '游弋於戰場兩翼的刺探斥候，善於藉助側翼地形發動奇襲。',
    trait: {
      id: 'scout_flank',
      name: '側翼突襲',
      badge: '突襲',
      trigger: 'ON_REVEAL',
      description: '若部署於左翼 (L0) 或右翼 (L2)，自身有效戰力 +1。',
      execute: (ctx) => {
        if (ctx.laneIndex === 0 || ctx.laneIndex === 2) {
          return {
            bonusEffectiveLevel: 1,
            popupText: '[ 突襲 FLANK ] 側翼借勢戰力 +1！'
          };
        }
        return null;
      }
    }
  },
  {
    id: 'trapper_hunter',
    name: '游擊陷阱兵',
    base_level: 1,
    level: 1,
    has_trait: true,
    avatar: { type: 'unicode', src: 'hunter' },
    themeColor: '#0284c7',
    lore: '於行軍路線設伏的伏擊手，戰敗或交鋒時能有效削弱對位敵軍。',
    trait: {
      id: 'trapper_snare',
      name: '牽制泥沼',
      badge: '牽制',
      trigger: 'ON_REVEAL',
      description: '開牌時，對位之敵方卡牌有效戰力 -1（最低為 0）。',
      execute: (ctx) => {
        const oppCard = ctx.oppCards[ctx.laneIndex];
        if (oppCard) {
          return {
            enemyEffectiveLevelModifier: -1,
            popupText: '[ 牽制 SNARE ] 削弱正對面敵軍 -1！'
          };
        }
        return null;
      }
    }
  },
  {
    id: 'pawn_infantry_a',
    name: '先鋒步兵',
    base_level: 1,
    level: 1,
    has_trait: false,
    avatar: { type: 'image', src: '/avatars/Solider.gif' },
    themeColor: '#dc9f55ff',
    lore: '恪盡職守的常規陣線步兵，站在那裏似乎就很可靠。'
  },
  {
    id: 'pawn_infantry_b',
    name: '列陣衛兵',
    base_level: 1,
    level: 1,
    has_trait: false,
    avatar: { type: 'unicode', src: 'pawn' },
    themeColor: '#78909c',
    lore: '受過嚴格軍陣操練的近衛步兵，堅實無華。'
  },

  // -----------------------------------------------------------------------
  // LV.2 梯隊 (共 4 張：2 特性角 + 2 純白板)
  // -----------------------------------------------------------------------
  {
    id: 'knight_guardian',
    name: '重裝鐵士',
    base_level: 2,
    level: 2,
    has_trait: true,
    avatar: { type: 'image', src: '/avatars/Knight.gif' },
    themeColor: '#42a5f5',
    lore: '身披厚甲的堅盾防線，在陷入逆境時激發不屈意志。',
    trait: {
      id: 'Dark knight',
      name: '堅毅防線',
      badge: '不屈',
      trigger: 'PASSIVE',
      description: '若此路對手卡牌基礎戰力高於自身，有效戰力額外 +1。',
      execute: (ctx) => {
        const oppCard = ctx.oppCards[ctx.laneIndex];
        if (oppCard && oppCard.base_level > 2) {
          return {
            bonusEffectiveLevel: 1,
            popupText: '[ 不屈 Spirit of knight ] 逆境激發戰力 +1！'
          };
        }
        return null;
      }
    }
  },
  {
    id: 'duelist_assassin',
    name: '核心刺客',
    base_level: 2,
    level: 2,
    has_trait: true,
    avatar: { type: 'unicode', src: 'catapult' },
    themeColor: '#e11d48',
    lore: '鎖定敵軍大本營的中路突破專家，專精於要塞斬首。',
    trait: {
      id: 'assassin_core',
      name: '中路刺殺',
      badge: '斬首',
      trigger: 'ON_REVEAL',
      description: '若部署於中路 (L1) 且符合禁令，自身有效戰力 +1 (達到 3 點)。',
      execute: (ctx) => {
        if (ctx.laneIndex === 1 && !ctx.isLaneConstraintViolated) {
          return {
            bonusEffectiveLevel: 1,
            popupText: '[ 斬首 CORE ] 中路精準突入戰力 +1！'
          };
        }
        return null;
      }
    }
  },
  {
    id: 'cavalry_rider_a',
    name: '巡防遊騎',
    base_level: 2,
    level: 2,
    has_trait: false,
    avatar: { type: 'unicode', src: 'knight' },
    themeColor: '#0ea5e9',
    lore: '速度飛快的巡弋騎兵，戰術機動性優秀。'
  },
  {
    id: 'cavalry_rider_b',
    name: '輕裝飆騎',
    base_level: 2,
    level: 2,
    has_trait: false,
    avatar: { type: 'unicode', src: 'knight' },
    themeColor: '#38bdf8',
    lore: '擅長高速切入戰線的正規騎兵部隊。'
  },

  // -----------------------------------------------------------------------
  // LV.3 梯隊 (共 4 張：4 純白板)
  // -----------------------------------------------------------------------
  {
    id: 'rook_bastion',
    name: '堅石主塔',
    base_level: 3,
    level: 3,
    has_trait: false,
    avatar: { type: 'unicode', src: 'rook' },
    themeColor: '#ab47bc',
    lore: '巍峨屹立的要塞高塔，提供極為強悍的中堅戰力支撐。'
  },
  {
    id: 'catapult_siege',
    name: '歐克族人',
    base_level: 3,
    level: 3,
    has_trait: false,
    avatar: { type: 'unicode', src: '/avatars/Ork.gif' },
    themeColor: '#2f940dff',
    lore: '具備巨大化技能的重型戰士，雖然看起來很粗魯，但每次問他問題只會說「呵呵」。'
  },
  {
    id: 'bishop_inquisitor',
    name: '審判聖官',
    base_level: 3,
    level: 3,
    has_trait: false,
    avatar: { type: 'unicode', src: 'bishop' },
    themeColor: '#8b5cf6',
    lore: '執掌肅清戒律的高位神官，正面作戰威儀奪目。'
  },
  {
    id: 'alchemist_transmute',
    name: '鍊金術士',
    base_level: 3,
    level: 3,
    has_trait: false,
    avatar: { type: 'unicode', src: 'alchemist' },
    themeColor: '#9333ea',
    lore: '調配毀滅奧術試劑的鍊金學者，威力不容小覷。'
  },

  // -----------------------------------------------------------------------
  // LV.4 梯隊 (共 3 張：3 純白板高階王牌)
  // -----------------------------------------------------------------------
  {
    id: 'bishop_archon',
    name: '光輝大主教',
    base_level: 4,
    level: 4,
    has_trait: false,
    avatar: { type: 'image', src: '/avatars/bishop.gif' },
    themeColor: '#26a69a',
    lore: '執掌教廷最高聖光的神權代表，頂級 4 級戰力壓迫。'
  },
  {
    id: 'queen_command',
    name: '王國女統領',
    base_level: 4,
    level: 4,
    has_trait: false,
    avatar: { type: 'unicode', src: 'queen' },
    themeColor: '#ec407a',
    lore: '軍功赫赫的戰場總指揮，單體戰力冠絕全軍。'
  },
  {
    id: 'king_emperor',
    name: '黑曜帝王',
    base_level: 4,
    level: 4,
    has_trait: false,
    avatar: { type: 'unicode', src: 'king' },
    themeColor: '#ffa726',
    lore: '王國最高統率君主，4 級無匹戰力，鎮守核心戰線。'
  }
];

// 卡牌索引表
export const CARD_MAP: Record<string, Card> = {};
STANDARD_CARDS.forEach(c => {
  CARD_MAP[c.id] = c;
});

/**
 * 取得一張深拷貝的卡牌（避免同一張牌狀態互串）
 */
export function cloneCard(card: Card, suffix?: string): Card {
  return {
    ...card,
    id: suffix ? `${card.id}_${suffix}` : card.id
  };
}

/**
 * 建立一副全新的 15 張標準戰術牌組 (洗牌後回傳)
 */
export function createStandardDeck(owner: 'player' | 'enemy' = 'player'): Card[] {
  const deck = STANDARD_CARDS.map((c, idx) => cloneCard(c, `${owner}_${idx}`));
  return shuffleDeck(deck);
}

/**
 * 牌組洗牌演算法 (Fisher-Yates)
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 相容性匯出
export const INITIAL_CHARACTERS = STANDARD_CARDS.slice(0, 6);
export const ALL_CHARACTERS = STANDARD_CARDS;
export const SHOP_CHARACTERS = STANDARD_CARDS.filter(c => c.has_trait);

export function getCharacter(idOrLevel: string | number): Card {
  const key = idOrLevel.toString();
  return CARD_MAP[key] || STANDARD_CARDS.find(c => c.base_level.toString() === key) || STANDARD_CARDS[0];
}

export function getAllCharacters(): Card[] {
  return [...STANDARD_CARDS];
}

export function getShopCharacters(): Card[] {
  return [...SHOP_CHARACTERS];
}

export function getCharactersByLevel(level: number): Card[] {
  return STANDARD_CARDS.filter(c => c.base_level === level);
}

export function getActivePlayerDeck(): Card[] {
  return createStandardDeck('player');
}
