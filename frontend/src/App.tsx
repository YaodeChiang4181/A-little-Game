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

  const [playerRole, setPlayerRole] = useState("ODD");
  const [enemyRole, setEnemyRole] = useState("EVEN");

  const [hand, setHand] = useState<number[]>([]);
  const [deployment, setDeployment] = useState<(number | null)[]>([null, null, null]);
  const [battleLogs, setBattleLogs] = useState<any[]>([]);

  const [isResolving, setIsResolving] = useState(false);
  const [dealStep, setDealStep] = useState(-1); // 處理敵方飛牌動畫
  const [resolveStep, setResolveStep] = useState(-1); // 處理翻牌與結算動畫
  const [pendingResult, setPendingResult] = useState<any>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  const [showMenu, setShowMenu] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const startGame = async (isGuest: boolean = false) => {
    try {
      const res = await fetch(`${API_BASE}/game/start`, { method: 'POST' });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();

      setGameId(data.game_id);
      setPlayerHp(data.player_hp);
      setEnemyHp(data.enemy_hp);
      setHand(data.player_hand);
      setPlayerRole(data.player_role);
      setEnemyRole(data.enemy_role);
      setDeployment([null, null, null]);
      setGameState('playing');
      setBattleLogs([]);
      setHistory([]);
      setWinner(null);
      setShowHistory(false);
      setDealStep(-1);
      setResolveStep(-1);

      if (isGuest) {
        setShowTutorial(true);
        setTutorialStep(0);
      }
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
        setHistory(prev => [...prev, {
          round: prev.length + 1,
          battles: pendingResult.battles,
          total_score: pendingResult.total_score,
          damage_to: pendingResult.damage_to
        }]);

        setTimeout(() => {
          if (pendingResult.game_over) {
            setWinner(pendingResult.winner);
            setGameState('game_over');
          } else {
            setDeployment([null, null, null]);
            setHand(pendingResult.next_player_hand);
            setPlayerRole(pendingResult.player_role);
            setEnemyRole(pendingResult.enemy_role);
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

  const TUTORIAL_PAGES = [
    { 
      title: "～陣營輪替～", 
      text: "這是一個比拚奇偶數的策略遊戲。\n雙方陣營分為【ODD 奇數】與【EVEN 偶數】，每局會自動換邊！",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{color: '#aaa'}}>Round 1:</span> <span style={{ color: '#4CAF50' }}>玩家 (ODD)</span> <span>⚔️</span> <span style={{ color: '#ff4747' }}>對手 (EVEN)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{color: '#aaa'}}>Round 2:</span> <span style={{ color: '#4CAF50' }}>玩家 (EVEN)</span> <span>⚔️</span> <span style={{ color: '#ff4747' }}>對手 (ODD)</span>
          </div>
        </div>
      )
    },
    { 
      title: "～戰場權重～", 
      text: "每回合雙方抽出 3 張牌，請暗置於三大戰場：\n【沼澤】(x1) 【城鎮】(x2) 【皇宮】(x3)。",
      graphic: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '12px', width: '100%' }}>
          <div style={{ flex: 1, padding: '10px 0', border: '2px dashed #2d5c38', backgroundColor: 'rgba(26,51,32,0.8)', borderRadius: '4px' }}>沼澤<br/><span style={{color: '#ffcc00'}}>x1</span></div>
          <div style={{ flex: 1, padding: '10px 0', border: '2px dashed #704f38', backgroundColor: 'rgba(61,43,31,0.8)', borderRadius: '4px' }}>城鎮<br/><span style={{color: '#ffcc00'}}>x2</span></div>
          <div style={{ flex: 1, padding: '10px 0', border: '2px dashed #8c2a2a', backgroundColor: 'rgba(74,21,21,0.8)', borderRadius: '4px' }}>皇宮<br/><span style={{color: '#ffcc00'}}>x3</span></div>
        </div>
      )
    },
    { 
      title: "～氣勢連鎖～", 
      text: "戰場會計算雙方卡牌差值並乘上地形倍率。\n贏下戰鬥的卡牌，下一局還會獲得【+1 經驗加成】！",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '14px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#4CAF50' }}>Lv.4 <span style={{ color: '#ffcc00' }}>(+1)</span></span> <span style={{fontSize: '10px', color: '#888'}}>VS</span> <span style={{ color: '#ff4747' }}>Lv.3</span>
          </div>
          <div style={{ color: '#00ffcc', fontSize: '12px', marginTop: '8px' }}>
            玩家以 5 > 3 勝出，下局再獲加成！
          </div>
        </div>
      )
    },
    { 
      title: "～勝負結算～", 
      text: "三個戰場的總積分若為【奇數】，則 ODD 發動攻擊；若為【偶數】，則 EVEN 發動攻擊。\n率先扣完 3 滴血者敗！",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%' }}>
          <div>全場總積分: <span style={{ color: '#ffcc00', fontSize: '18px', fontWeight: 'bold' }}>15</span> <span style={{color: '#aaa', fontSize: '12px'}}>(奇數)</span></div>
          <div style={{ marginTop: '5px' }}>👉 <span style={{ color: '#ffcc00', fontWeight: 'bold', textShadow: '1px 1px #000' }}>ODD 陣營</span> 成功造成 1 點傷害！</div>
        </div>
      )
    }
  ];

  return (
    <div className="game-wrapper">

      {/* Menu 按鈕 */}
      {(gameState === 'playing' || gameState === 'idle') && !showTutorial && !showMenu && (
        <button className="help-btn" onClick={() => setShowMenu(true)} style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
          <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }}></div>
          <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }}></div>
          <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }}></div>
        </button>
      )}

      {/* Menu 彈窗遮罩 */}
      {showMenu && (
        <div className="tutorial-overlay" style={{ zIndex: 1000 }} onClick={() => setShowMenu(false)}>
          <div className="tutorial-box" style={{ minHeight: 'auto', width: '300px', padding: '30px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ textAlign: 'center', color: '#fff', marginTop: 0, marginBottom: '30px', textShadow: '2px 2px 0 #000' }}>MENU</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button className="btn" onClick={() => {
                setShowMenu(false);
                setShowTutorial(true);
                setTutorialStep(0);
              }}>玩法說明</button>
              
              <button className="btn" style={{ background: '#ff4747' }} onClick={() => {
                setShowMenu(false);
                setGameState('idle');
              }}>返回主畫面</button>
              
              <button className="btn" style={{ background: '#555' }} onClick={() => setShowMenu(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 新手教學遮罩 */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-box">
            <div className="tutorial-content" style={{ width: '100%' }}>
              <h2 style={{ color: '#00ffcc', margin: '0 0 15px 0', fontSize: '22px' }}>{TUTORIAL_PAGES[tutorialStep].title}</h2>
              <div style={{ whiteSpace: 'pre-line', fontSize: '15px', marginBottom: '20px', color: '#ddd' }}>{TUTORIAL_PAGES[tutorialStep].text}</div>
              {TUTORIAL_PAGES[tutorialStep].graphic}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button className="btn" style={{ padding: '10px', fontSize: '14px', background: '#555' }}
                onClick={() => tutorialStep > 0 ? setTutorialStep(prev => prev - 1) : setShowTutorial(false)}>
                {tutorialStep > 0 ? '← 上一頁' : '關閉'}
              </button>

              <button className="btn" style={{ padding: '10px', fontSize: '14px' }}
                onClick={() => tutorialStep < 3 ? setTutorialStep(prev => prev + 1) : setShowTutorial(false)}>
                {tutorialStep < 3 ? '下一頁 →' : '開始遊戲 !'}
              </button>
            </div>

            <div className="tutorial-dots">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`dot ${tutorialStep === i ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ 左側/下方 玩家控制面板 ============ */}
      <div className="side-panel player-panel">
        {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
          <div className="hud-box player-hud">
            <div style={{ fontWeight: 'bold', color: '#fff' }}>{playerRole} (玩家)</div>
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
              {hand.length === 0 && <div style={{ color: '#aaa', fontSize: '12px' }}>空手牌</div>}
            </div>

            <button
              className={`btn ${isDeployReady && !isResolving ? 'engage' : ''}`}
              onClick={submitDeployment}
              disabled={!isDeployReady || isResolving}
              style={{ width: '100%' }}
            >
              {isResolving ? '決鬥進行中...' : (isDeployReady ? '決鬥！' : `準備兵力 (${deployedCount}/3)...`)}
            </button>
          </div>
        )}
      </div>

      {/* ============ 中央 戰鬥舞台 ============ */}
      <div className="main-stage">
        {gameState === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3.5rem', textShadow: '4px 4px 0 #000', margin: '0 0 20px 0' }}>
              機關算盡<br /><span style={{ fontSize: '1.5rem', color: '#aaa' }}>像素西洋棋</span>
            </h1>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
              <button className="btn" style={{ background: '#4CAF50' }} onClick={() => startGame(true)}>訪客登入 (看教學)</button>
              <button className="btn" style={{ background: '#ff4747' }} onClick={() => startGame(false)}>老手登入 (直接戰)</button>
            </div>
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
                          <span style={{ color: '#4CAF50' }}>玩家 {b.player_card}</span> {b.player_eff > b.player_card && <span style={{ color: '#ffcc00' }}>(+1 經驗加成)</span>}
                          <span style={{ margin: '0 5px' }}>vs</span>
                          <span style={{ color: '#ff4747' }}>對手 {b.enemy_card}</span> {b.enemy_eff > b.enemy_card && <span style={{ color: '#ffcc00' }}>(+1 經驗加成)</span>}
                        </div>
                        <div className="typewriter type-2">
                          差值 {b.diff} × <span style={{ color: '#00ffcc' }}>{b.weight} (場地加成)</span> = <span style={{ color: '#ff4747', fontSize: '18px', fontWeight: 'bold' }}>{b.score}</span>
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
            <div style={{ fontWeight: 'bold', color: '#fff' }}>{enemyRole} (對手)</div>
            <div className="hp-bar" style={{ justifyContent: 'flex-end' }}>{renderHearts(enemyHp)}</div>
          </div>
        )}

        {/* 電腦版才顯示的神祕手牌 */}
        {gameState === 'playing' && (
          <div className="enemy-hand-container">
            {Array.from({ length: 3 }).map((_, i) => {
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
              {history.map((h, i) => {
                const isPlayerOdd = h.round % 2 !== 0;
                return (
                  <div key={i} style={{ borderBottom: '1px solid #444', padding: '15px 0' }}>
                    <div style={{ color: '#aaa', marginBottom: '10px', fontSize: '16px', borderBottom: '1px dashed #444', paddingBottom: '5px' }}>
                      Round {h.round} - 玩家({isPlayerOdd ? 'ODD' : 'EVEN'}) vs 對手({isPlayerOdd ? 'EVEN' : 'ODD'})
                    </div>
                    {h.battles.map((b: any, j: number) => (
                      <div key={j} style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', marginBottom: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: b.winner === 'player' ? '#4CAF50' : '#fff', flex: 1 }}>
                            {TERRAIN_NAMES[j]}: {CHESS_PIECES[b.player_card]?.name} (Lv.{b.player_eff})
                          </span>
                          <span style={{ color: '#ffcc00', fontSize: '11px', margin: '0 10px' }}>VS</span>
                          <span style={{ color: b.winner === 'enemy' ? '#ff4747' : '#fff', flex: 1, textAlign: 'right' }}>
                            (Lv.{b.enemy_eff}) {CHESS_PIECES[b.enemy_card]?.name}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center', color: '#00ffcc', fontSize: '12px', marginTop: '6px' }}>
                          差值 {b.diff} × {b.weight} (場地加成) = <span style={{ color: '#ff4747', fontWeight: 'bold' }}>{b.score}</span> 分
                        </div>
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '15px' }}>
                      總積分: <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '18px' }}>{h.total_score}</span>
                      <span style={{ color: '#888', marginLeft: '5px' }}>({h.total_score % 2 !== 0 ? '奇數' : '偶數'})</span>
                      <br />
                      <span style={{ color: h.damage_to === 'enemy' ? '#4CAF50' : '#ff4747', fontSize: '14px', display: 'inline-block', marginTop: '5px' }}>
                        {h.damage_to === 'enemy' ? '💥 對手受到 1 點傷害' : '💥 玩家受到 1 點傷害'}
                      </span>
                    </div>
                  </div>
                )
              })}
              <button className="btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowHistory(false)}>返回</button>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: '4rem', color: winner === 'player' ? '#4CAF50' : '#ff4747', textShadow: '4px 4px 0 #000' }}>
                {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </h1>
              <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn engage" onClick={() => startGame(false)}>再來一局</button>
                <button className="btn" style={{ background: '#555' }} onClick={() => setShowHistory(true)}>戰況歷史</button>
                <button className="btn" style={{ background: '#333' }} onClick={() => setGameState('idle')}>主選單</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
