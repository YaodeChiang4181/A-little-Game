import React, { useState, useEffect } from 'react';
import { CardView } from './CardView';
import { TerrainBanner } from './TerrainBanner';
import { PixelHeart, PixelPieceIcon } from './PixelIcons';
import { soundManager } from '../game/soundManager';
import {
  TowerRunState,
  TOWER_FLOORS,
  startFloorBattle,
  resolveFloorVictory,
  resolveFloorDefeat,
  applyCampfireRest,
  applyCampfireTactics
} from '../game/towerEngine';
import { resolveTurn } from '../game/gameService';
import { Character, SingleBattleRecord, RoundResolutionResult } from '../game/types';
import { TowerResultModal } from './TowerResultModal';

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

  // 動畫與結算狀態
  const [isResolving, setIsResolving] = useState(false);
  const [dealStep, setDealStep] = useState(-1);
  const [resolveStep, setResolveStep] = useState(-1);
  const [pendingResult, setPendingResult] = useState<RoundResolutionResult | null>(null);
  const [battleLogs, setBattleLogs] = useState<SingleBattleRecord[]>([]);

  // 當前回合數與承傷紀錄
  const [floorRounds, setFloorRounds] = useState(1);
  const [displayEnemyHp, setDisplayEnemyHp] = useState(3);

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
    if (resolveStep >= 0 && resolveStep < 3 && pendingResult) {
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
        soundManager.playSfx('hitDamage');

        // 計算玩家承受的傷害
        const damageToPlayer = pendingResult.damage_to === 'player' ? 1 : 0;
        const newPlayerHp = Math.max(0, state.playerHp - damageToPlayer);
        const newFloorDamage = state.floorDamageTaken + damageToPlayer;

        setDisplayEnemyHp(pendingResult.enemy_hp);

        const nextRoundTimer = setTimeout(() => {
          // 檢查是否敵方陣亡 (通關本層)
          if (pendingResult.enemy_hp <= 0) {
            soundManager.playSfx('victory');
            const updatedState: TowerRunState = {
              ...state,
              playerHp: newPlayerHp,
              floorDamageTaken: newFloorDamage
            };
            const nextTowerState = resolveFloorVictory(updatedState, floorRounds);
            setState(nextTowerState);
            setFloorRounds(1);
          } else if (newPlayerHp <= 0) {
            // 玩家陣亡 (試煉失敗)
            soundManager.playSfx('defeat');
            const defeatState = resolveFloorDefeat({
              ...state,
              playerHp: 0,
              floorDamageTaken: newFloorDamage
            });
            setState(defeatState);
          } else {
            // 自動過渡至該層下一回合 (換邊)
            setState(prev => ({
              ...prev,
              playerHp: newPlayerHp,
              floorDamageTaken: newFloorDamage
            }));
            setFloorRounds(prev => prev + 1);
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

  // 手牌操作
  const handleCardClick = (card: Character, index: number) => {
    if (isResolving) return;
    const emptySlot = deployment.findIndex(s => s === null);
    if (emptySlot !== -1) {
      soundManager.ensureContext();
      const newDeployment = [...deployment];
      newDeployment[emptySlot] = card;
      setDeployment(newDeployment);

      const newHand = [...hand];
      newHand.splice(index, 1);
      setHand(newHand);

      const count = newDeployment.filter(c => c !== null).length;
      if (count === 3) {
        soundManager.playSfx('deployReady');
      } else {
        soundManager.playSfx('cardDeploy');
      }
    }
  };

  const handleSlotClick = (card: Character | null, index: number) => {
    if (isResolving || card === null) return;
    soundManager.ensureContext();
    soundManager.playSfx('cardRecall');
    setHand(prev => [...prev, card]);
    const newDeployment = [...deployment];
    newDeployment[index] = null;
    setDeployment(newDeployment);
  };

  const submitDeployment = () => {
    const deployedCount = deployment.filter(c => c !== null).length;
    if (deployedCount < 3 || !state.currentSession || isResolving) return;

    soundManager.ensureContext();
    soundManager.playSfx('startClash');
    setIsResolving(true);

    const { result, nextSession } = resolveTurn(
      state.currentSession,
      deployment as Character[]
    );

    setPendingResult(result);
    setBattleLogs([]);

    if (nextSession) {
      setState(prev => ({
        ...prev,
        currentSession: nextSession
      }));
    }

    setDealStep(0);
  };

  const handleStartFloor = () => {
    soundManager.playSfx('click');
    const newState = startFloorBattle(state);
    setState(newState);
  };

  const renderHearts = (hp: number, max: number = 5, size: number = 18) => {
    return Array.from({ length: max }).map((_, i) => (
      <span key={i} style={{ display: 'inline-flex', marginRight: '3px' }}>
        <PixelHeart filled={i < hp} size={size} />
      </span>
    ));
  };

  const deployedCount = deployment.filter(c => c !== null).length;
  const isDeployReady = deployedCount === 3;
  const currentTerrains = state.currentSession?.currentTerrains || [];

  return (
    <div className="game-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ============ 刷塔頂部 HUD 狀態列 ============ */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '2px solid #334155',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          zIndex: 50
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            className="btn"
            style={{ padding: '6px 12px', fontSize: '11px', background: '#334155' }}
            onClick={() => {
              soundManager.playSfx('click');
              onExit();
            }}
          >
            [ 撤退至主選單 ]
          </button>
          <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px', color: '#ffcc00' }}>
            [ 奇偶試煉 FLOOR 0{state.currentFloor} / 0{state.maxFloors} ]
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* 玩家持久化血量 (5 點) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#00ffcc', fontWeight: 'bold' }}>[ 玩家 HP ]</span>
            <div style={{ display: 'flex' }}>
              {renderHearts(state.playerHp, state.playerMaxHp, 15)}
            </div>
          </div>

          {/* 累計分數 */}
          <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#fff' }}>
            SCORE: <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{state.score.toLocaleString()}</span> PTS
          </div>
        </div>
      </header>

      {/* ============ 1. 每層開戰簡報畫面 (Briefing) ============ */}
      {state.status === 'briefing' && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div
            className="tutorial-box"
            style={{
              width: '90%',
              maxWidth: '500px',
              textAlign: 'center',
              border: `3px solid ${currentFloorConfig.isBoss ? '#ff4747' : currentFloorConfig.isElite ? '#ffcc00' : '#00ffcc'}`
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '12px', letterSpacing: '1px', marginBottom: '6px' }}>
              CHALLENGE ENCOUNTER
            </div>
            <h2 style={{ color: currentFloorConfig.isBoss ? '#ff4747' : currentFloorConfig.isElite ? '#ffcc00' : '#00ffcc', margin: '0 0 10px 0', fontSize: '22px' }}>
              {currentFloorConfig.title}
            </h2>
            <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '20px', fontFamily: 'monospace' }}>
              守衛首領: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{currentFloorConfig.enemyName}</span> ({currentFloorConfig.enemyTitle})
            </div>

            {/* 詞綴資訊框 */}
            <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #334155', borderRadius: '4px', padding: '14px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ color: '#ffcc00', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                戰場特殊法則 (MUTATION)
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
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
              [ 啟程迎戰 ENGAGE ]
            </button>
          </div>
        </div>
      )}

      {/* ============ 2. 營地休息畫面 (Campfire) ============ */}
      {state.status === 'campfire' && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="tutorial-box" style={{ width: '90%', maxWidth: '500px', textAlign: 'center', border: '3px solid #ffcc00' }}>
            <div style={{ color: '#ffcc00', fontSize: '12px', letterSpacing: '1px', marginBottom: '6px' }}>
              REST SITE
            </div>
            <h2 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '22px' }}>
              [ 試煉中繼營地 · CAMPFIRE ]
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '24px' }}>
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 20px' }}>
          {/* 對陣資訊列 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', border: '1px solid #334155', borderRadius: '4px', padding: '6px 14px', marginBottom: '10px' }}>
            <span style={{ color: '#00ffcc', fontSize: '12px' }}>
              [ 玩家陣營: {state.currentSession.playerRole} ] HP: {state.playerHp}
            </span>
            <span style={{ color: '#ffcc00', fontSize: '11px', fontFamily: 'monospace' }}>
              ROUND {floorRounds} · {currentFloorConfig.modifierDesc.split(' ')[0]}
            </span>
            <span style={{ color: '#ff4747', fontSize: '12px' }}>
              [ {currentFloorConfig.enemyName}: {state.currentSession.enemyRole} ] HP: {displayEnemyHp}
            </span>
          </div>

          {/* 戰場交鋒區 */}
          <div className="battlefield" style={{ flex: 1, margin: '10px 0' }}>
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
                <div key={i} className={`slot-column ${isClashing ? 'clashing' : ''}`}>
                  <TerrainBanner terrain={terrain} />

                  {/* 敵方卡片槽位 */}
                  <div className={`card-slot enemy-slot ${hasDealt ? 'dealt' : ''}`}>
                    {hasDealt && state.currentSession?.enemyHand[i] ? (
                      <CardView
                        character={state.currentSession.enemyHand[i]}
                        color="black"
                        isRevealed={resolveStep >= i}
                      />
                    ) : (
                      <div className="slot-placeholder">[ 敵方槽位 ]</div>
                    )}
                  </div>

                  {/* 玩家卡片槽位 */}
                  <div
                    className={`card-slot player-slot ${playerChar ? 'occupied' : ''}`}
                    onClick={() => handleSlotClick(playerChar, i)}
                  >
                    {playerChar ? (
                      <CardView character={playerChar} color="white" />
                    ) : (
                      <div className="slot-placeholder">[ 點選佈署 ]</div>
                    )}
                  </div>

                  {/* 即時算式打字機與特性標籤 */}
                  {b && (
                    <div className="battle-stat-box" style={{ marginTop: '8px' }}>
                      <div style={{ color: b.winner === 'player' ? '#00ffcc' : b.winner === 'enemy' ? '#ff4747' : '#fff', fontWeight: 'bold' }}>
                        {b.winner === 'player' ? '本格勝出' : b.winner === 'enemy' ? '本格戰敗' : '平手'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#ffcc00' }}>
                        差值 {b.diff} × x{b.weight} = {b.score} 分
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 手牌區與操作按鈕 */}
          <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #334155', borderRadius: '4px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
              {hand.map((card, i) => (
                <div key={card.id + i} onClick={() => handleCardClick(card, i)}>
                  <CardView character={card} color="white" isUnselectedHand={isDeployReady} />
                </div>
              ))}
              {hand.length === 0 && (
                <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                  手牌已全數佈署至三大戰場
                </div>
              )}
            </div>

            <button
              className={`btn ${isDeployReady && !isResolving ? 'engage' : ''}`}
              style={{ minWidth: '140px', padding: '12px', fontSize: '14px' }}
              onClick={submitDeployment}
              disabled={!isDeployReady || isResolving}
            >
              {isResolving ? '決鬥交鋒中...' : isDeployReady ? '出征決鬥！' : `佈署兵力 (${deployedCount}/3)`}
            </button>
          </div>
        </div>
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
