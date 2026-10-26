import { useState, useEffect } from 'react';
import './index.css';
import { Character, SingleBattleRecord, RoundResolutionResult } from './game/types';
import { initGameSession, resolveTurn, GameSession } from './game/gameService';
import { CardView } from './components/CardView';
import { TerrainBanner } from './components/TerrainBanner';
import { CompendiumModal } from './components/CompendiumModal';

export default function App() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'game_over'>('idle');
  const [session, setSession] = useState<GameSession | null>(null);

  // 當前手牌（4選3：手上持有牌庫抽出的卡牌）
  const [hand, setHand] = useState<Character[]>([]);
  // 當前戰場 3 槽位的佈署
  const [deployment, setDeployment] = useState<(Character | null)[]>([null, null, null]);

  // 動畫與結算狀態
  const [isResolving, setIsResolving] = useState(false);
  const [dealStep, setDealStep] = useState(-1);       // 敵方飛牌動畫 (0, 1, 2, 3)
  const [resolveStep, setResolveStep] = useState(-1); // 逐格翻牌與結算動畫 (0, 1, 2, 3)
  const [pendingResult, setPendingResult] = useState<RoundResolutionResult | null>(null);
  const [battleLogs, setBattleLogs] = useState<SingleBattleRecord[]>([]);

  // 歷史戰況紀錄
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 模態彈窗控制
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showCompendium, setShowCompendium] = useState(false);

  // 勝負與血量展示（基於 session 或過渡狀態）
  const [displayPlayerHp, setDisplayPlayerHp] = useState(3);
  const [displayEnemyHp, setDisplayEnemyHp] = useState(3);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);

  /**
   * 啟動全新對局（純客戶端秒開，無伺服器延遲）
   */
  const startGame = (showHelp: boolean = false) => {
    const newSession = initGameSession();
    setSession(newSession);
    setHand(newSession.playerHand);
    setDeployment([null, null, null]);
    setDisplayPlayerHp(newSession.playerHp);
    setDisplayEnemyHp(newSession.enemyHp);
    setGameState('playing');
    setBattleLogs([]);
    setHistory([]);
    setWinner(null);
    setShowHistory(false);
    setDealStep(-1);
    setResolveStep(-1);
    setPendingResult(null);
    setIsResolving(false);

    if (showHelp) {
      setShowTutorial(true);
      setTutorialStep(0);
    }
  };

  /**
   * 點選手牌：佈署進第一個空的戰場槽位
   */
  const handleCardClick = (card: Character, index: number) => {
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

  /**
   * 點選戰場槽位：撤回卡牌至手牌區
   */
  const handleSlotClick = (card: Character | null, index: number) => {
    if (isResolving || card === null) return;
    setHand(prev => [...prev, card]);
    const newDeployment = [...deployment];
    newDeployment[index] = null;
    setDeployment(newDeployment);
  };

  /**
   * 提交佈署並觸發對決
   */
  const submitDeployment = () => {
    const deployedCount = deployment.filter(c => c !== null).length;
    if (deployedCount < 3 || !session || isResolving) return;

    setIsResolving(true);

    // 本地純前端引擎即時結算（0ms 延遲，包含特性鉤子與 AI 24 種模擬）
    const { result, nextSession } = resolveTurn(
      session,
      deployment as Character[]
    );

    setPendingResult(result);
    setBattleLogs([]);

    // 更新下一回合 session 暫存
    if (nextSession) {
      setSession(nextSession);
    }

    // 啟動動畫序列：敵方卡片依序飛入戰場
    setDealStep(0);
  };

  // 第一階段動畫：敵方卡片依序飛入戰場
  useEffect(() => {
    if (dealStep >= 0 && dealStep < 3) {
      const timer = setTimeout(() => {
        setDealStep(prev => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    } else if (dealStep === 3) {
      const timer = setTimeout(() => {
        setResolveStep(0); // 飛入完畢，進入翻牌結算階段
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [dealStep]);

  // 第二階段動畫：逐格翻牌、特效文字與算式展示
  useEffect(() => {
    if (resolveStep >= 0 && resolveStep < 3 && pendingResult) {
      const currentBattle = pendingResult.battles[resolveStep];
      setBattleLogs(prev => {
        const newLogs = [...prev];
        newLogs[resolveStep] = currentBattle;
        return newLogs;
      });

      const timer = setTimeout(() => {
        setResolveStep(prev => prev + 1);
      }, 3600); // 保留時間讓玩家觀賞打字機算式與特性觸發

      return () => clearTimeout(timer);
    } else if (resolveStep === 3 && pendingResult) {
      // 3 個戰場全部結算完畢，結算總傷害與更新血量
      const endTimer = setTimeout(() => {
        setDisplayPlayerHp(pendingResult.player_hp);
        setDisplayEnemyHp(pendingResult.enemy_hp);

        // 存入戰況歷史
        setHistory(prev => [
          ...prev,
          {
            round: prev.length + 1,
            battles: pendingResult.battles,
            total_score: pendingResult.total_score,
            damage_to: pendingResult.damage_to,
            player_role: session?.playerRole,
            enemy_role: session?.enemyRole
          }
        ]);

        const nextRoundTimer = setTimeout(() => {
          if (pendingResult.game_over) {
            setWinner(pendingResult.winner);
            setGameState('game_over');
          } else {
            // 自動過渡至下一回合
            setDeployment([null, null, null]);
            if (pendingResult.next_player_hand) {
              setHand(pendingResult.next_player_hand);
            }
          }

          setDealStep(-1);
          setResolveStep(-1);
          setIsResolving(false);
          setPendingResult(null);
          setBattleLogs([]);
        }, 1600);

        return () => clearTimeout(nextRoundTimer);
      }, 600);

      return () => clearTimeout(endTimer);
    }
  }, [resolveStep, pendingResult]);

  const renderHearts = (hp: number) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} className="heart" style={{ opacity: i < hp ? 1 : 0.2 }}>
        ❤
      </span>
    ));
  };

  const deployedCount = deployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const currentTerrains = session?.currentTerrains || [];

  // 升級版遊戲教學頁面（涵蓋 4選3、角色特性與動態戰場）
  const TUTORIAL_PAGES = [
    {
      title: "～奇偶博弈與陣營輪替～",
      text: "雙方陣營分為【ODD 奇數】與【EVEN 偶數】，每局會自動換邊！\n所有戰場的（等級差值 × 戰場倍率）加總為【總積分】。\n總積分為奇數則 ODD 攻擊，為偶數則 EVEN 攻擊！率先將對手扣至 0 血者獲勝。",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#aaa' }}>Round 1:</span> <span style={{ color: '#4CAF50' }}>玩家 (ODD)</span> <span>vs</span> <span style={{ color: '#ff4747' }}>對手 (EVEN)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#aaa' }}>Round 2:</span> <span style={{ color: '#4CAF50' }}>玩家 (EVEN)</span> <span>vs</span> <span style={{ color: '#ff4747' }}>對手 (ODD)</span>
          </div>
        </div>
      )
    },
    {
      title: "～手牌管理：4 選 3 佈署～",
      text: "每回合系統會發放 4 張角色手牌！\n您需要從中精選 3 張佈署於三大戰場，剩餘的 1 張將留在手牌作為備用。\n多達 24 種出牌組合，讓您自由掌控奇偶走向與陣容搭配。",
      graphic: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '12px', width: '100%' }}>
          <div style={{ padding: '8px', border: '2px solid #fff', borderRadius: '4px', background: '#333' }}>♟ 1</div>
          <div style={{ padding: '8px', border: '2px solid #fff', borderRadius: '4px', background: '#333' }}>♞ 2</div>
          <div style={{ padding: '8px', border: '2px solid #fff', borderRadius: '4px', background: '#333' }}>♜ 3</div>
          <div style={{ padding: '8px', border: '2px dashed #ffcc00', borderRadius: '4px', background: '#222', color: '#ffcc00' }}>♚ 6 (備用)</div>
        </div>
      )
    },
    {
      title: "～角色專屬特性～",
      text: "每個棋子皆身懷絕技：\n♟ 小兵【以弱勝強】：面對 Lv.4~6 強敵判定直接逆襲獲勝！\n♜ 主塔【堅壁防線】：戰敗時差值強制鎖定為 1，控分止損！\n♞ 騎士【奇襲破陣】：破除敵方氣勢；♛ 皇后【威壓】：勝者氣勢躍升 +2！",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', width: '100%' }}>
          <div style={{ color: '#00ffcc', fontWeight: 'bold' }}>
            💥 小兵 Lv.1 vs 皇后 Lv.5 ➔ 小兵發動【以弱勝強】獲勝！
          </div>
        </div>
      )
    },
    {
      title: "～動態戰場環境～",
      text: "三大戰場每回合隨機輪換，帶來不同的戰略規則：\n🌲 沼澤：泥沼阻滯，氣勢加成無效。\n⚔️ 擂台：勝者氣勢加乘翻倍 (+2)。\n🏛️ 皇宮：高階棋子戰力 +1；🪞 鏡像：總分保底偶數！",
      graphic: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '12px', width: '100%' }}>
          <div style={{ flex: 1, padding: '8px 0', border: '2px dashed #2e7d32', backgroundColor: 'rgba(46,125,50,0.3)', borderRadius: '4px' }}>🌲 沼澤<br /><span style={{ color: '#ffcc00' }}>x1</span></div>
          <div style={{ flex: 1, padding: '8px 0', border: '2px dashed #d32f2f', backgroundColor: 'rgba(211,47,47,0.3)', borderRadius: '4px' }}>⚔️ 擂台<br /><span style={{ color: '#ffcc00' }}>x2</span></div>
          <div style={{ flex: 1, padding: '8px 0', border: '2px dashed #f57c00', backgroundColor: 'rgba(245,124,0,0.3)', borderRadius: '4px' }}>🏛️ 皇宮<br /><span style={{ color: '#ffcc00' }}>x3</span></div>
        </div>
      )
    }
  ];

  return (
    <div className="game-wrapper">
      {/* 頂部圖鑑百科按鈕 */}
      <button className="compendium-btn" onClick={() => setShowCompendium(true)}>
        📖 圖鑑
      </button>

      {/* Menu 選單按鈕 */}
      {(gameState === 'playing' || gameState === 'idle') && !showTutorial && !showMenu && (
        <button
          className="help-btn"
          onClick={() => setShowMenu(true)}
          style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}
        >
          <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }} />
          <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }} />
          <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }} />
        </button>
      )}

      {/* Menu 選單彈窗 */}
      {showMenu && (
        <div className="tutorial-overlay" style={{ zIndex: 1000 }} onClick={() => setShowMenu(false)}>
          <div className="tutorial-box" style={{ minHeight: 'auto', width: '300px', padding: '30px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ textAlign: 'center', color: '#fff', marginTop: 0, marginBottom: '25px', textShadow: '2px 2px 0 #000' }}>
              MENU
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                className="btn"
                onClick={() => {
                  setShowMenu(false);
                  setShowTutorial(true);
                  setTutorialStep(0);
                }}
              >
                玩法說明
              </button>
              <button
                className="btn"
                style={{ background: '#2196F3' }}
                onClick={() => {
                  setShowMenu(false);
                  setShowCompendium(true);
                }}
              >
                角色與戰場圖鑑
              </button>
              <button
                className="btn"
                style={{ background: '#ff4747' }}
                onClick={() => {
                  setShowMenu(false);
                  setGameState('idle');
                }}
              >
                返回主選單
              </button>
              <button className="btn" style={{ background: '#555' }} onClick={() => setShowMenu(false)}>
                繼續遊戲
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 圖鑑百科模態彈窗 */}
      {showCompendium && <CompendiumModal onClose={() => setShowCompendium(false)} />}

      {/* 新手玩法教學彈窗 */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-box">
            <div className="tutorial-content" style={{ width: '100%' }}>
              <h2 style={{ color: '#00ffcc', margin: '0 0 15px 0', fontSize: '20px' }}>
                {TUTORIAL_PAGES[tutorialStep].title}
              </h2>
              <div style={{ whiteSpace: 'pre-line', fontSize: '14px', marginBottom: '20px', color: '#ddd' }}>
                {TUTORIAL_PAGES[tutorialStep].text}
              </div>
              {TUTORIAL_PAGES[tutorialStep].graphic}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                className="btn"
                style={{ padding: '8px 15px', fontSize: '14px', background: '#555' }}
                onClick={() => (tutorialStep > 0 ? setTutorialStep(prev => prev - 1) : setShowTutorial(false))}
              >
                {tutorialStep > 0 ? '← 上一頁' : '關閉'}
              </button>
              <button
                className="btn"
                style={{ padding: '8px 15px', fontSize: '14px' }}
                onClick={() => (tutorialStep < 3 ? setTutorialStep(prev => prev + 1) : setShowTutorial(false))}
              >
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

      {/* ============ 玩家控制面板 (左側 / 手機下方) ============ */}
      <div className="side-panel player-panel">
        {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
          <div className="hud-box player-hud">
            <div style={{ fontWeight: 'bold', color: '#fff' }}>
              {session?.playerRole} (玩家)
            </div>
            <div className="hp-bar">{renderHearts(displayPlayerHp)}</div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="hand-section">
            <div style={{ fontSize: '12px', color: '#ffcc00', textAlign: 'center', marginBottom: '2px' }}>
              {isDeployReady ? '✦ 點擊戰場槽位可更換卡牌' : '✦ 點選 3 張角色佈署進戰場'}
            </div>

            {/* 4 張手牌展示區 */}
            <div
              className="hand-container"
              style={{
                opacity: isResolving ? 0.5 : 1,
                pointerEvents: isResolving ? 'none' : 'auto'
              }}
            >
              {hand.map((card, i) => {
                const isStandbyCard = isDeployReady;
                return (
                  <div key={card.id + i} onClick={() => handleCardClick(card, i)}>
                    <CardView
                      character={card}
                      color="white"
                      isUnselectedHand={isStandbyCard}
                    />
                  </div>
                );
              })}
              {hand.length === 0 && (
                <div style={{ color: '#aaa', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  手牌已全數佈署
                </div>
              )}
            </div>

            <button
              className={`btn ${isDeployReady && !isResolving ? 'engage' : ''}`}
              onClick={submitDeployment}
              disabled={!isDeployReady || isResolving}
              style={{ width: '100%' }}
            >
              {isResolving
                ? '決鬥進行中...'
                : isDeployReady
                ? '決鬥！'
                : `準備兵力 (${deployedCount}/3)...`}
            </button>
          </div>
        )}
      </div>

      {/* ============ 中央 戰鬥舞台 ============ */}
      <div className="main-stage">
        {gameState === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3.5rem', textShadow: '4px 4px 0 #000', margin: '0 0 10px 0' }}>
              氣勢連鎖<br />
              <span style={{ fontSize: '1.6rem', color: '#00ffcc' }}>奇偶戰 · 像素西洋棋</span>
            </h1>
            <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '30px' }}>
              4選3手牌管理 · 角色專屬特性 · 動態環境戰場
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="btn" style={{ background: '#4CAF50' }} onClick={() => startGame(true)}>
                新手指南 (玩法教學)
              </button>
              <button className="btn" style={{ background: '#ff4747' }} onClick={() => startGame(false)}>
                立即開戰
              </button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {/* 本局登場角色列表 */}
            <div className="deck-info-box">
              <span className="deck-info-title">本局對陣名單</span>
              {session?.roundPool.map(char => (
                <span key={char.id} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: '#fff' }}>{char.avatar.src}</span>
                  <span style={{ fontSize: '11px' }}>{char.name}</span>
                </span>
              ))}
            </div>

            {/* 三大動態戰場佈署區 */}
            <div className="battlefield">
              {deployment.map((playerChar, i) => {
                const b = battleLogs[i];
                const isClashing = resolveStep === i;
                const hasDealt = dealStep > i || resolveStep >= 0;
                const terrain = currentTerrains[i] || {
                  id: 'unknown',
                  name: `戰場 ${i + 1}`,
                  weight: i + 1,
                  icon: '⚔️',
                  color: '#555',
                  description: ''
                };

                return (
                  <div key={i} className="field-slot">
                    {/* 動態戰場環境橫幅 */}
                    <TerrainBanner terrain={terrain} index={i} />

                    {/* 敵方陣地 */}
                    <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {b ? (
                        <CardView
                          character={b.enemy_char}
                          color="black"
                          isWinner={b.winner === 'enemy'}
                          isLoser={b.winner === 'player'}
                          isClashing={isClashing}
                        />
                      ) : hasDealt ? (
                        <div
                          className="card black-piece fly-in"
                          style={{ borderColor: '#000', color: '#fff', fontSize: '38px' }}
                        >
                          ?
                        </div>
                      ) : (
                        <div className="card empty" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                      )}
                    </div>

                    {/* 中央算式推演與特性浮動標籤 */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '36px'
                      }}
                    >
                      {!isClashing && (
                        <div style={{ fontSize: '22px', color: '#ffcc00', textShadow: '2px 2px 0 #000' }}>
                          VS
                        </div>
                      )}

                      {/* 翻牌交鋒時的動態算式 Tooltip */}
                      {b && isClashing && (
                        <div className="equation-tooltip">
                          <div className="typewriter type-1">
                            <span style={{ color: '#4CAF50' }}>玩家 {b.player_char.name} ({b.player_eff})</span>
                            <span style={{ margin: '0 6px' }}>vs</span>
                            <span style={{ color: '#ff4747' }}>對手 {b.enemy_char.name} ({b.enemy_eff})</span>
                          </div>
                          <div className="typewriter type-2">
                            差值 {b.diff} × <span style={{ color: '#00ffcc' }}>x{b.weight} ({b.terrain.name})</span> ={' '}
                            <span style={{ color: '#ff4747', fontSize: '18px', fontWeight: 'bold' }}>
                              {b.score}
                            </span>
                          </div>

                          {/* 特性觸發標籤 */}
                          {b.traits_triggered.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                              {b.traits_triggered.map((t, idx) => (
                                <div key={idx} className="trait-popup-badge">
                                  {t.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 我方陣地 */}
                    <div
                      style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => handleSlotClick(playerChar, i)}
                    >
                      <CardView
                        character={playerChar}
                        color="white"
                        isWinner={b?.winner === 'player'}
                        isLoser={b?.winner === 'enemy'}
                        isClashing={isClashing}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ============ 對手控制面板 (右側 / 手機上方) ============ */}
      <div className="side-panel enemy-panel">
        {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
          <div className="hud-box enemy-hud">
            <div style={{ fontWeight: 'bold', color: '#fff' }}>
              {session?.enemyRole} (對手)
            </div>
            <div className="hp-bar" style={{ justifyContent: 'flex-end' }}>
              {renderHearts(displayEnemyHp)}
            </div>
          </div>
        )}

        {/* 電腦版顯示的神秘敵方手牌 (4 張) */}
        {gameState === 'playing' && (
          <div className="enemy-hand-container">
            {Array.from({ length: 4 }).map((_, i) => {
              const hasFlashed = dealStep > i || resolveStep >= 0;
              return (
                <div
                  key={i}
                  className="card black-piece"
                  style={{
                    opacity: hasFlashed ? 0.3 : 1,
                    transition: 'opacity 0.2s',
                    borderColor: '#000',
                    color: '#666',
                    fontSize: '28px'
                  }}
                >
                  ?
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ 遊戲結束與戰況歷史覆盤 ============ */}
      {gameState === 'game_over' && (
        <div className="overlay">
          {showHistory ? (
            <div
              style={{
                background: '#222',
                padding: '20px',
                border: '4px solid #fff',
                width: '90%',
                maxWidth: '520px',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              <h2 style={{ textAlign: 'center', color: '#ffcc00', marginTop: 0 }}>戰況歷史覆盤</h2>
              {history.map((h, i) => {
                return (
                  <div key={i} style={{ borderBottom: '1px solid #444', padding: '15px 0' }}>
                    <div
                      style={{
                        color: '#aaa',
                        marginBottom: '10px',
                        fontSize: '15px',
                        borderBottom: '1px dashed #444',
                        paddingBottom: '5px'
                      }}
                    >
                      Round {h.round} - 玩家({h.player_role}) vs 對手({h.enemy_role})
                    </div>
                    {h.battles.map((b: SingleBattleRecord, j: number) => (
                      <div
                        key={j}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          fontSize: '13px',
                          marginBottom: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px',
                          borderRadius: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: b.winner === 'player' ? '#4CAF50' : '#fff', flex: 1 }}>
                            {b.terrain.icon} {b.terrain.name}: {b.player_char.name} (Lv.{b.player_eff})
                          </span>
                          <span style={{ color: '#ffcc00', fontSize: '11px', margin: '0 8px' }}>VS</span>
                          <span
                            style={{
                              color: b.winner === 'enemy' ? '#ff4747' : '#fff',
                              flex: 1,
                              textAlign: 'right'
                            }}
                          >
                            (Lv.{b.enemy_eff}) {b.enemy_char.name}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center', color: '#00ffcc', fontSize: '12px', marginTop: '6px' }}>
                          差值 {b.diff} × x{b.weight} ({b.terrain.name}) ={' '}
                          <span style={{ color: '#ff4747', fontWeight: 'bold' }}>{b.score}</span> 分
                        </div>
                        {b.traits_triggered.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#ffcc00', textAlign: 'center', marginTop: '3px' }}>
                            {b.traits_triggered.map(t => t.text).join(' | ')}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '14px' }}>
                      總積分: <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '18px' }}>{h.total_score}</span>
                      <span style={{ color: '#888', marginLeft: '5px' }}>
                        ({h.total_score % 2 !== 0 ? '奇數' : '偶數'})
                      </span>
                      <br />
                      <span
                        style={{
                          color: h.damage_to === 'enemy' ? '#4CAF50' : '#ff4747',
                          fontSize: '14px',
                          display: 'inline-block',
                          marginTop: '4px'
                        }}
                      >
                        {h.damage_to === 'enemy' ? '💥 對手受到 1 點傷害' : '🩸 玩家受到 1 點傷害'}
                      </span>
                    </div>
                  </div>
                );
              })}
              <button className="btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowHistory(false)}>
                返回
              </button>
            </div>
          ) : (
            <>
              <h1
                style={{
                  fontSize: '4rem',
                  color: winner === 'player' ? '#4CAF50' : '#ff4747',
                  textShadow: '4px 4px 0 #000',
                  margin: '0 0 10px 0'
                }}
              >
                {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </h1>
              <div style={{ color: '#ccc', marginBottom: '30px', fontSize: '16px' }}>
                {winner === 'player' ? '恭喜您運籌帷幄，擊潰對手！' : '勝敗乃兵家常事，重整旗鼓再戰一局！'}
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn engage" onClick={() => startGame(false)}>
                  再來一局
                </button>
                <button className="btn" style={{ background: '#555' }} onClick={() => setShowHistory(true)}>
                  戰況歷史
                </button>
                <button className="btn" style={{ background: '#333' }} onClick={() => setGameState('idle')}>
                  主選單
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
