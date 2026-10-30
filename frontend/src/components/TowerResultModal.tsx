import React, { useState } from 'react';
import { TowerRunState, calculateRank, getTowerLeaderboard, TOWER_FLOORS } from '../game/towerEngine';
import { generateTowerScorecard, copyImageToClipboard } from '../game/towerCardGenerator';
import { soundManager } from '../game/soundManager';

interface TowerResultModalProps {
  state: TowerRunState;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const TowerResultModal: React.FC<TowerResultModalProps> = ({ state, onRestart, onMainMenu }) => {
  const isVictory = state.status === 'victory';
  const rank = calculateRank(state.score);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [copyTip, setCopyTip] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'leaderboard'>('summary');
  const leaderboard = getTowerLeaderboard();

  const rankTitle =
    rank === 'S'
      ? '奇偶至尊'
      : rank === 'A'
      ? '高階博弈者'
      : rank === 'B'
      ? '精算行家'
      : '見習棋手';

  const rankColor =
    rank === 'S' ? '#fbbf24' : rank === 'A' ? '#38bdf8' : rank === 'B' ? '#cbd5e1' : '#94a3b8';

  const handleGeneratePoster = async () => {
    soundManager.playSfx('click');
    const url = await generateTowerScorecard(state);
    setPosterUrl(url);
  };

  const handleCopyPoster = async () => {
    if (!posterUrl) return;
    soundManager.playSfx('click');
    const success = await copyImageToClipboard(posterUrl);
    if (success) {
      setCopyTip(true);
      setTimeout(() => setCopyTip(false), 2500);
    }
  };

  const handleDownloadPoster = () => {
    if (!posterUrl) return;
    soundManager.playSfx('click');
    const a = document.createElement('a');
    a.href = posterUrl;
    a.download = `Parity_Tower_${state.seed}_${state.score}.png`;
    a.click();
  };

  return (
    <div className="arcade-overlay">
      <div className={`arcade-tally-window ${isVictory ? 'victory' : 'defeat'}`}>
        {/* 1. 街機頂部公告橫幅 */}
        <div className="arcade-marquee-header">
          <div className="arcade-marquee-banner">
            {isVictory ? '[ 試煉登頂 · VICTORY ]' : `[ 終局折戟 · DEFEAT ]`}
          </div>
          <div className="arcade-seed-badge">
            EXPEDITION ARCHIVE // SEED #{state.seed}
          </div>
        </div>

        {/* 2. 街機記分銘牌與作戰矩陣 */}
        <div className="arcade-score-board">
          <div className="arcade-score-label">
            ── FINAL SCORE 結算總分 ──
          </div>
          <div className="arcade-score-digits">
            {state.score.toLocaleString()} <span>PTS</span>
          </div>
          <div className="arcade-stats-grid">
            <div className="arcade-stat-item">
              <span className="arcade-stat-label">終止階層</span>
              <span className="arcade-stat-value">
                FLOOR 0{state.currentFloor} / 05
              </span>
            </div>
            <div className="arcade-stat-item">
              <span className="arcade-stat-label">作戰評級</span>
              <span className="arcade-stat-value" style={{ color: rankColor }}>
                [ {rank} · {rankTitle} ]
              </span>
            </div>
          </div>
        </div>

        {/* 3. 街機實體切換分頁 */}
        <div className="arcade-tab-bar">
          <button
            className={`arcade-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playSfx('click');
              setActiveTab('summary');
            }}
          >
            [ 歷層戰報 BATTLE LOG ]
          </button>
          <button
            className={`arcade-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => {
              soundManager.playSfx('click');
              setActiveTab('leaderboard');
            }}
          >
            [ 殿堂榜單 TOP 10 ]
          </button>
        </div>

        {/* 4. 分頁內容區 */}
        {activeTab === 'summary' && (
          <div>
            <div className="arcade-panel-box">
              <div className="arcade-panel-title">
                <span>作戰各層明細</span>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                  TOTAL {state.history.length} CLEARED
                </span>
              </div>
              {state.history.map((h, i) => (
                <div key={i} className="arcade-log-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      0{h.floor}F
                    </span>
                    <span style={{ color: '#cbd5e1' }}>
                      {TOWER_FLOORS[h.floor - 1]?.enemyName || '先鋒對手'}
                    </span>
                    {h.flawless && (
                      <span
                        style={{
                          color: '#34d399',
                          fontSize: '10px',
                          border: '1px solid #059669',
                          padding: '0 4px'
                        }}
                      >
                        [無傷]
                      </span>
                    )}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {h.roundsTaken} 回合 / 承傷 {h.damageTaken} 點
                  </div>
                  <div style={{ color: '#fbbf24', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    +{h.scoreGained} PTS
                  </div>
                </div>
              ))}
              {state.history.length === 0 && (
                <div className="arcade-tactical-dispatch">
                  <div className="arcade-dispatch-title">
                    [ 01F 哨站斥候 ] ── 初戰受挫 · 於先鋒交鋒中力竭 (+0 PTS)
                  </div>
                  <div className="arcade-dispatch-desc">
                    戰術指引：開局需權衡手牌奇偶分配，善用小兵以弱勝強與主塔止損特性。
                  </div>
                </div>
              )}
            </div>

            {/* 戰報海報按鈕與展示 */}
            {!posterUrl ? (
              <div style={{ marginBottom: '16px' }}>
                <button className="arcade-poster-btn" onClick={handleGeneratePoster}>
                  [ 鐫刻戰績海報 · GENERATE POSTER ]
                </button>
              </div>
            ) : (
              <div className="arcade-poster-preview">
                <img
                  src={posterUrl}
                  alt="Tower Scorecard"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '260px',
                    border: '2px solid #000',
                    imageRendering: 'pixelated'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                  <button
                    className="arcade-btn-secondary"
                    style={{ padding: '8px', fontSize: '12px' }}
                    onClick={handleCopyPoster}
                  >
                    {copyTip ? '[ 已複製至剪貼簿！]' : '[ 複製圖片 · COPY ]'}
                  </button>
                  <button
                    className="arcade-btn-secondary"
                    style={{ padding: '8px', fontSize: '12px', background: '#065f46', color: '#6ee7b7' }}
                    onClick={handleDownloadPoster}
                  >
                    [ 下載海報 · SAVE PNG ]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 殿堂榮譽榜 */}
        {activeTab === 'leaderboard' && (
          <div className="arcade-panel-box">
            <div className="arcade-panel-title">
              <span>殿堂榮譽榜單</span>
              <span style={{ color: '#94a3b8', fontSize: '10px' }}>LOCAL ARCHIVE</span>
            </div>
            {leaderboard.map((item, idx) => (
              <div key={idx} className="arcade-log-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      color:
                        idx === 0
                          ? '#fbbf24'
                          : idx === 1
                          ? '#e2e8f0'
                          : idx === 2
                          ? '#b45309'
                          : '#64748b',
                      fontWeight: 'bold',
                      width: '24px',
                      fontFamily: 'monospace'
                    }}
                  >
                    #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>
                  <span style={{ color: item.isVictory ? '#34d399' : '#fff' }}>
                    {item.isVictory ? '[登頂通關]' : `第 ${item.floor} 層`}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    ({item.date})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      border: '1px solid #334155',
                      padding: '1px 6px',
                      color: item.rank === 'S' ? '#fbbf24' : '#94a3b8'
                    }}
                  >
                    RANK {item.rank}
                  </span>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {item.score.toLocaleString()} PTS
                  </span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                殿堂尚無留名者，完成一次試煉即刻鐫刻名號！
              </div>
            )}
          </div>
        )}

        {/* 5. 底部操作按鈕 */}
        <div className="arcade-action-row">
          <button
            className={`arcade-btn-primary ${isVictory ? 'victory' : 'defeat'}`}
            onClick={() => {
              soundManager.playSfx('click');
              onRestart();
            }}
          >
            [ 重返試煉 · RETRY ]
          </button>
          <button
            className="arcade-btn-secondary"
            onClick={() => {
              soundManager.playSfx('click');
              onMainMenu();
            }}
          >
            [ 返回大廳 · MAIN MENU ]
          </button>
        </div>
      </div>
    </div>
  );
};

