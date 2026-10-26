import { Terrain } from '../types';

/**
 * =========================================================================
 * 🌍 動態戰場環境註冊表 (Terrain Registry)
 * =========================================================================
 * 
 * 戰場環境會為交鋒引入額外的規則變數，例如倍率加成、氣勢增幅、特性封印等。
 * 每回合會從戰場池中隨機抽取 3 個戰場作為當局對陣舞台！
 */

export const TERRAIN_POOL: Terrain[] = [
  // 1. 🌲 沼澤荒原 (Swamp)
  {
    id: 'swamp',
    name: '沼澤荒原',
    weight: 1,
    icon: '🌲',
    color: '#2e7d32',
    description: '【泥沼阻滯】：泥濘難行，雙方皆無法享有上一格傳遞的氣勢加成。',
    disableMomentum: true
  },

  // 2. ⚔️ 決鬥擂台 (Arena)
  {
    id: 'arena',
    name: '決鬥擂台',
    weight: 2,
    icon: '⚔️',
    color: '#d32f2f',
    description: '【生死搏殺】：此格交鋒獲勝者，帶給下一格的氣勢加成躍升為 +2！',
    onClashWin: (winner) => {
      if (winner !== 'tie') {
        return { momentumBonus: 2, text: '⚔️ 擂台狂熱！勝者氣勢躍升 +2！' };
      }
      return null;
    }
  },

  // 3. 🏛️ 皇宮大殿 (Palace)
  {
    id: 'palace',
    name: '皇宮大殿',
    weight: 3,
    icon: '🏛️',
    color: '#f57c00',
    description: '【王權加護】：國王、皇后與主教（Lv.4~6）在此格戰力額外 +1！'
  },

  // 4. 🪞 鏡像之殿 (Mirror Hall)
  {
    id: 'mirror_hall',
    name: '鏡像之殿',
    weight: 2,
    icon: '🪞',
    color: '#0288d1',
    description: '【偶數領域】：結算時此格產生的分數若為奇數，強制 +1 湊為偶數。',
    modifyScore: (score) => {
      return score % 2 !== 0 ? score + 1 : score;
    }
  },

  // 5. ⛪ 靜默神殿 (Sanctuary)
  {
    id: 'sanctuary',
    name: '靜默神殿',
    weight: 1,
    icon: '⛪',
    color: '#7b1fa2',
    description: '【異能封印】：聖光籠罩，此格所有棋子被動特性完全失效！',
    isSilenceSanctuary: true
  },

  // 6. ⚡ 雷霆斷崖 (Storm Cliff)
  {
    id: 'storm_cliff',
    name: '雷霆斷崖',
    weight: 3,
    icon: '⚡',
    color: '#fbc02d',
    description: '【狂雷轟鳴】：若此格差值 >= 2，引發雷暴額外計入 +2 分！',
    modifyScore: (score, ctx) => {
      return ctx.diff >= 2 ? score + 2 : score;
    }
  }
];

// 預設戰場（相容原有經典三戰場）
export const CLASSIC_TERRAINS: Terrain[] = [
  TERRAIN_POOL[0], // 沼澤荒原 (x1)
  {
    id: 'town',
    name: '城鎮街道',
    weight: 2,
    icon: '🏘️',
    color: '#8d6e63',
    description: '【街巷爭奪】：中堅平穩交鋒，乘數倍率固定為 x2。'
  },
  TERRAIN_POOL[2]  // 皇宮大殿 (x3)
];

/**
 * 隨機抽取 3 個戰場（保證權重呈漸進式或多樣化搭配）
 */
export function drawRandomTerrains(): Terrain[] {
  // 從池中洗牌抽取 3 個不重複的戰場
  const shuffled = [...TERRAIN_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  
  // 按照權重升冪排序，給予 1 -> 2 -> 3 號戰場合理的遞進對決節奏
  selected.sort((a, b) => a.weight - b.weight);
  return selected;
}
