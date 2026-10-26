import { Character, Terrain, RoundResolutionResult } from './types';
import { getAllCharacters } from './registry/characters';
import { drawRandomTerrains } from './registry/terrains';
import { resolveRound } from './engine';
import { chooseBestDeployment } from './aiAgent';

export const HAND_DRAW_SIZE = 4;
export const DEPLOY_SIZE = 3;

/**
 * 從指定角色池隨機抽取 N 張不重複的手牌
 */
export function drawHand(count: number = HAND_DRAW_SIZE, pool: Character[] = getAllCharacters()): Character[] {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export interface GameSession {
  gameId: string;
  roundNumber: number;
  playerHp: number;
  enemyHp: number;
  playerRole: 'ODD' | 'EVEN';
  enemyRole: 'EVEN' | 'ODD';
  playerHand: Character[];
  enemyHand: Character[];
  currentTerrains: Terrain[];
  roundPool: Character[];
}

/**
 * 啟動新對局（純客戶端，秒開秒玩，零後端等待）
 */
export function initGameSession(): GameSession {
  const allPool = getAllCharacters();
  const playerHand = drawHand(HAND_DRAW_SIZE, allPool);
  const enemyHand = drawHand(HAND_DRAW_SIZE, allPool);
  const currentTerrains = drawRandomTerrains();

  // 合併並計算本局登場角色池（唯一值）
  const poolIds = new Set([...playerHand.map(c => c.id), ...enemyHand.map(c => c.id)]);
  const roundPool = allPool.filter(c => poolIds.has(c.id));

  return {
    gameId: `game_${Date.now()}`,
    roundNumber: 1,
    playerHp: 3,
    enemyHp: 3,
    playerRole: 'ODD',
    enemyRole: 'EVEN',
    playerHand,
    enemyHand,
    currentTerrains,
    roundPool
  };
}

/**
 * 結算當前回合
 */
export function resolveTurn(
  session: GameSession,
  playerDeployment: Character[]
): {
  result: RoundResolutionResult;
  enemyDeployment: Character[];
  nextSession?: GameSession;
} {
  // 1. AI 根據手牌與戰場環境，選出 4 選 3 的最佳出牌策略
  const enemyDeployment = chooseBestDeployment(
    session.enemyHand,
    session.currentTerrains,
    session.roundNumber,
    session.playerHp,
    session.enemyHp
  );

  // 2. 核心引擎結算此局交鋒
  const result = resolveRound(
    playerDeployment,
    enemyDeployment,
    session.currentTerrains,
    session.roundNumber,
    session.playerHp,
    session.enemyHp
  );

  let nextSession: GameSession | undefined = undefined;

  // 3. 若遊戲尚未結束，為雙方抽取下一回合 4 張手牌與新戰場環境
  if (!result.game_over) {
    const allPool = getAllCharacters();
    const nextPlayerHand = drawHand(HAND_DRAW_SIZE, allPool);
    const nextEnemyHand = drawHand(HAND_DRAW_SIZE, allPool);
    const nextTerrains = drawRandomTerrains();

    const poolIds = new Set([...nextPlayerHand.map(c => c.id), ...nextEnemyHand.map(c => c.id)]);
    const nextRoundPool = allPool.filter(c => poolIds.has(c.id));

    nextSession = {
      gameId: session.gameId,
      roundNumber: session.roundNumber + 1,
      playerHp: result.player_hp,
      enemyHp: result.enemy_hp,
      playerRole: result.player_role,
      enemyRole: result.enemy_role,
      playerHand: nextPlayerHand,
      enemyHand: nextEnemyHand,
      currentTerrains: nextTerrains,
      roundPool: nextRoundPool
    };

    result.next_player_hand = nextPlayerHand;
    result.next_round_pool = nextRoundPool;
    result.next_terrains = nextTerrains;
  }

  return {
    result,
    enemyDeployment,
    nextSession
  };
}
