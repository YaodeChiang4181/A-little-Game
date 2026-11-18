/**
 * 三路奇偶博弈卡牌 (3-Lane Parity Tactical Card Game)
 * 核心型別定義 - 嚴格 TypeScript 規格
 */

// 戰術姿態宣告
export type Stance = 'ODD' | 'EVEN';

// 特性觸發時機
export type TraitTrigger = 'ON_REVEAL' | 'PASSIVE' | 'ON_LOSE';

// 特性執行上下文
export interface TraitContext {
  card: Card;
  laneIndex: number;            // 0, 1, 2
  multiplier: number;           // 1 或 2
  isPlayer: boolean;
  myCards: (Card | null)[];
  oppCards: (Card | null)[];
  myStance: Stance;
  oppStance: Stance | null;
  isLaneConstraintViolated: boolean;
  roundNumber: number;
}

// 特性數值修正
export interface TraitModification {
  bonusEffectiveLevel?: number;          // 增減自身有效等級
  enemyEffectiveLevelModifier?: number;  // 增減對手有效等級
  popupText?: string;                    // 像素浮動效果文字
}

// 卡牌特性定義
export interface CardTrait {
  id: string;
  name: string;             // 特性名稱，如「暗影奇襲」
  badge: string;            // 2~3 字簡稱，如「奇襲」
  trigger: TraitTrigger;
  description: string;      // 特性說明
  execute: (ctx: TraitContext) => TraitModification | null;
}

// 卡牌實體
export interface Card {
  id: string;
  name: string;             // 顯示名稱，如「暗影斥候」
  base_level: 1 | 2 | 3 | 4; // 基礎等級 (1~4)
  has_trait: boolean;       // 是否有特性
  trait?: CardTrait;        // 專屬特性
  avatar: {
    type: 'unicode' | 'image';
    src: string;            // 圖示識別碼或圖片路徑
  };
  themeColor?: string;      // 主題配色
  lore?: string;            // 典故介紹
  // 向後相容或擴充屬性
  level?: number;           // 等同於 base_level，便於部分通用組件存取
  price?: number;
  category?: 'classic' | 'shop' | 'custom';
}

// 中路戰場進場限制 (Lane Constraint)
export interface LaneConstraint {
  id: string;
  name: string;             // 如「奇數通行令」
  badge: string;            // 簡稱標籤
  description: string;      // 完整規則說明
  color: string;
  check: (card: Card) => boolean; // 回傳 true 為合規；false 為違規 (有效等級視為 0)
}

// 戰場單路結構
export interface LaneDefinition {
  index: 0 | 1 | 2;
  name: string;
  multiplier: 1 | 2 | 1;
  constraint?: LaneConstraint;
}

// 單格戰況紀錄
export interface SingleLaneRecord {
  laneIndex: number;
  multiplier: number;
  playerCard: Card;
  enemyCard: Card;
  playerRawLevel: number;
  enemyRawLevel: number;
  playerEffectiveLevel: number;
  enemyEffectiveLevel: number;
  playerScore: number;       // playerEffectiveLevel * multiplier
  enemyScore: number;        // enemyEffectiveLevel * multiplier
  isPlayerViolatedConstraint: boolean;
  isEnemyViolatedConstraint: boolean;
  traitsTriggered: {
    side: 'player' | 'enemy' | 'lane';
    text: string;
    traitName: string;
  }[];
}

// 單回合完整結算結果
export interface RoundResolutionResult {
  roundNumber: number;
  laneConstraint: LaneConstraint;
  lanes: SingleLaneRecord[];
  playerStance: Stance;
  enemyStance: Stance;
  playerTotalScore: number;
  enemyTotalScore: number;
  winner: 'player' | 'enemy' | 'tie';
  
  // 數值前後變化
  playerAtkBefore: number;
  enemyAtkBefore: number;
  playerAtkAfter: number;
  enemyAtkAfter: number;
  playerHpBefore: number;
  enemyHpBefore: number;
  playerHpAfter: number;
  enemyHpAfter: number;
  
  // 執行的姿態行為文字摘要
  winnerActionText: string;
  
  // 終局判定
  gameOver: boolean;
  gameWinner: 'player' | 'enemy' | 'draw' | null;
  winReason?: 'HP_DEPLETED' | 'ROUND_LIMIT_HP' | 'ROUND_LIMIT_R5_SCORE' | 'ROUND_LIMIT_TOTAL_SCORE' | 'DRAW';
  winReasonText?: string;

  // 向後相容欄位 (供過渡動畫使用)
  battles?: SingleBattleRecord[];
  damage_to?: 'player' | 'enemy';
  player_role?: 'ODD' | 'EVEN';
  enemy_role?: 'EVEN' | 'ODD';
  total_score?: number;
  player_hp?: number;
  enemy_hp?: number;
  game_over?: boolean;
  next_player_hand?: Card[];
  next_round_pool?: Card[];
  next_terrains?: Terrain[];
}

// 相容舊型別別名
export type Character = Card;
export type Terrain = {
  id: string;
  name: string;
  weight: number;
  icon: string;
  color: string;
  description: string;
  isSilenceSanctuary?: boolean;
  disableMomentum?: boolean;
  modifyScore?: (score: number, effA: number, effB: number) => number;
  onClashWin?: (winner: 'player' | 'enemy' | 'tie', diff: number) => { bonusScore?: number; log?: string };
};
export type SingleBattleRecord = {
  battlefield: number;
  terrain: Terrain;
  player_card: number;
  enemy_card: number;
  player_char: Card;
  enemy_char: Card;
  player_eff: number;
  enemy_eff: number;
  winner: 'player' | 'enemy' | 'tie';
  diff: number;
  score: number;
  weight: number;
  traits_triggered: { side: 'player' | 'enemy' | 'terrain'; text: string; traitName: string }[];
};
