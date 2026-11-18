import { useState, useEffect, useRef } from 'react';
import './index.css';
import { Card, Stance, SingleLaneRecord, RoundResolutionResult } from './game/types';
import { initGameSession, resolveTurn, GameSession } from './game/gameService';
import { calculateProjectedScore, MULTIPLIERS } from './game/engine';
import { CardView } from './components/CardView';
import { TerrainBanner } from './components/TerrainBanner';
import { CompendiumModal } from './components/CompendiumModal';
import { SettingsModal } from './components/SettingsModal';
import { TowerView } from './components/TowerView';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';
import { OnlineMatchView } from './components/OnlineMatchView';
import { PixelHeart, PixelCoinIcon } from './components/PixelIcons';
import { soundManager } from './game/soundManager';
import { createTowerRun, TowerRunState, getTowerHighScore } from './game/towerEngine';
import { ShopModal } from './components/ShopModal';
import { DeckBuilderModal } from './components/DeckBuilderModal';
import { getWallet, subscribeWallet, addGold, PlayerWallet } from './game/economy/wallet';

export default function App() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'game_over' | 'tower' | 'online_match'>('idle');
  const [session, setSession] = useState<GameSession | null>(null);
  const [towerState, setTowerState] = useState<TowerRunState | null>(null);
  const [highScore, setHighScore] = useState<number>(0);

  // 雲端連機狀態
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [onlineRoomCode, setOnlineRoomCode] = useState('');
  const [isOnlineHost, setIsOnlineHost] = useState(false);
  const [urlRoomCode, setUrlRoomCode] = useState('');

  // 初始化讀取本機最高刷塔分與 URL 房間參數
  useEffect(() => {
    setHighScore(getTowerHighScore());

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room') || params.get('join');
      if (room) {
        setUrlRoomCode(room.trim());
        setShowOnlineLobby(true);
      }
    }
  }, []);

  // 當前手牌（固定 3 張，必全出）
  const [hand, setHand] = useState<Card[]>([]);
  // 當前戰場 3 槽位的佈署 [Lane 0, Lane 1, Lane 2]
  const [deployment, setDeployment] = useState<(Card | null)[]>([null, null, null]);
  // 玩家戰術姿態宣告 (預設 ODD 蓄力充能)
  const [playerStance, setPlayerStance] = useState<Stance>('ODD');
  // 敵方已揭露之戰術姿態
  const [enemyRevealedStance, setEnemyRevealedStance] = useState<Stance | null>(null);

  // 連貫動效狀態 (L4 手牌起跳 ➔ L1 戰場砸入 ➔ L2 卡槽高光)
  const [liftingHandIndex, setLiftingHandIndex] = useState<number | null>(null);
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [recallingSlot, setRecallingSlot] = useState<number | null>(null);

  // 防快速連擊與定時器嚴謹管理
  const isDeployingRef = useRef(false);
  const deployTimerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);
  const recallTimerRef = useRef<number | null>(null);

  // 動畫與結算狀態
  const [isResolving, setIsResolving] = useState(false);
  const [dealStep, setDealStep] = useState(-1);       // 敵方出兵動畫 (0, 1, 2, 3)
  const [resolveStep, setResolveStep] = useState(-1); // 逐格翻牌與結算動畫 (0, 1, 2, 3)
  const [pendingResult, setPendingResult] = useState<RoundResolutionResult | null>(null);
  const [pendingNextSession, setPendingNextSession] = useState<GameSession | null>(null);
  const [laneLogs, setLaneLogs] = useState<SingleLaneRecord[]>([]);

  // 歷史戰況紀錄
  const [history, setHistory] = useState<RoundResolutionResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 模態彈窗控制
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showCompendium, setShowCompendium] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [allowCustomUpload, setAllowCustomUpload] = useState(false);
  const [inspectedLaneIndex, setInspectedLaneIndex] = useState<number | null>(null);

  // 永久錢包與結算金幣
  const [wallet, setWallet] = useState<PlayerWallet>(getWallet());
  const [earnedGold, setEarnedGold] = useState<{ amount: number; reason: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeWallet((newWallet) => {
      setWallet(newWallet);
    });
    return unsub;
  }, []);

  // 卸載時安全回收連貫動效定時器
  useEffect(() => {
    return () => {
      if (deployTimerRef.current) window.clearTimeout(deployTimerRef.current);
      if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current);
      if (recallTimerRef.current) window.clearTimeout(recallTimerRef.current);
    };
  }, []);

  const clearDeployTimers = () => {
    if (deployTimerRef.current) {
      window.clearTimeout(deployTimerRef.current);
      deployTimerRef.current = null;
    }
    if (dropTimerRef.current) {
      window.clearTimeout(dropTimerRef.current);
      dropTimerRef.current = null;
    }
    if (recallTimerRef.current) {
      window.clearTimeout(recallTimerRef.current);
      recallTimerRef.current = null;
    }
    isDeployingRef.current = false;
    setLiftingHandIndex(null);
    setAnimatingSlot(null);
    setRecallingSlot(null);
  };

  // 初次互動解鎖音訊上下文
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundManager.ensureContext().then(() => {
        soundManager.startBgm();
      });
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // 勝負與數值展示
  const [displayPlayerHp, setDisplayPlayerHp] = useState(3);
  const [displayEnemyHp, setDisplayEnemyHp] = useState(3);
  const [displayPlayerAtk, setDisplayPlayerAtk] = useState(1);
  const [displayEnemyAtk, setDisplayEnemyAtk] = useState(1);
  const [winner, setWinner] = useState<'player' | 'enemy' | 'draw' | null>(null);

  /**
   * 啟動全新對局 (三路奇偶戰術博弈)
   */
  const startNewGame = () => {
    soundManager.ensureContext();
    soundManager.playSfx('click');
    const newSession = initGameSession();
    setSession(newSession);
    setHand(newSession.playerHand);
    setDeployment([null, null, null]);
    setPlayerStance('ODD');
    setEnemyRevealedStance(null);
    setDisplayPlayerHp(3);
    setDisplayEnemyHp(3);
    setDisplayPlayerAtk(1);
    setDisplayEnemyAtk(1);
    setWinner(null);
    setHistory([]);
    setPendingResult(null);
    setLaneLogs([]);
    setIsResolving(false);
    setDealStep(-1);
    setResolveStep(-1);
    setEarnedGold(null);
    setGameState('playing');
  };

  /**
   * 點選手牌：指派至戰場空位
   */
  const handleHandCardClick = (card: Card, index: number) => {
    if (isResolving || isDeployingRef.current) return;
    const emptySlot = deployment.findIndex(s => s === null);
    if (emptySlot !== -1) {
      isDeployingRef.current = true;
      soundManager.ensureContext();

      setLiftingHandIndex(index);

      deployTimerRef.current = window.setTimeout(() => {
        const newDeployment = [...deployment];
        newDeployment[emptySlot] = card;
        setDeployment(newDeployment);

        const newHand = [...hand];
        newHand.splice(index, 1);
        setHand(newHand);

        setLiftingHandIndex(null);
        setAnimatingSlot(emptySlot);

        const count = newDeployment.filter(c => c !== null).length;
        if (count === 3) {
          soundManager.playSfx('deployReady');
        } else {
          soundManager.playSfx('cardDeploy');
        }

        dropTimerRef.current = window.setTimeout(() => {
          setAnimatingSlot(null);
          isDeployingRef.current = false;
          dropTimerRef.current = null;
        }, 200);

        deployTimerRef.current = null;
      }, 80);
    }
  };

  /**
   * 點選戰場槽位：撤回卡牌至手牌區
   */
  const handleSlotClick = (card: Card | null, index: number) => {
    if (isResolving || card === null || isDeployingRef.current) return;
    isDeployingRef.current = true;
    soundManager.ensureContext();
    soundManager.playSfx('cardRecall');

    setRecallingSlot(index);

    recallTimerRef.current = window.setTimeout(() => {
      setHand(prev => [...prev, card]);
      const newDeployment = [...deployment];
      newDeployment[index] = null;
      setDeployment(newDeployment);
      setRecallingSlot(null);
      isDeployingRef.current = false;
      recallTimerRef.current = null;
    }, 80);
  };

  /**
   * 提交佈署並觸發三路對決
   */
  const submitDeployment = () => {
    const deployedCount = deployment.filter(c => c !== null).length;
    if (deployedCount < 3 || !session || isResolving) return;

    clearDeployTimers();
    setInspectedLaneIndex(null);
    soundManager.ensureContext();
    soundManager.playSfx('startClash');
    setIsResolving(true);

    // 本地純前端引擎即時結算
    const { result, enemyStance, nextSession } = resolveTurn(
      session,
      deployment as Card[],
      playerStance
    );

    setPendingResult(result);
    setEnemyRevealedStance(enemyStance);
    setLaneLogs([]);
    setPendingNextSession(nextSession || null);

    // 啟動動畫序列：敵方 3 張卡依序就位
    setDealStep(0);
  };

  // 第一階段動畫：敵方卡片依序飛入就位
  useEffect(() => {
    if (dealStep >= 0 && dealStep < 3) {
      soundManager.playSfx('enemyDeal');
      const timer = setTimeout(() => {
        setDealStep(prev => prev + 1);
      }, 250);
      return () => clearTimeout(timer);
    } else if (dealStep === 3) {
      const timer = setTimeout(() => {
        setResolveStep(0); // 飛入完畢，進入逐路翻牌結算階段
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [dealStep]);

  // 第二階段動畫：逐路翻牌、特性結算、姿態執行
  useEffect(() => {
    if (resolveStep >= 0 && resolveStep < 3 && pendingResult) {
      const currentLane = pendingResult.lanes[resolveStep];
      soundManager.playSfx('cardReveal');

      if (currentLane.traitsTriggered && currentLane.traitsTriggered.length > 0) {
        setTimeout(() => {
          soundManager.playSfx('traitTrigger');
        }, 300);
      }

      setLaneLogs(prev => {
        const newLogs = [...prev];
        newLogs[resolveStep] = currentLane;
        return newLogs;
      });

      const timer = setTimeout(() => {
        setResolveStep(prev => prev + 1);
      }, 1800);

      return () => clearTimeout(timer);
    } else if (resolveStep === 3 && pendingResult) {
      // 三路結算完畢，執行 Phase 4 勝者姿態動作
      const endTimer = setTimeout(() => {
        // 更新數值
        setDisplayPlayerHp(pendingResult.playerHpAfter);
        setDisplayEnemyHp(pendingResult.enemyHpAfter);
        setDisplayPlayerAtk(pendingResult.playerAtkAfter);
        setDisplayEnemyAtk(pendingResult.enemyAtkAfter);

        if (pendingResult.winner === 'player') {
          if (pendingResult.playerStance === 'ODD') {
            soundManager.playSfx('victory'); // 蓄力音效
          } else {
            soundManager.playSfx('hitDamage'); // 突擊打擊音效
          }
        } else if (pendingResult.winner === 'enemy') {
          if (pendingResult.enemyStance === 'ODD') {
            soundManager.playSfx('traitTrigger');
          } else {
            soundManager.playSfx('hitDamage');
          }
        }

        // 存入戰況歷史
        setHistory(prev => [...prev, pendingResult]);

        const nextRoundTimer = setTimeout(() => {
          if (pendingResult.gameOver) {
            setWinner(pendingResult.gameWinner);
            setGameState('game_over');

            if (pendingResult.gameWinner === 'player') {
              soundManager.playSfx('victory');
              const baseGold = 60;
              const flawlessBonus = pendingResult.playerHpAfter === 3 ? 40 : 0;
              const totalAward = baseGold + flawlessBonus;
              const reason = flawlessBonus > 0 ? '完封大捷 (滿血無損)' : '單局交鋒勝利';
              addGold(totalAward, reason);
              setEarnedGold({ amount: totalAward, reason });
              setTimeout(() => soundManager.playSfx('coin'), 700);
            } else if (pendingResult.gameWinner === 'enemy') {
              soundManager.playSfx('defeat');
              const award = 20;
              addGold(award, '奮戰慰問軍餉');
              setEarnedGold({ amount: award, reason: '奮戰慰問軍餉' });
              setTimeout(() => soundManager.playSfx('coin'), 700);
            } else {
              soundManager.playSfx('click');
              const award = 30;
              addGold(award, '平局平分獎金');
              setEarnedGold({ amount: award, reason: '平局平分獎金' });
            }
          } else {
            // 過渡至下一回合
            if (pendingNextSession) {
              setSession(pendingNextSession);
              setHand(pendingNextSession.playerHand);
              setPendingNextSession(null);
            }
            setDeployment([null, null, null]);
            setEnemyRevealedStance(null);
          }

          setDealStep(-1);
          setResolveStep(-1);
          setIsResolving(false);
          setPendingResult(null);
          setLaneLogs([]);
        }, 2200);

        return () => clearTimeout(nextRoundTimer);
      }, 500);

      return () => clearTimeout(endTimer);
    }
  }, [resolveStep, pendingResult]);

  // 16x16 點陣像素心之容器
  const renderHearts = (hp: number, size: number = 18) => {
    return Array.from({ length: 3 }).map((_, i) => (
      <span key={i} style={{ display: 'inline-flex', marginRight: '3px' }}>
        <PixelHeart filled={i < hp} size={size} />
      </span>
    ));
  };

  const deployedCount = deployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const currentConstraint = session?.currentConstraint;

  // 即時預估己方戰力
  const projected = session && currentConstraint
    ? calculateProjectedScore(deployment, currentConstraint)
    : { total: 0, laneScores: [0, 0, 0], violations: [false, false, false] };

  // 專業像素風格無 Emoji 教學頁面
  const TUTORIAL_PAGES = [
    {
      title: "[ 三路奇偶博弈規格 ]",
      text: "每回合存在 3 個戰場：左翼 (×1)、中路核心 (×2 帶禁令)、右翼 (×1)！\n雙方每回合抽取 3 張手牌，必須全數分別指派至三路。\n總積分高者為本回合勝者，可執行宣告之戰術姿態！",
      graphic: (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '12px', width: '100%' }}>
          <div style={{ flex: 1, padding: '8px 4px', border: '2px solid #64748b', background: '#090d16', textAlign: 'center' }}>
            左翼<br /><span style={{ color: '#ffcc00' }}>×1</span>
          </div>
          <div style={{ flex: 1.2, padding: '8px 4px', border: '2px solid #fbbf24', background: '#18181b', textAlign: 'center' }}>
            中路核心<br /><span style={{ color: '#fbbf24', fontWeight: 'bold' }}>×2 禁令</span>
          </div>
          <div style={{ flex: 1, padding: '8px 4px', border: '2px solid #64748b', background: '#090d16', textAlign: 'center' }}>
            右翼<br /><span style={{ color: '#ffcc00' }}>×1</span>
          </div>
        </div>
      )
    },
    {
      title: "[ 戰術姿態宣告：ODD 與 EVEN ]",
      text: "每回合佈署卡牌時，雙方秘密宣告戰術姿態（盲選）：\n[ ODD · 蓄力充能 ]：本回合勝出時，自身 ATK +1（可跨回合無限累積）！\n[ EVEN · 鋒刃突擊 ]：本回合勝出時，對敵方造成等於當前 ATK 的直接傷害！命中後 ATK 重置回 01。",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', background: 'rgba(15,23,42,0.8)', padding: '10px', border: '2px solid #334155' }}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>[ ODD 姿態 ] 蓄力強化：ATK 1 ➔ 2 ➔ 3... 積蓄毀滅一擊</div>
          <div style={{ color: '#f87171', fontWeight: 'bold' }}>[ EVEN 姿態 ] 致命出鞘：重創敵軍生命，一擊即歸</div>
        </div>
      )
    },
    {
      title: "[ 中路戰場禁令與特性 ]",
      text: "中路 (Lane 1) 享有 ×2 關鍵倍率，但每回合受專屬禁令限制！\n若放入未符規格之卡牌（如奇數令放入偶數卡），該卡在中路戰力視為 0。\nLV.1~2 棋子身懷戰術特性，LV.3~4 則為正面抗衡之高戰力核心。",
      graphic: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#cbd5e1' }}>
          <div>• 【暗影斥候】(LV.1)：於邊翼 (L0/L2) 戰力 +1</div>
          <div>• 【核心刺客】(LV.2)：於中路 (L1) 符合禁令時戰力 +1</div>
          <div>• 【不屈鐵衛】(LV.2)：面對高階強敵時激發不屈 +1</div>
        </div>
      )
    },
    {
      title: "[ 勝利條件與同分仲裁 ]",
      text: "1. 擊殺勝利：任一方生命歸零立即獲勝！\n2. 回合上限：打滿 5 回合生命較高者獲勝。\n3. 平局仲裁：HP 相同比「第 5 回合總積分」；仍相同比「5 回合累積總積分」；全同則 Draw！",
      graphic: (
        <div style={{ padding: '8px', border: '1px dashed #fbbf24', background: '#090d16', fontSize: '12px', color: '#fbbf24', textAlign: 'center' }}>
          [ 5 回合定勝負 · 3 點生命 · 15 張對稱牌庫 ]
        </div>
      )
    }
  ];

  // 若當前處於【奇偶試煉 (刷塔模式)】
  if (gameState === 'tower' && towerState) {
    return (
      <TowerView
        initialState={towerState}
        onExit={() => {
          setGameState('idle');
          setHighScore(getTowerHighScore());
        }}
        onRestart={() => {
          const newTower = createTowerRun();
          setTowerState(newTower);
        }}
      />
    );
  }

  // 若當前處於【雲端連線對戰】
  if (gameState === 'online_match') {
    return (
      <OnlineMatchView
        roomCode={onlineRoomCode}
        isHost={isOnlineHost}
        onExit={() => {
          setGameState('idle');
        }}
      />
    );
  }

  return (
    <div className="game-wrapper">
      {/* 電腦版頂部圖鑑按鈕 */}
      <button
        className="compendium-btn desktop-only"
        onClick={() => {
          soundManager.playSfx('click');
          setShowCompendium(true);
        }}
      >
        [ 圖鑑 ]
      </button>

      {/* 電腦版右上角導覽控制區 */}
      <div className="desktop-top-right-nav desktop-only">
        <div
          className="gold-badge-chip"
          onClick={() => {
            soundManager.playSfx('click');
            setShowShop(true);
          }}
          title="點擊開啟軍需商城"
        >
          <PixelCoinIcon size={14} />
          <span>{wallet.gold.toLocaleString()} G</span>
        </div>

        {gameState === 'idle' && (
          <button
            className="settings-btn"
            onClick={() => {
              soundManager.playSfx('click');
              setShowSettings(true);
            }}
          >
            [ 設定 ]
          </button>
        )}

        {gameState === 'playing' && !showTutorial && !showMenu && (
          <button
            className="help-btn"
            onClick={() => {
              soundManager.playSfx('click');
              setShowMenu(true);
            }}
            style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}
          >
            <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }} />
            <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }} />
            <div style={{ width: '24px', height: '4px', background: '#fff', margin: '2px 0' }} />
          </button>
        )}
      </div>

      {/* 手機版頂部導覽列 */}
      <header className="mobile-header-bar mobile-only">
        <div className="mobile-nav-row">
          <button
            className="mobile-btn"
            onClick={() => {
              soundManager.playSfx('click');
              setShowCompendium(true);
            }}
          >
            [ 圖鑑 ]
          </button>

          {gameState === 'idle' ? (
            <div
              className="gold-badge-chip"
              style={{
                position: 'static',
                transform: 'none',
                fontSize: '11px',
                padding: '4px 10px',
                fontFamily: 'var(--font-pixel)',
                letterSpacing: '0.5px'
              }}
              onClick={() => {
                soundManager.playSfx('click');
                setShowShop(true);
              }}
            >
              <PixelCoinIcon size={12} />
              <span>{wallet.gold.toLocaleString()} G</span>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace', fontWeight: 'bold' }}>
              [ 回合 {session?.roundNumber || 1} / 5 ]
            </div>
          )}

          {gameState === 'idle' ? (
            <button
              className="mobile-btn"
              style={{ borderColor: '#00ffcc', color: '#00ffcc' }}
              onClick={() => {
                soundManager.playSfx('click');
                setShowSettings(true);
              }}
            >
              [ 設定 ]
            </button>
          ) : (
            <button
              className="mobile-btn menu-btn"
              onClick={() => {
                soundManager.playSfx('click');
                setShowMenu(true);
              }}
            >
              [ 選單 ]
            </button>
          )}
        </div>

        {/* 手機版 HUD */}
        {(gameState === 'playing' || gameState === 'game_over') && !showHistory && (
          <div className="mobile-huds-row">
            <div className="mobile-hud player">
              <span style={{ fontSize: '10px' }}>玩家 [ ⚔ {displayPlayerAtk} ]</span>
              <div className="hp-bar">{renderHearts(displayPlayerHp, 13)}</div>
            </div>
            <div className="mobile-hud-vs" style={{ fontSize: '11px' }}>VS</div>
            <div className="mobile-hud enemy">
              <span style={{ fontSize: '10px' }}>對手 [ ⚔ {displayEnemyAtk} ]</span>
              <div className="hp-bar">{renderHearts(displayEnemyHp, 13)}</div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 1. 遊戲開始畫面 (Idle State)                                              */}
      {/* ========================================================================= */}
      {gameState === 'idle' && (
        <div className="start-screen">
          <h1 className="title">[ 三路奇偶戰術博弈 ]</h1>
          <div className="subtitle">3-LANE PARITY TACTICAL CARD GAME · 專業像素版</div>

          <div className="mode-selection-grid">
            <button
              className="mode-btn mode-tutorial"
              onClick={() => {
                soundManager.playSfx('click');
                setTutorialStep(0);
                setShowTutorial(true);
              }}
            >
              <span className="mode-btn-title">[ 新手指南 ]</span>
              <span className="mode-btn-desc">三路規則與姿態博弈教學</span>
            </button>

            <button
              className="mode-btn mode-single"
              onClick={startNewGame}
            >
              <span className="mode-btn-title">[ 戰術對決 ]</span>
              <span className="mode-btn-desc">15張牌庫與智能AI對戰</span>
            </button>

            <button
              className="mode-btn mode-online"
              onClick={() => {
                soundManager.playSfx('click');
                setShowOnlineLobby(true);
              }}
            >
              <span className="mode-btn-title">[ 雲端連機 ]</span>
              <span className="mode-btn-desc">P2P 雙向暗牌端對端交鋒</span>
            </button>

            <button
              className="mode-btn mode-tower"
              onClick={() => {
                soundManager.playSfx('click');
                const newTower = createTowerRun();
                setTowerState(newTower);
                setGameState('tower');
              }}
            >
              <span className="mode-btn-title">[ 一命通關 ]</span>
              <span className="mode-btn-desc">五層試煉 · 最高分 {highScore.toLocaleString()}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 主戰鬥畫面 (Playing / Game Over State)                                 */}
      {/* ========================================================================= */}
      {(gameState === 'playing' || gameState === 'game_over') && (
        <div className="battle-layout">
          {/* 左側面板：玩家 HUD 與戰備手牌 */}
          <aside className="sidebar player-sidebar">
            <div className="hud player-hud">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#00ffcc', letterSpacing: '0.5px' }}>
                  [ 己方陣容 ]
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  牌庫: {session?.playerDeck.length || 0}張
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>生命:</span>
                <div className="hp-bar">{renderHearts(displayPlayerHp, 16)}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>攻勢威力:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    background: displayPlayerAtk > 1 ? '#854d0e' : '#1e293b',
                    color: displayPlayerAtk > 1 ? '#fef08a' : '#94a3b8',
                    border: `1px solid ${displayPlayerAtk > 1 ? '#eab308' : '#334155'}`
                  }}
                >
                  [ ⚔ {displayPlayerAtk.toString().padStart(2, '0')} {displayPlayerAtk > 1 ? '蓄力中' : ''} ]
                </span>
              </div>
            </div>

            {/* 戰術姿態選擇器 */}
            <div
              style={{
                background: '#090d16',
                border: '2px solid #334155',
                padding: '8px',
                marginBottom: '10px'
              }}
            >
              <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>
                [ 戰術姿態宣告 (盲選) ]
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => {
                    soundManager.playSfx('click');
                    setPlayerStance('ODD');
                  }}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '11px',
                    cursor: isResolving ? 'not-allowed' : 'pointer',
                    background: playerStance === 'ODD' ? '#854d0e' : '#18181b',
                    color: playerStance === 'ODD' ? '#fef08a' : '#94a3b8',
                    border: `2px solid ${playerStance === 'ODD' ? '#eab308' : '#27272a'}`
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{playerStance === 'ODD' ? '▶ ' : '  '}[ ODD · 蓄力充能 ]</div>
                  <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                    勝出時 ATK +1 (可達 {displayPlayerAtk + 1})
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() => {
                    soundManager.playSfx('click');
                    setPlayerStance('EVEN');
                  }}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '11px',
                    cursor: isResolving ? 'not-allowed' : 'pointer',
                    background: playerStance === 'EVEN' ? '#7f1d1d' : '#18181b',
                    color: playerStance === 'EVEN' ? '#fecaca' : '#94a3b8',
                    border: `2px solid ${playerStance === 'EVEN' ? '#ef4444' : '#27272a'}`
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{playerStance === 'EVEN' ? '▶ ' : '  '}[ EVEN · 鋒刃突擊 ]</div>
                  <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                    勝出時造成 {displayPlayerAtk} 點打擊 (命中後歸1)
                  </div>
                </button>
              </div>
            </div>

            {/* 本回合戰備手牌 (固定 3 張，必全出) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>本回合戰備手牌:</span>
                <span style={{ fontSize: '10px', color: '#00ffcc', fontFamily: 'monospace' }}>
                  {hand.length === 0 ? '[ 已全部就位 ]' : `剩餘 ${hand.length} 張`}
                </span>
              </div>

              <div className="hand-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {hand.map((card, idx) => (
                  <CardView
                    key={card.id}
                    character={card}
                    color="white"
                    isLiftingOff={liftingHandIndex === idx}
                    onClick={() => handleHandCardClick(card, idx)}
                  />
                ))}
              </div>
            </div>

            {/* 即時預估戰力與出征按鈕 */}
            <div style={{ marginTop: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#0f172a',
                  padding: '6px 8px',
                  border: '1px solid #334155',
                  marginBottom: '8px',
                  fontSize: '11px'
                }}
              >
                <span style={{ color: '#94a3b8' }}>預估己方戰力:</span>
                <span style={{ color: '#fbbf24', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13px' }}>
                  {projected.total} PTS
                </span>
              </div>

              <button
                className={`btn deploy-btn ${isDeployReady && !isResolving ? 'ready' : ''}`}
                disabled={!isDeployReady || isResolving}
                onClick={submitDeployment}
                style={{ width: '100%', padding: '10px', fontSize: '13px' }}
              >
                {isResolving ? '交鋒演繹中...' : isDeployReady ? '[ 鎖定出征決鬥！ ]' : `請配置剩餘手牌 (${3 - deployedCount})`}
              </button>
            </div>
          </aside>

          {/* 中央主戰場 (三路架構) */}
          <main className="battleground">
            {/* 頂部中路禁令戰術情報橫條 */}
            <div
              className="terrain-stage-intel-bar"
              style={{
                borderColor: currentConstraint ? currentConstraint.color : '#fbbf24',
                marginBottom: '10px',
                padding: '6px 12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '11px' }}>
                  [ 回合 {session?.roundNumber || 1} / 5 ]
                </span>
                <span style={{ color: currentConstraint?.color || '#fff', fontWeight: 'bold', fontSize: '12px' }}>
                  中路禁令：{currentConstraint?.name || '無禁令'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                  中路戰力享受 ×2 倍率
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '2px', textAlign: 'center' }}>
                {currentConstraint?.description}
              </div>
            </div>

            {/* 三路戰場卡槽 */}
            <div className="battlefields-container" style={{ gap: '10px' }}>
              {[0, 1, 2].map(laneIdx => {
                const mult = MULTIPLIERS[laneIdx];
                const pCard = deployment[laneIdx];
                const laneRecord = laneLogs[laneIdx];
                const isLaneResolved = resolveStep > laneIdx && laneRecord;
                const isLaneCurrent = resolveStep === laneIdx;
                const isViolated = Boolean(pCard && laneIdx === 1 && currentConstraint && !currentConstraint.check(pCard));

                return (
                  <div
                    key={laneIdx}
                    className={`field-slot ${laneIdx === 1 ? 'core-lane' : ''}`}
                    style={{
                      border: laneIdx === 1 ? '2px solid #fbbf24' : '1px solid #334155',
                      background: laneIdx === 1 ? 'rgba(24, 24, 27, 0.7)' : 'rgba(9, 13, 22, 0.7)'
                    }}
                  >
                    {/* 戰場路名與倍率標籤 */}
                    <TerrainBanner
                      laneIndex={laneIdx}
                      multiplier={mult}
                      constraint={laneIdx === 1 ? currentConstraint : undefined}
                      isSelected={inspectedLaneIndex === laneIdx}
                      onSelect={() => setInspectedLaneIndex(laneIdx)}
                    />

                    {/* 敵方槽位 */}
                    <div className="slot-card-box enemy-box">
                      {isResolving && dealStep >= laneIdx ? (
                        <CardView
                          character={pendingResult ? pendingResult.lanes[laneIdx].enemyCard : null}
                          color="black"
                          isRevealed={isLaneResolved}
                          isClashing={isLaneCurrent}
                          isViolatedConstraint={isLaneResolved ? pendingResult?.lanes[laneIdx].isEnemyViolatedConstraint : false}
                          effectiveLevel={isLaneResolved ? pendingResult?.lanes[laneIdx].enemyEffectiveLevel : undefined}
                        />
                      ) : (
                        <div className="card-placeholder enemy">?</div>
                      )}
                    </div>

                    {/* 中央對抗戰力展示 */}
                    <div className="vs-indicator">
                      {isLaneResolved ? (
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          <span style={{ color: '#00ffcc' }}>{laneRecord.playerScore}</span>
                          <span style={{ color: '#64748b', margin: '0 4px' }}>VS</span>
                          <span style={{ color: '#ff4747' }}>{laneRecord.enemyScore}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '11px' }}>VS</span>
                      )}
                    </div>

                    {/* 己方槽位 */}
                    <div
                      className={`slot-card-box player-box ${animatingSlot === laneIdx ? 'slot-lock-flash' : ''}`}
                      onClick={() => handleSlotClick(pCard, laneIdx)}
                    >
                      {pCard ? (
                        <CardView
                          character={pCard}
                          color="white"
                          isDropIn={animatingSlot === laneIdx}
                          isRecalling={recallingSlot === laneIdx}
                          isViolatedConstraint={isViolated}
                          effectiveLevel={isLaneResolved ? laneRecord.playerEffectiveLevel : undefined}
                        />
                      ) : (
                        <div className="card-placeholder player">點擊放置</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 即時算式推演與交鋒特報條 */}
            <div className="clash-result-banner" style={{ marginTop: '12px', minHeight: '60px' }}>
              {isResolving && pendingResult ? (
                <div>
                  <div style={{ fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', marginBottom: '4px' }}>
                    {resolveStep < 3 ? `[ 第 ${resolveStep + 1} 路交鋒校驗中... ]` : '[ 總戰力對決裁定 ]'}
                  </div>
                  {resolveStep >= 3 && (
                    <div style={{ fontSize: '13px', color: '#fff', letterSpacing: '0.5px' }}>
                      己方總戰力 <strong style={{ color: '#00ffcc' }}>{pendingResult.playerTotalScore}</strong> PTS  VS  敵軍總戰力 <strong style={{ color: '#ff4747' }}>{pendingResult.enemyTotalScore}</strong> PTS
                      <div style={{ fontSize: '11px', color: '#facc15', marginTop: '4px' }}>
                        {pendingResult.winnerActionText}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '11px' }}>
                  [ 戰備指引 ] 將 3 張手牌指派至對應戰場，確認戰術姿態後點擊「鎖定出征」。
                </div>
              )}
            </div>
          </main>

          {/* 右側面板：對手 HUD 與戰備狀態 */}
          <aside className="sidebar enemy-sidebar">
            <div className="hud enemy-hud">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff4747', letterSpacing: '0.5px' }}>
                  [ 敵軍斥候隊 ]
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
                  牌庫: {session?.enemyDeck.length || 0}張
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>生命:</span>
                <div className="hp-bar">{renderHearts(displayEnemyHp, 16)}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>攻勢威力:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    background: displayEnemyAtk > 1 ? '#854d0e' : '#1e293b',
                    color: displayEnemyAtk > 1 ? '#fef08a' : '#94a3b8',
                    border: `1px solid ${displayEnemyAtk > 1 ? '#eab308' : '#334155'}`
                  }}
                >
                  [ ⚔ {displayEnemyAtk.toString().padStart(2, '0')} {displayEnemyAtk > 1 ? '蓄力中' : ''} ]
                </span>
              </div>
            </div>

            {/* 敵方姿態展示 */}
            <div
              style={{
                background: '#090d16',
                border: '2px solid #334155',
                padding: '8px',
                marginBottom: '10px'
              }}
            >
              <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>
                [ 敵方戰術姿態 ]
              </div>
              <div
                style={{
                  padding: '8px',
                  background: '#18181b',
                  border: '1px solid #27272a',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
              >
                {enemyRevealedStance ? (
                  <span style={{ color: enemyRevealedStance === 'ODD' ? '#fbbf24' : '#f87171', fontWeight: 'bold' }}>
                    [ {enemyRevealedStance === 'ODD' ? 'ODD · 蓄力充能' : 'EVEN · 鋒刃突擊'} ]
                  </span>
                ) : (
                  <span style={{ color: '#64748b' }}>[ ？？？ · 隱蔽宣告 ]</span>
                )}
              </div>
            </div>

            {/* 敵方手牌 (背面展示) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                敵方當前手牌 (3 張):
              </div>
              <div className="hand-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="card black-piece"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: '#64748b'
                    }}
                  >
                    ?
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 對局結算彈窗 (Game Over Modal)                                         */}
      {/* ========================================================================= */}
      {gameState === 'game_over' && (
        <div className="tutorial-overlay" style={{ zIndex: 1200 }}>
          <div
            className="tutorial-box"
            style={{
              width: '90%',
              maxWidth: '480px',
              textAlign: 'center',
              border: `3px solid ${winner === 'player' ? '#fbbf24' : winner === 'draw' ? '#94a3b8' : '#ef4444'}`
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                color: winner === 'player' ? '#fbbf24' : winner === 'draw' ? '#94a3b8' : '#ef4444',
                margin: '0 0 10px 0',
                letterSpacing: '1px'
              }}
            >
              {winner === 'player' ? '[ 大捷 · 榮耀凱旋 ]' : winner === 'draw' ? '[ 勢均力敵 · 平局 ]' : '[ 惜敗 · 陣線瓦解 ]'}
            </h2>

            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px' }}>
              {pendingResult?.winReasonText || (winner === 'player' ? '成功擊潰敵軍大營！' : '部隊防線力竭失守。')}
            </div>

            {/* 軍餉獎勵 */}
            {earnedGold && (
              <div
                style={{
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid #fbbf24',
                  padding: '8px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <PixelCoinIcon size={16} />
                <span style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 'bold' }}>
                  獲取軍餉: +{earnedGold.amount} G ({earnedGold.reason})
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn"
                style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#0f766e' }}
                onClick={startNewGame}
              >
                [ 再戰一局 ]
              </button>
              <button
                className="btn"
                style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#334155' }}
                onClick={() => setGameState('idle')}
              >
                [ 返回大廳 ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 戰術指南彈窗 (Tutorial Modal)                                          */}
      {/* ========================================================================= */}
      {showTutorial && (
        <div className="tutorial-overlay" style={{ zIndex: 1200 }} onClick={() => setShowTutorial(false)}>
          <div className="tutorial-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ color: '#ffcc00', margin: 0, fontSize: '16px' }}>{TUTORIAL_PAGES[tutorialStep].title}</h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{tutorialStep + 1} / {TUTORIAL_PAGES.length}</span>
            </div>
            <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '15px 0' }}>
              {TUTORIAL_PAGES[tutorialStep].graphic}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-line', marginBottom: '20px' }}>
              {TUTORIAL_PAGES[tutorialStep].text}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                className="btn"
                disabled={tutorialStep === 0}
                onClick={() => setTutorialStep(prev => prev - 1)}
                style={{ opacity: tutorialStep === 0 ? 0.3 : 1 }}
              >
                上一步
              </button>
              {tutorialStep < TUTORIAL_PAGES.length - 1 ? (
                <button className="btn" onClick={() => setTutorialStep(prev => prev + 1)}>
                  下一步
                </button>
              ) : (
                <button
                  className="btn"
                  style={{ background: '#00ffcc', color: '#000', fontWeight: 'bold' }}
                  onClick={() => setShowTutorial(false)}
                >
                  開始戰鬥
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. 局內暫停與選單彈窗 (Menu Modal)                                        */}
      {/* ========================================================================= */}
      {showMenu && (
        <div className="tutorial-overlay" style={{ zIndex: 1200 }} onClick={() => setShowMenu(false)}>
          <div className="tutorial-box" style={{ maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#ffcc00', margin: '0 0 16px 0', fontSize: '16px', textAlign: 'center' }}>
              [ 戰況選單 MENU ]
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn"
                style={{ padding: '10px', fontSize: '13px' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  setShowMenu(false);
                  setShowSettings(true);
                }}
              >
                [ 系統與音訊設定 ]
              </button>
              <button
                className="btn"
                style={{ padding: '10px', fontSize: '13px' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  setShowMenu(false);
                  setShowCompendium(true);
                }}
              >
                [ 戰術百科圖鑑 ]
              </button>
              <button
                className="btn"
                style={{ padding: '10px', fontSize: '13px', background: '#991b1b' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  setShowMenu(false);
                  setGameState('idle');
                }}
              >
                [ 撤出戰場 ]
              </button>
              <button
                className="btn"
                style={{ padding: '8px', fontSize: '12px', background: '#334155' }}
                onClick={() => setShowMenu(false)}
              >
                [ 繼續戰鬥 ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. 其他模態彈窗 (圖鑑、設定、商城、軍備、雲端大廳)                           */}
      {/* ========================================================================= */}
      {showCompendium && <CompendiumModal onClose={() => setShowCompendium(false)} />}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpenShop={() => setShowShop(true)}
          onOpenDeckBuilder={() => {
            setAllowCustomUpload(true);
            setShowDeckBuilder(true);
          }}
        />
      )}
      {showShop && <ShopModal onClose={() => setShowShop(false)} />}
      {showDeckBuilder && (
        <DeckBuilderModal
          onClose={() => {
            setShowDeckBuilder(false);
            setAllowCustomUpload(false);
          }}
          allowCustomUpload={allowCustomUpload}
        />
      )}
      {showOnlineLobby && (
        <OnlineLobbyModal
          initialRoomCode={urlRoomCode}
          onClose={() => {
            setShowOnlineLobby(false);
            setUrlRoomCode('');
          }}
          onStartMatch={(roomCode, isHost) => {
            setOnlineRoomCode(roomCode);
            setIsOnlineHost(isHost);
            setShowOnlineLobby(false);
            setGameState('online_match');
          }}
        />
      )}
    </div>
  );
}
