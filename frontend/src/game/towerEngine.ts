/**
 * 氣勢連鎖奇偶戰 - 一命通關 (Tower of Parity) 核心引擎
 * 獨立於單局對決的 Roguelite 刷塔持久化進程
 */

import { Character } from './types';
import { GameSession, initGameSession } from './gameService';

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
}

export const TOWER_FLOORS: TowerFloorConfig[] = [
  {
    floor: 1,
    title: '哨站斥候 (FLOOR 01)',
    enemyName: '哨站斥候',
    enemyTitle: 'LV.2 鐵衛巡邏',
    enemyHp: 3,
    modifierDesc: '[ 標準交鋒 ] 使用三路倍率、中路禁令與五回合裁決規則。'
  },
  {
    floor: 2,
    title: '沼澤異端 (FLOOR 02)',
    enemyName: '泥沼異端',
    enemyTitle: 'LV.3 泥沼行者',
    enemyHp: 3,
    modifierDesc: '[ 沼澤異端 ] 沿用標準三路交鋒規則，敵方生命值 3 點。'
  },
  {
    floor: 3,
    title: '狂雷要衝 (FLOOR 03)',
    enemyName: '狂雷魔像',
    enemyTitle: 'LV.4 斷崖巨石 [精英]',
    enemyHp: 4,
    isElite: true,
    modifierDesc: '[ 精英首領 ] 沿用標準三路交鋒規則，敵方生命值 4 點。'
  },
  {
    floor: 4,
    title: '鏡像神殿 (FLOOR 04)',
    enemyName: '鏡像主教',
    enemyTitle: 'LV.5 偏轉秘術 [試煉]',
    enemyHp: 4,
    hasCampfireAfter: true,
    modifierDesc: '[ 中繼營地 ] 沿用標準三路交鋒規則，敵方生命值 4 點；勝利後可選擇休整。'
  },
  {
    floor: 5,
    title: '終焉王座 (FLOOR 05)',
    enemyName: '永劫棋王',
    enemyTitle: 'LV.6 奇偶至尊 [BOSS]',
    enemyHp: 5,
    isBoss: true,
    modifierDesc: '[ 王座決戰 ] 沿用標準三路交鋒規則，永劫棋王生命值 5 點。'
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
  const session: GameSession = {
    ...initGameSession(state.playerHp, config.enemyHp),
    gameId: `${state.runId}_f${state.currentFloor}`
  };
  session.roundPool = [...session.playerHand, ...session.enemyHand]
    .sort((a, b) => (a.base_level ?? a.level ?? 0) - (b.base_level ?? b.level ?? 0));

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
