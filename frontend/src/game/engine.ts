import { Character, Terrain, SingleBattleRecord, RoundResolutionResult, ClashContext } from './types';

export const MAX_HP = 3;
export const MOMENTUM_DEFAULT_BUFF = 1;

/**
 * 核心戰鬥引擎：逐格結算交鋒、執行特性鉤子與戰場環境修正
 */
export function resolveRound(
  playerDeployment: Character[],
  enemyDeployment: Character[],
  terrains: Terrain[],
  roundNumber: number,
  playerHp: number,
  enemyHp: number
): RoundResolutionResult {
  if (playerDeployment.length !== 3 || enemyDeployment.length !== 3) {
    throw new Error('佈署卡牌數量必須剛好為 3 張。');
  }

  let buffP = 0;
  let buffE = 0;
  let totalScore = 0;
  const isPlayerOdd = roundNumber % 2 !== 0;

  const battles: SingleBattleRecord[] = [];

  for (let i = 0; i < 3; i++) {
    const pChar = playerDeployment[i];
    const eChar = enemyDeployment[i];
    const terrain = terrains[i];
    const isSilenced = Boolean(terrain.isSilenceSanctuary);

    const traitsTriggered: { side: 'player' | 'enemy' | 'terrain'; text: string; traitName: string }[] = [];

    // 1. 檢查戰場是否禁用氣勢
    let effectiveBuffP = terrain.disableMomentum ? 0 : buffP;
    let effectiveBuffE = terrain.disableMomentum ? 0 : buffE;

    if (terrain.disableMomentum && (buffP > 0 || buffE > 0)) {
      traitsTriggered.push({
        side: 'terrain',
        traitName: '泥沼阻滯',
        text: '🌲 泥沼阻滯！雙方氣勢無法發揮！'
      });
    }

    // 2. 戰場環境前置被動（如皇宮大殿 Lv.4+ 額外 +1）
    let terrainBonusP = 0;
    let terrainBonusE = 0;
    if (terrain.id === 'palace') {
      if (pChar.level >= 4) {
        terrainBonusP += 1;
        traitsTriggered.push({ side: 'player', traitName: '王座加冕', text: '🏛️ 皇宮王座護體，戰力 +1！' });
      }
      if (eChar.level >= 4) {
        terrainBonusE += 1;
        traitsTriggered.push({ side: 'enemy', traitName: '王座加冕', text: '🏛️ 敵方王座護體，戰力 +1！' });
      }
    }

    // 構建基礎交鋒上下文
    let pEff = pChar.level + effectiveBuffP + terrainBonusP;
    let eEff = eChar.level + effectiveBuffE + terrainBonusE;

    const ctx: ClashContext = {
      playerChar: pChar,
      enemyChar: eChar,
      playerBaseVal: pChar.level,
      enemyBaseVal: eChar.level,
      playerBuff: effectiveBuffP,
      enemyBuff: effectiveBuffE,
      playerEff: pEff,
      enemyEff: eEff,
      terrain,
      roundNumber,
      isPlayerOdd,
      winner: 'tie',
      diff: Math.abs(pEff - eEff),
      score: 0,
      isSilenced
    };

    // 3. 執行 BEFORE_CLASH 特性鉤子（非封印狀態）
    if (!isSilenced) {
      // 玩家方特性
      if (pChar.trait && pChar.trait.trigger === 'BEFORE_CLASH') {
        const mod = pChar.trait.execute(ctx, true);
        if (mod) {
          if (mod.bonusEff) pEff += mod.bonusEff;
          if (mod.cancelOpponentMomentum) {
            eEff -= effectiveBuffE;
            effectiveBuffE = 0;
          }
          if (mod.popupText) {
            traitsTriggered.push({ side: 'player', traitName: pChar.trait.name, text: mod.popupText });
          }
        }
      }
      // 敵方特性
      if (eChar.trait && eChar.trait.trigger === 'BEFORE_CLASH') {
        const mod = eChar.trait.execute(ctx, false);
        if (mod) {
          if (mod.bonusEff) eEff += mod.bonusEff;
          if (mod.cancelOpponentMomentum) {
            pEff -= effectiveBuffP;
            effectiveBuffP = 0;
          }
          if (mod.popupText) {
            traitsTriggered.push({ side: 'enemy', traitName: eChar.trait.name, text: mod.popupText });
          }
        }
      }
    }

    // 更新最新有效戰力至 context
    ctx.playerEff = pEff;
    ctx.enemyEff = eEff;

    // 4. 判定勝負與執行 DETERMINE_WIN 特性鉤子
    let winner: 'player' | 'enemy' | 'tie' = 'tie';
    let winOverridden = false;

    if (!isSilenced) {
      if (pChar.trait && pChar.trait.trigger === 'DETERMINE_WIN') {
        const mod = pChar.trait.execute(ctx, true);
        if (mod && mod.overrideWinner) {
          winner = mod.overrideWinner;
          winOverridden = true;
          if (mod.popupText) {
            traitsTriggered.push({ side: 'player', traitName: pChar.trait.name, text: mod.popupText });
          }
        }
      }
      if (!winOverridden && eChar.trait && eChar.trait.trigger === 'DETERMINE_WIN') {
        const mod = eChar.trait.execute(ctx, false);
        if (mod && mod.overrideWinner) {
          winner = mod.overrideWinner;
          winOverridden = true;
          if (mod.popupText) {
            traitsTriggered.push({ side: 'enemy', traitName: eChar.trait.name, text: mod.popupText });
          }
        }
      }
    }

    if (!winOverridden) {
      if (pEff > eEff) winner = 'player';
      else if (eEff > pEff) winner = 'enemy';
      else winner = 'tie';
    }

    ctx.winner = winner;

    // 5. 計算初始差值
    let diff = Math.abs(pEff - eEff);
    // 若小兵以弱勝強等逆轉勝，差值預設給予 1
    if (winOverridden && diff === 0) diff = 1;
    ctx.diff = diff;

    // 6. 執行 AFTER_CLASH 特性鉤子（如主塔堅壁防線、主教偏轉）
    if (!isSilenced) {
      if (pChar.trait && pChar.trait.trigger === 'AFTER_CLASH') {
        const mod = pChar.trait.execute(ctx, true);
        if (mod) {
          if (mod.overrideDiff !== undefined) diff = mod.overrideDiff;
          if (mod.popupText) {
            traitsTriggered.push({ side: 'player', traitName: pChar.trait.name, text: mod.popupText });
          }
        }
      }
      if (eChar.trait && eChar.trait.trigger === 'AFTER_CLASH') {
        const mod = eChar.trait.execute(ctx, false);
        if (mod) {
          if (mod.overrideDiff !== undefined) diff = mod.overrideDiff;
          if (mod.popupText) {
            traitsTriggered.push({ side: 'enemy', traitName: eChar.trait.name, text: mod.popupText });
          }
        }
      }
    }
    ctx.diff = diff;

    // 7. 計算該戰場總分 (diff * weight) 並套用戰場環境修正
    let score = diff * terrain.weight;
    if (terrain.modifyScore) {
      const originalScore = score;
      score = terrain.modifyScore(score, ctx);
      if (score !== originalScore) {
        traitsTriggered.push({
          side: 'terrain',
          traitName: terrain.name,
          text: `${terrain.icon} ${terrain.name}環境修正：積分調整為 ${score} 分！`
        });
      }
    }
    ctx.score = score;
    totalScore += score;

    // 8. 傳遞給下一個戰場的氣勢加成
    let nextBuffP = 0;
    let nextBuffE = 0;

    if (winner === 'player') {
      nextBuffP = MOMENTUM_DEFAULT_BUFF;
    } else if (winner === 'enemy') {
      nextBuffE = MOMENTUM_DEFAULT_BUFF;
    }

    // 檢查戰場環境勝者氣勢修正（如決鬥擂台 +2）
    if (terrain.onClashWin && winner !== 'tie') {
      const terrainWinMod = terrain.onClashWin(winner);
      if (terrainWinMod && terrainWinMod.momentumBonus) {
        if (winner === 'player') nextBuffP = terrainWinMod.momentumBonus;
        if (winner === 'enemy') nextBuffE = terrainWinMod.momentumBonus;
        if (terrainWinMod.text) {
          traitsTriggered.push({ side: 'terrain', traitName: terrain.name, text: terrainWinMod.text });
        }
      }
    }

    // 檢查 ON_MOMENTUM 特性（如皇后威壓加乘 +2）
    if (!isSilenced) {
      if (winner === 'player' && pChar.trait && pChar.trait.trigger === 'ON_MOMENTUM') {
        const mod = pChar.trait.execute(ctx, true);
        if (mod && mod.overrideMomentum) {
          nextBuffP = mod.overrideMomentum;
          if (mod.popupText) {
            traitsTriggered.push({ side: 'player', traitName: pChar.trait.name, text: mod.popupText });
          }
        }
      } else if (winner === 'enemy' && eChar.trait && eChar.trait.trigger === 'ON_MOMENTUM') {
        const mod = eChar.trait.execute(ctx, false);
        if (mod && mod.overrideMomentum) {
          nextBuffE = mod.overrideMomentum;
          if (mod.popupText) {
            traitsTriggered.push({ side: 'enemy', traitName: eChar.trait.name, text: mod.popupText });
          }
        }
      }
    }

    buffP = nextBuffP;
    buffE = nextBuffE;

    battles.push({
      battlefield: i + 1,
      terrain,
      player_card: pChar.level,
      enemy_card: eChar.level,
      player_char: pChar,
      enemy_char: eChar,
      player_eff: pEff,
      enemy_eff: eEff,
      winner,
      diff,
      score,
      weight: terrain.weight,
      traits_triggered: traitsTriggered
    });
  }

  // 9. 奇偶數判定傷害歸屬
  let damageTo: 'player' | 'enemy';
  if (totalScore % 2 !== 0) {
    // 總分為奇數：ODD 陣營獲勝造成傷害
    damageTo = isPlayerOdd ? 'enemy' : 'player';
  } else {
    // 總分為偶數：EVEN 陣營獲勝造成傷害
    damageTo = isPlayerOdd ? 'player' : 'enemy';
  }

  let newPlayerHp = playerHp;
  let newEnemyHp = enemyHp;
  if (damageTo === 'player') {
    newPlayerHp = Math.max(0, playerHp - 1);
  } else {
    newEnemyHp = Math.max(0, enemyHp - 1);
  }

  const gameOver = newPlayerHp <= 0 || newEnemyHp <= 0;
  let winner: 'player' | 'enemy' | null = null;
  if (gameOver) {
    winner = newPlayerHp > 0 ? 'player' : 'enemy';
  }

  const nextIsPlayerOdd = (roundNumber + 1) % 2 !== 0;

  return {
    battles,
    total_score: totalScore,
    damage_to: damageTo,
    player_role: nextIsPlayerOdd ? 'ODD' : 'EVEN',
    enemy_role: nextIsPlayerOdd ? 'EVEN' : 'ODD',
    player_hp: newPlayerHp,
    enemy_hp: newEnemyHp,
    game_over: gameOver,
    winner
  };
}
