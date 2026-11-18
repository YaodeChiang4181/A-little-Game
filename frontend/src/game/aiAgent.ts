import { Card, Stance, LaneConstraint } from './types';
import { calculateProjectedScore } from './engine';

/**
 * 輔助函數：取得 3 張手牌的所有 6 種排列 (Permutations)
 */
export function getThreeCardPermutations(cards: Card[]): Card[][] {
  if (cards.length !== 3) return [cards];
  const [a, b, c] = cards;
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a]
  ];
}

export interface AiDecision {
  deployment: Card[];
  stance: Stance;
  projectedScore: number;
}

/**
 * 智慧 AI 決策器：支援三路限制排位演算與姿態博弈
 */
export function chooseAiDeploymentAndStance(
  aiHand: Card[],
  laneConstraint: LaneConstraint,
  roundNumber: number,
  aiHp: number = 3,
  playerHp: number = 3,
  aiAtk: number = 1,
  playerAtk: number = 1
): AiDecision {
  if (aiHand.length === 0) {
    return {
      deployment: [],
      stance: 'ODD',
      projectedScore: 0
    };
  }

  // 1. 排列排位演算：尋找在 Lane[0], Lane[1], Lane[2] 預估戰力最高的方案
  const perms = getThreeCardPermutations(aiHand);
  let bestPerm = perms[0];
  let highestScore = -Infinity;

  for (const perm of perms) {
    const { total, violations } = calculateProjectedScore(perm, laneConstraint);
    // 扣除違規懲罰權重
    const penalty = violations[1] ? 4 : 0;
    const finalScore = total - penalty;

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestPerm = perm;
    }
  }

  // 2. 姿態博弈宣告 (Stance Heuristic)
  let stance: Stance = 'ODD';

  // 策略 A: 斬殺誘惑 (若當前 ATK 足以致命擊殺玩家)
  if (aiAtk >= playerHp) {
    // 85% 機率直接宣告 EVEN 嘗試斬殺
    stance = Math.random() < 0.85 ? 'EVEN' : 'ODD';
  }
  // 策略 B: 自身生命危殆 (若玩家有斬殺 AI 的可能)
  else if (playerAtk >= aiHp) {
    // 高度警戒，嘗試搶攻或混淆
    stance = Math.random() < 0.65 ? 'EVEN' : 'ODD';
  }
  // 策略 C: 早期回合或 ATK 為 1 時優先蓄力
  else if (aiAtk === 1) {
    if (roundNumber <= 2) {
      // 前期傾向蓄力 75%
      stance = Math.random() < 0.75 ? 'ODD' : 'EVEN';
    } else {
      // 中後期平分秋色
      stance = Math.random() < 0.5 ? 'ODD' : 'EVEN';
    }
  }
  // 策略 D: 蓄力已達 2 或以上，爆發攻擊慾望提升
  else if (aiAtk >= 2) {
    // 70% 機率釋放攻擊
    stance = Math.random() < 0.7 ? 'EVEN' : 'ODD';
  }

  const { total } = calculateProjectedScore(bestPerm, laneConstraint);

  return {
    deployment: bestPerm,
    stance,
    projectedScore: total
  };
}

// 相容舊介面簽名
export function chooseBestDeployment(
  aiHand: Card[],
  _terrains?: any,
  _roundNumber: number = 1,
  _playerHp: number = 3,
  _aiHp: number = 3
): Card[] {
  if (aiHand.length <= 3) return aiHand;
  return aiHand.slice(0, 3);
}
