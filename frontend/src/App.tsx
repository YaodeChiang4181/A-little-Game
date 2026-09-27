import { useState, useEffect } from 'react'
import './index.css'

const CHESS_PIECES: Record<number, { name: string, icon: string }> = {
  1: { name: '小兵', icon: '♟' },
  2: { name: '騎士', icon: '♞' },
  3: { name: '主塔', icon: '♜' },
  4: { name: '主教', icon: '♝' },
  5: { name: '皇后', icon: '♛' },
  6: { name: '國王', icon: '♚' },
}

export default function App() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'game_over'>('idle');
  const [playerHp, setPlayerHp] = useState(3);
  const [enemyHp, setEnemyHp] = useState(3);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  
  const [hand, setHand] = useState<number[]>([]);
  const [deployment, setDeployment] = useState<(number | null)[]>([null, null, null]);
  const [battleLogs, setBattleLogs] = useState<any[]>([]); 
  
  const [isResolving, setIsResolving] = useState(false);
  const [dealStep, setDealStep] = useState(-1); // 處理敵方飛牌動畫
  const [resolveStep, setResolveStep] = useState(-1); // 處理翻牌與結算動畫
  const [pendingResult, setPendingResult] = useState<any>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const startGame = async () => {
    try {
      const res = await fetch(`${API_BASE}/game/start`, { method: 'POST' });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      setGameId(data.game_id);
      setPlayerHp(data.player_hp);
      setEnemyHp(data.enemy_hp);
      setHand(data.player_hand); 
      setDeployment([null, null, null]);
      setGameState('playing');
      setBattleLogs([]);
      setHistory([]);
      setWinner(null);
      setShowHistory(false);
      setDealStep(-1);
      setResolveStep(-1);
    } catch (e) {
      alert("無法連接伺服器！");
    }
  };

  const handleCardClick = (card: number, index: number) => {
    if (isResolving) return;
    const emptySlot = deployment.findIndex(s => s === null);
    if (emptySlot !== -1) {
      const newDeployment = [...deployment];
      newDeployment[emptySlot] = card;
      setDeployment(newDeployment);
      const newHand = [...hand];
      newHand.splice(index, 1);
      setHand(newHand);
    }
  };

  const handleSlotClick = (card: number | null, index: number) => {
    if (isResolving || card === null) return;
    setHand([...hand, card]);
    const newDeployment = [...deployment];
    newDeployment[index] = null;
    setDeployment(newDeployment);
  };

  const submitDeployment = async () => {
    const deployedCount = deployment.filter(c => c !== null).length;
    if (deployedCount < 3 || gameId === null || isResolving) return;
    
    setIsResolving(true);
    
    try {
      const res = await fetch(`${API_BASE}/game/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          player_deployment: deployment,
          player_hand: hand
        })
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      setPendingResult(data);
      setBattleLogs([]);
      setDealStep(0); // 觸發第一階段：敵方飛牌動畫
      
    } catch (e) {
      alert("結算錯誤！");
      setIsResolving(false);
    }
  };

  // 第一階段動畫：神秘卡片飛入戰場
  useEffect(() => {
    if (dealStep >= 0 && dealStep < 3) {
      const timer = setTimeout(() => {
        setDealStep(prev => prev + 1);
      }, 300); // 每0.3秒飛入一張
      return () => clearTimeout(timer);
    } else if (dealStep === 3) {
      const timer = setTimeout(() => {
        setResolveStep(0); // 飛完後等待一下，進入翻牌結算階段
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [dealStep]);

  // 第二階段動畫：翻牌與算式結算
  useEffect(() => {
    if (resolveStep >= 0 && resolveStep < 3 && pendingResult) {
      const b = pendingResult.battles[resolveStep];
      setBattleLogs(prev => {
        const newLogs = [...prev];
        newLogs[resolveStep] = b;
        return newLogs;
      });
      
      const timer = setTimeout(() => {
        setResolveStep(prev => prev + 1);
      }, 3500); 
      
      return () => clearTimeout(timer);
    } 
    else if (resolveStep === 3 && pendingResult) {
      // 全部翻完，結算總結果
      setTimeout(() => {
        setEnemyHp(pendingResult.enemy_hp);
        setPlayerHp(pendingResult.player_hp);
        setHistory(prev => [...prev, { round: prev.length + 1, battles: pendingResult.battles }]);
        
        setTimeout(() => {
          if (pendingResult.game_over) {
            setWinner(pendingResult.winner);
            setGameState('game_over');
          } else {
            setDeployment([null, null, null]);
            setHand(pendingResult.next_player_hand);
          }
          setDealStep(-1);
          setResolveStep(-1);
          setIsResolving(false);
          setPendingResult(null);
          setBattleLogs([]);
        }, 1500);
      }, 500);
    }
  }, [resolveStep, pendingResult]);

  const renderCard = (val: number | null, color: 'white' | 'black', isWinner?: boolean, isLoser?: boolean, isResolvingSlot?: boolean) => {
    if (val === null) return <div className="card empty"></div>;
    const piece = CHESS_PIECES[val];
    
    let animClass = '';
    if (isResolvingSlot) {
      animClass = color === 'black' ? 'flip-reveal ' : ''; // 敵方卡片翻開動畫
      if (isWinner) animClass += 'clash-winner';
      if (isLoser) animClass += 'clash-loser';
    } else {
      if (isWinner) animClass = 'resolved-winner';
      if (isLoser) animClass = 'resolved-loser';
    }
    
    return (
      <div className={`card ${color}-piece ${animClass}`}>
        <div style={{ fontSize: '32px', marginBottom: '5px' }}>{piece.icon}</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{piece.name}</div>
        <div style={{ fontSize: '10px', marginTop: '2px', color: color === 'white' ? '#888' : '#aaa' }}>Lv.{val}</div>
      </div>
    );
  };

  const renderHearts = (hp: number) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} className="heart" style={{ opacity: i < hp ? 1 : 0.2 }}>❤</span>
    ));
  };

  const deployedCount = deployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const TERRAIN_NAMES = ['沼澤地帶', '城鎮街道', '皇宮大殿'];

  return (
    <div className="game-wrapper">
      
      {/* ============ 左側/下方 玩家控制面板 ============ */}
      <div className="side-panel player-panel">
        {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
          <div className="hud-box player-hud">
            <div style={{fontWeight: 'bold', color: '#fff'}}>ODD (玩家)</div>
            <div className="hp-bar">{renderHearts(playerHp)}</div>
          </div>
        )}
        
        {gameState === 'playing' && (
          <div className="hand-section">
            <div className="hand-container" style={{ opacity: isResolving ? 0.5 : 1, pointerEvents: isResolving ? 'none' : 'auto' }}>
              {hand.map((card, i) => (
                <div key={i} onClick={() => handleCardClick(card, i)}>
                  {renderCard(card, 'white')}
                </div>
              ))}
              {hand.length === 0 && <div style={{color: '#aaa', fontSize: '12px'}}>空手牌</div>}
            </div>
            
            <button 
              className={`btn ${isDeployReady && !isResolving ? 'engage' : ''}`} 
              onClick={submitDeployment} 
              disabled={!isDeployReady || isResolving}
              style={{ width: '100%' }}
            >
              {isResolving ? '決鬥進行中...' : (isDeployReady ? '🔥 決鬥！ 🔥' : `準備兵力 (${deployedCount}/3)...`)}
            </button>
          </div>
        )}
      </div>

      {/* ============ 中央 戰鬥舞台 ============ */}
      <div className="main-stage">
        {gameState === 'idle' && (
          <div style={{textAlign: 'center'}}>
            <h1 style={{ fontSize: '3.5rem', textShadow: '4px 4px 0 #000', margin: '0 0 20px 0' }}>
              氣勢連鎖奇偶戰<br/><span style={{fontSize: '1.5rem', color:'#aaa'}}>像素西洋棋</span>
            </h1>
            <button className="btn engage" onClick={startGame}>START BATTLE</button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="battlefield">
            {deployment.map((val, i) => {
              const b = battleLogs[i]; // 有值代表該格已經翻開
              const isClashing = resolveStep === i;
              const hasDealt = dealStep > i || resolveStep >= 0; // 卡片是否已經飛入戰場
              
              return (
                <div key={i} className="field-slot">
                  <div style={{ color: '#ccc', fontSize: '14px', textShadow: '1px 1px #000', letterSpacing: '2px' }}>
                    {TERRAIN_NAMES[i]}
                  </div>
                  
                  {/* 敵方陣地 */}
                  <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b 
                      ? renderCard(b.enemy_card, 'black', b.winner === 'enemy', b.winner === 'player', isClashing) 
                      : hasDealt 
                        ? <div className="card black-piece fly-in" style={{ borderColor: '#000', color: '#fff', fontSize: '40px' }}>?</div>
                        : <div className="card empty" style={{ borderColor: 'rgba(255,255,255,0.15)' }}></div>
                    }
                  </div>
                  
                  {/* 中央資訊與算式 */}
                  <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', height: '30px', alignItems: 'center' }}>
                    {!isClashing && <div style={{ fontSize: '24px', color: '#ffcc00', textShadow: '2px 2px 0 #000' }}>VS</div>}
                    
                    {b && isClashing && (
                      <div className="equation-tooltip">
                        <div className="typewriter type-1">
                          <span style={{color: '#4CAF50'}}>玩家 {b.player_card}</span> {b.player_eff > b.player_card && <span style={{color:'#ffcc00'}}>(+1 經驗加成)</span>} 
                          <span style={{margin: '0 5px'}}>vs</span> 
                          <span style={{color: '#ff4747'}}>對手 {b.enemy_card}</span> {b.enemy_eff > b.enemy_card && <span style={{color:'#ffcc00'}}>(+1 經驗加成)</span>}
                        </div>
                        <div className="typewriter type-2">
                          差值 {b.diff} × <span style={{color:'#00ffcc'}}>{b.weight} (場地加成)</span> = <span style={{color: '#ff4747', fontSize: '18px', fontWeight: 'bold'}}>{b.score}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 我方陣地 */}
                  <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleSlotClick(val, i)}>
                    {renderCard(val, 'white', b?.winner === 'player', b?.winner === 'enemy', isClashing)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ 右側/右上方 對手控制面板 ============ */}
      <div className="side-panel enemy-panel">
        {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
          <div className="hud-box enemy-hud" style={{ textAlign: 'right' }}>
            <div style={{fontWeight: 'bold', color: '#fff'}}>EVEN (對手)</div>
            <div className="hp-bar" style={{ justifyContent: 'flex-end' }}>{renderHearts(enemyHp)}</div>
          </div>
        )}
        
        {/* 電腦版才顯示的神祕手牌 */}
        {gameState === 'playing' && (
          <div className="enemy-hand-container">
            {Array.from({length: 3}).map((_, i) => {
              const hasFlashed = dealStep > i || resolveStep >= 0;
              return (
                <div key={i} className="card black-piece" style={{ opacity: hasFlashed ? 0 : 1, transition: 'opacity 0.2s', borderColor: '#000', color: '#666', fontSize: '32px' }}>
                  ?
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 遊戲結束與歷史覆盤 */}
      {gameState === 'game_over' && (
        <div className="overlay">
          {showHistory ? (
            <div style={{ background: '#222', padding: '20px', border: '4px solid #fff', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
              <h2 style={{ textAlign: 'center', color: '#ffcc00', marginTop: 0 }}>戰況歷史</h2>
              {history.map((h, i) => (
                <div key={i} style={{ borderBottom: '1px solid #444', padding: '10px 0' }}>
                  <div style={{ color: '#aaa', marginBottom: '5px' }}>Round {h.round}</div>
                  {h.battles.map((b: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '3px' }}>
                      <span style={{color: b.winner === 'player' ? '#4CAF50' : '#fff'}}>戰場 {b.battlefield}: {CHESS_PIECES[b.player_card]?.name}</span>
                      <span style={{color: '#ffcc00'}}>vs</span>
                      <span style={{color: b.winner === 'enemy' ? '#ff4747' : '#fff'}}>{CHESS_PIECES[b.enemy_card]?.name}</span>
                    </div>
                  ))}
                </div>
              ))}
              <button className="btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowHistory(false)}>返回</button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: '4rem', color: winner === 'player' ? '#4CAF50' : '#ff4747', textShadow: '4px 4px 0 #000' }}>
                {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </h1>
              <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn engage" onClick={startGame}>再來一局</button>
                <button className="btn" style={{ background: '#555' }} onClick={() => setShowHistory(true)}>戰況歷史</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
