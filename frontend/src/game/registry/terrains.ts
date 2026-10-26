import { Terrain } from '../types';

/**
 * =========================================================================
 * 動態戰場環境註冊表 (Terrain Registry) - 專業像素無 Emoji 版
 * =========================================================================
 */

export const TERRAIN_POOL: Terrain[] = [
  // 1. 沼澤荒原 (Swamp)
  {
    id: 'swamp',
    name: '沼澤荒原',
    weight: 1,
    icon: 'swamp',
    color: '#2e7d32',
    description: '[ 泥沼阻滯 ] 雙方無法享有上一格傳遞的氣勢加成。',
    disableMomentum: true
  },

  // 2. 決鬥擂台 (Arena)
  {
    id: 'arena',
    name: '決鬥擂台',
    weight: 2,
    icon: 'arena',
    color: '#d32f2f',
    description: '[ 生死搏殺 ] 此格勝者帶給下一格的氣勢加成躍升為 +2。',
    onClashWin: (winner) => {
      if (winner !== 'tie') {
        return { momentumBonus: 2, text: '[ 擂台 ARENA ] 勝者氣勢加乘 +2！' };
      }
      return null;
    }
  },

  // 3. 皇宮大殿 (Palace)
  {
    id: 'palace',
    name: '皇宮大殿',
    weight: 3,
    icon: 'palace',
    color: '#f57c00',
    description: '[ 王權加護 ] Lv.4 以上高階棋子在此格戰力額外 +1。'
  },

  // 4. 鏡像之殿 (Mirror Hall)
  {
    id: 'mirror_hall',
    name: '鏡像之殿',
    weight: 2,
    icon: 'mirror_hall',
    color: '#0288d1',
    description: '[ 偶數領域 ] 結算時此格產生的積分保底為偶數（奇數強制 +1）。',
    modifyScore: (score) => {
      return score % 2 !== 0 ? score + 1 : score;
    }
  },

  // 5. 靜默神殿 (Sanctuary)
  {
    id: 'sanctuary',
    name: '靜默神殿',
    weight: 1,
    icon: 'sanctuary',
    color: '#7b1fa2',
    description: '[ 異能封印 ] 聖光壓制，此格所有棋子被動特性失效。',
    isSilenceSanctuary: true
  },

  // 6. 雷霆斷崖 (Storm Cliff)
  {
    id: 'storm_cliff',
    name: '雷霆斷崖',
    weight: 3,
    icon: 'storm_cliff',
    color: '#fbc02d',
    description: '[ 狂雷轟鳴 ] 若此格戰鬥差值 ≥ 2，額外計入 +2 分。',
    modifyScore: (score, ctx) => {
      return ctx.diff >= 2 ? score + 2 : score;
    }
  }
];

export const CLASSIC_TERRAINS: Terrain[] = [
  TERRAIN_POOL[0],
  {
    id: 'town',
    name: '城鎮街道',
    weight: 2,
    icon: 'town',
    color: '#8d6e63',
    description: '[ 街巷交鋒 ] 中堅平穩對決，乘數倍率固定為 x2。'
  },
  TERRAIN_POOL[2]
];

export function drawRandomTerrains(): Terrain[] {
  const shuffled = [...TERRAIN_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  selected.sort((a, b) => a.weight - b.weight);
  return selected;
}
