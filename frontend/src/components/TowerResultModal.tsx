import React, { useState } from 'react';
import { TowerRunState, calculateRank, getTowerLeaderboard } from '../game/towerEngine';
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
    <div className="tutorial-overlay" style={{ zIndex: 1100 }}>
      <div
        className="tutorial-box"
        style={{
          width: '92%',
          maxWidth: '560px',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.98)',
          border: `3px solid ${isVictory ? '#00ffcc' : '#ff4747'}`,
          boxShadow: isVictory ? '0 0 30px rgba(0,255,204,0.3)' : '0 0 30px rgba(255,71,71,0.3)',
          padding: '24px'
        }}
      >
        {/* 標題橫幅 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2
            style={{
              margin: '0 0 6px 0',
              fontSize: '24px',
              color: isVictory ? '#00ffcc' : '#ff4747',
              letterSpacing: '2px',
              textShadow: '2px 2px 0 #000'
            }}
          >
            {isVictory ? '[ 試煉登頂 · TOWER CONQUERED ]' : `[ 止步第 ${state.currentFloor} 層 · DEFEAT ]`}
          </h2>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
            EXPEDITION SEED: #{state.seed}
          </div>
        </div>

        {/* 總分與評級牌匾 */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '2px solid #334155',
            borderRadius: '4px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '20px'
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '11px', letterSpacing: '1px' }}>
            FINAL SCORE
          </div>
          <div style={{ color: '#ffcc00', fontSize: '38px', fontWeight: 'bold', fontFamily: 'monospace', margin: '4px 0' }}>
            {state.score.toLocaleString()} <span style={{ fontSize: '16px' }}>PTS</span>
          </div>
          <div style={{ display: 'inline-block', background: '#0f172a', border: '1px solid #475569', padding: '4px 12px', borderRadius: '3px', fontSize: '13px', color: rank === 'S' ? '#00ffcc' : '#38bdf8' }}>
            [ 評級 RANK: {rank} ] {rank === 'S' ? '奇偶至尊' : rank === 'A' ? '高階博弈者' : rank === 'B' ? '精算行家' : '見習棋手'}
          </div>
        </div>

        {/* 分頁按鈕 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          <button
            className="btn"
            style={{ flex: 1, padding: '8px', fontSize: '12px', background: activeTab === 'summary' ? '#0f766e' : '#1e293b' }}
            onClick={() => setActiveTab('summary')}
          >
            [ 本局戰況明細 ]
          </button>
          <button
            className="btn"
            style={{ flex: 1, padding: '8px', fontSize: '12px', background: activeTab === 'leaderboard' ? '#0f766e' : '#1e293b' }}
            onClick={() => setActiveTab('leaderboard')}
          >
            [ 歷史榮譽榜 TOP 10 ]
          </button>
        </div>

        {/* 本局戰況分頁 */}
        {activeTab === 'summary' && (
          <div>
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', marginBottom: '15px' }}>
              <div style={{ fontSize: '11px', color: '#ffcc00', fontWeight: 'bold', marginBottom: '8px' }}>
                各層交鋒戰報
              </div>
              {state.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: i < state.history.length - 1 ? '1px dashed #334155' : 'none' }}>
                  <span style={{ color: '#fff' }}>
                    FLOOR 0{h.floor} {h.flawless && <span style={{ color: '#00ffcc', fontSize: '10px', marginLeft: '4px' }}>[無傷]</span>}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {h.roundsTaken} 回合 / 承傷 {h.damageTaken} 點
                  </span>
                  <span style={{ color: '#ffcc00', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    +{h.scoreGained} PTS
                  </span>
                </div>
              ))}
              {state.history.length === 0 && (
                <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
                  未通過任何層數
                </div>
              )}
            </div>

            {/* 像素戰報海報展示區 */}
            {!posterUrl ? (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button
                  className="btn"
                  style={{ width: '100%', background: '#4338ca', padding: '10px', fontSize: '14px' }}
                  onClick={handleGeneratePoster}
                >
                  [ 繪製 8-Bit 像素戰報海報 (可分享) ]
                </button>
              </div>
            ) : (
              <div style={{ background: '#090d16', border: '2px solid #00ffcc', borderRadius: '4px', padding: '12px', marginBottom: '20px', textAlign: 'center' }}>
                <img
                  src={posterUrl}
                  alt="Tower Scorecard"
                  style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '2px', border: '1px solid #334155', imageRendering: 'pixelated' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                  <button className="btn" style={{ flex: 1, background: '#0284c7', padding: '8px', fontSize: '12px' }} onClick={handleCopyPoster}>
                    {copyTip ? '[ 已複製至剪貼簿！]' : '[ 複製圖片 ]'}
                  </button>
                  <button className="btn" style={{ flex: 1, background: '#059669', padding: '8px', fontSize: '12px' }} onClick={handleDownloadPoster}>
                    [ 下載海報 PNG ]
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 歷史榮譽榜分頁 */}
        {activeTab === 'leaderboard' && (
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid #334155', borderRadius: '4px', padding: '10px 14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: '#ffcc00', fontWeight: 'bold', marginBottom: '8px' }}>
              本機最佳試煉紀錄 (TOP 10)
            </div>
            {leaderboard.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  padding: '7px 0',
                  borderBottom: idx < leaderboard.length - 1 ? '1px dashed #334155' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: idx === 0 ? '#ffcc00' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#b45309' : '#94a3b8', fontWeight: 'bold', width: '20px' }}>
                    #{idx + 1}
                  </span>
                  <span style={{ color: item.isVictory ? '#00ffcc' : '#fff' }}>
                    {item.isVictory ? '[登頂通關]' : `第 ${item.floor} 層`}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    ({item.date})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', background: '#1e293b', color: '#38bdf8', padding: '1px 5px', borderRadius: '2px' }}>
                    RANK {item.rank}
                  </span>
                  <span style={{ color: '#ffcc00', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {item.score.toLocaleString()} PTS
                  </span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '14px' }}>
                暫無榮譽紀錄，完成一輪試煉即可留名！
              </div>
            )}
          </div>
        )}

        {/* 底部操作按鈕 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn engage"
            style={{ flex: 1, padding: '10px', fontSize: '14px' }}
            onClick={() => {
              soundManager.playSfx('click');
              onRestart();
            }}
          >
            再次試煉
          </button>
          <button
            className="btn"
            style={{ flex: 1, background: '#334155', padding: '10px', fontSize: '14px' }}
            onClick={() => {
              soundManager.playSfx('click');
              onMainMenu();
            }}
          >
            返回主選單
          </button>
        </div>
      </div>
    </div>
  );
};
