/**
 * 氣勢連鎖奇偶戰 - HTML5 Canvas 8-Bit 像素戰報卡生成器
 * 純本地客戶端繪製，零外部依賴、零伺服器開銷
 */

import { TowerRunState, calculateRank } from './towerEngine';

export function generateTowerScorecard(state: TowerRunState): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 620;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    const isVictory = state.status === 'victory';
    const rank = calculateRank(state.score);
    const flawlessCount = state.history.filter(h => h.flawless).length;

    // 1. 滿版像素暗夜背景
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 復古地磚像素紋理
    ctx.fillStyle = '#0f172a';
    for (let y = 0; y < canvas.height; y += 20) {
      for (let x = 0; x < canvas.width; x += 40) {
        const offsetX = (y / 20) % 2 === 0 ? 0 : 20;
        ctx.fillRect(x + offsetX, y, 38, 18);
      }
    }

    // 3. 像素雙重邊框 (Double Pixel Frame)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.strokeStyle = isVictory ? '#00ffcc' : '#ff4747';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);

    // 4. 頂部標題區
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ 氣勢連鎖 · 奇偶試煉戰報 ]', canvas.width / 2, 45);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('PARITY SPIRE EXPEDITION REPORT', canvas.width / 2, 65);

    // 5. 勝負徽章橫幅 (Banner)
    const bannerY = 85;
    ctx.fillStyle = isVictory ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255, 71, 71, 0.15)';
    ctx.fillRect(30, bannerY, canvas.width - 60, 48);
    ctx.strokeStyle = isVictory ? '#00ffcc' : '#ff4747';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, bannerY, canvas.width - 60, 48);

    ctx.fillStyle = isVictory ? '#00ffcc' : '#ff4747';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(
      isVictory ? '[ 試煉登頂 · TOWER CONQUERED ]' : `[ 止步第 ${state.currentFloor} 層 · DEFEATED ]`,
      canvas.width / 2,
      bannerY + 31
    );

    // 6. 核心總分展示
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px monospace';
    ctx.fillText('FINAL SCORE', canvas.width / 2, 165);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${state.score.toLocaleString()} PTS`, canvas.width / 2, 205);

    // 7. 評級徽章 (Rank Box)
    const rankY = 225;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(80, rankY, canvas.width - 160, 44);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, rankY, canvas.width - 160, 44);

    const rankTitle = rank === 'S' ? '奇偶至尊 (MASTER)' : rank === 'A' ? '高階博弈者 (EXPERT)' : rank === 'B' ? '精算行家 (VETERAN)' : '見習棋手 (NOVICE)';
    ctx.fillStyle = rank === 'S' ? '#00ffcc' : rank === 'A' ? '#38bdf8' : '#e2e8f0';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`[ 評級 RANK: ${rank} ] ${rankTitle}`, canvas.width / 2, rankY + 28);

    // 8. 戰績數據明細表 (Stats Table)
    const tableY = 295;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(30, tableY, canvas.width - 60, 220);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, tableY, canvas.width - 60, 220);

    const rows = [
      { label: '通關進度 (PROGRESS)', val: `${isVictory ? state.maxFloors : state.currentFloor - 1} / ${state.maxFloors} 層` },
      { label: '剩餘生命 (HP REMAIN)', val: `${state.playerHp} / ${state.playerMaxHp}` },
      { label: '無傷層數 (FLAWLESS)', val: `${flawlessCount} 層` },
      { label: '累計戰鬥回合 (ROUNDS)', val: `${state.history.reduce((acc, h) => acc + h.roundsTaken, 0)} 回合` },
      { label: '對局種子 (SEED CODE)', val: `#${state.seed}` },
      { label: '通關日期 (DATE)', val: new Date().toLocaleDateString('zh-TW') }
    ];

    ctx.textAlign = 'left';
    ctx.font = '12px monospace';

    rows.forEach((row, idx) => {
      const lineY = tableY + 32 + idx * 32;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(row.label, 50, lineY);
      ctx.fillStyle = '#00ffcc';
      ctx.textAlign = 'right';
      ctx.fillText(row.val, canvas.width - 50, lineY);
      ctx.textAlign = 'left';

      if (idx < rows.length - 1) {
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(50, lineY + 10);
        ctx.lineTo(canvas.width - 50, lineY + 10);
        ctx.stroke();
      }
    });

    // 9. 底部官方落款
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('* 氣勢連鎖奇偶戰 · PARITY BATTLE ENGINE *', canvas.width / 2, 550);
    ctx.fillText('純前端開源架構 · 點擊複製或保存戰報海報', canvas.width / 2, 568);

    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * 將圖片複製到使用者系統剪貼簿
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch (e) {
    return false;
  }
}
