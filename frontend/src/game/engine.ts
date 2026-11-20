import {
  Card,
  Stance,
  LaneConstraint,
  SingleLaneRecord,
  RoundResolutionResult,
  TraitContext
} from './types';

export const MAX_HP = 3;
export const INITIAL_ATK = 1;
export const MAX_ROUNDS = 5;
export const MULTIPLIERS = [1, 2, 1] as const;

export interface RoundHistoryEntry {
  round: number;
  playerTotalScore: number;
  enemyTotalScore: number;
}

/**
 * 預估己方單方在三路的基礎總分（Phase 1 佈署時即時推播給玩家）
 */
export function calculateProjectedScore(
  deployment: (Card | null)[],
  laneConstraint: LaneConstraint
): { total: number; laneScores: number[]; violations: boolean[] } {
  const laneScores = [0, 0, 0];
  const violations = [false, false, false];

  for (let i = 0; i < 3; i++) {
    const card = deployment[i];
    const multiplier = MULTIPLIERS[i];
    if (!card) {
      laneScores[i] = 0;
      continue;
    }

    // 中路檢查進場限制
    if (i === 1) {
      const isValid = laneConstraint.check(card);
      if (!isValid) {
        violations[1] = true;
        laneScores[1] = 0;
        continue;
      }
    }

    // 基礎預估 (若有特性則進行基礎加成推算)
    let eff = card.base_level;
    if (card.trait && card.trait.trigger === 'ON_REVEAL') {
      if (card.trait.id === 'scout_flank' && (i === 0 || i === 2)) eff += 1;
      if (card.trait.id === 'assassin_core' && i === 1) eff += 1;
    }

    laneScores[i] = eff * multiplier;
  }

  const total = laneScores.reduce((acc, curr) => acc + curr, 0);
  return { total, laneScores, violations };
}

/**
 * 核心回合結算狀態機 (Phase 1 ~ Phase 5 嚴格執行，支援新舊簽名重載相容)
 */
export function resolveRound(
  playerDeployment: Card[],
  enemyDeployment: Card[],
  playerStance: Stance,
  enemyStance: Stance,
  laneConstraint: LaneConstraint,
  roundNumber: number = 1,
  playerHp: number = 3,
  enemyHp: number = 3,
  playerAtk: number = 1,
  enemyAtk: number = 1,
  previousRoundsHistory: RoundHistoryEntry[] = []
): RoundResolutionResult {
  if (playerDeployment.length !== 3 || enemyDeployment.length !== 3) {
    throw new Error('雙方佈署卡牌數量必須剛好為 3 張。');
  }

  // -------------------------------------------------------------------------
  // Phase 2: 開牌與特性結算 (Reveal & Trait Resolution)
  // -------------------------------------------------------------------------
  const lanes: SingleLaneRecord[] = [];
  const playerEffective: number[] = [0, 0, 0];
  const enemyEffective: number[] = [0, 0, 0];

  // 1. 初始化基礎等級與中路禁令判定
  const playerViolated = [false, false, false];
  const enemyViolated = [false, false, false];

  for (let i = 0; i < 3; i++) {
    const pCard = playerDeployment[i];
    const eCard = enemyDeployment[i];

    if (i === 1) {
      if (!laneConstraint.check(pCard)) playerViolated[1] = true;
      if (!laneConstraint.check(eCard)) enemyViolated[1] = true;
    }

    playerEffective[i] = playerViolated[i] ? 0 : pCard.base_level;
    enemyEffective[i] = enemyViolated[i] ? 0 : eCard.base_level;
  }

  // 2. 依序觸發特性鉤子
  const laneTraitLogs: { side: 'player' | 'enemy' | 'lane'; text: string; traitName: string }[][] = [
    [],
    [],
    []
  ];

  for (let i = 0; i < 3; i++) {
    const pCard = playerDeployment[i];
    const eCard = enemyDeployment[i];
    const mult = MULTIPLIERS[i];

    // 中路違規日誌提示
    if (i === 1 && playerViolated[1]) {
      laneTraitLogs[1].push({
        side: 'player',
        traitName: laneConstraint.name,
        text: `[ 禁令限制 ] ${pCard.name} 不符中路規格，戰力歸 0！`
      });
    }
    if (i === 1 && enemyViolated[1]) {
      laneTraitLogs[1].push({
        side: 'enemy',
        traitName: laneConstraint.name,
        text: `[ 禁令限制 ] 敵方 ${eCard.name} 不符中路規格，戰力歸 0！`
      });
    }

    // 觸發玩家特性 (非中路違規時)
    if (pCard.trait && !playerViolated[i]) {
      const pCtx: TraitContext = {
        card: pCard,
        laneIndex: i,
        multiplier: mult,
        isPlayer: true,
        myCards: playerDeployment,
        oppCards: enemyDeployment,
        myStance: playerStance,
        oppStance: enemyStance,
        isLaneConstraintViolated: playerViolated[i],
        roundNumber
      };
      const mod = pCard.trait.execute(pCtx);
      if (mod) {
        if (mod.bonusEffectiveLevel) playerEffective[i] += mod.bonusEffectiveLevel;
        if (mod.enemyEffectiveLevelModifier) {
          enemyEffective[i] = Math.max(0, enemyEffective[i] + mod.enemyEffectiveLevelModifier);
        }
        if (mod.popupText) {
          laneTraitLogs[i].push({ side: 'player', traitName: pCard.trait.name, text: mod.popupText });
        }
      }
    }

    // 觸發敵方特性 (非中路違規時)
    if (eCard.trait && !enemyViolated[i]) {
      const eCtx: TraitContext = {
        card: eCard,
        laneIndex: i,
        multiplier: mult,
        isPlayer: false,
        myCards: enemyDeployment,
        oppCards: playerDeployment,
        myStance: enemyStance,
        oppStance: playerStance,
        isLaneConstraintViolated: enemyViolated[i],
        roundNumber
      };
      const mod = eCard.trait.execute(eCtx);
      if (mod) {
        if (mod.bonusEffectiveLevel) enemyEffective[i] += mod.bonusEffectiveLevel;
        if (mod.enemyEffectiveLevelModifier) {
          playerEffective[i] = Math.max(0, playerEffective[i] + mod.enemyEffectiveLevelModifier);
        }
        if (mod.popupText) {
          laneTraitLogs[i].push({ side: 'enemy', traitName: eCard.trait.name, text: mod.popupText });
        }
      }
    }

    // 封裝單路紀錄
    lanes.push({
      laneIndex: i,
      multiplier: mult,
      playerCard: pCard,
      enemyCard: eCard,
      playerRawLevel: pCard.base_level,
      enemyRawLevel: eCard.base_level,
      playerEffectiveLevel: playerEffective[i],
      enemyEffectiveLevel: enemyEffective[i],
      playerScore: playerEffective[i] * mult,
      enemyScore: enemyEffective[i] * mult,
      isPlayerViolatedConstraint: playerViolated[i],
      isEnemyViolatedConstraint: enemyViolated[i],
      traitsTriggered: laneTraitLogs[i]
    });
  }

  // -------------------------------------------------------------------------
  // Phase 3: 場地積分加總與勝負判定 (Score Calculation)
  // -------------------------------------------------------------------------
  const playerTotalScore = lanes.reduce((acc, l) => acc + l.playerScore, 0);
  const enemyTotalScore = lanes.reduce((acc, l) => acc + l.enemyScore, 0);

  let roundWinner: 'player' | 'enemy' | 'tie' = 'tie';
  if (playerTotalScore > enemyTotalScore) {
    roundWinner = 'player';
  } else if (enemyTotalScore > playerTotalScore) {
    roundWinner = 'enemy';
  } else {
    roundWinner = 'tie';
  }

  // -------------------------------------------------------------------------
  // Phase 4: 勝者行為執行 (Winner Action Execution)
  // -------------------------------------------------------------------------
  let playerHpAfter = playerHp;
  let enemyHpAfter = enemyHp;
  let playerAtkAfter = playerAtk;
  let enemyAtkAfter = enemyAtk;
  let winnerActionText = '';

  if (roundWinner === 'player') {
    if (playerStance === 'ODD') {
      playerAtkAfter = playerAtk + 1;
      winnerActionText = `[ 姿態生效 · 蓄力充能 ] 玩家勝出，攻勢威力躍升 +1 (達到 ${playerAtkAfter} 點)！`;
    } else {
      // EVEN: 發動攻擊並重置 ATK 為 1
      const dmg = playerAtk;
      enemyHpAfter = Math.max(0, enemyHp - dmg);
      playerAtkAfter = 1;
      winnerActionText = `[ 姿態生效 · 鋒刃突擊 ] 玩家勝出，造成 ${dmg} 點致命打擊！攻勢威力重置回 01。`;
    }
  } else if (roundWinner === 'enemy') {
    if (enemyStance === 'ODD') {
      enemyAtkAfter = enemyAtk + 1;
      winnerActionText = `[ 姿態生效 · 蓄力充能 ] 敵軍勝出，攻勢威力躍升 +1 (達到 ${enemyAtkAfter} 點)！`;
    } else {
      // EVEN: 發動攻擊並重置 ATK 為 1
      const dmg = enemyAtk;
      playerHpAfter = Math.max(0, playerHp - dmg);
      enemyAtkAfter = 1;
      winnerActionText = `[ 姿態生效 · 鋒刃突擊 ] 敵軍勝出，造成 ${dmg} 點致命打擊！攻勢威力重置回 01。`;
    }
  } else {
    winnerActionText = `[ 旗鼓相當 · 勢均力敵 ] 雙方總戰力同為 ${playerTotalScore} 分，本回合姿態宣告皆不生效！`;
  }

  // -------------------------------------------------------------------------
  // Phase 5: 回合結束與狀態檢查 (End of Round Check)
  // -------------------------------------------------------------------------
  let gameOver = false;
  let gameWinner: 'player' | 'enemy' | 'draw' | null = null;
  let winReason: 'HP_DEPLETED' | 'ROUND_LIMIT_HP' | 'ROUND_LIMIT_R5_SCORE' | 'ROUND_LIMIT_TOTAL_SCORE' | 'DRAW' | undefined;
  let winReasonText = '';

  // 1. 即時生命值耗盡判定
  if (playerHpAfter <= 0 || enemyHpAfter <= 0) {
    gameOver = true;
    winReason = 'HP_DEPLETED';
    if (playerHpAfter > 0 && enemyHpAfter <= 0) {
      gameWinner = 'player';
      winReasonText = `敵方生命歸零，玩家取得殲滅勝利！`;
    } else if (enemyHpAfter > 0 && playerHpAfter <= 0) {
      gameWinner = 'enemy';
      winReasonText = `玩家生命歸零，敵軍取得殲滅勝利！`;
    } else {
      // 極端同歸於盡
      gameWinner = 'draw';
      winReasonText = `雙方同時力竭，判定為平局！`;
    }
  } else if (roundNumber >= MAX_ROUNDS) {
    // 2. 達到第 5 回合上限判定
    gameOver = true;

    if (playerHpAfter > enemyHpAfter) {
      gameWinner = 'player';
      winReason = 'ROUND_LIMIT_HP';
      winReasonText = `打滿 5 回合，玩家存活生命值領先 (${playerHpAfter} vs ${enemyHpAfter})，獲勝！`;
    } else if (enemyHpAfter > playerHpAfter) {
      gameWinner = 'enemy';
      winReason = 'ROUND_LIMIT_HP';
      winReasonText = `打滿 5 回合，敵方存活生命值領先 (${enemyHpAfter} vs ${playerHpAfter})，獲勝！`;
    } else {
      // HP 相同，依序執行平局仲裁 (Tie-breaker)
      // 仲裁 1：比較「第 5 回合總積分」
      if (playerTotalScore > enemyTotalScore) {
        gameWinner = 'player';
        winReason = 'ROUND_LIMIT_R5_SCORE';
        winReasonText = `生命值相同，玩家憑藉第 5 回合總積分領先 (${playerTotalScore} vs ${enemyTotalScore}) 奪勝！`;
      } else if (enemyTotalScore > playerTotalScore) {
        gameWinner = 'enemy';
        winReason = 'ROUND_LIMIT_R5_SCORE';
        winReasonText = `生命值相同，敵方憑藉第 5 回合總積分領先 (${enemyTotalScore} vs ${playerTotalScore}) 奪勝！`;
      } else {
        // 仲裁 2：比較「全場 5 回合累積總積分」
        const currentEntry: RoundHistoryEntry = {
          round: roundNumber,
          playerTotalScore,
          enemyTotalScore
        };
        const allRounds = [...previousRoundsHistory, currentEntry];
        const sumPlayerScore = allRounds.reduce((acc, r) => acc + r.playerTotalScore, 0);
        const sumEnemyScore = allRounds.reduce((acc, r) => acc + r.enemyTotalScore, 0);

        if (sumPlayerScore > sumEnemyScore) {
          gameWinner = 'player';
          winReason = 'ROUND_LIMIT_TOTAL_SCORE';
          winReasonText = `生命與末局平手，玩家憑藉 5 回合累積總戰力 (${sumPlayerScore} vs ${sumEnemyScore}) 榮獲勝出！`;
        } else if (sumEnemyScore > sumPlayerScore) {
          gameWinner = 'enemy';
          winReason = 'ROUND_LIMIT_TOTAL_SCORE';
          winReasonText = `生命與末局平手，敵方憑藉 5 回合累積總戰力 (${sumEnemyScore} vs ${sumPlayerScore}) 榮獲勝出！`;
        } else {
          // 仲裁 3：完全平手
          gameWinner = 'draw';
          winReason = 'DRAW';
          winReasonText = `經過 5 回合鏖戰，雙方生命與全場累積戰力完全一致，判定為傳奇平局 (Draw)！`;
        }
      }
    }
  }

  // 構造舊版 battles 陣列，保證舊組件動畫演繹相容
  const battles = lanes.map((l, idx) => ({
    battlefield: idx + 1,
    terrain: {
      id: idx === 1 ? 'core_lane' : 'flank_lane',
      name: idx === 1 ? `中路 (${laneConstraint.badge})` : `戰場 ${idx + 1}`,
      weight: l.multiplier,
      icon: idx === 1 ? 'arena' : 'town',
      color: idx === 1 ? laneConstraint.color : '#64748b',
      description: idx === 1 ? laneConstraint.description : '常規戰場'
    },
    player_card: l.playerRawLevel,
    enemy_card: l.enemyRawLevel,
    player_score: l.playerScore,
    enemy_score: l.enemyScore,
    player_char: l.playerCard,
    enemy_char: l.enemyCard,
    player_eff: l.playerEffectiveLevel,
    enemy_eff: l.enemyEffectiveLevel,
    winner: (l.playerScore > l.enemyScore ? 'player' : l.enemyScore > l.playerScore ? 'enemy' : 'tie') as 'player' | 'enemy' | 'tie',
    diff: Math.abs(l.playerEffectiveLevel - l.enemyEffectiveLevel),
    score: l.playerScore,
    weight: l.multiplier,
    traits_triggered: l.traitsTriggered.map(t => ({
      side: (t.side === 'lane' ? 'terrain' : t.side) as 'player' | 'enemy' | 'terrain',
      text: t.text,
      traitName: t.traitName
    }))
  }));

  return {
    roundNumber,
    laneConstraint,
    lanes,
    playerStance,
    enemyStance,
    playerTotalScore,
    enemyTotalScore,
    winner: roundWinner,
    playerAtkBefore: playerAtk,
    enemyAtkBefore: enemyAtk,
    playerAtkAfter,
    enemyAtkAfter,
    playerHpBefore: playerHp,
    enemyHpBefore: enemyHp,
    playerHpAfter,
    enemyHpAfter,
    winnerActionText,
    gameOver,
    gameWinner,
    winReason,
    winReasonText,
    // 相容性屬性
    battles,
    damage_to: roundWinner === 'tie' ? undefined : roundWinner === 'player'
      ? (playerStance === 'EVEN' ? 'enemy' : undefined)
      : (enemyStance === 'EVEN' ? 'player' : undefined),
    player_role: playerStance,
    enemy_role: enemyStance,
    total_score: playerTotalScore,
    player_hp: playerHpAfter,
    enemy_hp: enemyHpAfter,
    game_over: gameOver
  };
}
