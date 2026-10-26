import { Character, Terrain } from './types';
import { resolveRound } from './engine';
import { getAllCharacters } from './registry/characters';

/**
 * 輔助函數：取得手牌中任選 3 張的所有排列組合 (Permutations)
 * 若手牌為 4 張，P(4, 3) = 4 * 3 * 2 = 24 種出牌可能
 */
export function getDeploymentsFromHand(hand: Character[], count: number = 3): Character[][] {
  const results: Character[][] = [];

  function permute(current: Character[], remaining: Character[]) {
    if (current.length === count) {
      results.push(current);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const next = remaining[i];
      const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      permute([...current, next], rest);
    }
  }

  permute([], hand);
  return results;
}

/**
 * 智慧 AI 決策器：
 * 支援 4 選 3、特性感知與動態戰場評估。
 * 遍歷自身的 24 種出牌可能，模擬對手所有可能佈署，找出勝率（能打傷玩家或防扣血）最高的方案！
 */
export function chooseBestDeployment(
  aiHand: Character[],
  terrains: Terrain[],
  roundNumber: number,
  playerHp: number = 3,
  aiHp: number = 3
): Character[] {
  // 1. 取得 AI 自身手牌的 24 種出牌排列
  const aiChoices = getDeploymentsFromHand(aiHand, 3);
  if (aiChoices.length === 0) return [];
  if (aiChoices.length === 1) return aiChoices[0];

  // 2. 構建假想的玩家可能出牌池 (從全角色庫中抽樣排列)
  const allChars = getAllCharacters();
  const playerHypotheticalChoices = getDeploymentsFromHand(allChars, 3);

  // 抽樣 30 種常見的玩家出牌情境，兼顧演算速度與統計代表性
  const samplePlayerDeployments = playerHypotheticalChoices
    .sort(() => 0.5 - Math.random())
    .slice(0, 36);

  let bestDeployment = aiChoices[0];
  let highestScore = -Infinity;

  for (const myDep of aiChoices) {
    let wins = 0;
    let safeDraws = 0;

    for (const oppDep of samplePlayerDeployments) {
      try {
        // 在模擬中：playerDeployment 是 oppDep，enemyDeployment 是 myDep
        const result = resolveRound(
          oppDep,
          myDep,
          terrains,
          roundNumber,
          playerHp,
          aiHp
        );

        // 如果傷害打在玩家身上 (damage_to === 'player')，代表 AI 獲勝
        if (result.damage_to === 'player') {
          wins += 2;
        } else {
          // AI 受到傷害
          wins -= 1;
        }
      } catch {
        // 忽略模擬異常
      }
    }

    const currentScore = wins + safeDraws;
    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestDeployment = myDep;
    }
  }

  return bestDeployment;
}
