import { LaneConstraint, Card } from '../types';

/**
 * =========================================================================
 * 中路戰場禁令庫 (Lane Constraints Registry) - 專業像素無 Emoji 版
 * 專用於 Lane[1] (×2 核心倍率戰場) 的進場規則限制
 * 若放置之卡牌未通過 check 函式，其在 Lane[1] 的有效等級視為 0
 * =========================================================================
 */

export const LANE_CONSTRAINTS: LaneConstraint[] = [
  // 1. 奇數通行令
  {
    id: 'odd_only',
    name: '奇數通行令',
    badge: '奇數',
    color: '#38bdf8',
    description: '中路禁令：僅限奇數等級 (LV.1, LV.3) 卡牌生效；偶數卡牌戰力視為 0。',
    check: (card: Card) => card.base_level % 2 !== 0
  },

  // 2. 偶數通行令
  {
    id: 'even_only',
    name: '偶數通行令',
    badge: '偶數',
    color: '#f43f5e',
    description: '中路禁令：僅限偶數等級 (LV.2, LV.4) 卡牌生效；奇數卡牌戰力視為 0。',
    check: (card: Card) => card.base_level % 2 === 0
  },

  // 3. 輕裝突入令
  {
    id: 'max_level_3',
    name: '輕裝突入令',
    badge: '輕裝',
    color: '#10b981',
    description: '中路禁令：僅限 LV.3 以下輕裝卡牌生效；超重型 LV.4 卡牌戰力視為 0。',
    check: (card: Card) => card.base_level <= 3
  },

  // 4. 精銳衝鋒令
  {
    id: 'min_level_2',
    name: '精銳衝鋒令',
    badge: '精銳',
    color: '#f59e0b',
    description: '中路禁令：僅限 LV.2 以上精銳卡牌生效；LV.1 輕裝雜兵戰力視為 0。',
    check: (card: Card) => card.base_level >= 2
  },

  // 5. 破法封魔域
  {
    id: 'no_trait_only',
    name: '破法封魔域',
    badge: '純武',
    color: '#a855f7',
    description: '中路禁令：僅限純白板卡牌生效；帶有特性異能者戰力視為 0。',
    check: (card: Card) => !card.has_trait
  },

  // 6. 自由平原 (無限制)
  {
    id: 'open_field',
    name: '自由開闊域',
    badge: '平原',
    color: '#94a3b8',
    description: '中路無禁令：全等級卡牌皆能完整發揮戰力並享有 ×2 倍率。',
    check: () => true
  }
];

export const DEFAULT_CONSTRAINT = LANE_CONSTRAINTS[0];

/**
 * 隨機抽取一個中路限制規則
 */
export function drawRandomLaneConstraint(): LaneConstraint {
  const index = Math.floor(Math.random() * LANE_CONSTRAINTS.length);
  return LANE_CONSTRAINTS[index];
}

/**
 * 根據 ID 獲取限制規則
 */
export function getLaneConstraint(id: string): LaneConstraint {
  return LANE_CONSTRAINTS.find(c => c.id === id) || DEFAULT_CONSTRAINT;
}
