export type TraitTrigger = 
  | 'BEFORE_CLASH'   // 交鋒前：修改點數、消除或修改氣勢加成
  | 'DETERMINE_WIN'  // 判定勝負時：覆寫勝負邏輯（如以弱勝強）
  | 'AFTER_CLASH'    // 結算差值時：鎖定差值、調整奇偶數
  | 'ON_MOMENTUM';   // 傳遞氣勢時：調整給下一格的氣勢加成 (+1 變 +2 等)

export interface ClashContext {
  playerChar: Character;
  enemyChar: Character;
  playerBaseVal: number;
  enemyBaseVal: number;
  playerBuff: number;
  enemyBuff: number;
  playerEff: number;
  enemyEff: number;
  terrain: Terrain;
  roundNumber: number;
  isPlayerOdd: boolean;
  winner: 'player' | 'enemy' | 'tie';
  diff: number;
  score: number;
  isSilenced: boolean; // 該戰場是否封印特性
}

export interface ClashModification {
  bonusEff?: number;               // 增加自身有效點數
  enemyEffModifier?: number;        // 減少或調整對手有效點數
  overrideWinner?: 'player' | 'enemy' | 'tie'; // 直接指定勝者
  overrideDiff?: number;            // 覆寫兩者差值（如主塔鎖定為 1）
  overrideScore?: number;           // 直接覆寫最終積分
  overrideMomentum?: number;        // 覆寫勝者給予下一格的氣勢
  cancelOpponentMomentum?: boolean; // 消除對手上一格獲得的氣勢
  popupText?: string;               // 觸發時浮動顯示的像素文字特效
}

export interface CharacterTrait {
  id: string;
  name: string;             // 特性名稱，如「以弱勝強」
  badge: string;            // 簡短標籤，如「逆襲」
  description: string;      // 完整效果說明
  trigger: TraitTrigger;
  execute: (context: ClashContext, isPlayer: boolean) => ClashModification | null;
}

export interface Character {
  id: string;               // 唯一 ID，如 'pawn', 'knight'
  name: string;             // 顯示名稱，如「小兵」
  level: number;            // 基礎等級/點數 (1~6 或自訂)
  avatar: {
    type: 'unicode' | 'image';
    src: string;            // 符號如 '♟' 或圖片路徑 '/sprites/char.png'
  };
  themeColor?: string;      // 專屬主題色彩
  lore?: string;            // 角色背景故事
  trait?: CharacterTrait;   // 專屬角色特性
}

export interface Terrain {
  id: string;
  name: string;
  weight: number;           // 預設乘數倍率 (1, 2, 3...)
  icon: string;             // 像素圖示，如 🌲, ⚔️, 🏛️
  description: string;      // 環境規則說明
  color: string;            // 邊框與背景標籤顏色
  isSilenceSanctuary?: boolean; // 是否封印所有特性
  disableMomentum?: boolean;    // 是否禁止使用氣勢加成
  modifyDiff?: (diff: number, ctx: ClashContext) => number;
  modifyScore?: (score: number, ctx: ClashContext) => number;
  onClashWin?: (winner: 'player' | 'enemy' | 'tie') => { momentumBonus?: number; text?: string } | null;
}

export interface SingleBattleRecord {
  battlefield: number;
  terrain: Terrain;
  player_card: number;
  enemy_card: number;
  player_char: Character;
  enemy_char: Character;
  player_eff: number;
  enemy_eff: number;
  winner: 'player' | 'enemy' | 'tie';
  diff: number;
  score: number;
  weight: number;
  traits_triggered: {
    side: 'player' | 'enemy' | 'terrain';
    text: string;
    traitName: string;
  }[];
}

export interface RoundResolutionResult {
  battles: SingleBattleRecord[];
  total_score: number;
  damage_to: 'player' | 'enemy';
  player_role: 'ODD' | 'EVEN';
  enemy_role: 'EVEN' | 'ODD';
  player_hp: number;
  enemy_hp: number;
  game_over: boolean;
  winner: 'player' | 'enemy' | null;
  next_player_hand?: Character[];
  next_round_pool?: Character[];
  next_terrains?: Terrain[];
}
