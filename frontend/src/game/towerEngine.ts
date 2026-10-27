/**
 * 氣勢連鎖奇偶戰 - 奇偶試煉 (Tower of Parity) 核心引擎
 * 獨立於單局對決的 Roguelite 刷塔持久化進程
 */

import { Character, Terrain } from './types';
import { getAllCharacters } from './registry/characters';
import { TERRAIN_POOL, drawRandomTerrains } from './registry/terrains';
import { GameSession, drawHand, HAND_DRAW_SIZE } from './gameService';

export interface TowerFloorConfig {
  floor: number;
  title: string;
  enemyName: string;
  enemyTitle: string;
  enemyHp: number;
  modifierDesc: string;
  isBoss?: boolean;
  isElite?: boolean;
  hasCampfireAfter?: boolean;
  fixedTerrains?: (string | null)[]; // terrain ids to fix in slot 0, 1, 2
}

export const TOWER_FLOORS: TowerFloorConfig[] = [
  {
    floor: 1,
    title: '哨站斥候 (FLOOR 01)',
    enemyName: '哨站斥候',
    enemyTitle: 'LV.2 鐵衛巡邏',
    enemyHp: 3,
    modifierDesc: '[ 基礎交鋒 ] 常規戰場輪替，盡可能保持滿血無傷通關。'
  },
  {
    floor: 2,
    title: '沼澤異端 (FLOOR 02)',
    enemyName: '泥沼異端',
    enemyTitle: 'LV.3 泥沼行者',
    enemyHp: 3,
    modifierDesc: '[ 泥沼封鎖 ] 第一戰場固定為沼澤荒原，氣勢連鎖失效，純拼卡牌裸點數！',
    fixedTerrains: ['swamp', null, null]
  },
  {
    floor: 3,
    title: '狂雷要衝 (FLOOR 03)',
    enemyName: '狂雷魔像',
    enemyTitle: 'LV.4 斷崖巨石 [精英]',
    enemyHp: 4,
    isElite: true,
    modifierDesc: '[ 狂雷爆轟 ] 第三戰場固定為雷霆斷崖，差值大於等於 2 額外計入 +2 分！',
    fixedTerrains: [null, null, 'thunder']
  },
  {
    floor: 4,
    title: '鏡像神殿 (FLOOR 04)',
    enemyName: '鏡像主教',
    enemyTitle: 'LV.5 偏轉秘術 [試煉]',
    enemyHp: 4,
    hasCampfireAfter: true,
    modifierDesc: '[ 偶數領域 ] 第二戰場固定為鏡像之殿，結算總分保底為偶數！戰勝後可抵達休息營地。',
    fixedTerrains: [null, 'mirror', null]
  },
  {
    floor: 5,
    title: '終焉王座 (FLOOR 05)',
    enemyName: '永劫棋王',
    enemyTitle: 'LV.6 奇偶至尊 [BOSS]',
    enemyHp: 5,
    isBoss: true,
    modifierDesc: '[ 王座決戰 ] 棋王坐鎮要衝！全戰場加權提升，率先扣除 5 點生命者勝出！'
  }
];

export interface TowerFloorResult {
  floor: number;
  roundsTaken: number;
  damageTaken: number;
  flawless: boolean;
  scoreGained: number;
}

export interface TowerRunState {
  runId: string;
  seed: string;
  currentFloor: number;
  maxFloors: number;
  playerHp: number;
  playerMaxHp: number;
  score: number;
  floorDamageTaken: number;
  roundCountInFloor: number;
  history: TowerFloorResult[];
  status: 'briefing' | 'battling' | 'floor_cleared' | 'campfire' | 'victory' | 'defeat';
  currentSession: GameSession | null;
}

export interface TowerLeaderboardEntry {
  runId: string;
  date: string;
  score: number;
  floor: number;
  maxFloors: number;
  rank: 'S' | 'A' | 'B' | 'C';
  seed: string;
  isVictory: boolean;
}

const LEADERBOARD_KEY = 'parity_tower_leaderboard_v1';

/**
 * 根據種子生成戰場配置
 */
export function generateFloorTerrains(config: TowerFloorConfig): Terrain[] {
  const allTerrains = [...TERRAIN_POOL];
  const result: Terrain[] = [];

  const randoms = drawRandomTerrains();

  for (let i = 0; i < 3; i++) {
    const fixedId = config.fixedTerrains ? config.fixedTerrains[i] : null;
    if (fixedId) {
      const fixed = allTerrains.find(t => t.id === fixedId);
      result.push(fixed ? { ...fixed } : randoms[i]);
    } else {
      result.push(randoms[i]);
    }
  }

  // BOSS 關卡倍率加權
  if (config.isBoss) {
    result[0].weight = Math.max(result[0].weight, 2);
    result[1].weight = Math.max(result[1].weight, 3);
    result[2].weight = Math.max(result[2].weight, 3);
  }

  return result;
}

/**
 * 建立全新爬塔 Run
 */
export function createTowerRun(customSeed?: string): TowerRunState {
  const seed = customSeed || `ODD-${Math.floor(1000 + Math.random() * 9000)}`;
  const runId = `tower_${Date.now()}`;

  return {
    runId,
    seed,
    currentFloor: 1,
    maxFloors: TOWER_FLOORS.length,
    playerHp: 5,
    playerMaxHp: 5,
    score: 0,
    floorDamageTaken: 0,
    roundCountInFloor: 0,
    history: [],
    status: 'briefing',
    currentSession: null
  };
}

/**
 * 開始當前層的戰鬥
 */
export function startFloorBattle(state: TowerRunState): TowerRunState {
  const config = TOWER_FLOORS[state.currentFloor - 1];
  const allPool = getAllCharacters();
  const playerHand = drawHand(HAND_DRAW_SIZE, allPool);
  const enemyHand = drawHand(HAND_DRAW_SIZE, allPool);
  const currentTerrains = generateFloorTerrains(config);

  const poolIds = new Set([...playerHand.map(c => c.id), ...enemyHand.map(c => c.id)]);
  const roundPool = allPool.filter(c => poolIds.has(c.id));

  const session: GameSession = {
    gameId: `${state.runId}_f${state.currentFloor}`,
    roundNumber: 1,
    playerHp: state.playerHp,
    enemyHp: config.enemyHp,
    playerRole: 'ODD',
    enemyRole: 'EVEN',
    playerHand,
    enemyHand,
    currentTerrains,
    roundPool
  };

  return {
    ...state,
    status: 'battling',
    floorDamageTaken: 0,
    roundCountInFloor: 1,
    currentSession: session
  };
}

/**
 * 結算當前層勝利
 */
export function resolveFloorVictory(state: TowerRunState, roundsTaken: number): TowerRunState {
  const isFlawless = state.floorDamageTaken === 0;
  const isSpeedy = roundsTaken <= 2;

  // 分數計算
  const floorBase = 1000;
  const flawlessBonus = isFlawless ? 600 : 0;
  const speedBonus = isSpeedy ? 400 : 0;
  const scoreGained = floorBase + flawlessBonus + speedBonus;

  const floorRecord: TowerFloorResult = {
    floor: state.currentFloor,
    roundsTaken,
    damageTaken: state.floorDamageTaken,
    flawless: isFlawless,
    scoreGained
  };

  const newScore = state.score + scoreGained;
  const newHistory = [...state.history, floorRecord];
  const config = TOWER_FLOORS[state.currentFloor - 1];

  // 判斷是否為最終 Boss 通關
  if (state.currentFloor >= state.maxFloors) {
    const finalHpBonus = state.playerHp * 250;
    const finalScore = newScore + finalHpBonus;
    const victoryState: TowerRunState = {
      ...state,
      score: finalScore,
      history: newHistory,
      status: 'victory'
    };
    saveScoreToLeaderboard(victoryState);
    return victoryState;
  }

  // 判斷是否有休息營地
  if (config.hasCampfireAfter) {
    return {
      ...state,
      score: newScore,
      history: newHistory,
      status: 'campfire'
    };
  }

  // 前往下一層
  return {
    ...state,
    currentFloor: state.currentFloor + 1,
    score: newScore,
    history: newHistory,
    status: 'briefing',
    currentSession: null
  };
}

/**
 * 結算當前層戰敗
 */
export function resolveFloorDefeat(state: TowerRunState): TowerRunState {
  const defeatState: TowerRunState = {
    ...state,
    playerHp: 0,
    status: 'defeat'
  };
  saveScoreToLeaderboard(defeatState);
  return defeatState;
}

/**
 * 營地選擇：休憩回復生命值
 */
export function applyCampfireRest(state: TowerRunState): TowerRunState {
  const healedHp = Math.min(state.playerMaxHp, state.playerHp + 2);
  return {
    ...state,
    playerHp: healedHp,
    currentFloor: state.currentFloor + 1,
    status: 'briefing',
    currentSession: null
  };
}

/**
 * 營地選擇：推演獲得額外積分
 */
export function applyCampfireTactics(state: TowerRunState): TowerRunState {
  return {
    ...state,
    score: state.score + 1000,
    currentFloor: state.currentFloor + 1,
    status: 'briefing',
    currentSession: null
  };
}

/**
 * 計算試煉評級 (Rank)
 */
export function calculateRank(score: number): 'S' | 'A' | 'B' | 'C' {
  if (score >= 6500) return 'S';
  if (score >= 5000) return 'A';
  if (score >= 3500) return 'B';
  return 'C';
}

/**
 * 存檔至本地排行榜
 */
function saveScoreToLeaderboard(state: TowerRunState) {
  try {
    const board = getTowerLeaderboard();
    const isVictory = state.status === 'victory';
    const entry: TowerLeaderboardEntry = {
      runId: state.runId,
      date: new Date().toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      score: state.score,
      floor: isVictory ? state.maxFloors : state.currentFloor,
      maxFloors: state.maxFloors,
      rank: calculateRank(state.score),
      seed: state.seed,
      isVictory
    };

    const updated = [...board, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 保留最佳前 10 筆

    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

/**
 * 讀取本地排行榜
 */
export function getTowerLeaderboard(): TowerLeaderboardEntry[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

/**
 * 取得本機最高分紀錄
 */
export function getTowerHighScore(): number {
  const board = getTowerLeaderboard();
  if (board.length === 0) return 0;
  return board[0].score;
}
