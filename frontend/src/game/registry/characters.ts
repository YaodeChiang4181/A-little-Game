import { Character } from '../types';

/**
 * =========================================================================
 * 像素角色註冊表 (Character Registry) - 專業像素無 Emoji 版
 * =========================================================================
 */

export const INITIAL_CHARACTERS: Character[] = [
  // -------------------------------------------------------------
  // 小兵 (Lv.1) - 【逆襲】
  // -------------------------------------------------------------
  {
    id: 'pawn',
    name: '小兵',
    level: 1,
    avatar: { type: 'unicode', src: 'pawn' },
    themeColor: '#78909c',
    lore: '看似微不足道的步兵，直面王族時能爆發逆襲奇蹟。',
    trait: {
      id: 'pawn_reversal',
      name: '以弱勝強',
      badge: '逆襲',
      trigger: 'DETERMINE_WIN',
      description: '敵方有效戰力大於等於 4 時，直接勝出。',
      execute: (ctx, isPlayer) => {
        const myEff = isPlayer ? ctx.playerEff : ctx.enemyEff;
        const oppEff = isPlayer ? ctx.enemyEff : ctx.playerEff;

        if (oppEff - myEff >= 3) {
          return {
            overrideWinner: isPlayer ? 'player' : 'enemy',
            popupText: '[ 逆襲 REVERSAL ] 弱者克敵勝出！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 騎士 (Lv.2) - 【破陣】
  // -------------------------------------------------------------
  {
    id: 'knight',
    name: '騎士',
    level: 2,
    avatar: { type: 'unicode', src: 'knight' },
    themeColor: '#42a5f5',
    lore: '破除前陣障礙，強行斬斷對手滾雪球的氣勢連鎖。',
    trait: {
      id: 'knight_leap',
      name: '奇襲跳躍',
      badge: '破陣',
      trigger: 'BEFORE_CLASH',
      description: '無視敵方上一格氣勢；若獲勝，下格氣勢躍升 +2。',
      execute: (ctx, isPlayer) => {
        const oppBuff = isPlayer ? ctx.enemyBuff : ctx.playerBuff;
        if (oppBuff > 0) {
          return {
            cancelOpponentMomentum: true,
            popupText: '[ 破陣 LEAP ] 瓦解敵方氣勢！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 主塔 (Lv.3) - 【堅守】
  // -------------------------------------------------------------
  {
    id: 'rook',
    name: '主塔',
    level: 3,
    avatar: { type: 'unicode', src: 'rook' },
    themeColor: '#ab47bc',
    lore: '巍峨屹立的巨石防線，能最大程度抵擋與吸收衝擊。',
    trait: {
      id: 'rook_fortress',
      name: '堅壁防線',
      badge: '堅守',
      trigger: 'AFTER_CLASH',
      description: '戰敗時差值鎖定為 1，避免高額分數差拉扯。',
      execute: (ctx, isPlayer) => {
        const isLoser = isPlayer ? ctx.winner === 'enemy' : ctx.winner === 'player';
        if (isLoser && ctx.diff > 1) {
          return {
            overrideDiff: 1,
            popupText: '[ 堅守 FORTRESS ] 差值鎖定為 1！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 主教 (Lv.4) - 【天秤】
  // -------------------------------------------------------------
  {
    id: 'bishop',
    name: '主教',
    level: 4,
    avatar: { type: 'unicode', src: 'bishop' },
    themeColor: '#26a69a',
    lore: '諳熟命運軌跡的神職者，微調差值以導正奇偶走向。',
    trait: {
      id: 'bishop_parity_shift',
      name: '天秤偏轉',
      badge: '天秤',
      trigger: 'AFTER_CLASH',
      description: '勝出時若該格積分不利己方目標，差值自動 +1 導正。',
      execute: (ctx, isPlayer) => {
        const isWinner = isPlayer ? ctx.winner === 'player' : ctx.winner === 'enemy';
        if (!isWinner) return null;

        const weight = ctx.terrain.weight;
        const currentScore = ctx.diff * weight;
        const isCurrentScoreOdd = currentScore % 2 !== 0;

        const myIsOddGoal = isPlayer ? ctx.isPlayerOdd : !ctx.isPlayerOdd;
        if (isCurrentScoreOdd !== myIsOddGoal) {
          return {
            overrideDiff: ctx.diff + 1,
            popupText: '[ 天秤 SHIFT ] 差值微調導正奇偶！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 皇后 (Lv.5) - 【威壓】
  // -------------------------------------------------------------
  {
    id: 'queen',
    name: '皇后',
    level: 5,
    avatar: { type: 'unicode', src: 'queen' },
    themeColor: '#ec407a',
    lore: '君臨天下的至高統治者，以絕頂戰威壓垮敵陣。',
    trait: {
      id: 'queen_dominance',
      name: '威壓統御',
      badge: '威壓',
      trigger: 'ON_MOMENTUM',
      description: '勝出時帶給下一格的氣勢加成由 +1 提升至 +2。',
      execute: (ctx, isPlayer) => {
        const isWinner = isPlayer ? ctx.winner === 'player' : ctx.winner === 'enemy';
        if (isWinner) {
          return {
            overrideMomentum: 2,
            popupText: '[ 威壓 DOMINANCE ] 下格氣勢躍升 +2！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // 國王 (Lv.6) - 【王威】
  // -------------------------------------------------------------
  {
    id: 'king',
    name: '國王',
    level: 6,
    avatar: { type: 'unicode', src: 'king' },
    themeColor: '#ffa726',
    lore: '最高統帥，親臨要衝重地時將激發無與倫比的王權威勢。',
    trait: {
      id: 'king_presence',
      name: '御駕親征',
      badge: '王威',
      trigger: 'BEFORE_CLASH',
      description: '佈署於倍率最高（≥ 3）戰場時，有效戰力額外 +1。',
      execute: (ctx) => {
        if (ctx.terrain.weight >= 3) {
          return {
            bonusEff: 1,
            popupText: '[ 王威 ROYAL ] 戰力加成 +1！'
          };
        }
        return null;
      }
    }
  }
];

// 角色查找與管理輔助函數
export const CHARACTER_MAP: Record<string, Character> = {};
INITIAL_CHARACTERS.forEach(c => {
  CHARACTER_MAP[c.id] = c;
  CHARACTER_MAP[c.level.toString()] = c;
});

export function getCharacter(idOrLevel: string | number): Character {
  const key = idOrLevel.toString();
  return CHARACTER_MAP[key] || INITIAL_CHARACTERS[0];
}

export function getAllCharacters(): Character[] {
  return [...INITIAL_CHARACTERS];
}
