import { useState, useEffect } from 'react';
import './index.css';
import { Character, SingleBattleRecord, RoundResolutionResult } from './game/types';
import { initGameSession, resolveTurn, GameSession } from './game/gameService';
import { CardView } from './components/CardView';
import { TerrainBanner } from './components/TerrainBanner';
import { CompendiumModal } from './components/CompendiumModal';
import { PixelHeart, PixelPieceIcon } from './components/PixelIcons';

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

  // 16x16 點陣像素心之容器
  const renderHearts = (hp: number) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} style={{ display: 'inline-flex', marginRight: '4px' }}>
        <PixelHeart filled={i < hp} size={18} />
      </span>
    ));
  };

  const deployedCount = deployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const currentTerrains = session?.currentTerrains || [];

  // 專業像素風格無 Emoji 教學頁面
  const TUTORIAL_PAGES = [
    {
      title: "[ 奇偶博弈與陣營輪替 ]",
      text: "雙方陣營分為 [ ODD 奇數 ] 與 [ EVEN 偶數 ]，每局自動換邊！\n所有戰場的 (等級差值 × 戰場倍率) 加總為【全場總積分】。\n總積分為奇數則 ODD 攻擊，偶數則 EVEN 攻擊！率先扣光敵方 3 點生命值者勝出。",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', background: 'rgba(15,23,42,0.8)', padding: '12px', border: '2px solid #334155', borderRadius: '4px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>ROUND 1:</span> <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>玩家 [ ODD ]</span> <span>VS</span> <span style={{ color: '#ff4747', fontWeight: 'bold' }}>對手 [ EVEN ]</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>ROUND 2:</span> <span style={{ color: '#ff4747', fontWeight: 'bold' }}>玩家 [ EVEN ]</span> <span>VS</span> <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>對手 [ ODD ]</span>
          </div>
        </div>
      )
    },
    {
      title: "[ 手牌管理：4 抽選 3 佈署 ]",
      text: "每回合發放 4 位兵力手牌！\n從中精選 3 張佈署至三大戰場，剩餘 1 張作為備用。\n24 種出牌組合，讓您精確計算奇偶總分走向與環境相剋。",
      graphic: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '12px', width: '100%' }}>
          <div style={{ padding: '8px 12px', border: '2px solid #fff', borderRadius: '2px', background: '#0f172a' }}>小兵 LV.1</div>
          <div style={{ padding: '8px 12px', border: '2px solid #fff', borderRadius: '2px', background: '#0f172a' }}>騎士 LV.2</div>
          <div style={{ padding: '8px 12px', border: '2px solid #fff', borderRadius: '2px', background: '#0f172a' }}>主塔 LV.3</div>
          <div style={{ padding: '8px 12px', border: '2px dashed #f59e0b', borderRadius: '2px', background: '#1e293b', color: '#f59e0b' }}>國王 LV.6 [備用]</div>
        </div>
      )
    },
    {
      title: "[ 角色專屬特性 ]",
      text: "每顆棋子皆身懷戰術特性：\n【逆襲】小兵：面對 LV.4~6 強敵時直接勝出！\n【堅守】主塔：戰敗時差值強制鎖定為 1，控分止損！\n【破陣】騎士：斬斷敵方氣勢；【威壓】皇后：勝出時氣勢躍升 +2！",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', background: 'rgba(15,23,42,0.8)', padding: '10px', border: '2px solid #334155', borderRadius: '4px', width: '100%' }}>
          <div style={{ color: '#00ffcc', fontWeight: 'bold' }}>
            [ 逆襲 REVERSAL ] 小兵 LV.1 vs 皇后 LV.5 -{'>'} 小兵逆襲勝出！
          </div>
        </div>
      )
    },
    {
      title: "[ 動態戰場環境 ]",
      text: "三大戰場每回合隨機輪換，帶來不同的戰略規則：\n[ 沼澤 ]：泥沼阻滯，氣勢加成無效。\n[ 擂台 ]：勝者氣勢加乘翻倍 (+2)。\n[ 皇宮 ]：高階棋子戰力 +1；[ 鏡像 ]：總分保底偶數！",
      graphic: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '12px', width: '100%' }}>
          <div style={{ flex: 1, padding: '8px 0', border: '2px dashed #2e7d32', backgroundColor: 'rgba(46,125,50,0.3)', borderRadius: '2px' }}>沼澤<br /><span style={{ color: '#ffcc00' }}>x1</span></div>
          <div style={{ flex: 1, padding: '8px 0', border: '2px dashed #d32f2f', backgroundColor: 'rgba(211,47,47,0.3)', borderRadius: '2px' }}>擂台<br /><span style={{ color: '#ffcc00' }}>x2</span></div>
          <div style={{ flex: 1, padding: '8px 0', border: '2px dashed #f57c00', backgroundColor: 'rgba(245,124,0,0.3)', borderRadius: '2px' }}>皇宮<br /><span style={{ color: '#ffcc00' }}>x3</span></div>
        </div>
      )
    }
  ];

  return (
    <div className="game-wrapper">
      {/* 頂部圖鑑百科按鈕 */}
      <button className="compendium-btn" onClick={() => setShowCompendium(true)}>
        [ 圖鑑 ]
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
                style={{ background: '#0284c7' }}
                onClick={() => {
                  setShowMenu(false);
                  setShowCompendium(true);
                }}
              >
                角色與戰場圖鑑
              </button>
              <button
                className="btn"
                style={{ background: '#dc2626' }}
                onClick={() => {
                  setShowMenu(false);
                  setGameState('idle');
                }}
              >
                返回主選單
              </button>
              <button className="btn" style={{ background: '#475569' }} onClick={() => setShowMenu(false)}>
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
              <h2 style={{ color: '#00ffcc', margin: '0 0 15px 0', fontSize: '18px', letterSpacing: '1px' }}>
                {TUTORIAL_PAGES[tutorialStep].title}
              </h2>
              <div style={{ whiteSpace: 'pre-line', fontSize: '14px', marginBottom: '20px', color: '#cbd5e1' }}>
                {TUTORIAL_PAGES[tutorialStep].text}
              </div>
              {TUTORIAL_PAGES[tutorialStep].graphic}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                className="btn"
                style={{ padding: '8px 15px', fontSize: '14px', background: '#475569' }}
                onClick={() => (tutorialStep > 0 ? setTutorialStep(prev => prev - 1) : setShowTutorial(false))}
              >
                {tutorialStep > 0 ? '← 上一頁' : '關閉'}
              </button>
              <button
                className="btn"
                style={{ padding: '8px 15px', fontSize: '14px' }}
                onClick={() => (tutorialStep < 3 ? setTutorialStep(prev => prev + 1) : setShowTutorial(false))}
              >
                {tutorialStep < 3 ? '下一頁 →' : '開始決鬥'}
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
            <div style={{ fontWeight: 'bold', color: '#00ffcc', letterSpacing: '1px' }}>
              [ {session?.playerRole} ] 玩家
            </div>
            <div className="hp-bar">{renderHearts(displayPlayerHp)}</div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="hand-section">
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginBottom: '2px', fontFamily: 'monospace' }}>
              {isDeployReady ? '[ 戰備完畢 ] 點擊槽位可撤回更換' : '[ 佈署階段 ] 選擇 3 位棋子進戰場'}
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
                <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
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
                ? '決鬥交鋒中...'
                : isDeployReady
                ? '出征決鬥！'
                : `佈署兵力 (${deployedCount}/3)`}
            </button>
          </div>
        )}
      </div>

      {/* ============ 中央 戰鬥舞台 ============ */}
      <div className="main-stage">
        {gameState === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3.2rem', textShadow: '4px 4px 0 #000', margin: '0 0 10px 0', letterSpacing: '2px' }}>
              氣勢連鎖<br />
              <span style={{ fontSize: '1.5rem', color: '#00ffcc' }}>奇偶戰 · 點陣西洋棋</span>
            </h1>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '30px', letterSpacing: '1px' }}>
              [ 4選3手牌管理 · 角色專屬特性 · 動態環境戰場 ]
            </div>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button className="btn" style={{ background: '#0f766e' }} onClick={() => startGame(true)}>
                新手指南
              </button>
              <button className="btn" style={{ background: '#dc2626' }} onClick={() => startGame(false)}>
                立即開戰
              </button>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {/* 本局登場角色列表 (零 Emoji，純像素圖示) */}
            <div className="deck-info-box">
              <span className="deck-info-title">[ 對陣名冊 ]</span>
              {session?.roundPool.map(char => (
                <span key={char.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <PixelPieceIcon type={char.avatar.src || char.id} color="white" size={16} />
                  <span style={{ fontSize: '11px', letterSpacing: '0.5px' }}>{char.name}</span>
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
                  icon: 'arena',
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
                          style={{ borderColor: '#000', color: '#fff', fontSize: '32px', fontFamily: 'monospace' }}
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
                        <div style={{ fontSize: '20px', color: '#ffcc00', textShadow: '2px 2px 0 #000', letterSpacing: '2px' }}>
                          VS
                        </div>
                      )}

                      {/* 翻牌交鋒時的動態算式 Tooltip */}
                      {b && isClashing && (
                        <div className="equation-tooltip">
                          <div className="typewriter type-1">
                            <span style={{ color: '#00ffcc' }}>玩家 {b.player_char.name} ({b.player_eff})</span>
                            <span style={{ margin: '0 6px' }}>vs</span>
                            <span style={{ color: '#ff4747' }}>對手 {b.enemy_char.name} ({b.enemy_eff})</span>
                          </div>
                          <div className="typewriter type-2">
                            差值 {b.diff} × <span style={{ color: '#f59e0b' }}>x{b.weight} ({b.terrain.name})</span> ={' '}
                            <span style={{ color: '#ff4747', fontSize: '18px', fontWeight: 'bold' }}>
                              {b.score}
                            </span>
                          </div>

                          {/* 特性觸發街機標籤 */}
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
            <div style={{ fontWeight: 'bold', color: '#ff4747', letterSpacing: '1px' }}>
              [ {session?.enemyRole} ] 對手
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
                    color: '#64748b',
                    fontSize: '24px',
                    fontFamily: 'monospace'
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
                background: '#0f172a',
                padding: '20px',
                border: '4px solid #fff',
                width: '90%',
                maxWidth: '520px',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              <h2 style={{ textAlign: 'center', color: '#ffcc00', marginTop: 0, fontSize: '18px', letterSpacing: '1px' }}>
                [ 戰況歷史覆盤 HISTORY ]
              </h2>
              {history.map((h, i) => {
                return (
                  <div key={i} style={{ borderBottom: '1px solid #334155', padding: '14px 0' }}>
                    <div
                      style={{
                        color: '#94a3b8',
                        marginBottom: '8px',
                        fontSize: '13px',
                        borderBottom: '1px dashed #334155',
                        paddingBottom: '4px',
                        fontFamily: 'monospace'
                      }}
                    >
                      ROUND {h.round} - 玩家 [ {h.player_role} ] vs 對手 [ {h.enemy_role} ]
                    </div>
                    {h.battles.map((b: SingleBattleRecord, j: number) => (
                      <div
                        key={j}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          fontSize: '12px',
                          marginBottom: '6px',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '8px',
                          borderRadius: '2px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: b.winner === 'player' ? '#00ffcc' : '#fff', flex: 1 }}>
                            [{b.terrain.name}] {b.player_char.name} (LV.{b.player_eff})
                          </span>
                          <span style={{ color: '#ffcc00', fontSize: '11px', margin: '0 8px' }}>VS</span>
                          <span
                            style={{
                              color: b.winner === 'enemy' ? '#ff4747' : '#fff',
                              flex: 1,
                              textAlign: 'right'
                            }}
                          >
                            (LV.{b.enemy_eff}) {b.enemy_char.name}
                          </span>
                        </div>
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                          差值 {b.diff} × x{b.weight} ={' '}
                          <span style={{ color: '#ff4747', fontWeight: 'bold' }}>{b.score}</span> 分
                        </div>
                        {b.traits_triggered.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#ffcc00', textAlign: 'center', marginTop: '2px' }}>
                            {b.traits_triggered.map(t => t.text).join(' | ')}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '13px' }}>
                      全場總積分: <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '16px' }}>{h.total_score}</span>
                      <span style={{ color: '#64748b', marginLeft: '5px' }}>
                        ({h.total_score % 2 !== 0 ? '奇數' : '偶數'})
                      </span>
                      <br />
                      <span
                        style={{
                          color: h.damage_to === 'enemy' ? '#00ffcc' : '#ff4747',
                          fontSize: '13px',
                          display: 'inline-block',
                          marginTop: '4px',
                          fontWeight: 'bold'
                        }}
                      >
                        {h.damage_to === 'enemy' ? '[ 命中 HIT ] 對手受到 1 點傷害' : '[ 受創 DAMAGE ] 玩家受到 1 點傷害'}
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
                  fontSize: '3.6rem',
                  color: winner === 'player' ? '#00ffcc' : '#ff4747',
                  textShadow: '4px 4px 0 #000',
                  margin: '0 0 10px 0',
                  letterSpacing: '3px'
                }}
              >
                {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
              </h1>
              <div style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '15px' }}>
                {winner === 'player' ? '奇偶相生，智冠全場！' : '勝敗乃兵家常事，重整旗鼓再決一戰！'}
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn engage" onClick={() => startGame(false)}>
                  再次對決
                </button>
                <button className="btn" style={{ background: '#334155' }} onClick={() => setShowHistory(true)}>
                  戰況歷史
                </button>
                <button className="btn" style={{ background: '#1e293b' }} onClick={() => setGameState('idle')}>
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
