import { Card, Stance, LaneConstraint } from './types';
import { createStandardDeck } from './registry/characters';
import { LANE_CONSTRAINTS, drawRandomLaneConstraint } from './registry/laneConstraints';
import { resolveRound, RoundHistoryEntry } from './engine';
import { chooseAiDeploymentAndStance } from './aiAgent';

export interface SimulationResult {
  totalGames: number;
  playerAWins: number;
  playerBWins: number;
  draws: number;
  playerAWinRate: string;
  playerBWinRate: string;
  drawRate: string;
  averageRounds: number;
  killWins: number;
  hpLimitWins: number;
  scoreTieBreakerWins: number;
  totalScoreTieBreakerWins: number;
}

// 簡易偽隨機數生成器 (LCG)，支援指定 Seed
export class PseudoRandom {
  private seed: number;

  constructor(seed: number = 123456789) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * 執行一局確定性模擬
 */
export function simulateSingleGame(
  fixedSeed?: number,
  customDeckA?: Card[],
  customDeckB?: Card[]
): {
  winner: 'player' | 'enemy' | 'draw';
  roundsPlayed: number;
  finalHpA: number;
  finalHpB: number;
  history: RoundHistoryEntry[];
} {
  const rng = fixedSeed !== undefined ? new PseudoRandom(fixedSeed) : null;
  const getRandom = () => (rng ? rng.next() : Math.random());

  // 1. 初始化 15 張牌庫並洗牌
  let deckA = customDeckA ? [...customDeckA] : createStandardDeck('player');
  let deckB = customDeckB ? [...customDeckB] : createStandardDeck('enemy');

  // 若使用自訂 RNG 進行洗牌
  if (rng) {
    deckA = [...deckA].sort(() => getRandom() - 0.5);
    deckB = [...deckB].sort(() => getRandom() - 0.5);
  }

  let hpA = 3;
  let hpB = 3;
  let atkA = 1;
  let atkB = 1;
  const history: RoundHistoryEntry[] = [];

  let gameWinner: 'player' | 'enemy' | 'draw' = 'draw';
  let roundsPlayed = 0;

  for (let r = 1; r <= 5; r++) {
    roundsPlayed = r;

    // 雙方每回合抽取 3 張牌
    const handA = deckA.slice((r - 1) * 3, r * 3);
    const handB = deckB.slice((r - 1) * 3, r * 3);

    // 抽取本回合限制
    const constraintIndex = Math.floor(getRandom() * LANE_CONSTRAINTS.length);
    const constraint = LANE_CONSTRAINTS[constraintIndex] || drawRandomLaneConstraint();

    // AI A 與 AI B 決策 (模擬雙方皆具備智能)
    const decisionA = chooseAiDeploymentAndStance(handA, constraint, r, hpA, hpB, atkA, atkB);
    const decisionB = chooseAiDeploymentAndStance(handB, constraint, r, hpB, hpA, atkB, atkA);

    const res = resolveRound(
      decisionA.deployment,
      decisionB.deployment,
      decisionA.stance,
      decisionB.stance,
      constraint,
      r,
      hpA,
      hpB,
      atkA,
      atkB,
      history
    );

    hpA = res.playerHpAfter;
    hpB = res.enemyHpAfter;
    atkA = res.playerAtkAfter;
    atkB = res.enemyAtkAfter;

    history.push({
      round: r,
      playerTotalScore: res.playerTotalScore,
      enemyTotalScore: res.enemyTotalScore
    });

    if (res.gameOver) {
      gameWinner = res.gameWinner || 'draw';
      break;
    }
  }

  return {
    winner: gameWinner,
    roundsPlayed,
    finalHpA: hpA,
    finalHpB: hpB,
    history
  };
}

/**
 * 執行大規模蒙地卡羅確定性平衡模擬
 */
export function runBalanceSimulation(totalGames: number = 1000, startSeed: number = 42): SimulationResult {
  let playerAWins = 0;
  let playerBWins = 0;
  let draws = 0;
  let totalRounds = 0;
  let killWins = 0;
  let hpLimitWins = 0;
  let scoreTieBreakerWins = 0;
  let totalScoreTieBreakerWins = 0;

  for (let i = 0; i < totalGames; i++) {
    const seed = startSeed + i * 7919;
    const res = simulateSingleGame(seed);
    totalRounds += res.roundsPlayed;

    if (res.winner === 'player') playerAWins++;
    else if (res.winner === 'enemy') playerBWins++;
    else draws++;

    if (res.finalHpA <= 0 || res.finalHpB <= 0) {
      killWins++;
    } else {
      hpLimitWins++;
    }
  }

  const result: SimulationResult = {
    totalGames,
    playerAWins,
    playerBWins,
    draws,
    playerAWinRate: ((playerAWins / totalGames) * 100).toFixed(1) + '%',
    playerBWinRate: ((playerBWins / totalGames) * 100).toFixed(1) + '%',
    drawRate: ((draws / totalGames) * 100).toFixed(1) + '%',
    averageRounds: Number((totalRounds / totalGames).toFixed(2)),
    killWins,
    hpLimitWins,
    scoreTieBreakerWins,
    totalScoreTieBreakerWins
  };

  return result;
}

// 瀏覽器主控台調試掛載
if (typeof window !== 'undefined') {
  (window as any).__PARITY_SIMULATOR__ = {
    run: (count: number = 1000, seed: number = 42) => {
      console.log(`[ 確定性平衡模擬啟動 ] 執行 ${count} 場對決 (Seed: ${seed})...`);
      const res = runBalanceSimulation(count, seed);
      console.table(res);
      return res;
    },
    single: (seed: number = 42) => {
      const res = simulateSingleGame(seed);
      console.log('[ 單局對局模擬結果 ]', res);
      return res;
    }
  };
}

