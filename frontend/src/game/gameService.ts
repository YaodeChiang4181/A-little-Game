import { Card, Stance, LaneConstraint, RoundResolutionResult } from './types';
import { createStandardDeck } from './registry/characters';
import { drawRandomLaneConstraint } from './registry/laneConstraints';
import { resolveRound, RoundHistoryEntry } from './engine';
import { chooseAiDeploymentAndStance } from './aiAgent';

export const HAND_DRAW_SIZE = 3;
export const DEPLOY_SIZE = 3;

/**
 * 從指定角色池隨機抽取 N 張手牌
 */
export function drawHand(count: number = HAND_DRAW_SIZE, pool: Card[] = []): Card[] {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export interface GameSession {
  gameId: string;
  roundNumber: number;
  playerHp: number;
  enemyHp: number;
  playerAtk: number;
  enemyAtk: number;
  playerDeck: Card[];           // 牌庫剩餘卡牌
  enemyDeck: Card[];            // 敵方牌庫剩餘卡牌
  playerHand: Card[];           // 本回合手牌 (固定 3 張)
  enemyHand: Card[];            // 敵方手牌 (固定 3 張)
  currentConstraint: LaneConstraint;
  roundHistory: RoundHistoryEntry[];
  // 相容舊介面屬性
  playerRole?: 'ODD' | 'EVEN';
  enemyRole?: 'EVEN' | 'ODD';
  currentTerrains?: any[];
  roundPool?: Card[];
}

/**
 * 啟動新對局 (三路奇偶戰術博弈規格)
 * 雙方各自配置 15 張牌庫，每回合發 3 張牌（必全出）
 */
export function initGameSession(): GameSession {
  const fullPlayerDeck = createStandardDeck('player');
  const fullEnemyDeck = createStandardDeck('enemy');

  const playerHand = fullPlayerDeck.slice(0, 3);
  const playerDeck = fullPlayerDeck.slice(3);

  const enemyHand = fullEnemyDeck.slice(0, 3);
  const enemyDeck = fullEnemyDeck.slice(3);

  const currentConstraint = drawRandomLaneConstraint();

  return {
    gameId: `game_${Date.now()}`,
    roundNumber: 1,
    playerHp: 3,
    enemyHp: 3,
    playerAtk: 1,
    enemyAtk: 1,
    playerDeck,
    enemyDeck,
    playerHand,
    enemyHand,
    currentConstraint,
    roundHistory: []
  };
}

/**
 * 結算當前回合
 */
export function resolveTurn(
  session: GameSession,
  playerDeployment: Card[],
  playerStance: Stance
): {
  result: RoundResolutionResult;
  enemyDeployment: Card[];
  enemyStance: Stance;
  nextSession?: GameSession;
} {
  // 1. AI 決策：三路排位與姿態宣告
  const aiDecision = chooseAiDeploymentAndStance(
    session.enemyHand,
    session.currentConstraint,
    session.roundNumber,
    session.enemyHp,
    session.playerHp,
    session.enemyAtk,
    session.playerAtk
  );

  // 2. 核心引擎執行 Phase 1 ~ 5
  const result = resolveRound(
    playerDeployment,
    aiDecision.deployment,
    playerStance,
    aiDecision.stance,
    session.currentConstraint,
    session.roundNumber,
    session.playerHp,
    session.enemyHp,
    session.playerAtk,
    session.enemyAtk,
    session.roundHistory
  );

  let nextSession: GameSession | undefined = undefined;

  // 3. 若未結束且回合 < 5，推進回合並發牌
  if (!result.gameOver && session.roundNumber < 5) {
    const nextPlayerHand = session.playerDeck.slice(0, 3);
    const nextPlayerDeck = session.playerDeck.slice(3);

    const nextEnemyHand = session.enemyDeck.slice(0, 3);
    const nextEnemyDeck = session.enemyDeck.slice(3);

    const nextConstraint = drawRandomLaneConstraint();

    const currentHistoryEntry: RoundHistoryEntry = {
      round: session.roundNumber,
      playerTotalScore: result.playerTotalScore,
      enemyTotalScore: result.enemyTotalScore
    };

    nextSession = {
      gameId: session.gameId,
      roundNumber: session.roundNumber + 1,
      playerHp: result.playerHpAfter,
      enemyHp: result.enemyHpAfter,
      playerAtk: result.playerAtkAfter,
      enemyAtk: result.enemyAtkAfter,
      playerDeck: nextPlayerDeck,
      enemyDeck: nextEnemyDeck,
      playerHand: nextPlayerHand,
      enemyHand: nextEnemyHand,
      currentConstraint: nextConstraint,
      roundHistory: [...session.roundHistory, currentHistoryEntry]
    };
  }

  return {
    result,
    enemyDeployment: aiDecision.deployment,
    enemyStance: aiDecision.stance,
    nextSession
  };
}

export interface RosterTierGroup {
  level: number;
  characters: Card[];
}

export function groupRosterByTier(pool: Card[]): RosterTierGroup[] {
  const map = new Map<number, Card[]>();
  for (const c of pool) {
    const lvl = c.base_level || c.level || 1;
    const list = map.get(lvl) || [];
    list.push(c);
    map.set(lvl, list);
  }
  const result: RosterTierGroup[] = [];
  for (let lvl = 1; lvl <= 4; lvl++) {
    const list = map.get(lvl);
    if (list && list.length > 0) {
      result.push({ level: lvl, characters: list });
    }
  }
  return result;
}
