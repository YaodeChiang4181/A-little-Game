import { useState } from 'react'
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
    } catch (e) {
      alert("無法連接伺服器，請確認 VITE_API_URL 環境變數與後端服務！");
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
      
      // 第一段：顯示敵方覆蓋牌翻牌與戰果
      setBattleLogs(data.battles);
      setHistory(prev => [...prev, { round: prev.length + 1, battles: data.battles }]);
      
      // 第二段：延遲顯示生命值變化與抖動 (Phase 2)
      setTimeout(() => {
        setEnemyHp(data.enemy_hp);
        setPlayerHp(data.player_hp);
        
        // 第三段：準備下一回合或進入結算畫面
        setTimeout(() => {
          if (data.game_over) {
            setWinner(data.winner);
            setGameState('game_over');
          } else {
            setDeployment([null, null, null]);
            setHand(data.next_player_hand);
            setBattleLogs([]);
          }
          setIsResolving(false);
        }, 2000); 
      }, 1500); 
      
    } catch (e) {
      alert("結算時發生錯誤！");
      setIsResolving(false);
    }
  };

  const renderCard = (val: number | null, color: 'white' | 'black') => {
    if (val === null) return <div className="card empty"></div>;
    const piece = CHESS_PIECES[val];
    return (
      <div className={`card ${color}-piece`}>
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

  return (
    <div className="game-container">
      {/* HUD 資訊區 (左上與右上) */}
      {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
        <div className="hud">
          <div className="hud-player">
            <div style={{fontWeight: 'bold'}}>ODD (玩家)</div>
            <div className="hp-bar">{renderHearts(playerHp)}</div>
          </div>
          <div className="hud-enemy">
            <div style={{fontWeight: 'bold'}}>EVEN (對手)</div>
            <div className="hp-bar" style={{ justifyContent: 'flex-end' }}>{renderHearts(enemyHp)}</div>
          </div>
        </div>
      )}

      {/* 待機頁面 */}
      {gameState === 'idle' && (
        <div className="main-stage">
          <h1 style={{ fontSize: '2.5rem', textAlign: 'center', textShadow: '2px 2px 0 #000', margin: '0 0 20px 0' }}>
            氣勢連鎖奇偶戰<br/>
            <span style={{fontSize: '1.2rem', color:'#aaa'}}>像素西洋棋</span>
          </h1>
          <button className="btn engage" onClick={startGame}>START BATTLE</button>
        </div>
      )}

      {/* 遊玩主戰場 */}
      {gameState === 'playing' && (
        <div className="main-stage">
          <div className="battlefield">
            {deployment.map((val, i) => (
              <div key={i} className="field-slot">
                {/* 敵方陣地 */}
                {battleLogs.length > 0 
                  ? renderCard(battleLogs[i].enemy_card, 'black') 
                  : <div className="card empty" style={{ backgroundColor: '#111', borderColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>?</div>
                }
                
                <div style={{ fontSize: '20px', color: '#ffcc00', textShadow: '1px 1px 0 #000' }}>VS</div>
                
                {/* 我方陣地 */}
                <div onClick={() => handleSlotClick(val, i)}>
                  {renderCard(val, 'white')}
                </div>
              </div>
            ))}
          </div>

          <div className="hand-container" style={{ opacity: isResolving ? 0.5 : 1, pointerEvents: isResolving ? 'none' : 'auto' }}>
            {hand.map((card, i) => (
              <div key={i} onClick={() => handleCardClick(card, i)}>
                {renderCard(card, 'white')}
              </div>
            ))}
            {hand.length === 0 && <div style={{width: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '12px'}}>空手牌</div>}
          </div>

          <button 
            className={`btn ${isDeployReady && !isResolving ? 'engage' : ''}`} 
            onClick={submitDeployment} 
            disabled={!isDeployReady || isResolving}
          >
            {isResolving ? '結算動畫中...' : (isDeployReady ? '🔥 ENGAGE BATTLE 🔥' : `Deploying (${deployedCount}/3)...`)}
          </button>
        </div>
      )}

      {/* 結算與歷史頁面遮罩 */}
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
              <button className="btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowHistory(false)}>返回結算</button>
            </div>
          ) : (
            <>
              <h1 className={winner === 'player' ? 'shake' : ''} style={{ fontSize: '4rem', color: winner === 'player' ? '#4CAF50' : '#ff4747', textShadow: '4px 4px 0 #000', textAlign: 'center' }}>
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
