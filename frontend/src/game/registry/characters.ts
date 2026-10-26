import { Character } from '../types';

/**
 * =========================================================================
 * 🎮 像素角色註冊表 (Character Registry)
 * =========================================================================
 * 
 * 💡【如何自主新增角色？】
 * 您只需要在這個陣列中新增一個 Character 物件，填入：
 * 1. id: 角色唯一標識
 * 2. name: 顯示名稱
 * 3. level: 戰力等級 (1~6 或自訂數值)
 * 4. avatar: 支援 unicode 符號 (如 '💀') 或自訂像素圖檔 (如 { type: 'image', src: '/sprites/hero.png' })
 * 5. trait: 特性名稱、說明與觸發鉤子 (BEFORE_CLASH, DETERMINE_WIN, AFTER_CLASH, ON_MOMENTUM)
 * 
 * 系統引擎與 AI 會全自動感知並適配新角色，不需要修改任何底層演算！
 */

export const INITIAL_CHARACTERS: Character[] = [
  // -------------------------------------------------------------
  // ♟ 小兵 (Lv.1) - 【以弱勝強】
  // 典故：西洋棋小兵雖弱，但直面王族時有潛在的致命殺傷力。
  // -------------------------------------------------------------
  {
    id: 'pawn',
    name: '小兵',
    level: 1,
    avatar: { type: 'unicode', src: '♟' },
    themeColor: '#78909c',
    lore: '看似微不足道的步兵，在面對巨大強敵時能爆發逆襲奇蹟。',
    trait: {
      id: 'pawn_reversal',
      name: '以弱勝強',
      badge: '逆襲',
      trigger: 'DETERMINE_WIN',
      description: '若對手當前戰力比自己大 3 級以上（面對 Lv.4~6），小兵判定為直接勝出！',
      execute: (ctx, isPlayer) => {
        const myEff = isPlayer ? ctx.playerEff : ctx.enemyEff;
        const oppEff = isPlayer ? ctx.enemyEff : ctx.playerEff;

        if (oppEff - myEff >= 3) {
          return {
            overrideWinner: isPlayer ? 'player' : 'enemy',
            popupText: '♟ 以弱勝強！逆襲高階敵軍！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // ♞ 騎士 (Lv.2) - 【奇襲跳躍】
  // 典故：西洋棋中唯一能越子移動的兵種，破除前陣壁壘。
  // -------------------------------------------------------------
  {
    id: 'knight',
    name: '騎士',
    level: 2,
    avatar: { type: 'unicode', src: '♞' },
    themeColor: '#42a5f5',
    lore: '騎兵奔襲，無視障礙跨越戰場，能強行斬斷對手的連勝氣焰。',
    trait: {
      id: 'knight_leap',
      name: '奇襲跳躍',
      badge: '破陣',
      trigger: 'BEFORE_CLASH',
      description: '忽視對手上一格獲得的「+1 氣勢加成」；且若自身獲勝，下格氣勢直接加倍為 +2！',
      execute: (ctx, isPlayer) => {
        const oppBuff = isPlayer ? ctx.enemyBuff : ctx.playerBuff;
        if (oppBuff > 0) {
          return {
            cancelOpponentMomentum: true,
            popupText: '♞ 奇襲破陣！瓦解敵方氣勢！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // ♜ 主塔 (Lv.3) - 【堅壁防線】
  // 典故：堅固的城堡防禦，擅長止損與築起工事。
  // -------------------------------------------------------------
  {
    id: 'rook',
    name: '主塔',
    level: 3,
    avatar: { type: 'unicode', src: '♜' },
    themeColor: '#ab47bc',
    lore: '巍峨屹立的巨石防線，能最大程度抵擋與吸收衝擊。',
    trait: {
      id: 'rook_fortress',
      name: '堅壁防線',
      badge: '堅守',
      trigger: 'AFTER_CLASH',
      description: '此格若不幸戰敗，差值計算強制鎖定為 1（不受高額分數差懲罰，控分止損神卡）。',
      execute: (ctx, isPlayer) => {
        const isLoser = isPlayer ? ctx.winner === 'enemy' : ctx.winner === 'player';
        if (isLoser && ctx.diff > 1) {
          return {
            overrideDiff: 1,
            popupText: '♜ 堅壁生效！差值鎖定為 1！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // ♝ 主教 (Lv.4) - 【天秤偏轉】
  // 典故：在斜線上靈活調度的宗教審判官，掌控奇偶天平。
  // -------------------------------------------------------------
  {
    id: 'bishop',
    name: '主教',
    level: 4,
    avatar: { type: 'unicode', src: '♝' },
    themeColor: '#26a69a',
    lore: '諳熟命運軌跡的神職者，能微調戰局分值，導向己方陣營。',
    trait: {
      id: 'bishop_parity_shift',
      name: '天秤偏轉',
      badge: '天秤',
      trigger: 'AFTER_CLASH',
      description: '若此格獲勝，此格差值若與己方目標陣營衝突，自動微調 +1 以導正奇偶！',
      execute: (ctx, isPlayer) => {
        const isWinner = isPlayer ? ctx.winner === 'player' : ctx.winner === 'enemy';
        if (!isWinner) return null;

        // 目標希望總分為奇數還是偶數？
        // 若該格產生的 score 不利於己方，則差值 +1
        const weight = ctx.terrain.weight;
        const currentScore = ctx.diff * weight;
        const isCurrentScoreOdd = currentScore % 2 !== 0;

        // 如果我是 Player 且當前為 ODD，期望 score 盡量促成奇數
        const myIsOddGoal = isPlayer ? ctx.isPlayerOdd : !ctx.isPlayerOdd;
        if (isCurrentScoreOdd !== myIsOddGoal) {
          return {
            overrideDiff: ctx.diff + 1,
            popupText: '♝ 天秤偏轉！差值 +1 導正奇偶！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // ♛ 皇后 (Lv.5) - 【威壓統御】
  // 典故：棋盤上最強大的進攻火力，統御戰場帶來極致氣勢。
  // -------------------------------------------------------------
  {
    id: 'queen',
    name: '皇后',
    level: 5,
    avatar: { type: 'unicode', src: '♛' },
    themeColor: '#ec407a',
    lore: '君臨天下的至高統治者，以絕頂戰威壓垮敵陣，賦予全軍澎湃氣勢。',
    trait: {
      id: 'queen_dominance',
      name: '威壓統御',
      badge: '威壓',
      trigger: 'ON_MOMENTUM',
      description: '若此格交鋒獲勝，帶給下一格戰場的氣勢加成由 +1 提升至 +2！',
      execute: (ctx, isPlayer) => {
        const isWinner = isPlayer ? ctx.winner === 'player' : ctx.winner === 'enemy';
        if (isWinner) {
          return {
            overrideMomentum: 2,
            popupText: '♛ 威壓統御！下格氣勢躍升 +2！'
          };
        }
        return null;
      }
    }
  },

  // -------------------------------------------------------------
  // ♚ 國王 (Lv.6) - 【御駕親征】
  // 典故：最高統帥，親臨最關鍵要衝將引發全場狂熱。
  // -------------------------------------------------------------
  {
    id: 'king',
    name: '國王',
    level: 6,
    avatar: { type: 'unicode', src: '♚' },
    themeColor: '#ffa726',
    lore: '一國之君，當其親自坐鎮重地時，將激發無與倫比的領土威勢。',
    trait: {
      id: 'king_presence',
      name: '御駕親征',
      badge: '王威',
      trigger: 'BEFORE_CLASH',
      description: '若佈署在權重最高（weight >= 3）的戰場，額外獲得 +1 戰力加成！',
      execute: (ctx) => {
        if (ctx.terrain.weight >= 3) {
          return {
            bonusEff: 1,
            popupText: '♚ 御駕親征！戰場王氣護體戰力 +1！'
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
  // 同步支援舊版數字 level 查找
  CHARACTER_MAP[c.level.toString()] = c;
});

export function getCharacter(idOrLevel: string | number): Character {
  const key = idOrLevel.toString();
  return CHARACTER_MAP[key] || INITIAL_CHARACTERS[0];
}

export function getAllCharacters(): Character[] {
  return [...INITIAL_CHARACTERS];
}
