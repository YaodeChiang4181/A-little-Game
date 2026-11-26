import React, { useState, useEffect, useRef } from 'react';
import { CardView } from './CardView';
import { TerrainBanner } from './TerrainBanner';
import { PixelHeart } from './PixelIcons';
import { soundManager } from '../game/soundManager';
import {
  TowerRunState,
  TOWER_FLOORS,
  startFloorBattle,
  resolveFloorVictory,
  resolveFloorDefeat,
  applyCampfireRest,
  applyCampfireTactics,
} from '../game/towerEngine';
import { resolveTurn, GameSession } from '../game/gameService';
import { Character, SingleBattleRecord, RoundResolutionResult, Stance } from '../game/types';
import { TowerResultModal } from './TowerResultModal';
import { addGold } from '../game/economy/wallet';

interface TowerViewProps {
  initialState: TowerRunState;
  onExit: () => void;
  onRestart: () => void;
}

export const TowerView: React.FC<TowerViewProps> = ({ initialState, onExit, onRestart }) => {
  const [state, setState] = useState<TowerRunState>(initialState);

  // 當前戰場 3 槽位佈署
  const [deployment, setDeployment] = useState<(Character | null)[]>([null, null, null]);
  const [hand, setHand] = useState<Character[]>([]);
  const [playerStance, setPlayerStance] = useState<Stance>('ODD');

  // 連貫動效狀態 (L4 ➔ L1 ➔ L2)
  const [liftingHandIndex, setLiftingHandIndex] = useState<number | null>(null);
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [recallingSlot, setRecallingSlot] = useState<number | null>(null);
  const isDeployingRef = useRef(false);
  const deployTimerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);
  const recallTimerRef = useRef<number | null>(null);

  // 動畫與結算狀態
  const [isResolving, setIsResolving] = useState(false);
  const [dealStep, setDealStep] = useState(-1);
  const [resolveStep, setResolveStep] = useState(-1);
  const [pendingResult, setPendingResult] = useState<RoundResolutionResult | null>(null);
  const [pendingNextSession, setPendingNextSession] = useState<GameSession | null>(null);
  const [battleLogs, setBattleLogs] = useState<SingleBattleRecord[]>([]);

  // 當前回合數與承傷紀錄
  const [floorRounds, setFloorRounds] = useState(1);
  const [displayEnemyHp, setDisplayEnemyHp] = useState(3);
  const [inspectedTerrainIndex, setInspectedTerrainIndex] = useState<number | null>(null);

  const currentFloorConfig = TOWER_FLOORS[state.currentFloor - 1] || TOWER_FLOORS[0];

  // 進入戰鬥狀態時初始化手牌
  useEffect(() => {
    if (state.status === 'battling' && state.currentSession) {
      setHand(state.currentSession.playerHand);
      setDeployment([null, null, null]);
      setDisplayEnemyHp(state.currentSession.enemyHp);
      setBattleLogs([]);
      setIsResolving(false);
      setDealStep(-1);
      setResolveStep(-1);
      setInspectedTerrainIndex(null);
    }
  }, [state.status, state.currentFloor]);

  // 第一階段動畫：敵方卡片依序飛入戰場
  useEffect(() => {
    if (dealStep >= 0 && dealStep < 3) {
      soundManager.playSfx('enemyDeal');
      const timer = setTimeout(() => {
        setDealStep(prev => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    } else if (dealStep === 3) {
      const timer = setTimeout(() => {
        setResolveStep(0);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [dealStep]);

  // 第二階段動畫：逐格翻牌結算
  useEffect(() => {
    if (resolveStep >= 0 && resolveStep < 3 && pendingResult && pendingResult.battles) {
      const currentBattle = pendingResult.battles[resolveStep];
      soundManager.playSfx('cardReveal');
      if (currentBattle.traits_triggered && currentBattle.traits_triggered.length > 0) {
        setTimeout(() => {
          soundManager.playSfx('traitTrigger');
        }, 400);
      }
      setBattleLogs(prev => {
        const newLogs = [...prev];
        newLogs[resolveStep] = currentBattle;
        return newLogs;
      });

      const timer = setTimeout(() => {
        setResolveStep(prev => prev + 1);
      }, 3600);

      return () => clearTimeout(timer);
    } else if (resolveStep === 3 && pendingResult && state.currentSession) {
      // 3 個戰場全部結算完畢，結算總傷害與更新血量
      const endTimer = setTimeout(() => {
        const newPlayerHp = pendingResult.playerHpAfter;
        const newEnemyHp = pendingResult.enemyHpAfter;
        const damageToPlayer = Math.max(0, state.playerHp - newPlayerHp);
        if (damageToPlayer > 0) soundManager.playSfx('hitDamage');
        const newFloorDamage = state.floorDamageTaken + damageToPlayer;

        setDisplayEnemyHp(newEnemyHp);

        const nextRoundTimer = setTimeout(() => {
          const wonFloor = pendingResult.gameOver && pendingResult.gameWinner === 'player';
          const lostFloor = pendingResult.gameOver && pendingResult.gameWinner !== 'player';
          if (wonFloor) {
            soundManager.playSfx('victory');
            const updatedState: TowerRunState = {
              ...state,
              playerHp: newPlayerHp,
              floorDamageTaken: newFloorDamage
            };
            const nextTowerState = resolveFloorVictory(updatedState, floorRounds);
            setState(nextTowerState);
            setFloorRounds(1);

            // 結算突破金幣
            const floorGold = 40 + state.currentFloor * 20;
            addGold(floorGold, `一命通關 第 ${state.currentFloor} 層突破`);
            if (nextTowerState.status === 'victory') {
              addGold(100, '一命通關 登頂通關賞金');
            }
            setTimeout(() => soundManager.playSfx('coin'), 600);
          } else if (lostFloor || newPlayerHp <= 0) {
            // 玩家陣亡 (挑戰失敗)
            soundManager.playSfx('defeat');
            const defeatState = resolveFloorDefeat({
              ...state,
              playerHp: 0,
              floorDamageTaken: newFloorDamage
            });
            setState(defeatState);
            addGold(25, '一命通關 奮戰慰問金');
            setTimeout(() => soundManager.playSfx('coin'), 600);
          } else {
            // 自動過渡至該層下一回合 (換邊與套用下一回合戰場)
            setState(prev => ({
              ...prev,
              playerHp: newPlayerHp,
              floorDamageTaken: newFloorDamage,
              currentSession: pendingNextSession || prev.currentSession
            }));
            if (pendingNextSession) {
              setHand(pendingNextSession.playerHand);
              setPendingNextSession(null);
            } else if (pendingResult.next_player_hand) {
              setHand(pendingResult.next_player_hand);
            }
            setFloorRounds(prev => prev + 1);
            setDeployment([null, null, null]);
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

  // 手牌操作：點選手牌佈署至第一個空槽位 (L4 ➔ L1 連貫動效)
  const handleCardClick = (card: Character, index: number) => {
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

  // 槽位操作：點選已佈署槽位撤回手牌 (card-recall-out 0.3s)
  const handleSlotClick = (card: Character | null, index: number) => {
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

  // 提交佈署開始決鬥
  const submitDeployment = () => {
    const deployedCount = deployment.filter(c => c !== null).length;
    if (deployedCount < 3 || !state.currentSession || isResolving) return;

    // 提交時清除殘留動畫定時器
    if (deployTimerRef.current) { window.clearTimeout(deployTimerRef.current); deployTimerRef.current = null; }
    if (dropTimerRef.current) { window.clearTimeout(dropTimerRef.current); dropTimerRef.current = null; }
    if (recallTimerRef.current) { window.clearTimeout(recallTimerRef.current); recallTimerRef.current = null; }
    isDeployingRef.current = false;
    setLiftingHandIndex(null);
    setAnimatingSlot(null);
    setRecallingSlot(null);

    setInspectedTerrainIndex(null);
    soundManager.ensureContext();
    soundManager.playSfx('startClash');
    setIsResolving(true);

    const { result, nextSession } = resolveTurn(
      state.currentSession,
      deployment as Character[],
      playerStance
    );

    setPendingResult(result);
    setBattleLogs([]);

    if (nextSession) {
      setPendingNextSession(nextSession);
    } else {
      setPendingNextSession(null);
    }

    setDealStep(0);
  };

  const handleStartFloor = () => {
    soundManager.playSfx('click');
    const newState = startFloorBattle(state);
    setState(newState);
  };

  const renderHearts = (hp: number, max: number = 5, size: number = 16) => {
    return Array.from({ length: max }).map((_, i) => (
      <span key={i} style={{ display: 'inline-flex', marginRight: '3px' }}>
        <PixelHeart filled={i < hp} size={size} />
      </span>
    ));
  };

  const deployedCount = deployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const currentTerrains = [0, 1, 2].map(index => ({
    id: `lane-${index}`,
    name: index === 0 ? '左翼陣線' : index === 1 ? `中路核心 · ${state.currentSession?.currentConstraint.name || '禁令'}` : '右翼陣線',
    weight: index === 1 ? 2 : 1,
    icon: index === 1 ? 'arena' : 'town',
    color: index === 1 ? (state.currentSession?.currentConstraint.color || '#fbbf24') : '#64748b',
    description: index === 1
      ? (state.currentSession?.currentConstraint.description || '中路核心，倍率 ×2。')
      : '常規陣線，倍率 ×1。'
  }));

  const renderStanceControls = () => (
    <div style={{ display: 'flex', gap: '6px', margin: '8px 0', padding: '6px', border: '1px solid #334155', background: '#090d16' }}>
      {(['ODD', 'EVEN'] as Stance[]).map(stance => (
        <button
          key={stance}
          type="button"
          disabled={isResolving}
          onClick={() => setPlayerStance(stance)}
          style={{
            flex: 1, padding: '7px 4px', cursor: isResolving ? 'not-allowed' : 'pointer',
            background: playerStance === stance ? (stance === 'ODD' ? '#854d0e' : '#7f1d1d') : '#18181b',
            color: playerStance === stance ? '#fff' : '#94a3b8',
            border: `2px solid ${playerStance === stance ? (stance === 'ODD' ? '#eab308' : '#ef4444') : '#27272a'}`,
            fontFamily: 'var(--font-pixel)', fontSize: '10px'
          }}
        >
          {stance === 'ODD' ? '[ ODD · 蓄力 ]' : '[ EVEN · 攻擊 ]'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="game-wrapper">
      {/* ============ 1. 每層開戰簡報畫面 (Briefing) ============ */}
      {state.status === 'briefing' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div
            className="tutorial-box"
            style={{
              width: '92%',
              maxWidth: '520px',
              textAlign: 'center',
              border: `3px solid ${currentFloorConfig.isBoss ? '#ff4747' : currentFloorConfig.isElite ? '#ffcc00' : '#00ffcc'}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '11px', letterSpacing: '1px' }}>
                EXPEDITION: #{state.seed}
              </span>
              <button
                className="btn"
                style={{ padding: '4px 10px', fontSize: '11px', background: '#334155' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  onExit();
                }}
              >
                [ 撤退至主選單 ]
              </button>
            </div>

            <div style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '1px', marginBottom: '6px' }}>
              CHALLENGE ENCOUNTER · FLOOR 0{state.currentFloor} / 0{state.maxFloors}
            </div>
            <h2 style={{ color: currentFloorConfig.isBoss ? '#ff4747' : currentFloorConfig.isElite ? '#ffcc00' : '#00ffcc', margin: '0 0 10px 0', fontSize: '22px' }}>
              {currentFloorConfig.title}
            </h2>
            <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '20px', fontFamily: 'monospace' }}>
              守衛首領: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{currentFloorConfig.enemyName}</span> ({currentFloorConfig.enemyTitle})
            </div>

            {/* 詞綴資訊框 */}
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #334155', borderRadius: '4px', padding: '14px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ color: '#ffcc00', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
                戰場特殊法則 (MUTATION)
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.6' }}>
                {currentFloorConfig.modifierDesc}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(30,41,59,0.5)', padding: '10px 14px', borderRadius: '4px', marginBottom: '20px', fontSize: '12px' }}>
              <span style={{ color: '#94a3b8' }}>敵方生命值:</span>
              <span style={{ color: '#ff4747', fontWeight: 'bold' }}>{currentFloorConfig.enemyHp} 點</span>
              <span style={{ color: '#94a3b8' }}>玩家帶入生命:</span>
              <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{state.playerHp} / {state.playerMaxHp} 點</span>
            </div>

            <button
              className="btn engage"
              style={{ width: '100%', padding: '12px', fontSize: '16px', letterSpacing: '1px' }}
              onClick={handleStartFloor}
            >
              [ 開始 ]
            </button>
          </div>
        </div>
      )}

      {/* ============ 2. 營地休息畫面 (Campfire) ============ */}
      {state.status === 'campfire' && (
        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="tutorial-box" style={{ width: '92%', maxWidth: '520px', textAlign: 'center', border: '3px solid #ffcc00' }}>
            <div style={{ color: '#ffcc00', fontSize: '12px', letterSpacing: '1px', marginBottom: '6px' }}>
              REST SITE
            </div>
            <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '22px' }}>
              [ 試煉中繼營地 · CAMPFIRE ]
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px', lineHeight: '1.6' }}>
              你通過了鏡像神殿的考驗，終焉棋王就在前方的王座大殿！請選擇一項戰略整備：
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <button
                className="btn"
                style={{ background: '#0f766e', padding: '14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  setState(applyCampfireRest(state));
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[ 休憩修整 ] 回復 2 點生命值</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>穩健續航，避免在終焉 Boss 戰遭瞬秒</div>
                </div>
                <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>+2 HP</span>
              </button>

              <button
                className="btn"
                style={{ background: '#4338ca', padding: '14px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => {
                  soundManager.playSfx('click');
                  setState(applyCampfireTactics(state));
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>[ 戰意激昂 ] 獲得額外試煉積分</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>極限衝分，挑戰結算最高評級 S</div>
                </div>
                <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>+1,000 PTS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 3. 戰鬥交鋒主舞台 (Battling) ============ */}
      {state.status === 'battling' && state.currentSession && (
        <>
          {/* ============ 手機版專用頂部整合導覽與 HUD ============ */}
          <div className="mobile-header-bar mobile-only">
            {/* 第一行：撤退至主選單與關卡進度 */}
            <div className="mobile-nav-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="mobile-btn"
                onClick={() => {
                  soundManager.playSfx('click');
                  onExit();
                }}
              >
                [ 撤退至主選單 ]
              </button>
              <div style={{ fontSize: '11px', color: '#ffcc00', fontFamily: 'monospace', fontWeight: 'bold' }}>
                FLOOR 0{state.currentFloor}/0{state.maxFloors} · {state.score.toLocaleString()} PTS
              </div>
            </div>

            {/* 第二行：對局 HUD 資訊列 (不擠壓、空間獨立) */}
            <div className="mobile-huds-row">
              <div className="mobile-hud player" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px' }}>[ 試煉者 ]</span>
                <div className="hp-bar" style={{ display: 'flex' }}>
                  {renderHearts(state.playerHp, state.playerMaxHp, 11)}
                </div>
              </div>
              <div className="mobile-hud-vs" style={{ padding: '0 6px', fontSize: '10px', color: '#ffcc00' }}>
                R{floorRounds}
              </div>
              <div className="mobile-hud enemy" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexDirection: 'row-reverse' }}>
                <span style={{ fontSize: '10px' }}>[ 敵軍 ⚔{state.currentSession?.enemyAtk ?? 1} ]</span>
                <div className="hp-bar" style={{ display: 'flex' }}>
                  {renderHearts(displayEnemyHp, currentFloorConfig.enemyHp, 11)}
                </div>
              </div>
            </div>
          </div>

          {/* ============ 玩家控制面板 (左側 / 電腦版) ============ */}
          <div className="side-panel player-panel tower-panel desktop-only">
            {/* 頂部撤退按鈕 */}
            <button
              className="btn"
              style={{ padding: '6px 12px', fontSize: '11px', background: '#334155', alignSelf: 'flex-start' }}
              onClick={() => {
                soundManager.playSfx('click');
                onExit();
              }}
            >
              [ 撤退至主選單 ]
            </button>

            {/* 玩家情報 HUD (兩排獨立佈局，防止擠壓折行) */}
            <div className="hud-box player-hud" style={{ padding: '10px 14px', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              {/* 上列：身分與血量 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#00ffcc', letterSpacing: '1px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                  [ {playerStance} 姿態 ] 試煉者
                </span>
                <div className="hp-bar" style={{ display: 'flex' }}>
                  {renderHearts(state.playerHp, state.playerMaxHp, 15)}
                </div>
              </div>

              {/* 下列：樓層與積分 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '6px', fontSize: '11px', fontFamily: 'monospace' }}>
                <span style={{ color: '#ffcc00', whiteSpace: 'nowrap' }}>
                  FLOOR 0{state.currentFloor} / 0{state.maxFloors}
                </span>
                <span style={{ color: '#fff', whiteSpace: 'nowrap' }}>
                  SCORE: <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{state.score.toLocaleString()}</span> PTS
                </span>
              </div>
            </div>

            {renderStanceControls()}

            {/* 電腦版顯示的手牌區 (3 張) */}
            <div className="hand-section">
              <div className="deck-tag" style={{ color: '#00ffcc', whiteSpace: 'nowrap', fontSize: '11px' }}>
                [ 本回合手牌 · 3 張全數佈署 ]
              </div>
              <div
                className="hand-container"
                style={{
                  opacity: isResolving ? 0.5 : 1,
                  pointerEvents: isResolving ? 'none' : 'auto'
                }}
              >
                {hand.map((card, i) => (
                  <div key={card.id + i} onClick={() => handleCardClick(card, i)}>
                    <CardView
                      character={card}
                      color="white"
                      isUnselectedHand={isDeployReady}
                      isLiftingOff={liftingHandIndex === i}
                    />
                  </div>
                ))}
                {hand.length === 0 && (
                  <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', padding: '15px 0' }}>
                    手牌已全數佈署
                  </div>
                )}
              </div>

              <button
                className={`btn ${isDeployReady && !isResolving ? 'engage' : ''}`}
                style={{ width: '100%', padding: '10px', fontSize: '15px' }}
                onClick={submitDeployment}
                disabled={!isDeployReady || isResolving}
              >
                {isResolving ? '決鬥交鋒中...' : isDeployReady ? '出征決鬥！' : `佈署兵力 (${deployedCount}/3)`}
              </button>
            </div>
          </div>

          {/* ============ 中央主戰場區 (Center Stage) ============ */}
          <div className="main-stage">
            {/* 電腦版頂部情報列 */}
            <div className="deck-info-box desktop-only" style={{ maxWidth: '680px', whiteSpace: 'normal', padding: '6px 18px', textAlign: 'center', top: '15px' }}>
              <span style={{ color: '#ffcc00', fontWeight: 'bold', marginRight: '8px' }}>
                [ 第 {state.currentFloor} 層 · {currentFloorConfig.title} ]
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '11px' }}>
                {currentFloorConfig.modifierDesc}
              </span>
            </div>

            {/* 即時戰場戰術情報橫條 (全寬展開，徹底解決彈窗遮蔽卡牌與邊界截斷問題) */}
            {inspectedTerrainIndex !== null && (() => {
              const activeTerrains = (isResolving && pendingResult?.battles)
                ? pendingResult.battles.map(bt => bt.terrain)
                : currentTerrains;
              const targetTerrain = activeTerrains[inspectedTerrainIndex];
              if (!targetTerrain) return null;
              return (
                <div
                  className="terrain-stage-intel-bar"
                  onClick={() => setInspectedTerrainIndex(null)}
                  style={{
                    '--intel-color': targetTerrain.color
                  } as React.CSSProperties}
                >
                  <span style={{ color: targetTerrain.color, fontWeight: 'bold' }}>
                    [ {targetTerrain.name} · 倍率 x{targetTerrain.weight} ]
                  </span>
                  <span style={{ color: '#cbd5e1' }}>
                    {targetTerrain.description}
                  </span>
                  <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '10px' }}>
                    [ 點擊收起 ]
                  </span>
                </div>
              );
            })()}

            {/* 戰場交鋒區 (嚴格套用 .battlefield 與 .field-slot) */}
            <div className="battlefield">
              {deployment.map((playerChar, i) => {
                const b = battleLogs[i];
                const isClashing = resolveStep === i;
                const hasDealt = dealStep > i || resolveStep >= 0;
                // 優先使用當前交鋒所綁定之真實戰場，保證橫幅、算式與倍率 100% 絕對一致
                const activeBattle = b || pendingResult?.battles?.[i];
                const terrain = (isResolving && activeBattle) ? activeBattle.terrain : (currentTerrains[i] || {
                  id: 'unknown',
                  name: `戰場 ${i + 1}`,
                  weight: i + 1,
                  icon: 'arena',
                  color: '#555',
                  description: ''
                });

                return (
                  <div key={i} className="field-slot  {i === 1 ? 'core-lane' : ''}"
                    style={{
                      borderColor: i === 1 ? terrain.color : undefined,
                      boxShadow: i === 1 ? `0 0 12px ${terrain.color}33` : undefined,
                      '--lane-color': terrain.color,
                    } as React.CSSProperties}
                  >

                    {/* 動態戰場環境橫幅 */}
                    <TerrainBanner
                      terrain={terrain}
                      index={i}
                      isSelected={inspectedTerrainIndex === i}
                      onSelect={() => setInspectedTerrainIndex(prev => (prev === i ? null : i))}
                    />

                    {/* 敵方卡槽 */}
                    <div className="slot-card-box">
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
                          style={{ borderColor: '#000', color: '#fff', fontSize: '22px', fontFamily: 'monospace' }}
                        >
                          ?
                        </div>
                      ) : (
                        <div className="card empty" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                      )}
                    </div>

                    {/* 中央推演算式與 VS */}
                    <div className="clash-center-box">
                      {!isClashing && (
                        <div style={{ fontSize: '18px', color: '#ffcc00', textShadow: '2px 2px 0 #000', letterSpacing: '1px' }}>
                          VS
                        </div>
                      )}

                      {b && isClashing && (
                        <div className={`equation-tooltip slot-${i}`}>
                          <div className="typewriter type-1">
                            <span style={{ color: '#00ffcc' }}>玩家 {b.player_char.name} ({b.player_eff})</span>
                            <span style={{ margin: '0 6px' }}>vs</span>
                            <span style={{ color: '#ff4747' }}>對手 {b.enemy_char.name} ({b.enemy_eff})</span>
                          </div>
                          <div className="typewriter type-2">
                            我方 {b.player_eff} × x{b.weight} = <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{b.player_score}</span>
                            {' · '}敵方 {b.enemy_eff} × x{b.weight} = <span style={{ color: '#ff4747', fontWeight: 'bold' }}>{b.enemy_score}</span>
                            <div style={{ fontSize: '10px', color: '#fbbf24' }}>
                              {b.terrain.name} · 路線分差 {Math.abs(b.player_score - b.enemy_score)}
                            </div>
                          </div>

                          {b.traits_triggered.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
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

                    {/* 玩家卡槽 */}
                    <div
                      className={`slot-card-box${animatingSlot === i ? ' slot-lock-flash' : ''}`}
                      onClick={() => handleSlotClick(playerChar, i)}
                    >
                      {playerChar ? (
                        <CardView
                          character={playerChar}
                          color="white"
                          isWinner={b?.winner === 'player'}
                          isLoser={b?.winner === 'enemy'}
                          isClashing={isClashing}
                          isDropIn={animatingSlot === i}
                          isRecalling={recallingSlot === i}
                        />
                      ) : (
                        <div
                          className="card empty"
                          style={{
                            borderColor: 'rgba(255,255,255,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: '11px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            gap: '3px'
                          }}
                        >
                          <span style={{ fontSize: '15px', color: '#64748b' }}>+</span>
                          <span>[ 點選佈署 ]</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ============ 對手控制面板 (右側 / 電腦版) ============ */}
          <div className="side-panel enemy-panel tower-panel desktop-only">
            {/* 頂部佔位以對齊左側撤退按鈕 */}
            <div style={{ height: '27px', marginBottom: '0' }} />

            {/* 首領情報 HUD (兩排獨立佈局，防止擠壓折行) */}
            <div className="hud-box enemy-hud" style={{ padding: '10px 14px', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              {/* 上列：首領名稱與血量 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: currentFloorConfig.isBoss ? '#ff4747' : currentFloorConfig.isElite ? '#ffcc00' : '#f87171', letterSpacing: '1px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                  [ 敵軍 ] {currentFloorConfig.enemyName}
                </span>
                <div className="hp-bar" style={{ display: 'flex' }}>
                  {renderHearts(displayEnemyHp, currentFloorConfig.enemyHp, 15)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px solid #334155', paddingTop: '6px', fontSize: '11px' }}>
                <span style={{ color: state.currentSession.enemyAtk > 1 ? '#facc15' : '#94a3b8' }}>
                  敵方 ATK：{state.currentSession.enemyAtk}{state.currentSession.enemyAtk > 1 ? '（蓄力中）' : ''}
                </span>
                <span style={{ color: pendingResult?.enemyStance === 'ODD' ? '#facc15' : pendingResult?.enemyStance === 'EVEN' ? '#f87171' : '#64748b' }}>
                  {pendingResult?.enemyStance
                    ? `本回合 ${pendingResult.enemyStance === 'ODD' ? 'ODD 蓄力' : 'EVEN 攻擊'}`
                    : '姿態：隱蔽宣告'}
                </span>
              </div>

              {/* 下列：頭銜稱號 */}
              <div style={{ textAlign: 'right', borderTop: '1px solid #334155', paddingTop: '6px', fontSize: '11px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                {currentFloorConfig.enemyTitle}
              </div>
            </div>

            {/* 電腦版顯示的神秘敵方手牌 (3 張) */}
            <div className="hand-section">
              <div className="deck-tag" style={{ color: '#ff4747', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px' }}>
                [ 敵方戰備手牌 (3) ]
              </div>
              <div className="enemy-hand-container">
                {Array.from({ length: 3 }).map((_, i) => {
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
            </div>
          </div>

          {/* ============ 手機版專用底部手牌托盤與出兵按鈕 ============ */}
          <div className="mobile-bottom-tray mobile-only">
            <div className="mobile-hand-hint">
              {isDeployReady ? '[ 戰備完畢 ] 點擊槽位可撤回更換' : `[ 佈署階段 ] 選擇 3 位棋子進戰場 (${deployedCount}/3)`}
            </div>

            {renderStanceControls()}

            <div
              className="mobile-hand-container"
              style={{
                opacity: isResolving ? 0.5 : 1,
                pointerEvents: isResolving ? 'none' : 'auto'
              }}
            >
              {hand.map((card, i) => (
                <div key={card.id + i} onClick={() => handleCardClick(card, i)}>
                  <CardView
                    character={card}
                    color="white"
                    isUnselectedHand={isDeployReady}
                    isLiftingOff={liftingHandIndex === i}
                  />
                </div>
              ))}
              {hand.length === 0 && (
                <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  手牌已全數佈署
                </div>
              )}
            </div>

            <button
              className={`mobile-deploy-btn ${isDeployReady && !isResolving ? 'btn engage' : 'btn'}`}
              onClick={submitDeployment}
              disabled={!isDeployReady || isResolving}
            >
              {isResolving ? '決鬥交鋒中...' : isDeployReady ? '出征決鬥！' : `佈署兵力 (${deployedCount}/3)`}
            </button>
          </div>
        </>
      )}

      {/* ============ 4. 結算榮譽海報彈窗 (Victory / Defeat) ============ */}
      {(state.status === 'victory' || state.status === 'defeat') && (
        <TowerResultModal
          state={state}
          onRestart={onRestart}
          onMainMenu={onExit}
        />
      )}
    </div>
  );
};
