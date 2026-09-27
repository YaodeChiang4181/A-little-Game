import { useState } from 'react'

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
  
  // 目前手牌
  const [hand, setHand] = useState<number[]>([]);
  // 準備出戰的陣型 (3個戰場)
  const [deployment, setDeployment] = useState<(number | null)[]>([null, null, null]);
  
  // 戰報紀錄
  const [battleLogs, setBattleLogs] = useState<any[]>([]);

  const [gameId, setGameId] = useState<number | null>(null);
  
  // 透過環境變數取得 API 網址，本地端預設為 localhost:8000
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
    } catch (e) {
      alert("無法連接伺服器，請確認後端已部署完成！");
    }
  };

  // 點擊手牌，自動放到第一個空位
  const handleCardClick = (card: number, index: number) => {
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

  // 點擊戰場上的牌，退回手牌
  const handleSlotClick = (card: number | null, index: number) => {
    if (card !== null) {
      setHand([...hand, card]);
      const newDeployment = [...deployment];
      newDeployment[index] = null;
      setDeployment(newDeployment);
    }
  };

  const submitDeployment = async () => {
    if (deployment.includes(null) || gameId === null) return;
    
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
      
      setBattleLogs(data.battles);
      setEnemyHp(data.enemy_hp);
      setPlayerHp(data.player_hp);
      
      // 讓玩家看 3 秒的戰報結果
      setTimeout(() => {
        if (data.game_over) {
          alert(data.winner === 'player' ? "🎉 恭喜你，你贏了！" : "💀 你輸了！");
          setGameState('idle'); // 結束後回到首頁
        } else {
          setDeployment([null, null, null]);
          setHand(data.next_player_hand);
          setBattleLogs([]);
        }
      }, 3000);
    } catch (e) {
      alert("結算時發生錯誤！");
    }
  };

  const renderCard = (val: number | null, color: 'white' | 'black') => {
    if (val === null) return <div className="card empty"></div>;
    const piece = CHESS_PIECES[val];
    return (
      <div className={`card ${color}-piece`}>
        <div style={{ fontSize: '50px', marginBottom: '10px' }}>{piece.icon}</div>
        <div style={{ fontSize: '14px' }}>{piece.name}</div>
        <div style={{ fontSize: '12px', marginTop: '2px', color: color === 'white' ? '#888' : '#aaa' }}>Lv.{val}</div>
      </div>
    );
  };

  const renderHearts = (hp: number) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} className="heart" style={{ opacity: i < hp ? 1 : 0.2 }}>❤</span>
    ));
  };

  return (
    <div className="pixel-box" style={{ width: '800px' }}>
      <h1 className="text-center">氣勢連鎖奇偶戰 - 像素西洋棋</h1>
      
      {gameState === 'idle' && (
        <div className="text-center" style={{ margin: '80px 0' }}>
          <button className="btn" onClick={startGame}>START BATTLE</button>
        </div>
      )}

      {gameState === 'playing' && (
        <div>
          {/* 敵方狀態區 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>對手 (EVEN - 黑色)</h2>
            <div className="hp-bar">{renderHearts(enemyHp)}</div>
          </div>

          {/* 戰場區 */}
          <div className="battlefield">
            {deployment.map((val, i) => (
              <div key={i} className="field-slot">
                <span style={{ fontSize: '14px' }}>戰場 {i + 1}</span>
                
                {/* 敵方陣地 (尚未結算時隱藏) */}
                {battleLogs.length > 0 
                  ? renderCard(battleLogs[i].enemy_card, 'black') 
                  : <div className="card empty" style={{ backgroundColor: '#111', borderColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>?</div>
                }
                
                <div style={{ margin: '15px 0', fontSize: '24px', color: '#ffcc00' }}>VS</div>
                
                {/* 我方陣地 */}
                <div onClick={() => handleSlotClick(val, i)}>
                  {renderCard(val, 'white')}
                </div>
              </div>
            ))}
          </div>

          {/* 我方狀態區 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>玩家 (ODD - 白色)</h2>
            <div className="hp-bar">{renderHearts(playerHp)}</div>
          </div>

          {/* 手牌區 */}
          <div className="hand-container">
            {hand.map((card, i) => (
              <div key={i} onClick={() => handleCardClick(card, i)}>
                {renderCard(card, 'white')}
              </div>
            ))}
          </div>

          {/* 操作區 */}
          <div className="text-center" style={{ marginTop: '40px' }}>
            <button 
              className="btn" 
              onClick={submitDeployment} 
              disabled={deployment.includes(null) || battleLogs.length > 0}
            >
              {battleLogs.length > 0 ? '結算中...' : '確認出兵 (DEPLOY)'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
